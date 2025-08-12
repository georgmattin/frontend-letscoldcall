import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json()

    if (!accountId) {
      return NextResponse.json({ 
        error: 'Account ID is required' 
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the connected account details
    const { data: connectedAccount, error: accountError } = await supabase
      .from('user_twilio_connect_accounts')
      .select(`
        *,
        twilio_connect_apps (
          connect_app_sid
        )
      `)
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (accountError || !connectedAccount) {
      return NextResponse.json({ 
        error: 'Connected account not found' 
      }, { status: 404 })
    }

    // Get our main Twilio Auth Token for authentication
    // The accountSid from the connected account is a subaccount under the user's account
    // We authenticate using: subaccount SID + our own Auth Token
    const ourAuthToken = process.env.TWILIO_AUTH_TOKEN

    if (!ourAuthToken) {
      console.error('TWILIO_AUTH_TOKEN environment variable is not set')
      return NextResponse.json({ 
        error: 'Twilio Auth Token not configured. Please set TWILIO_AUTH_TOKEN environment variable.' 
      }, { status: 500 })
    }

    const subaccountSid = connectedAccount.account_sid
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`

    console.log('Setting up Twilio Connect account:', {
      subaccountSid,
      baseUrl,
      authTokenLength: ourAuthToken.length,
      authTokenPrefix: ourAuthToken.substring(0, 4) + '...'
    })

    // Step 1: Create API Key and Secret for the subaccount
    // We authenticate using the subaccount SID and our own Auth Token
    console.log('Creating API Key for subaccount...')
    
    const authHeader = `Basic ${Buffer.from(`${subaccountSid}:${ourAuthToken}`).toString('base64')}`
    console.log('Auth header length:', authHeader.length)
    
    const apiKeyResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${subaccountSid}/Keys.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          FriendlyName: `Let's Cold Call API Key - ${new Date().toISOString().split('T')[0]}`
        })
      }
    )

    console.log('API Key Response Status:', apiKeyResponse.status)
    console.log('API Key Response Headers:', Object.fromEntries(apiKeyResponse.headers.entries()))

    if (!apiKeyResponse.ok) {
      const errorText = await apiKeyResponse.text()
      console.error('Failed to create API key:', {
        status: apiKeyResponse.status,
        statusText: apiKeyResponse.statusText,
        errorText,
        subaccountSid,
        authTokenPresent: !!ourAuthToken,
        authTokenLength: ourAuthToken?.length
      })
      
      return NextResponse.json({ 
        error: 'Failed to create API key',
        details: errorText,
        debug: {
          status: apiKeyResponse.status,
          subaccountSid,
          authTokenConfigured: !!ourAuthToken
        }
      }, { status: 500 })
    }

    const apiKeyData = await apiKeyResponse.json()
    console.log('API Key created:', apiKeyData.sid)

    // Step 2: Create TwiML Application for the subaccount
    console.log('Creating TwiML Application...')
    const twimlAppResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${subaccountSid}/Applications.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${subaccountSid}:${ourAuthToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          FriendlyName: `Let's Cold Call Voice App`,
          VoiceUrl: `${baseUrl}/api/voice`,
          VoiceMethod: 'POST',
          StatusCallback: `${baseUrl}/api/call-status`,
          StatusCallbackMethod: 'POST'
        })
      }
    )

    if (!twimlAppResponse.ok) {
      const errorText = await twimlAppResponse.text()
      console.error('Failed to create TwiML app:', errorText)
      return NextResponse.json({ 
        error: 'Failed to create TwiML application',
        details: errorText
      }, { status: 500 })
    }

    const twimlAppData = await twimlAppResponse.json()
    console.log('TwiML Application created:', twimlAppData.sid)

    // Step 3: Get phone numbers from the subaccount and configure the first one
    console.log('Fetching phone numbers from subaccount...')
    const phoneNumbersResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${subaccountSid}/IncomingPhoneNumbers.json`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${subaccountSid}:${ourAuthToken}`).toString('base64')}`
        }
      }
    )

    if (!phoneNumbersResponse.ok) {
      const errorText = await phoneNumbersResponse.text()
      console.error('Failed to fetch phone numbers:', errorText)
      return NextResponse.json({ 
        error: 'Failed to fetch phone numbers',
        details: errorText
      }, { status: 500 })
    }

    const phoneNumbersData = await phoneNumbersResponse.json()
    const phoneNumbers = phoneNumbersData.incoming_phone_numbers || []

    let configuredPhoneNumber = null

    // Configure the first available phone number
    if (phoneNumbers.length > 0) {
      const phoneNumber = phoneNumbers[0]
      console.log('Configuring phone number:', phoneNumber.phone_number)

      const updatePhoneResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${subaccountSid}/IncomingPhoneNumbers/${phoneNumber.sid}.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${subaccountSid}:${ourAuthToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            VoiceUrl: `${baseUrl}/api/voice`,
            VoiceMethod: 'POST',
            StatusCallback: `${baseUrl}/api/call-status`,
            StatusCallbackMethod: 'POST',
            VoiceApplicationSid: twimlAppData.sid
          })
        }
      )

      if (updatePhoneResponse.ok) {
        configuredPhoneNumber = phoneNumber.phone_number
        console.log('Phone number configured successfully')
      } else {
        const errorText = await updatePhoneResponse.text()
        console.error('Failed to configure phone number:', errorText)
      }
    }

    // Step 4: Save configuration to our database
    const configData = {
      user_id: user.id,
      account_sid: subaccountSid,
      auth_token: '', // We don't store the auth token for security
      api_key: apiKeyData.sid,
      api_secret: apiKeyData.secret,
      phone_number: configuredPhoneNumber || '',
      twiml_app_sid: twimlAppData.sid,
      webhook_url: `${baseUrl}/api/voice`,
      is_default: true,
      is_active: true,
      friendly_name: `${connectedAccount.friendly_name || 'Connected Account'} - Auto Setup`,
      created_via_connect: true,
      connect_account_id: accountId
    }

    const { error: configError } = await supabase
      .from('user_twilio_configs')
      .upsert(configData, {
        onConflict: 'user_id,account_sid',
        ignoreDuplicates: false
      })

    if (configError) {
      console.error('Failed to save config:', configError)
      return NextResponse.json({ 
        error: 'Failed to save configuration',
        details: configError.message
      }, { status: 500 })
    }

    // Step 5: Update the connected account with TwiML App SID
    const { error: updateError } = await supabase
      .from('user_twilio_connect_accounts')
      .update({ 
        twiml_app_sid: twimlAppData.sid,
        setup_completed: true,
        setup_completed_at: new Date().toISOString()
      })
      .eq('id', accountId)

    if (updateError) {
      console.error('Failed to update connected account:', updateError)
    }

    return NextResponse.json({
      success: true,
      setup: {
        apiKey: apiKeyData.sid,
        twimlAppSid: twimlAppData.sid,
        phoneNumber: configuredPhoneNumber,
        webhookUrl: `${baseUrl}/api/voice`,
        totalPhoneNumbers: phoneNumbers.length
      },
      message: 'Account setup completed successfully'
    })

  } catch (error) {
    console.error('Account setup error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 