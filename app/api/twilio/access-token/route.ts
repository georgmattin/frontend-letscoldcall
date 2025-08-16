import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        error: 'Kasutaja pole autenditud'
      }, { status: 401 })
    }

    // Always use user's default active Twilio configuration if available (rented or BYO)
    const { data: config, error: configError } = await supabase
      .from('user_twilio_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    if (configError) {
      if (configError.code === 'PGRST116') {
        return NextResponse.json({
          error: 'Twilio vaikimisi konfiguratsioon puudub. Palun lisage Twilio konfiguratsioon Settings lehel.',
          code: 'NO_USER_CONFIG',
          redirectTo: '/settings'
        }, { status: 404 })
      }
      throw configError
    }

    // Use dynamic import for Twilio to handle server-side environment
    const { default: twilio } = await import('twilio')
    
    if (!config.api_key || !config.api_secret || !config.twiml_app_sid) {
      return NextResponse.json({
        error: 'Kasutaja Twilio konfiguratsioonis puuduvad API Key, API Secret või TwiML App SID. Palun täiendage oma seadistusi.'
      }, { status: 400 })
    }

    const AccessToken = twilio.jwt.AccessToken
    const VoiceGrant = AccessToken.VoiceGrant

    // Create access token using user's configuration
    const token = new AccessToken(
      config.account_sid,
      config.api_key,
      config.api_secret,
      { 
        identity: `user_${user.id}`, // Use user ID as identity
        ttl: 3600 // Token valid for 1 hour
      }
    )

    // Create a Voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: config.twiml_app_sid,
      incomingAllow: true
    })

    token.addGrant(voiceGrant)

    return NextResponse.json({
      token: token.toJwt(),
      identity: token.identity,
      config: {
        phone_number: config.phone_number,
        friendly_name: config.friendly_name,
        source: 'user_config'
      }
    })
  } catch (error: any) {
    console.error('Error generating access token:', error)
    
    return NextResponse.json(
      { 
        error: 'Access token genereerimine ebaõnnestus', 
        details: error.message
      },
      { status: 500 }
    )
  }
} 