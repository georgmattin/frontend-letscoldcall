import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { createClient } from '@/utils/supabase/server'
import { getUserTwilioConfig } from '@/lib/twilio-utils'

export async function POST(request: NextRequest) {
  try {
    console.log('🔥 TwiML ENDPOINT CALLED! 🔥')
    
    // Parse form data from Twilio webhook
    const formData = await request.formData()
    const body: { [key: string]: string } = {}
    
    for (const [key, value] of formData.entries()) {
      body[key] = value.toString()
    }
    
    console.log('📞 Request headers:', Object.fromEntries(request.headers.entries()))
    console.log('📞 Request body:', body)
    console.log('📞 Request method:', request.method)
    console.log('📞 Request URL:', request.url)
    
    const twiml = new twilio.twiml.VoiceResponse()
    
    // Check if this is an incoming call (someone calling our Twilio number)
    const isIncomingCall = body.Direction === 'inbound'
    const caller = body.From
    const calledNumber = body.To
    
    // Additional check: make sure this is not a call FROM our browser client
    const isFromBrowserClient = caller && caller.includes('user_')
    
    console.log('📞 Call Direction:', body.Direction)
    console.log('📞 From:', caller)
    console.log('📞 To:', calledNumber)
    console.log('📞 Is from browser client:', isFromBrowserClient)
    
    if (isIncomingCall && !isFromBrowserClient) {
      console.log('📞 🔔 INCOMING CALL detected from external caller:', caller)
      
      // Get the proper host for callbacks (frontend API)
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3001'
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      const callbackUrl = `${protocol}://${host}/api/recording-status`
      
      console.log('📞 Using callback URL:', callbackUrl)
      
      // For incoming calls, dial to the client (browser) using TwiML App
      const dial = twiml.dial({
        callerId: caller, // Show the original caller's number
        timeout: 30,
        record: 'record-from-ringing',
        recordingStatusCallback: callbackUrl
      })
      
      // Dial to the client (this will ring in the browser)
      // TODO: make this dynamic by mapping calledNumber -> owner user identity.
      // For now, route to the current user's identity so inbound rings the web client.
      dial.client('user_92194486-0de3-4dfc-a08f-05c95564d3e8')
      
      console.log('📞 ➡️ Forwarding incoming call to browser client')
    } else {
      // This is an outgoing call from Voice SDK
      console.log('📞 📤 Outgoing Voice SDK call detected')
      
      // Extract phone number from various possible sources
      const phoneNumber = body.To || 
                         body.Called || 
                         body.phoneNumber ||
                         body.PhoneNumber ||
                         body.TargetNumber ||
                         body.to ||
                         body.called
      
      console.log('📞 📤 Outgoing Voice SDK call - extracted phone number:', phoneNumber)
      console.log('📞 All request params:', { body })
      
      if (phoneNumber && phoneNumber.startsWith('+')) {
        console.log('📞 Making outgoing call with recording:', phoneNumber)
        
        // Get the proper host for callbacks (frontend API)
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3001'
        const protocol = request.headers.get('x-forwarded-proto') || 'https'
        const callbackUrl = `${protocol}://${host}/api/recording-status`
        
        console.log('📞 Using callback URL:', callbackUrl)
        
        // Add recording notification
        twiml.say('This call is being recorded for quality purposes.')
        
        // Dial the phone number with recording enabled
        const dial = twiml.dial({
          record: 'record-from-ringing',
          recordingStatusCallback: callbackUrl,
          timeout: 30,
          callerId: body.Caller || undefined // Use the caller ID if available
        })
        
        // Add the phone number to dial
        dial.number(phoneNumber)
        
        console.log('📞 TwiML dial configured for:', phoneNumber)
      } else {
        console.log('📞 No valid phone number provided for outgoing call, playing test message')
        twiml.say('Hello! This is a Voice SDK test call. Please provide a phone number to dial.')
        
        // For Voice SDK, we need to hang up cleanly
        twiml.hangup()
      }
    }

    const twimlString = twiml.toString()
    console.log('📞 Generated TwiML:', twimlString)

    // Return TwiML response
    return new NextResponse(twimlString, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  } catch (error) {
    console.error('❌ ERROR in webhook:', error)
    
    // Send a basic TwiML response even if there's an error
    const errorTwiml = new twilio.twiml.VoiceResponse()
    errorTwiml.say('I am sorry, there was an error processing your call. Please try again later.')
    errorTwiml.hangup()
    
    return new NextResponse(errorTwiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    })
  }
}

// Add a GET endpoint for testing
export async function GET(request: NextRequest) {
  console.log('🔥 TwiML GET ENDPOINT CALLED! 🔥')
  const twiml = new twilio.twiml.VoiceResponse()
  twiml.say('Hello! This is a GET request test. The webhook endpoint is working.')
  
  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  })
} 