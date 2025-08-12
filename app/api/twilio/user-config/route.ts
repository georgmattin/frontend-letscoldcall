import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Kasutaja pole autenditud'
      }, { status: 401 })
    }

    // Get user's default Twilio configuration
    const { data: config, error: configError } = await supabase
      .from('user_twilio_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    if (configError) {
      if (configError.code === 'PGRST116') {
        // No default config found
        return NextResponse.json({
          success: false,
          error: 'Vaikimisi Twilio konfiguratsioon puudub',
          code: 'NO_DEFAULT_CONFIG'
        }, { status: 404 })
      }
      throw configError
    }

    // Return config without sensitive data in logs
    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        account_sid: config.account_sid,
        auth_token: config.auth_token,
        api_key: config.api_key,
        api_secret: config.api_secret,
        phone_number: config.phone_number,
        twiml_app_sid: config.twiml_app_sid,
        webhook_url: config.webhook_url,
        friendly_name: config.friendly_name
      }
    })

  } catch (error: any) {
    console.error('Error fetching user Twilio config:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Konfiguratsiooni laadimine ebaõnnestus',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Kasutaja pole autenditud'
      }, { status: 401 })
    }

    // Validate required fields
    const { account_sid, auth_token, phone_number, friendly_name, api_key, api_secret, twiml_app_sid } = body
    
    if (!account_sid || !auth_token || !phone_number) {
      return NextResponse.json({
        success: false,
        error: 'Account SID, Auth Token ja telefoni number on kohustuslikud'
      }, { status: 400 })
    }

    // Check if user already has a default config
    const { data: existingConfig } = await supabase
      .from('user_twilio_configs')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .eq('is_active', true)
      .single()

    // Prepare the configuration data
    const configData = {
      user_id: user.id,
      account_sid: account_sid.trim(),
      auth_token: auth_token.trim(),
      phone_number: phone_number.trim(),
      friendly_name: friendly_name?.trim() || 'My Twilio Configuration',
      api_key: api_key?.trim() || null,
      api_secret: api_secret?.trim() || null,
      twiml_app_sid: twiml_app_sid?.trim() || null,
      is_default: !existingConfig, // Set as default if no existing default config
      is_active: true,
      created_via_connect: false
    }

    // Insert the new configuration
    const { data: newConfig, error: insertError } = await supabase
      .from('user_twilio_configs')
      .insert([configData])
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting Twilio config:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Konfiguratsiooni salvestamine ebaõnnestus',
        details: insertError.message
      }, { status: 500 })
    }

    console.log('✅ Twilio configuration saved successfully:', {
      id: newConfig.id,
      user_id: user.id,
      friendly_name: newConfig.friendly_name,
      phone_number: newConfig.phone_number,
      is_default: newConfig.is_default
    })

    return NextResponse.json({
      success: true,
      config: {
        id: newConfig.id,
        account_sid: newConfig.account_sid,
        phone_number: newConfig.phone_number,
        friendly_name: newConfig.friendly_name,
        is_default: newConfig.is_default
      },
      message: 'Twilio konfiguratsioon edukalt salvestatud'
    })

  } catch (error: any) {
    console.error('Error saving Twilio config:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Konfiguratsiooni salvestamine ebaõnnestus',
      details: error.message
    }, { status: 500 })
  }
}