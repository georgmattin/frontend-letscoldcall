import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Instantiate Stripe without hardcoding apiVersion to avoid TS literal mismatches
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret)
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Use service role key to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log(`🔔 Stripe webhook received: ${event.type}`, event.id)

  // Handle the event
  switch (event.type) {
    case 'customer.created':
      const customer = event.data.object as Stripe.Customer
      console.log('Customer created:', customer.id, customer.email)
      
      // Note: We'll update with customer_id when we process checkout session
      break

    case 'customer.subscription.created':
      const subscription = event.data.object as Stripe.Subscription
      console.log('Subscription created:', subscription.id, 'for customer:', subscription.customer)
      
      // Note: We'll update with subscription_id when we process checkout session
      break

    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session

      console.log('💳 Payment successful:', session.id)
      console.log('📋 Session metadata:', session.metadata)
      console.log('👤 Customer ID:', session.customer)
      console.log('📄 Subscription ID:', session.subscription)

      try {
        // Get the metadata from the session
        const {
          user_id,
          package_id,
          package_name,
          phone_number_selection_id,
          phone_number
        } = session.metadata!

        // Mark onboarding as completed on successful checkout session
        try {
          const { error: onboardErr } = await supabase
            .from('profiles')
            .update({ onboarding_status: 'yes', updated_at: new Date().toISOString() })
            .eq('id', user_id)
          if (onboardErr) {
            console.error('❌ Failed to set onboarding_status yes in webhook:', onboardErr)
          } else {
            console.log('✅ Onboarding status set to yes for user:', user_id)
          }
        } catch (e) {
          console.error('❌ Unexpected error updating onboarding status in webhook:', e)
        }

        // Update phone number selection with Stripe IDs
        const updateData: any = {
          status: 'paid',
          stripe_session_id: session.id,
          updated_at: new Date().toISOString()
        }

        // Add customer ID if available
        if (session.customer) {
          updateData.stripe_customer_id = typeof session.customer === 'string' 
            ? session.customer 
            : session.customer.id
        }

        // Add subscription ID if available
        if (session.subscription) {
          updateData.stripe_subscription_id = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id
        }

        console.log('🔄 Updating phone_number_selections with:', updateData)
        console.log('🎯 For selection ID:', phone_number_selection_id)

        // First, check if the record exists
        const { data: existingRecord, error: findError } = await supabase
          .from('phone_number_selections')
          .select('*')
          .eq('id', phone_number_selection_id)
          .single()

        if (findError || !existingRecord) {
          console.error('❌ Record not found:', findError, phone_number_selection_id)
        } else {
          console.log('📋 Found existing record:', existingRecord)
        }

        const { data, error } = await supabase
          .from('phone_number_selections')
          .update(updateData)
          .eq('id', phone_number_selection_id)
          .select()

        if (error) {
          console.error('❌ Error updating phone_number_selections:', error)
        } else {
          console.log('✅ Successfully updated phone_number_selections:', data)
          console.log('📊 Updated rows count:', data.length)
        }

        // Get package type ID
        const { data: packageType, error: packageError } = await supabase
          .from('package_types')
          .select('id')
          .eq('package_name', package_id)
          .single()

        if (packageError || !packageType) {
          console.error('❌ Error finding package type:', packageError)
          throw new Error('Package type not found')
        }

        // Create or update user subscription
        const now = new Date()
        const nextMonth = new Date(now)
        nextMonth.setMonth(now.getMonth() + 1)

        const subscriptionData = {
          user_id,
          package_id: packageType.id,
          stripe_customer_id: updateData.stripe_customer_id,
          stripe_subscription_id: updateData.stripe_subscription_id,
          status: 'active',
          is_default: true,
          subscription_start_date: now.toISOString(),
          subscription_end_date: nextMonth.toISOString(),
          billing_cycle_start: now.toISOString().split('T')[0],
          billing_cycle_end: nextMonth.toISOString().split('T')[0],
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        }

        // First deactivate any existing default subscriptions
        await supabase
          .from('user_subscriptions')
          .update({ is_default: false, status: 'inactive', updated_at: new Date().toISOString() })
          .eq('user_id', user_id)
          .eq('is_default', true)

        // Create new subscription
        const { data: subscription, error: subError } = await supabase
          .from('user_subscriptions')
          .insert(subscriptionData)
          .select()
          .single()

        if (subError) {
          console.error('❌ Error creating subscription:', subError)
          throw new Error('Failed to create subscription')
        }

        console.log('✅ Successfully created subscription:', subscription.id)

        // Initialize usage tracking for the new subscription
        const periodEnd = new Date(nextMonth)
        periodEnd.setSeconds(-1)

        const usageData = {
          user_id,
          subscription_id: subscription.id,
          period_start: now.toISOString(),
          period_end: periodEnd.toISOString(),
          call_minutes_used: 0,
          recordings_accessed: 0,
          active_call_scripts: 0,
          active_contact_lists: 0,
          total_contacts: 0,
          transcription_access_used: 0,
          call_summary_generations_used: 0,
          call_suggestions_generations_used: 0,
          script_generations_used: 0,
          objection_generations_used: 0,
          last_updated: now.toISOString(),
          created_at: now.toISOString()
        }

        const { data: usage, error: usageError } = await supabase
          .from('user_package_usage')
          .insert(usageData)
          .select()
          .single()

        if (usageError) {
          console.error('❌ Error initializing usage:', usageError)
          throw new Error('Failed to initialize usage tracking')
        }

        console.log('✅ Successfully initialized usage tracking:', usage.id)

        // Use local URL for internal calls (webhook calling same server)
        const baseUrl = 'http://localhost:3001' // Direct local call
        
        // Trigger the actual phone number purchase
        console.log('🚀 Calling purchase endpoint from webhook...')
        console.log('🔗 Using URL:', `${baseUrl}/api/rent-number/purchase`)
        const purchaseResponse = await fetch(`${baseUrl}/api/rent-number/purchase`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer webhook-${process.env.STRIPE_WEBHOOK_SECRET}`, // Webhook authorization
          },
          body: JSON.stringify({
            packageId: package_id,
            phoneNumberSelectionId: phone_number_selection_id,
            stripeSessionId: session.id,
            stripeSubscriptionId: session.subscription,
            stripeCustomerId: session.customer,
            user_id: user_id // Add user_id for webhook authentication
          })
        })

        if (!purchaseResponse.ok) {
          const errorText = await purchaseResponse.text()
          console.error('Failed to purchase phone number:', errorText)
          
          // Update status to failed
          await supabase
            .from('phone_number_selections')
            .update({
              status: 'purchase_failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', phone_number_selection_id)
        } else {
          console.log('Phone number purchased successfully for session:', session.id)
          
          // Update status to purchased
          await supabase
            .from('phone_number_selections')
            .update({
              status: 'purchased',
              purchased_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', phone_number_selection_id)
        }

      } catch (error) {
        console.error('Error processing completed payment:', error)
        
        // Update status to failed if we have the selection ID
        if (session.metadata?.phone_number_selection_id) {
          await supabase
            .from('phone_number_selections')
            .update({
              status: 'purchase_failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', session.metadata.phone_number_selection_id)
        }
      }
      break

    case 'customer.subscription.updated':
      {
        const subscriptionUpdated = event.data.object as Stripe.Subscription
        console.log('🔄 Subscription updated:', subscriptionUpdated.id, 'Status:', subscriptionUpdated.status)

        // Helper: derive Stripe plan identifiers
        const firstItem = subscriptionUpdated.items?.data?.[0]
        const priceId = firstItem?.price?.id
        const priceNickname = firstItem?.price?.nickname as string | undefined
        const productField = firstItem?.price?.product as string | Stripe.Product | undefined
        const productId = typeof productField === 'string' ? productField : productField?.id

        // Convert Stripe period times to ISO (cast for SDK typing differences)
        const subAny: any = subscriptionUpdated
        const periodStartIso = subAny.current_period_start
          ? new Date(subAny.current_period_start * 1000).toISOString()
          : undefined
        const periodEndIso = subAny.current_period_end
          ? new Date(subAny.current_period_end * 1000).toISOString()
          : undefined

        try {
          // 1) Update rental status based on subscription status
          try {
            const { data: rental } = await supabase
              .from('rented_phone_numbers')
              .select('*')
              .eq('stripe_subscription_id', subscriptionUpdated.id)
              .single()

            if (rental) {
              let rentalStatus = 'active'
              if (
                subscriptionUpdated.status === 'canceled' ||
                subscriptionUpdated.status === 'unpaid' ||
                subscriptionUpdated.status === 'past_due'
              ) {
                rentalStatus = 'suspended'
              }

              await supabase
                .from('rented_phone_numbers')
                .update({
                  rental_status: rentalStatus,
                  updated_at: new Date().toISOString()
                })
                .eq('id', rental.id)

              console.log('📞 Rental status set to', rentalStatus)
            }
          } catch (e) {
            console.error('❌ Rental status update error:', e)
          }

          // 2) Map Stripe plan -> internal package_types.id
          let mappedPackageId: number | null = null
          try {
            // Try by stripe_price_id
            if (priceId) {
              const { data: pkgByPrice, error: pkgPriceErr } = await supabase
                .from('package_types')
                .select('id, package_name, stripe_price_id, stripe_product_id')
                .eq('stripe_price_id', priceId)
                .single()
              if (!pkgPriceErr && pkgByPrice) {
                mappedPackageId = pkgByPrice.id
              }
            }
            // Try by stripe_product_id
            if (!mappedPackageId && productId) {
              const { data: pkgByProduct, error: pkgProdErr } = await supabase
                .from('package_types')
                .select('id, package_name, stripe_price_id, stripe_product_id')
                .eq('stripe_product_id', productId)
                .single()
              if (!pkgProdErr && pkgByProduct) {
                mappedPackageId = pkgByProduct.id
              }
            }
            // Fallback by package_name matching price nickname
            if (!mappedPackageId && priceNickname) {
              const { data: pkgByName, error: pkgNameErr } = await supabase
                .from('package_types')
                .select('id, package_name')
                .eq('package_name', priceNickname)
                .single()
              if (!pkgNameErr && pkgByName) {
                mappedPackageId = pkgByName.id
              }
            }
          } catch (mapErr) {
            console.error('❌ Package mapping error:', mapErr)
          }

          // 3) Update user_subscriptions row for this Stripe subscription
          try {
            const updateFields: any = {
              status: subscriptionUpdated.status, // keep raw Stripe status for transparency
              updated_at: new Date().toISOString()
            }

            if (typeof subscriptionUpdated.cancel_at_period_end === 'boolean') {
              updateFields.cancel_at_period_end = subscriptionUpdated.cancel_at_period_end
              updateFields.canceled_at = subscriptionUpdated.cancel_at_period_end ? new Date().toISOString() : null
            }

            if (periodStartIso && periodEndIso) {
              updateFields.subscription_start_date = periodStartIso
              updateFields.subscription_end_date = periodEndIso
              updateFields.billing_cycle_start = periodStartIso.split('T')[0]
              updateFields.billing_cycle_end = periodEndIso.split('T')[0]
            }

            if (mappedPackageId) {
              updateFields.package_id = mappedPackageId
            }

            const { error: subUpdErr } = await supabase
              .from('user_subscriptions')
              .update(updateFields)
              .eq('stripe_subscription_id', subscriptionUpdated.id)

            if (subUpdErr) {
              console.error('❌ user_subscriptions update failed:', subUpdErr)
            } else {
              console.log('✅ user_subscriptions synced with Stripe subscription update')
            }
          } catch (subErr) {
            console.error('❌ Error syncing user_subscriptions:', subErr)
          }

          // 4) Reactivation case (cancel_at_period_end turned off and status active)
          if (!subscriptionUpdated.cancel_at_period_end && subscriptionUpdated.status === 'active') {
            console.log('✅ Subscription active and not set to cancel at period end')
          }
        } catch (error) {
          console.error('❌ Error handling subscription update:', error)
        }
      }
      break

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription
      
      // Handle subscription cancellation
      console.log('Subscription cancelled:', deletedSubscription.id)
      
      try {
        // Find the rental associated with this subscription
        const { data: rental, error } = await supabase
          .from('rented_phone_numbers')
          .select('*')
          .eq('stripe_subscription_id', deletedSubscription.id)
          .single()

        if (rental && !error) {
          // Update rental status to cancelled
          await supabase
            .from('rented_phone_numbers')
            .update({
              rental_status: 'cancelled',
              rental_end_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', rental.id)

          console.log('Rental cancelled for subscription:', deletedSubscription.id)
        }
      } catch (error) {
        console.error('Error handling subscription cancellation:', error)
      }
      break

    case 'invoice.payment_failed':
      // Cast to any to access subscription field safely across Stripe type versions
      const invoice: any = event.data.object as any
      
      console.log('Payment failed for invoice:', invoice.id)
      
      // Handle failed payment - you might want to notify the user
      // or take action like suspending the service
      try {
        if (invoice.subscription) {
          const { data: rental } = await supabase
            .from('rented_phone_numbers')
            .select('*')
            .eq('stripe_subscription_id', invoice.subscription)
            .single()

          if (rental) {
            await supabase
              .from('rented_phone_numbers')
              .update({
                rental_status: 'suspended',
                updated_at: new Date().toISOString()
              })
              .eq('id', rental.id)

            console.log('Rental suspended due to payment failure for subscription:', invoice.subscription)
          }
        }
      } catch (error) {
        console.error('Error handling payment failure:', error)
      }
      break

    
    case 'invoice.payment_succeeded':
      {
        // Cast for compatibility across Stripe versions
        const invoiceAny: any = event.data.object as any
        console.log('✅ Invoice payment succeeded:', invoiceAny.id)
        try {
          // Resume rental if any
          if (invoiceAny.subscription) {
            const subId = typeof invoiceAny.subscription === 'string' ? invoiceAny.subscription : invoiceAny.subscription?.id
            if (subId) {
              const { data: rental } = await supabase
                .from('rented_phone_numbers')
                .select('*')
                .eq('stripe_subscription_id', subId)
                .single()
              if (rental) {
                await supabase
                  .from('rented_phone_numbers')
                  .update({ rental_status: 'active', updated_at: new Date().toISOString() })
                  .eq('id', rental.id)
                console.log('📞 Rental reactivated after successful payment')
              }

              // Ensure user_subscriptions is active
              const { error: usErr } = await supabase
                .from('user_subscriptions')
                .update({ status: 'active', updated_at: new Date().toISOString() })
                .eq('stripe_subscription_id', subId)
              if (usErr) {
                console.error('❌ Failed to mark user_subscriptions active:', usErr)
              }
            }
          }
        } catch (e) {
          console.error('❌ Error handling payment success:', e)
        }
      }
      break

    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object as Stripe.Subscription
      console.log('🗑️ Subscription deleted/canceled:', subscriptionDeleted.id)
      
      try {
        // Update user_subscriptions table to canceled status
        const { error: cancelError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionDeleted.id)
        
        if (cancelError) {
          console.error('❌ Error marking subscription as canceled:', cancelError)
        } else {
          console.log('✅ Subscription marked as canceled')
          
          // Also suspend any associated phone number rentals
          const { data: rental } = await supabase
            .from('rented_phone_numbers')
            .select('*')
            .eq('stripe_subscription_id', subscriptionDeleted.id)
            .single()
          
          if (rental) {
            await supabase
              .from('rented_phone_numbers')
              .update({
                rental_status: 'suspended',
                updated_at: new Date().toISOString()
              })
              .eq('id', rental.id)
            
            console.log('📞 Phone number rental suspended for canceled subscription')
          }
        }
      } catch (error) {
        console.error('❌ Error handling subscription cancellation:', error)
      }
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return new NextResponse(JSON.stringify({ received: true }), {
    status: 200,
  })
} 