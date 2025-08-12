import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

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

    const { 
      phoneNumber, 
      friendlyName, 
      pricing, 
      locality, 
      region, 
      country, 
      capabilities 
    } = await request.json()

    // Save selected number to database
    const { data, error: insertError } = await supabase
      .from('phone_number_selections')
      .insert({
        user_id: user.id,
        phone_number: phoneNumber,
        friendly_name: friendlyName,
        locality,
        region,
        country,
        capabilities,
        monthly_price: pricing.monthlyPrice,
        setup_price: pricing.setupPrice,
        currency: pricing.currency,
        price_unit: pricing.priceUnit,
        status: 'selected', // selected, purchased, cancelled
        selected_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving phone number selection:', insertError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save number selection' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Phone number selected successfully',
      selection: data,
      selectionId: data.id
    })

  } catch (error) {
    console.error('Error in select number endpoint:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
} 