import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const accountSid = formData.get('AccountSid') as string
    const connectAppSid = formData.get('ConnectAppSid') as string

    console.log('Twilio Connect deauthorize callback:', {
      accountSid,
      connectAppSid
    })

    if (!accountSid) {
      console.error('No AccountSid in deauthorize request')
      return NextResponse.json({ error: 'Missing AccountSid' }, { status: 400 })
    }

    const supabase = await createClient()

    // Mark the account as deauthorized
    const { error: updateError } = await supabase
      .from('user_twilio_connect_accounts')
      .update({
        is_active: false,
        deauthorized_at: new Date().toISOString()
      })
      .eq('account_sid', accountSid)

    if (updateError) {
      console.error('Failed to update deauthorized account:', updateError)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }

    console.log('Successfully deauthorized account:', accountSid)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Deauthorize endpoint error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Also handle GET requests in case Twilio sends GET instead of POST
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const accountSid = searchParams.get('AccountSid')
    const connectAppSid = searchParams.get('ConnectAppSid')

    console.log('Twilio Connect deauthorize GET callback:', {
      accountSid,
      connectAppSid
    })

    if (!accountSid) {
      console.error('No AccountSid in deauthorize request')
      return NextResponse.json({ error: 'Missing AccountSid' }, { status: 400 })
    }

    const supabase = await createClient()

    // Mark the account as deauthorized
    const { error: updateError } = await supabase
      .from('user_twilio_connect_accounts')
      .update({
        is_active: false,
        deauthorized_at: new Date().toISOString()
      })
      .eq('account_sid', accountSid)

    if (updateError) {
      console.error('Failed to update deauthorized account:', updateError)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }

    console.log('Successfully deauthorized account:', accountSid)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Deauthorize GET endpoint error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
} 