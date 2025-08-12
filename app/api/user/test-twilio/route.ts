import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import twilio from 'twilio'

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

    // Test Twilio connection
    const client = twilio(config.account_sid, config.auth_token)
    
    try {
      const account = await client.api.v2010.accounts(config.account_sid).fetch()
      
      return NextResponse.json({
        success: true,
        message: 'Connection test successful',
        account: {
          friendlyName: account.friendlyName,
          status: account.status,
          type: account.type,
          phoneNumber: config.phone_number
        }
      })
    } catch (twilioError: any) {
      return NextResponse.json({
        success: false,
        error: twilioError.message || 'Failed to connect to Twilio'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error testing Twilio connection:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
} 