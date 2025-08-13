import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.API_SECRET
    if (!secret) {
      return NextResponse.json(
        { error: 'Server misconfiguration: API_SECRET not set' },
        { status: 500 }
      )
    }

    const body = await request.json()

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
    const proto = request.headers.get('x-forwarded-proto') || 'http'
    const targetUrl = `${proto}://${host}/api/ai-analysis`

    const cookieHeader = request.headers.get('cookie') || ''

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': secret,
        'Cookie': cookieHeader,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const text = await res.text()
    const contentType = res.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      let data: any
      try { data = JSON.parse(text) } catch { data = { raw: text } }
      return NextResponse.json(data, { status: res.status })
    }

    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': contentType || 'text/plain' },
    })
  } catch (err: any) {
    console.error('ai-analysis-proxy error:', err)
    return NextResponse.json(
      { error: 'Proxy failed: ' + (err?.message || 'Unknown error') },
      { status: 500 }
    )
  }
}
