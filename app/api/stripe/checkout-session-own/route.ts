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
      console.error('Missing IDs:', missingIds)
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

    const { packageId } = await request.json()

    if (!packageId) {
      return NextResponse.json({
        success: false,
        error: 'Package ID is required'
      }, { status: 400 })
    }

    // Define package details with Price IDs (for own Twilio - no phone number costs)
    const packages = {
      basic_own: { 
        name: 'Basic Package (Own Twilio)', 
        priceId: stripeConfig.ownPriceIds.basic_own
      },
      standard_own: { 
        name: 'Standard Package (Own Twilio)', 
        priceId: stripeConfig.ownPriceIds.standard_own
      },
      premium_own: { 
        name: 'Premium Package (Own Twilio)', 
        priceId: stripeConfig.ownPriceIds.premium_own
      }
    }

    // Validate package selection
    if (!packageId || !packages[packageId as keyof typeof packages]) {
      return NextResponse.json({
        success: false,
        error: 'Invalid package selected'
      }, { status: 400 })
    }

    const selectedPackage = packages[packageId as keyof typeof packages]
    if (!selectedPackage || !selectedPackage.priceId) {
      return NextResponse.json({
        success: false,
        error: 'Invalid package ID or missing price configuration'
      }, { status: 400 })
    }

    // Create Stripe checkout session (only package subscription, no phone number costs)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPackage.priceId, // Use predefined Price ID
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
        flow_type: 'own_twilio', // Mark this as own Twilio flow
      },
    })

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
