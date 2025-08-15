import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Use the main system Twilio account for number rentals
function getMainTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Main Twilio configuration not found');
  }

  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    {
      timeout: 30000,
      region: 'us1'
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Check if we're in test mode
    const isTestMode = process.env.MODE === 'test';
    console.log(`🔧 Purchase endpoint called. Mode: ${isTestMode ? 'TEST' : 'PRODUCTION'}`);
    
    const body = await request.json();
    const { packageId, phoneNumberSelectionId, stripeSessionId, stripeSubscriptionId, stripeCustomerId, user_id: webhookUserId } = body;
    
    // Check if request is from webhook (has Authorization header)
    const authHeader = request.headers.get('Authorization');
    const isWebhookRequest = authHeader && authHeader.includes('webhook');
    
    let supabase;
    let user;
    
    if (isWebhookRequest) {
      console.log('🔗 Request from webhook - using service role');
      // Use service role to bypass RLS
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      if (!webhookUserId) {
        return NextResponse.json({
          success: false,
          error: 'user_id required for webhook requests'
        }, { status: 400 });
      }
      
      // Get user by ID from webhook
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(webhookUserId);
      if (userError || !userData.user) {
        return NextResponse.json({
          success: false,
          error: 'Invalid user_id from webhook'
        }, { status: 400 });
      }
      user = userData.user;
      
    } else {
      console.log('👤 Regular user request - using session');
      // Regular user request - use session
      supabase = await createClient();
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !sessionUser) {
        return NextResponse.json({
          success: false,
          error: 'Kasutaja pole autenditud'
        }, { status: 401 });
      }
             user = sessionUser;
     }

    if (!packageId || !phoneNumberSelectionId) {
      return NextResponse.json({
        success: false,
        error: 'Package ID and phone number selection ID are required'
      }, { status: 400 });
    }

    // Get the specific paid phone number selection
    const { data: selection, error: selectionError } = await supabase
      .from('phone_number_selections')
      .select('*')
      .eq('id', phoneNumberSelectionId)
      .eq('user_id', user.id)
      .eq('status', 'paid')
      .single();

    if (selectionError || !selection) {
      return NextResponse.json({
        success: false,
        error: 'Paid phone number selection not found. Payment may not have completed yet.'
      }, { status: 400 });
    }

    const phoneNumber = selection.phone_number;
    const friendlyName = selection.friendly_name;

    // Define package details (support current package ids from Stripe metadata)
    const packages = {
      // legacy/test ids
      starter_test: { name: 'Basic', price: 29.99 },
      professional: { name: 'Professional', price: 79.99 },
      enterprise: { name: 'Enterprise', price: 199.99 },
      // current internal package names
      basic: { name: 'Basic', price: 29.99 },
      standard: { name: 'Standard', price: 59.99 },
      premium: { name: 'Premium', price: 99.99 },
      // own twilio variants
      basic_own: { name: 'Basic (Own)', price: 19.99 },
      standard_own: { name: 'Standard (Own)', price: 39.99 },
      premium_own: { name: 'Premium (Own)', price: 79.99 },
    } as const;

    // Graceful fallback: if unknown id, store the raw id as name and skip price enforcement
    const selectedPackage = (packages as any)[packageId] || { name: String(packageId), price: null };

    // Get user's existing subaccount (should already exist)
    const { data: existingSubaccount, error: subaccountError } = await supabase
      .from('user_subaccounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('subaccount_status', 'active')
      .single();

    if (subaccountError || !existingSubaccount) {
      return NextResponse.json({
        success: false,
        error: 'Subaccount not found. Please go back and create one first.'
      }, { status: 400 });
    }

    const subaccountSid = existingSubaccount.subaccount_sid;

    let incomingPhoneNumber;
    
    if (isTestMode) {
      // Test mode: simulate number purchase without actually buying from Twilio
      console.log('🧪 TEST MODE: Simulating phone number purchase for', phoneNumber);
      
      incomingPhoneNumber = {
        sid: `PN${Math.random().toString(36).substr(2, 30)}`, // Generate fake SID
        phoneNumber: phoneNumber,
        friendlyName: friendlyName || `Rented ${phoneNumber}`,
        accountSid: subaccountSid,
        voiceApplicationSid: existingSubaccount.twiml_app_sid,
        smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms`,
        dateCreated: new Date(),
        dateUpdated: new Date()
      };
      
      console.log('✅ TEST MODE: Simulated number purchase successful');
    } else {
      // Production mode: actually purchase the number from Twilio
      const client = getMainTwilioClient();
      // Use subaccount context for purchase
      const subaccount = client.api.accounts(subaccountSid);
      
      incomingPhoneNumber = await subaccount.incomingPhoneNumbers.create({
        phoneNumber: phoneNumber,
        friendlyName: friendlyName || `Rented ${phoneNumber}`,
        voiceApplicationSid: existingSubaccount.twiml_app_sid, // Use the TwiML app we created
        smsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms`,
        smsMethod: 'POST'
      });
    }

    // Save rental info to database
    const { data: rental, error: rentalError } = await supabase
      .from('rented_phone_numbers')
      .insert({
        user_id: user.id,
        subaccount_id: existingSubaccount.id,
        phone_number: phoneNumber,
        phone_number_sid: incomingPhoneNumber.sid,
        friendly_name: friendlyName || `Rented ${phoneNumber}`,
        rental_status: 'active',
        rental_start_date: new Date().toISOString(),
        rental_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
        monthly_cost: selection.monthly_price, // Use actual monthly cost
        setup_cost: selection.setup_price, // Use actual setup cost
        package_id: packageId,
        package_name: selectedPackage.name,
        package_price: selectedPackage.price,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId || selection.stripe_customer_id,
        locality: selection.locality,
        region: selection.region,
        country: selection.country,
        notes: isTestMode ? 'TEST MODE: Simulated purchase' : null
      })
      .select()
      .single();

    if (rentalError) {
      console.error('Error saving rental info:', rentalError);
      
      // Try to clean up the purchased number (only in production mode)
      if (!isTestMode) {
        try {
          const client = getMainTwilioClient();
          await client.incomingPhoneNumbers(incomingPhoneNumber.sid).remove();
          console.log('🧹 Cleaned up purchased number after database error');
        } catch (cleanupError) {
          console.error('Error cleaning up purchased number:', cleanupError);
        }
      } else {
        console.log('🧪 TEST MODE: Skipping number cleanup (was simulated)');
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to save rental information'
      }, { status: 500 });
    }

    // Save user's Twilio configuration to use the subaccount
    const { error: configError } = await supabase
      .from('user_twilio_configs')
      .upsert({
        user_id: user.id,
        account_sid: subaccountSid,
        auth_token: existingSubaccount.api_secret,
        api_key: existingSubaccount.api_key,
        api_secret: existingSubaccount.api_secret,
        twiml_app_sid: existingSubaccount.twiml_app_sid,
        phone_number: phoneNumber,
        friendly_name: `Rented Number Config`,
        is_default: true,
        is_active: true
      });

    if (configError) {
      console.error('Error saving Twilio config:', configError);
    }

    // Update the selection status to purchased
    await supabase
      .from('phone_number_selections')
      .update({
        status: 'purchased',
        purchased_at: new Date().toISOString(),
        rental_id: rental.id,
        stripe_session_id: stripeSessionId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId || selection.stripe_customer_id
      })
      .eq('id', selection.id);

    // Update user profile to indicate they're using rented numbers
    await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        twilio_config_preference: 'own',
        use_own_twilio_config: true,
        phone_number_preference: 'rent'
      });

    return NextResponse.json({
      success: true,
      phoneNumber: {
        sid: incomingPhoneNumber.sid,
        phoneNumber: incomingPhoneNumber.phoneNumber,
        friendlyName: incomingPhoneNumber.friendlyName,
        subaccountSid: subaccountSid,
        rentalId: rental.id,
        status: 'rented',
        testMode: isTestMode
      },
      message: isTestMode 
        ? `🧪 TEST MODE: Number ${phoneNumber} simulated successfully! (No real purchase made)`
        : `Number ${phoneNumber} successfully rented and configured!`,
      testMode: isTestMode
    });

  } catch (error: any) {
    console.error('Error renting phone number:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to rent phone number'
    }, { status: 500 });
  }
} 