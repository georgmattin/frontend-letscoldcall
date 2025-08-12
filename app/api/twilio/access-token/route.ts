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

    // Get user's profile to check their Twilio preference
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('twilio_config_preference, use_own_twilio_config')
      .eq('id', user.id)
      .single()

    // Default to global if no profile or preference found
    const useOwnConfig = profile?.twilio_config_preference === 'own' || profile?.use_own_twilio_config === true

    if (useOwnConfig) {
      // User wants to use their own Twilio configuration
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
            error: 'Teil on valitud oma Twilio konfiguratsiooni kasutamine, kuid vaikimisi konfiguratsioon puudub. Palun lisage Twilio konfiguratsioon Settings lehel või valige "Kasuta süsteemi konfiguratsiooni".',
            code: 'NO_USER_CONFIG'
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
    } else {
      // User wants to use global/system configuration - fallback to backend
      // This path is deprecated since backend now requires user authentication
      // We'll redirect user to configure their own Twilio account
      return NextResponse.json({
        error: 'Süsteemi konfiguratsioon pole enam saadaval. Palun seadistage oma Twilio konfiguratsioon Settings lehel.',
        code: 'SYSTEM_CONFIG_DEPRECATED',
        redirectTo: '/settings'
      }, { status: 404 })
    }

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