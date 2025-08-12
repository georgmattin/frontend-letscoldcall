import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { account_sid, auth_token, phone_number } = body

    if (!account_sid || !auth_token) {
      return NextResponse.json({
        success: false,
        error: 'Account SID ja Auth Token on nõutavad'
      }, { status: 400 })
    }

    // Test Twilio connection with provided credentials
    const client = twilio(account_sid, auth_token)
    
    // Fetch account information to verify credentials
    const account = await client.api.accounts(account_sid).fetch()
    
    // Optional: Test if phone number is valid by fetching its info
    let phoneNumberInfo = null
    if (phone_number) {
      try {
        const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({
          phoneNumber: phone_number
        })
        if (incomingPhoneNumbers.length > 0) {
          phoneNumberInfo = incomingPhoneNumbers[0]
        }
      } catch (phoneError) {
        console.warn('Could not fetch phone number info:', phoneError)
        // Don't fail the test if phone number check fails
      }
    }

    return NextResponse.json({
      success: true,
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type
      },
      phoneNumber: phoneNumberInfo ? {
        sid: phoneNumberInfo.sid,
        phoneNumber: phoneNumberInfo.phoneNumber,
        friendlyName: phoneNumberInfo.friendlyName,
        capabilities: phoneNumberInfo.capabilities
      } : null,
      message: 'Twilio ühendus edukas!'
    })

  } catch (error: any) {
    console.error('Twilio connection test failed:', error)
    
    let errorMessage = 'Twilio ühendus ebaõnnestus'
    
    if (error.code === 20003) {
      errorMessage = 'Vigased Twilio API andmed (Account SID või Auth Token)'
    } else if (error.code === 20404) {
      errorMessage = 'Twilio konto ei leitud'
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR'
    }, { status: 400 })
  }
} 