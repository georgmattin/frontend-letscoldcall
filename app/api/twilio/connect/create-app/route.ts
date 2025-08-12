import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { body } = await request.json()
    const { twilioAccountSid, twilioAuthToken, ngrokUrl } = body

    if (!twilioAccountSid || !twilioAuthToken || !ngrokUrl) {
      return NextResponse.json({ 
        error: 'Missing required fields: twilioAccountSid, twilioAuthToken, ngrokUrl' 
      }, { status: 400 })
    }

    // Create Connect App via Twilio API
    const connectAppData = {
      FriendlyName: 'Let\'s Cold Call',
      CompanyName: 'Let\'s Cold Call',
      Description: 'Make cold calls using your own Twilio account',
      HomepageUrl: ngrokUrl,
      AuthorizeUrl: `${ngrokUrl}/api/twilio/connect/authorize`,
      DeauthorizeUrl: `${ngrokUrl}/api/twilio/connect/deauthorize`,
      DeauthorizeMethod: 'POST',
      Permissions: ['get-all', 'post-all']
    }

    const formData = new URLSearchParams()
    Object.entries(connectAppData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => formData.append(key, v))
      } else {
        formData.append(key, value as string)
      }
    })

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/ConnectApps.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      }
    )

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text()
      console.error('Twilio API error:', errorText)
      return NextResponse.json({ 
        error: 'Failed to create Connect App',
        details: errorText
      }, { status: 500 })
    }

    const connectApp = await twilioResponse.json()
    console.log('Created Connect App:', connectApp)

    // Store in database
    const supabase = await createClient()
    
    const { error: insertError } = await supabase
      .from('twilio_connect_apps')
      .upsert({
        friendly_name: connectApp.friendly_name,
        company_name: connectApp.company_name,
        description: connectApp.description,
        homepage_url: connectApp.homepage_url,
        authorize_url: connectApp.authorize_url,
        deauthorize_url: connectApp.deauthorize_url,
        deauthorize_method: connectApp.deauthorize_method,
        permissions: connectApp.permissions,
        connect_app_sid: connectApp.sid
      }, {
        onConflict: 'connect_app_sid',
        ignoreDuplicates: false
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json({ 
        error: 'Failed to store Connect App',
        details: insertError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      connectApp: {
        sid: connectApp.sid,
        friendly_name: connectApp.friendly_name,
        authorize_url: connectApp.authorize_url
      }
    })

  } catch (error) {
    console.error('Create Connect App error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { body } = await request.json()
    const { twilioAccountSid, twilioAuthToken, ngrokUrl, connectAppSid } = body

    if (!twilioAccountSid || !twilioAuthToken || !ngrokUrl || !connectAppSid) {
      return NextResponse.json({ 
        error: 'Missing required fields: twilioAccountSid, twilioAuthToken, ngrokUrl, connectAppSid' 
      }, { status: 400 })
    }

    console.log('Updating Connect App URLs:', {
      connectAppSid,
      ngrokUrl,
      authorizeUrl: `${ngrokUrl}/api/twilio/connect/authorize`,
      deauthorizeUrl: `${ngrokUrl}/api/twilio/connect/deauthorize`
    })

    // Update Connect App URLs via Twilio API
    const updateData = {
      HomepageUrl: ngrokUrl,
      AuthorizeUrl: `${ngrokUrl}/api/twilio/connect/authorize`,
      DeauthorizeUrl: `${ngrokUrl}/api/twilio/connect/deauthorize`
    }

    const formData = new URLSearchParams()
    Object.entries(updateData).forEach(([key, value]) => {
      formData.append(key, value as string)
    })

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/ConnectApps/${connectAppSid}.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      }
    )

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text()
      console.error('Twilio API error:', errorText)
      return NextResponse.json({ 
        error: 'Failed to update Connect App',
        details: errorText
      }, { status: 500 })
    }

    const updatedConnectApp = await twilioResponse.json()
    console.log('Updated Connect App:', updatedConnectApp)

    // Update in database
    const supabase = await createClient()
    
    const { error: updateError } = await supabase
      .from('twilio_connect_apps')
      .update({
        homepage_url: updatedConnectApp.homepage_url,
        authorize_url: updatedConnectApp.authorize_url,
        deauthorize_url: updatedConnectApp.deauthorize_url,
        updated_at: new Date().toISOString()
      })
      .eq('connect_app_sid', connectAppSid)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update Connect App in database',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      connectApp: {
        sid: updatedConnectApp.sid,
        friendly_name: updatedConnectApp.friendly_name,
        authorize_url: updatedConnectApp.authorize_url,
        deauthorize_url: updatedConnectApp.deauthorize_url,
        homepage_url: updatedConnectApp.homepage_url
      }
    })

  } catch (error) {
    console.error('Update Connect App error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 