import { NextResponse } from 'next/server'

// Proxy the Twilio Voice SDK through our own domain to avoid CSP/extension blocking
// GET /api/twilio/voice-sdk
export async function GET() {
  const sdkUrl = 'https://sdk.twilio.com/js/voice/releases/2.8.0/twilio.min.js'
  try {
    const res = await fetch(sdkUrl, {
      // Ensure we always get the latest in dev, allow caching in prod via CDN
      cache: 'no-store',
    })
    if (!res.ok) {
      return new NextResponse(`Failed to fetch Twilio SDK: ${res.status}`, { status: 502 })
    }
    const js = await res.text()
    return new NextResponse(js, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        // Allow caching client-side a bit to reduce requests; adjust as needed
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e: any) {
    return new NextResponse(`Error fetching Twilio SDK: ${e?.message || 'unknown error'}`, { status: 502 })
  }
}
