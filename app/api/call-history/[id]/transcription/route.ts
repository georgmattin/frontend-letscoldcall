import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: callHistoryId } = await params
    const supabase = await createClient()

    console.log('🎙️ Fetching transcription for call history:', callHistoryId)

    // FUCK call_history table, just get the latest recording with transcription
    console.log('🔍 Getting latest recording with transcription from recordings table...')

    const { data: latestRecording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .not('transcription_text', 'is', null) // Only recordings with transcription
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (recordingError || !latestRecording) {
      console.error('❌ No recording with transcription found:', recordingError)
      return NextResponse.json(
        { error: 'No recording with transcription found' },
        { status: 404 }
      )
    }

    console.log('✅ Found recording with transcription:', latestRecording.recording_sid, 'Call SID:', latestRecording.call_sid)

    // Return the transcription data
    const transcriptionData = {
      recording_sid: latestRecording.recording_sid,
      call_sid: latestRecording.call_sid,
      transcription_text: latestRecording.transcription_text,
      transcription_status: latestRecording.transcription_status,
      transcription_language: latestRecording.transcription_language,
      transcription_confidence: latestRecording.transcription_confidence,
      transcription_duration: latestRecording.transcription_duration,
      transcription_segments: latestRecording.transcription_segments,
      transcription_words: latestRecording.transcription_words,
      transcription_method: latestRecording.transcription_method,
      transcribed_at: latestRecording.transcribed_at,
      has_transcription: !!latestRecording.transcription_text
    }

    console.log('✅ Returning transcription data:', {
      recording_sid: latestRecording.recording_sid,
      call_sid: latestRecording.call_sid,
      has_transcription: !!latestRecording.transcription_text,
      text_length: latestRecording.transcription_text?.length || 0,
      status: latestRecording.transcription_status
    })

    return NextResponse.json(transcriptionData)

  } catch (error) {
    console.error('❌ Error fetching transcription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 