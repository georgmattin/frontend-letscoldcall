export async function GET(
  request: Request,
  { params }: { params: { recordingSid: string } }
) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002'
    const { recordingSid } = params
    
    const response = await fetch(`${backendUrl}/api/recording/${recordingSid}/local`, {
      method: 'GET',
    })

    if (!response.ok) {
      return Response.json(
        { error: 'Recording not found' },
        { status: response.status }
      )
    }

    // Stream the audio file back to the client
    const audioBuffer = await response.arrayBuffer()
    
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': `inline; filename="recording_${recordingSid}.wav"`,
      },
    })
    
  } catch (error) {
    console.error('Error proxying recording request:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 