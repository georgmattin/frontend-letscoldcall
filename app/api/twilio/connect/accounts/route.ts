import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get connected accounts with Connect App info
    const { data: accounts, error: accountsError } = await supabase
      .from('user_twilio_connect_accounts')
      .select(`
        *,
        twilio_connect_apps (
          friendly_name,
          company_name,
          connect_app_sid
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('authorized_at', { ascending: false })

    if (accountsError) {
      console.error('Error fetching connected accounts:', accountsError)
      return NextResponse.json({ 
        error: 'Failed to fetch connected accounts',
        details: accountsError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      accounts: accounts || []
    })

  } catch (error) {
    console.error('Connected accounts endpoint error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('id')

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

    // Deactivate the connected account
    const { error: updateError } = await supabase
      .from('user_twilio_connect_accounts')
      .update({ 
        is_active: false,
        deauthorized_at: new Date().toISOString()
      })
      .eq('id', accountId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error deactivating account:', updateError)
      return NextResponse.json({ 
        error: 'Failed to disconnect account',
        details: updateError.message 
      }, { status: 500 })
    }

    // Also deactivate any associated Twilio configs
    const { error: configError } = await supabase
      .from('user_twilio_configs')
      .update({ is_active: false })
      .eq('connect_account_id', accountId)
      .eq('user_id', user.id)

    if (configError) {
      console.error('Error deactivating configs:', configError)
      // Don't fail the request for this, just log it
    }

    return NextResponse.json({
      success: true,
      message: 'Account disconnected successfully'
    })

  } catch (error) {
    console.error('Disconnect account error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 