import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')
  
  if (error) {
    return NextResponse.redirect(new URL('/my-account?error=google_auth_failed', request.url))
  }
  
  if (!code) {
    // Start OAuth flow - need to check if user is authenticated first
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return NextResponse.redirect(new URL('/login?error=authentication_required', request.url))
      }
      
                // Store user ID in state parameter for later retrieval
          const client_id = process.env.GOOGLE_CLIENT_ID
          const redirect_uri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/google-calendar/auth`
          const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
          const stateData = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64')
      
      const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
        `client_id=${client_id}&` +
        `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
        `scope=${encodeURIComponent(scope)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(stateData)}`
      
      return NextResponse.redirect(authUrl)
    } catch (err) {
      console.error('Auth check error:', err)
      return NextResponse.redirect(new URL('/login?error=authentication_required', request.url))
    }
  }
  
  try {
    console.log('🔄 OAuth: Starting token exchange...')
    
    // Decode state to get user ID
    let userId: string
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        userId = stateData.userId
        console.log('👤 OAuth: User ID from state:', userId)
      } catch (err) {
        console.error('❌ OAuth: Invalid state parameter:', err)
        throw new Error('Invalid state parameter')
      }
    } else {
      console.error('❌ OAuth: Missing state parameter')
      throw new Error('Missing state parameter')
    }
    
    // Exchange code for tokens
    console.log('🔄 OAuth: Exchanging code for tokens...')
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/google-calendar/auth`,
        grant_type: 'authorization_code',
      }),
    })
    
    const tokens = await tokenResponse.json()
    console.log('🔑 OAuth: Token response:', { 
      has_access_token: !!tokens.access_token, 
      has_refresh_token: !!tokens.refresh_token,
      expires_in: tokens.expires_in
    })
    
    if (!tokens.access_token) {
      console.error('❌ OAuth: No access token received:', tokens)
      throw new Error('Failed to get access token')
    }
    
    // Get user info from Google
    console.log('🔄 OAuth: Fetching user info from Google...')
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })
    
    const userInfo = await userInfoResponse.json()
    console.log('👤 OAuth: Google user info:', { email: userInfo.email, name: userInfo.name })
    
    // Use service role to save tokens to database
    console.log('🔄 OAuth: Creating Supabase admin client...')
    const { createClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    console.log('⚠️ OAuth: Make sure google_calendar_integrations table exists in Supabase!')
    
    // Save integration data
    console.log('🔄 OAuth: Saving integration to database...')
    const integrationData = {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      google_email: userInfo.email,
      google_name: userInfo.name,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('💾 OAuth: Integration data to save:', { 
      user_id: integrationData.user_id,
      google_email: integrationData.google_email,
      google_name: integrationData.google_name
    })
    
    const saveResult = await supabaseAdmin
      .from('google_calendar_integrations')
      .upsert(integrationData)
    
    console.log('💾 OAuth: Save result:', saveResult)
    
    if (saveResult.error) {
      console.error('❌ OAuth: Database save error:', saveResult.error)
      throw new Error(`Database save failed: ${saveResult.error.message}`)
    }
    
    console.log('✅ OAuth: Integration saved successfully!')
    return NextResponse.redirect(new URL('/my-account?tab=integrations&success=google_calendar_connected', request.url))
    
  } catch (error) {
    console.error('Google Calendar auth error:', error)
    return NextResponse.redirect(new URL('/my-account?error=google_auth_failed', request.url))
  }
} 