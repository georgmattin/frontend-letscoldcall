import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET - Check Google Calendar integration
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 API: Starting calendar check...')
    
    const supabase = await createClient()
    console.log('✅ API: Supabase client created')
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('👤 API: User check:', user ? 'Found' : 'Not found', 'Error:', authError)
    
    if (authError || !user) {
      console.log('❌ API: Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get Google Calendar integration
    console.log('🔍 API: Checking for integration...')
    const { data: integration, error: dbError } = await supabase
      .from('google_calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    
    console.log('📊 API: Integration query result:', integration ? 'Found' : 'Not found', 'Error:', dbError)
    
    if (!integration) {
      console.log('📭 API: No integration found')
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 404 })
    }
    
    console.log('✅ API: Integration found:', integration.google_email)
    
    // Return basic integration info for now
    return NextResponse.json({
      calendars: [{ id: 'primary', summary: 'Primary Calendar', primary: true }],
      events: [],
      integration: {
        email: integration.google_email,
        name: integration.google_name
      }
    })
    
  } catch (error) {
    console.error('❌ API: Google Calendar fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 })
  }
}

// POST - Create calendar event
export async function POST(request: NextRequest) {
  try {
    console.log('📅 API: Creating calendar event...')
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('❌ API: Unauthorized for creating event')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get event data from request
    const eventData = await request.json()
    console.log('📝 API: Event data received:', {
      title: eventData.title,
      startDate: eventData.startDate,
      startTime: eventData.startTime,
      contactName: eventData.contactInfo?.name
    })

    // Get user's Google Calendar integration
    const { data: integration, error: dbError } = await supabase
      .from('google_calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!integration) {
      console.log('📭 API: No Google Calendar integration found')
      return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 404 })
    }

    // Check if token is expired and refresh if needed
    const now = new Date()
    const tokenExpiry = new Date(integration.token_expiry)
    
    let accessToken = integration.access_token

    if (now >= tokenExpiry) {
      console.log('🔄 API: Refreshing expired token...')
      // Refresh token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      const tokens = await refreshResponse.json()
      
      if (tokens.access_token) {
        accessToken = tokens.access_token
        
        // Update tokens in database
        await supabase
          .from('google_calendar_integrations')
          .update({
            access_token: tokens.access_token,
            token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          
        console.log('✅ API: Token refreshed successfully')
      } else {
        console.error('❌ API: Failed to refresh token:', tokens)
        return NextResponse.json({ error: 'Failed to refresh Google token' }, { status: 401 })
      }
    }

    // Format event for Google Calendar API
    const startDateTime = `${eventData.startDate}T${eventData.startTime}:00`
    const endDateTime = eventData.endDate && eventData.endTime 
      ? `${eventData.endDate}T${eventData.endTime}:00`
      : `${eventData.startDate}T${eventData.startTime}:00`

    const calendarEvent = {
      summary: eventData.title,
      description: eventData.description || '',
      start: {
        dateTime: startDateTime,
        timeZone: 'Europe/Tallinn'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Europe/Tallinn'
      },
      attendees: eventData.attendees ? [{ email: eventData.attendees }] : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 },
          { method: 'email', minutes: 60 }
        ]
      }
    }

    console.log('📅 API: Creating event in Google Calendar...')
    
    // Create event in Google Calendar
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarEvent),
      }
    )

    const calendarResult = await calendarResponse.json()

    if (calendarResponse.ok) {
      console.log('✅ API: Event created successfully:', calendarResult.id)
      return NextResponse.json({
        success: true,
        event: {
          id: calendarResult.id,
          title: calendarResult.summary,
          start: calendarResult.start,
          end: calendarResult.end,
          link: calendarResult.htmlLink
        }
      })
    } else {
      console.error('❌ API: Google Calendar API error:', calendarResult)
      return NextResponse.json({ 
        error: 'Failed to create event in Google Calendar',
        details: calendarResult
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ API: Error creating calendar event:', error)
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 })
  }
}

// DELETE - Disconnect Google Calendar
export async function DELETE(request: NextRequest) {
  try {
    console.log('🔄 API: Disconnecting Google Calendar...')
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log('❌ API: Unauthorized for disconnect')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Deactivate the integration (don't delete it in case we want to reconnect)
    const { error: updateError } = await supabase
      .from('google_calendar_integrations')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('❌ API: Error disconnecting Google Calendar:', updateError)
      return NextResponse.json({ error: 'Failed to disconnect Google Calendar' }, { status: 500 })
    }

    console.log('✅ API: Google Calendar disconnected successfully')
    return NextResponse.json({ 
      success: true,
      message: 'Google Calendar disconnected successfully' 
    })

  } catch (error) {
    console.error('❌ API: Error disconnecting Google Calendar:', error)
    return NextResponse.json({ error: 'Failed to disconnect Google Calendar' }, { status: 500 })
  }
} 