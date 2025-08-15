import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the most recent subscription (active or canceled) to find Stripe customer ID
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id, created_at, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'canceled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // If no subscription with a Stripe customer is found, return empty list (not an error for UI)
    if (subError || !subscription?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] }, { status: 200 })
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 20,
      status: 'paid', // Only show paid invoices
    })

    // Format invoices for frontend
    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency.toUpperCase(),
      date: new Date(invoice.created * 1000).toISOString(),
      status: invoice.status,
      description: invoice.description || `Invoice ${invoice.number}`,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    }))

    return NextResponse.json({ invoices: formattedInvoices })
  } catch (error) {
    console.error('Error fetching Stripe invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}
