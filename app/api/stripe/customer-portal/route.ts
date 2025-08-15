import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    let { customerId, returnUrl } = body as { customerId?: string; returnUrl?: string }

    // If customerId not provided by client, try to resolve from DB using the authenticated user
    if (!customerId) {
      console.log('ℹ️ No customerId provided, resolving from latest user_subscriptions')
      const { data: latestSub, error: latestSubErr } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id, created_at, status')
        .eq('user_id', user.id)
        .not('stripe_customer_id', 'is', null)
        .in('status', ['active', 'canceled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestSubErr) {
        console.error('❌ Failed to read latest subscription:', latestSubErr)
      }

      if (latestSub?.stripe_customer_id) {
        customerId = latestSub.stripe_customer_id
        console.log('✅ Resolved stripe_customer_id from DB')
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required and could not be resolved' }, { status: 400 })
    }

    // Create Stripe customer portal session
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const origin = host ? `${proto}://${host}` : (request.headers.get('origin') || '')
    const safeReturnUrl = returnUrl || (origin ? `${origin}/settings?tab=billing` : undefined)

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: safeReturnUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating customer portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    )
  }
}
