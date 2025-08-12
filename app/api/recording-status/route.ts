import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('📹 RECORDING STATUS CALLBACK RECEIVED! 📹')
    
    // Parse form data from Twilio webhook
    const formData = await request.formData()
    const body: { [key: string]: string } = {}
    
    for (const [key, value] of formData.entries()) {
      body[key] = value.toString()
    }
    
    const {
      AccountSid,
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingStatus,
      RecordingDuration,
      RecordingChannels,
      RecordingSource
    } = body
    
    console.log('📹 Recording Status:', RecordingStatus)
    console.log('📹 Recording SID:', RecordingSid)
    console.log('📹 Recording URL:', RecordingUrl)
    console.log('📹 Call SID:', CallSid)
    console.log('📹 Recording Duration:', RecordingDuration)
    
    // Process completed recordings
    if (RecordingStatus === 'completed' && RecordingUrl) {
      try {
        console.log('📹 Processing completed recording:', RecordingSid)
        
        // Create Supabase client with service role key to bypass RLS for webhooks
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )
        
        // Find the call history record to get user_id
        console.log('🔍 Searching for call history with call_sid:', CallSid)
        const { data: callHistory, error: callError } = await supabase
          .from('call_history')
          .select('id, user_id')
          .eq('call_sid', CallSid)
          .single()
        
        console.log('🔍 Call history query result:')
        console.log('- Data:', callHistory)
        console.log('- Error:', callError)
        
        if (callError || !callHistory) {
          console.log('⚠️ Call history not found for call_sid:', CallSid)
          console.log('⚠️ Error details:', callError)
          return NextResponse.json({ status: 'error', message: 'Call history not found' })
        }
        
        console.log('📞 Found call history for user:', callHistory.user_id)
        
        // Save recording metadata to database
        const { error: recordingError } = await supabase
          .from('recordings')
          .insert({
            recording_sid: RecordingSid,
            call_sid: CallSid,
            user_id: callHistory.user_id,
            call_history_id: callHistory.id,
            recording_url: RecordingUrl,
            duration: parseInt(RecordingDuration) || 0,
            status: RecordingStatus,
            channels: parseInt(RecordingChannels) || 1,
            source: RecordingSource || 'DialVerb',
            download_status: 'pending',
            created_at: new Date().toISOString()
          })
        
        if (recordingError) {
          console.error('❌ Error saving recording metadata:', recordingError)
        } else {
          console.log('✅ Recording metadata saved to database')
        }
        
        // Update call history with recording availability
        const { error: updateError } = await supabase
          .from('call_history')
          .update({
            recording_available: true,
            recording_url: RecordingUrl
          })
          .eq('id', callHistory.id)
        
        if (updateError) {
          console.error('❌ Error updating call history:', updateError)
        } else {
          console.log('✅ Call history updated with recording info')
        }
        
        // Download recording from Twilio and upload to Supabase Storage
        try {
          console.log('📥 Starting recording download from Twilio...')
          
          // Get user's Twilio config for authentication
          const { data: twilioConfig } = await supabase
            .from('user_twilio_configs')
            .select('account_sid, auth_token')
            .eq('user_id', callHistory.user_id)
            .eq('is_active', true)
            .single()
          
          if (!twilioConfig) {
            console.log('⚠️ No Twilio config found for user, skipping download')
            return new NextResponse('<Response></Response>', {
              status: 200,
              headers: { 'Content-Type': 'text/xml' }
            })
          }
          
          // Download recording from Twilio
          const authString = Buffer.from(`${twilioConfig.account_sid}:${twilioConfig.auth_token}`).toString('base64')
          const recordingResponse = await fetch(RecordingUrl, {
            headers: {
              'Authorization': `Basic ${authString}`
            }
          })
          
          if (!recordingResponse.ok) {
            console.error('❌ Failed to download recording from Twilio:', recordingResponse.statusText)
            return new NextResponse('<Response></Response>', {
              status: 200,
              headers: { 'Content-Type': 'text/xml' }
            })
          }
          
          const audioBuffer = await recordingResponse.arrayBuffer()
          const audioBlob = new Uint8Array(audioBuffer)
          
          console.log('✅ Recording downloaded from Twilio, size:', audioBlob.length, 'bytes')
          
          // Upload to Supabase Storage
          const fileName = `${RecordingSid}.wav`
          const storagePath = `recordings/${callHistory.user_id}/${fileName}`
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('recordings')
            .upload(storagePath, audioBlob, {
              contentType: 'audio/wav',
              cacheControl: '3600',
              upsert: false
            })
          
          if (uploadError) {
            console.error('❌ Error uploading to Supabase Storage:', uploadError)
          } else {
            console.log('✅ Recording uploaded to Supabase Storage:', uploadData.path)
            
            // Update recording metadata with storage info
            const { error: updateRecordingError } = await supabase
              .from('recordings')
              .update({
                storage_path: uploadData.path,
                file_size: audioBlob.length,
                download_status: 'completed'
              })
              .eq('recording_sid', RecordingSid)
            
            if (updateRecordingError) {
              console.error('❌ Error updating recording metadata:', updateRecordingError)
            } else {
              console.log('✅ Recording metadata updated with storage info')
            }
            
            // Get signed URL for immediate access
            const { data: signedUrlData } = await supabase.storage
              .from('recordings')
              .createSignedUrl(uploadData.path, 3600) // 1 hour expiry
            
            if (signedUrlData) {
              // Update call history with signed URL
              await supabase
                .from('call_history')
                .update({
                  recording_url: signedUrlData.signedUrl
                })
                .eq('id', callHistory.id)
              
              console.log('✅ Call history updated with signed URL')
            }
            
            // Trigger backend transcription process
            try {
              console.log('🎤 Triggering backend transcription for recording:', RecordingSid)
              
              const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002'
              const response = await fetch(`${backendUrl}/api/transcribe-recording`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SECRET}`
                },
                body: JSON.stringify({
                  recordingSid: RecordingSid,
                  userId: callHistory.user_id,
                  callSid: CallSid,
                  storagePath: uploadData.path
                })
              })
              
              if (response.ok) {
                console.log('✅ Backend transcription process triggered successfully')
              } else {
                const errorData = await response.text()
                console.log('⚠️ Backend transcription trigger failed:', errorData)
              }
            } catch (transcriptionError) {
              console.log('⚠️ Could not trigger backend transcription:', transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error')
            }
          }
          
        } catch (downloadError) {
          console.error('❌ Error downloading/uploading recording:', downloadError)
        }
        
      } catch (error) {
        console.error('❌ Error processing recording:', error)
      }
    }
    
    // Return TwiML response (required by Twilio)
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  } catch (error) {
    console.error('❌ ERROR in recording status callback:', error)
    
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  }
}

// Add a GET endpoint for testing
export async function GET(request: NextRequest) {
  console.log('📹 Recording status GET endpoint called')
  
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Recording status endpoint is working' 
  })
} 