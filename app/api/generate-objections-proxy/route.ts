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

    // Read JSON body from client
    const body = await request.json()

    // Forward to the internal protected route
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
    const proto = request.headers.get('x-forwarded-proto') || 'http'
    const targetUrl = `${proto}://${host}/api/generate-objections`

    // Forward user cookies for auth context
    const cookieHeader = request.headers.get('cookie') || ''

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-secret': secret,
        // Preserve user auth/session
        'Cookie': cookieHeader,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const message = typeof data?.error === 'string' ? data.error : `Failed to generate objections (${res.status})`
      return NextResponse.json({ error: message }, { status: res.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 })
  }
}
