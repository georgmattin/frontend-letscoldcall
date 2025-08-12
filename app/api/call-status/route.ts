import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('📞 📊 Call Status Webhook received')
    
    // Parse form data from Twilio webhook
    const formData = await request.formData()
    const body: { [key: string]: string } = {}
    
    for (const [key, value] of formData.entries()) {
      body[key] = value.toString()
    }
    
    console.log('📞 📊 Call Status Data:', {
      CallSid: body.CallSid,
      CallStatus: body.CallStatus,
      CallDuration: body.CallDuration,
      From: body.From,
      To: body.To,
      Direction: body.Direction
    })
    
    // Here you can add logic to:
    // - Update call records in database
    // - Send notifications
    // - Log call analytics
    // - Update user's call history
    
    // For now, just acknowledge receipt
    return new NextResponse('OK', { status: 200 })
    
  } catch (error) {
    console.error('📞 ❌ Call Status Webhook Error:', error)
    return new NextResponse('Error processing call status', { status: 500 })
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({ 
    message: 'Call Status Webhook Endpoint',
    status: 'active' 
  })
}
