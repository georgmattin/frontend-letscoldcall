import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const accountSid = searchParams.get('AccountSid')
    const error = searchParams.get('error')
    const state = searchParams.get('state') // This can contain user session info

    console.log('Twilio Connect authorize callback:', {
      accountSid,
      error,
      state,
      url: request.url
    })

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User not authenticated:', userError)
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
    }

    if (error) {
      console.error('Twilio Connect authorization error:', error)
      return NextResponse.redirect(new URL('/settings?error=twilio_connect_denied', request.url))
    }

    if (!accountSid) {
      console.error('No AccountSid received from Twilio')
      return NextResponse.redirect(new URL('/settings?error=no_account_sid', request.url))
    }

    // Get the Connect App info
    const { data: connectApp, error: connectAppError } = await supabase
      .from('twilio_connect_apps')
      .select('*')
      .limit(1)
      .single()

    if (connectAppError || !connectApp) {
      console.error('Connect App not found:', connectAppError)
      return NextResponse.redirect(new URL('/settings?error=connect_app_not_found', request.url))
    }

    // Store the authorized account
    const { error: insertError } = await supabase
      .from('user_twilio_connect_accounts')
      .upsert({
        user_id: user.id,
        connect_app_id: connectApp.id,
        account_sid: accountSid,
        friendly_name: `Twilio Account ${accountSid.slice(-8)}`,
        is_active: true,
        authorized_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,account_sid',
        ignoreDuplicates: false
      })

    if (insertError) {
      console.error('Failed to store authorized account:', insertError)
      return NextResponse.redirect(new URL('/settings?error=storage_failed', request.url))
    }

    console.log('Successfully stored Twilio Connect authorization for user:', user.id)
    
    // Redirect to settings with success message
    return NextResponse.redirect(new URL('/settings?success=twilio_connected', request.url))

  } catch (error) {
    console.error('Authorize endpoint error:', error)
    return NextResponse.redirect(new URL('/settings?error=server_error', request.url))
  }
} 