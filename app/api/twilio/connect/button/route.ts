import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    console.log('Connect button endpoint called')

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User authentication failed:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User authenticated:', user.id)

    // Get the Connect App info
    const { data: connectApp, error: connectAppError } = await supabase
      .from('twilio_connect_apps')
      .select('*')
      .limit(1)
      .single()

    console.log('Connect App query result:', { connectApp, connectAppError })

    if (connectAppError || !connectApp) {
      console.error('Connect App not found:', connectAppError)
      return NextResponse.json({ 
        error: 'Connect App not configured',
        details: connectAppError?.message 
      }, { status: 404 })
    }

    if (!connectApp.connect_app_sid) {
      console.error('Connect App SID missing')
      return NextResponse.json({ 
        error: 'Connect App SID not configured' 
      }, { status: 404 })
    }

    // Use the correct Twilio authorization URL format
    const state = encodeURIComponent(user.id) // Pass user ID as state
    const connectUrl = `https://www.twilio.com/authorize/${connectApp.connect_app_sid}?state=${state}`

    console.log('Generated connect URL:', connectUrl)

    // Generate the HTML for the Connect button using Twilio's style
    const buttonHtml = `
      <style type="text/css">
        .twilio-connect-button { 
          display: flex; 
          justify-content: center; 
          align-items: center; 
          background: #F22F46; 
          width: 180px; 
          height: 36px; 
          padding-right: 5px; 
          color: white; 
          border: none; 
          border-radius: 4px; 
          text-decoration: none; 
          font-size: 14px; 
          font-weight: 600; 
          line-height: 20px; 
        }
        .icon { margin-top: 4px; width: 40px; }
      </style>
      <a href="${connectUrl}" class="twilio-connect-button" target="_blank">
        <span class="icon">
          <img src="data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCA2MCI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiNmZmY7fTwvc3R5bGU+PC9kZWZzPgoJPHRpdGxlPnR3aWxpby1sb2dvbWFyay13aGl0ZUFydGJvYXJkIDE8L3RpdGxlPgoJPHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMzAsMTVBMTUsMTUsMCwxLDAsNDUsMzAsMTUsMTUsMCwwLDAsMzAsMTVabTAsMjZBMTEsMTEsMCwxLDEsNDEsMzAsMTEsMTEsMCwwLDEsMzAsNDFabTYuOC0xNC43YTMuMSwzLjEsMCwxLDEtMy4xLTMuMUEzLjEyLDMuMTIsMCwwLDEsMzYuOCwyNi4zWm0wLDcuNGEzLjEsMy4xLDAsMSwxLTMuMS0zLjFBMy4xMiwzLjEyLDAsMCwxLDM2LjgsMzMuN1ptLTcuNCwwYTMuMSwzLjEsMCwxLDEtMy4xLTMuMUEzLjEyLDMuMTIsMCwwLDEsMjkuNCwzMy43Wm0wLTcuNGEzLjEsMy4xLDAsMSwxLTMuMS0zLjFBMy4xMiwzLjEyLDAsMCwxLDI5LjQsMjYuM1oiLz4KPC9zdmc+" />
        </span>
        Twilio Connect App
      </a>
    `

    return NextResponse.json({
      success: true,
      connectUrl,
      buttonHtml,
      connectAppSid: connectApp.connect_app_sid
    })

  } catch (error) {
    console.error('Connect button endpoint error:', error)
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 