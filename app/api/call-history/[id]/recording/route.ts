import { createClient } from '@/utils/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: callHistoryId } = await params
    console.log('🎵 Recording API called for call history ID:', callHistoryId)
    const supabase = await createClient()

    // Get the user to ensure they can only access their own recordings
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ Auth error:', userError)
      return Response.json(
        { 
          error: 'Authentication error',
          details: userError.message 
        },
        { status: 401 }
      )
    }
    
    if (!user) {
      console.error('❌ No user found in auth context')
      return Response.json(
        { error: 'No authenticated user' },
        { status: 401 }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // First, get the call history record to ensure user owns it
    console.log('🔍 Looking up call history for ID:', callHistoryId, 'user:', user.id)
    const { data: callHistory, error: callHistoryError } = await supabase
      .from('call_history')
      .select('id, call_sid, user_id, recording_available, recording_url')
      .eq('id', callHistoryId)
      .eq('user_id', user.id)
      .single()

    if (callHistoryError || !callHistory) {
      console.error('❌ Call history not found:', callHistoryError)
      return Response.json(
        { error: 'Call history not found' },
        { status: 404 }
      )
    }

    console.log('✅ Call history found:', callHistory.id, 'call_sid:', callHistory.call_sid)

    // If no recording is available, return early
    if (!callHistory.recording_available || !callHistory.call_sid) {
      return Response.json(
        { error: 'No recording available for this call' },
        { status: 404 }
      )
    }

    // Get the recording details from the recordings table
    // Note: recordings might not have user_id set, so we only filter by call_sid
    console.log('🔍 Looking up recording for call_sid:', callHistory.call_sid)
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('call_sid', callHistory.call_sid)
      .single()

    if (recordingError || !recording) {
      console.error('❌ Recording not found for call_sid:', callHistory.call_sid, 'Error:', recordingError)
      return Response.json(
        { error: 'Recording details not found' },
        { status: 404 }
      )
    }

    console.log('✅ Recording found:', recording.recording_sid, 'status:', recording.status, 'path:', recording.storage_path)

    // Check if recording is ready for playback
    if (recording.status !== 'completed' || recording.download_status !== 'completed') {
      return Response.json(
        { 
          error: 'Recording not ready', 
          status: recording.status,
          download_status: recording.download_status 
        },
        { status: 202 } // Accepted but processing
      )
    }

    // Get signed URL for the recording from Supabase Storage
    console.log('Attempting to create signed URL for path:', recording.storage_path)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('recordings')
      .createSignedUrl(recording.storage_path, 3600) // 1 hour expiry

    if (urlError || !signedUrlData) {
      console.error('Error creating signed URL for path:', recording.storage_path, 'Error:', urlError)
      return Response.json(
        { 
          error: 'Could not generate recording URL',
          details: urlError?.message || 'Unknown storage error',
          storage_path: recording.storage_path
        },
        { status: 500 }
      )
    }

    console.log('✅ Successfully generated signed URL for recording')
    
    return Response.json({
      recording_id: recording.id,
      recording_sid: recording.recording_sid,
      call_sid: recording.call_sid,
      duration: recording.duration,
      status: recording.status,
      download_status: recording.download_status,
      recording_url: signedUrlData.signedUrl,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour from now
      storage_path: recording.storage_path
    })

  } catch (error) {
    console.error('❌ Error fetching recording:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return Response.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 