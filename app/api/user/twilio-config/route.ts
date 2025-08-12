import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    // Get user's Twilio config
    const { data: config, error: configError } = await supabase
      .from('user_twilio_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single()

    if (configError) {
      if (configError.code === 'PGRST116') {
        return NextResponse.json({ 
          success: false, 
          error: 'Configuration not found' 
        }, { status: 404 })
      }
      throw configError
    }

    return NextResponse.json({
      success: true,
      config
    })

  } catch (error) {
    console.error('Error getting Twilio config:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const config = await request.json()

    // Validate required fields
    const requiredFields = ['account_sid', 'auth_token', 'api_key', 'api_secret']
    const missingFields = requiredFields.filter(field => !config[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 })
    }

    // First deactivate any existing default configs
    await supabase
      .from('user_twilio_configs')
      .update({ 
        is_default: false,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('is_default', true)

    // Create or update config
    const { data: savedConfig, error: saveError } = await supabase
      .from('user_twilio_configs')
      .upsert({
        user_id: user.id,
        account_sid: config.account_sid,
        auth_token: config.auth_token,
        api_key: config.api_key,
        api_secret: config.api_secret,
        phone_number: config.phone_number || null,
        twiml_app_sid: config.twiml_app_sid || null,
        webhook_url: config.webhook_url || null,
        friendly_name: config.friendly_name || `${user.email}'s Twilio Config`,
        is_default: true,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) {
      throw saveError
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      config: savedConfig
    })

  } catch (error) {
    console.error('Error saving Twilio config:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
} 