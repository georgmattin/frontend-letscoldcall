import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Retrieve user profile data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('caller_name, company_name, first_name, last_name, email, phone_number, position')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // If no profile exists, return default values
    if (!profile) {
      return NextResponse.json({
        caller_name: '',
        company_name: '',
        first_name: '',
        last_name: '',
        email: user.email || '',
        phone_number: '',
        position: ''
      })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Error in GET /api/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update user profile data
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { caller_name, company_name, first_name, last_name, phone_number, position } = body

    // Validate required fields for script variables
    if (!caller_name?.trim()) {
      return NextResponse.json({ error: 'Caller name is required for script variables' }, { status: 400 })
    }

    if (!company_name?.trim()) {
      return NextResponse.json({ error: 'Company name is required for script variables' }, { status: 400 })
    }

    // Update or insert profile
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        caller_name: caller_name.trim(),
        company_name: company_name.trim(),
        first_name: first_name?.trim() || null,
        last_name: last_name?.trim() || null,
        phone_number: phone_number?.trim() || null,
        position: position?.trim() || null,
        email: user.email,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      profile: data
    })
  } catch (error) {
    console.error('Error in PUT /api/profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 