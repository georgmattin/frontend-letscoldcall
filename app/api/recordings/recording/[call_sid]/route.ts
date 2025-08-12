import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ call_sid: string }> }
) {
  try {
    const { call_sid } = await params
    const supabase = await createClient()

    console.log('🎵 Fetching recording for call SID:', call_sid)

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

    // Check if recording has been uploaded to storage
    if (!recording.storage_path) {
      console.error('❌ Recording not yet uploaded to storage for call SID:', call_sid)
      return NextResponse.json(
        { error: 'Recording is still being processed' },
        { status: 202 } // Accepted but not ready yet
      )
    }

    console.log('✅ Found recording:', recording.recording_sid, 'for call SID:', call_sid)

    // Get the signed URL for the recording
    const { data: signedUrlData, error: urlError } = await supabase
      .storage
      .from('recordings')
      .createSignedUrl(recording.storage_path, 3600) // Valid for 1 hour

    if (urlError || !signedUrlData?.signedUrl) {
      console.error('❌ Error creating signed URL:', urlError)
      return NextResponse.json(
        { error: 'Could not generate recording URL' },
        { status: 500 }
      )
    }

    // Return the recording data
    const recordingData = {
      recording_sid: recording.recording_sid,
      call_sid: recording.call_sid,
      recording_url: signedUrlData.signedUrl,
      duration: recording.duration,
      status: recording.status,
      channels: recording.channels,
      created_at: recording.created_at,
      file_size: recording.file_size,
      storage_path: recording.storage_path
    }

    console.log('✅ Returning recording data for call SID:', call_sid, {
      recording_sid: recording.recording_sid,
      has_url: !!signedUrlData.signedUrl,
      duration: recording.duration
    })

    return NextResponse.json(recordingData)

  } catch (error) {
    console.error('❌ Error fetching recording for call SID:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 