import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// Configuration via environment variables (no secrets in code)
const AZURE_OPENAI_TRANSCRIBE_ENDPOINT = process.env.AZURE_OPENAI_TRANSCRIBE_ENDPOINT
const AZURE_API_KEY = process.env.AZURE_AI_SERVICES_KEY

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recordingSid: string }> }
) {
  try {
    // Validate config
    if (!AZURE_OPENAI_TRANSCRIBE_ENDPOINT || !AZURE_API_KEY) {
      return NextResponse.json(
        { error: 'Server is not configured for Azure OpenAI transcription. Missing AZURE_OPENAI_TRANSCRIBE_ENDPOINT or AZURE_AI_SERVICES_KEY.' },
        { status: 500 }
      )
    }
    const { recordingSid } = await params
    const supabase = await createClient()

    // Get user for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🎤 Starting transcription for recording:', recordingSid)

    // Find the recording in database
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('recording_sid', recordingSid)
      .eq('user_id', user.id)
      .single()

    if (recordingError || !recording) {
      console.error('❌ Recording not found:', recordingError)
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      )
    }

    // Check if recording is already transcribed
    if (recording.transcription_status === 'completed' && recording.transcription_text) {
      console.log('✅ Transcription already exists for recording:', recordingSid)
      return NextResponse.json({
        success: true,
        transcription_text: recording.transcription_text,
        status: 'completed'
      })
    }

    // Update status to processing
    await supabase
      .from('recordings')
      .update({
        transcription_status: 'processing',
        transcription_error: null
      })
      .eq('recording_sid', recordingSid)

    console.log('📥 Downloading recording from Twilio...')

    // Download the recording from Twilio
    const recordingResponse = await fetch(recording.recording_url, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`
      }
    })

    if (!recordingResponse.ok) {
      throw new Error(`Failed to download recording: ${recordingResponse.statusText}`)
    }

    const audioBuffer = await recordingResponse.arrayBuffer()
    console.log('✅ Recording downloaded, size:', audioBuffer.byteLength, 'bytes')

    // Prepare form data for Azure OpenAI Whisper
    const formData = new FormData()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' })
    formData.append('file', audioBlob, `${recordingSid}.wav`)
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')
    formData.append('response_format', 'verbose_json')

    console.log('🤖 Sending to Azure OpenAI Whisper for transcription...')

    // Send to Azure OpenAI Whisper
    const transcriptionResponse = await fetch(AZURE_OPENAI_TRANSCRIBE_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': AZURE_API_KEY
      },
      body: formData
    })

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text()
      console.error('❌ Azure OpenAI transcription failed:', errorText)
      
      // Update status to failed
      await supabase
        .from('recordings')
        .update({
          transcription_status: 'failed',
          transcription_error: `Azure OpenAI error: ${errorText}`
        })
        .eq('recording_sid', recordingSid)

      return NextResponse.json(
        { error: 'Transcription failed', details: errorText },
        { status: 500 }
      )
    }

    const transcriptionResult = await transcriptionResponse.json()
    console.log('✅ Transcription completed:', {
      text_length: transcriptionResult.text?.length || 0,
      duration: transcriptionResult.duration,
      language: transcriptionResult.language
    })

    // Save transcription to database
    const { error: updateError } = await supabase
      .from('recordings')
      .update({
        transcription_text: transcriptionResult.text,
        transcription_status: 'completed',
        transcription_language: transcriptionResult.language,
        transcription_duration: transcriptionResult.duration,
        transcription_confidence: transcriptionResult.segments?.[0]?.avg_logprob || null,
        transcription_segments: transcriptionResult.segments || null,
        transcription_words: transcriptionResult.words || null,
        transcription_method: 'azure_openai_whisper',
        transcribed_at: new Date().toISOString(),
        transcription_error: null
      })
      .eq('recording_sid', recordingSid)

    if (updateError) {
      console.error('❌ Error saving transcription:', updateError)
      return NextResponse.json(
        { error: 'Failed to save transcription' },
        { status: 500 }
      )
    }

    console.log('✅ Transcription saved to database successfully')

    return NextResponse.json({
      success: true,
      transcription_text: transcriptionResult.text,
      status: 'completed',
      language: transcriptionResult.language,
      duration: transcriptionResult.duration
    })

  } catch (error) {
    console.error('❌ Error in transcription process:', error)
    
    // Update status to failed
    try {
      const supabase = await createClient()
      await supabase
        .from('recordings')
        .update({
          transcription_status: 'failed',
          transcription_error: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('recording_sid', (await params).recordingSid)
    } catch (updateError) {
      console.error('❌ Error updating failed status:', updateError)
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
