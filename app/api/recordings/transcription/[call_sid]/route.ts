import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ call_sid: string }> }
) {
  try {
    const { call_sid } = await params
    const supabase = await createClient()

    console.log('🎙️ Fetching transcription for call SID:', call_sid)

    // Find recording by call_sid (remove .single() to avoid PGRST116 error)
    const { data: recordings, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('call_sid', call_sid)
      .order('created_at', { ascending: false })
      .limit(1)

    console.log('🔍 Database query result:', { recordings, recordingError, count: recordings?.length })

    if (recordingError) {
      console.error('❌ Database error for call SID:', call_sid, recordingError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    if (!recordings || recordings.length === 0) {
      console.error('❌ No recording found for call SID:', call_sid)
      return NextResponse.json(
        { error: 'No recording found for this call' },
        { status: 404 }
      )
    }

    const recording = recordings[0]

    console.log('✅ Found recording with transcription:', recording.recording_sid, 'for call SID:', call_sid)

    // Return the transcription data
    const transcriptionData = {
      recording_sid: recording.recording_sid,
      call_sid: recording.call_sid,
      transcription_text: recording.transcription_text,
      transcription_status: recording.transcription_status,
      transcription_language: recording.transcription_language,
      transcription_confidence: recording.transcription_confidence,
      transcription_duration: recording.transcription_duration,
      transcription_segments: recording.transcription_segments,
      transcription_words: recording.transcription_words,
      transcription_method: recording.transcription_method,
      transcribed_at: recording.transcribed_at,
      has_transcription: !!recording.transcription_text
    }

    console.log('✅ Returning transcription data for call SID:', call_sid, {
      recording_sid: recording.recording_sid,
      has_transcription: !!recording.transcription_text,
      text_length: recording.transcription_text?.length || 0,
      status: recording.transcription_status
    })

    return NextResponse.json(transcriptionData)

  } catch (error) {
    console.error('❌ Error fetching transcription for call SID:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 