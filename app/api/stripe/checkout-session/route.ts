import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'
import stripeConfig from '@/lib/stripe-config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
})

export async function POST(request: NextRequest) {
  try {
    // Validate Stripe configuration
    const { isValid, missingIds } = stripeConfig.validatePriceIds()
    if (!isValid) {
      console.error('Stripe configuration error:', stripeConfig.getConfigurationErrorMessage())
      return NextResponse.json({
        success: false,
        error: `Stripe configuration incomplete. Missing: ${missingIds.join(', ')}`
      }, { status: 500 })
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const { packageId, phoneNumberSelectionId } = await request.json()

    if (!packageId || !phoneNumberSelectionId) {
      return NextResponse.json({
        success: false,
        error: 'Package ID and phone number selection ID are required'
      }, { status: 400 })
    }

    // Get the selected phone number details
    const { data: selection, error: selectionError } = await supabase
      .from('phone_number_selections')
      .select('*')
      .eq('id', phoneNumberSelectionId)
      .eq('user_id', user.id)
      .eq('status', 'selected')
      .single()

    if (selectionError || !selection) {
      return NextResponse.json({
        success: false,
        error: 'Phone number selection not found'
      }, { status: 404 })
    }

    // Define package details with Price IDs (for rented numbers)
    const packages = {
      basic: { 
        name: 'Basic Package', 
        priceId: stripeConfig.priceIds.basic
      },
      standard: { 
        name: 'Standard Package', 
        priceId: stripeConfig.priceIds.standard
      },
      premium: { 
        name: 'Premium Package', 
        priceId: stripeConfig.priceIds.premium
      }
    }

    // Validate package selection
    if (!packageId || !packages[packageId as keyof typeof packages]) {
      return new Response(JSON.stringify({ error: 'Invalid package selected' }), { status: 400 })
    }

    const selectedPackage = packages[packageId as keyof typeof packages]
    if (!selectedPackage || !selectedPackage.priceId) {
      return NextResponse.json({
        success: false,
        error: 'Invalid package ID or missing price configuration'
      }, { status: 400 })
    }

    // Calculate phone number costs
    const phoneNumberSetupFee = selection.setup_price || 1.00
    const phoneNumberMonthlyCost = selection.monthly_price || 5.00

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPackage.priceId, // Use predefined Price ID
          quantity: 1,
        },
        {
          price_data: {
            currency: stripeConfig.currency,
            product_data: {
              name: `Phone Number Setup - ${selection.phone_number}`,
              description: `One-time setup fee for ${selection.phone_number}`,
            },
            unit_amount: Math.round(phoneNumberSetupFee * 100), // Convert to cents
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: stripeConfig.currency,
            product_data: {
              name: `Phone Number Monthly - ${selection.phone_number}`,
              description: `Monthly cost for ${selection.phone_number}`,
            },
            unit_amount: Math.round(phoneNumberMonthlyCost * 100), // Convert to cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        }
      ],
      mode: 'subscription',
      success_url: `${request.headers.get('origin')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/payment/error?cancelled=true`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        package_name: selectedPackage.name,
        phone_number_selection_id: phoneNumberSelectionId,
        phone_number: selection.phone_number,
      },
    })

    // Update selection status to pending payment
    await supabase
      .from('phone_number_selections')
      .update({
        status: 'pending_payment',
        stripe_session_id: session.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', phoneNumberSelectionId)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    })

  } catch (error) {
    console.error('Stripe checkout session error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
} 