import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      return NextResponse.json({ 
        message: 'User already has an active subscription',
        subscription_id: existingSubscription.id 
      })
    }

    // Get the starter test package
    const { data: starterPackage, error: packageError } = await supabase
      .from('package_types')
      .select('id')
      .eq('package_name', 'starter_test')
      .eq('is_active', true)
      .single()

    if (packageError || !starterPackage) {
      console.error('Error finding starter package:', packageError)
      return NextResponse.json({ error: 'Starter package not found' }, { status: 404 })
    }

    // Create subscription for user
    const { data: newSubscription, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        package_id: starterPackage.id,
        status: 'active',
        is_default: true,
        subscription_start_date: new Date().toISOString(),
        billing_cycle_start: new Date().toISOString().split('T')[0], // Current date
        billing_cycle_end: new Date(new Date().setMonth(new Date().getMonth() + 1, 0)).toISOString().split('T')[0] // End of month
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError)
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      subscription: newSubscription,
      message: 'Starter package assigned successfully'
    })

  } catch (error) {
    console.error('Error assigning default package:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 