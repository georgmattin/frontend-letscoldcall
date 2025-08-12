export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '50'
    const userId = searchParams.get('user_id')
    
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002'
    
    // Build query parameters
    const params = new URLSearchParams({
      limit: limit
    })
    
    if (userId) {
      params.append('user_id', userId)
    }
    
    const response = await fetch(`${backendUrl}/api/recordings?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // Read the response body once as text first
      const responseText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch (e) {
        // If response is not JSON (e.g., HTML error page), handle it
        errorData = { message: responseText.substring(0, 200) + '...' }
      }
      return Response.json(
        { error: 'Failed to get recordings', details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Add metadata about the response
    const enrichedData = {
      ...data,
      timestamp: new Date().toISOString(),
      backend_url: backendUrl
    }
    
    return Response.json(enrichedData)
    
  } catch (error) {
    console.error('Error proxying recordings request:', error)
    return Response.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString() 
      },
      { status: 500 }
    )
  }
} 