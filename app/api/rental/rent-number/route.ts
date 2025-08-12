import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Kasutaja pole autenditud'
      }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumberId, subaccountId, rentalMonths = 1, friendlyName } = body;

    if (!phoneNumberId || !subaccountId) {
      return NextResponse.json({
        success: false,
        error: 'Telefoni numbri ID ja subkonto ID on kohustuslikud'
      }, { status: 400 });
    }

    // Verify subaccount belongs to user
    const { data: subaccount, error: subaccountError } = await supabase
      .from('user_subaccounts')
      .select('*')
      .eq('id', subaccountId)
      .eq('user_id', user.id)
      .eq('subaccount_status', 'active')
      .single();

    if (subaccountError || !subaccount) {
      return NextResponse.json({
        success: false,
        error: 'Subkonto ei leitud või pole aktiivne'
      }, { status: 404 });
    }

    // Get phone number from inventory
    const { data: inventoryNumber, error: inventoryError } = await supabase
      .from('phone_number_inventory')
      .select('*')
      .eq('id', phoneNumberId)
      .eq('availability_status', 'available')
      .single();

    if (inventoryError || !inventoryNumber) {
      return NextResponse.json({
        success: false,
        error: 'Telefoni number pole saadaval'
      }, { status: 404 });
    }

    // Reserve the number temporarily to prevent race conditions
    const { error: reserveError } = await supabase
      .from('phone_number_inventory')
      .update({
        availability_status: 'reserved',
        reserved_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        reserved_for_user_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', phoneNumberId)
      .eq('availability_status', 'available');

    if (reserveError) {
      return NextResponse.json({
        success: false,
        error: 'Numbri reserveerimisel tekkis viga'
      }, { status: 500 });
    }

    try {
      // Purchase number in Twilio subaccount
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        throw new Error('Twilio konfiguratsioon puudub');
      }

      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      // Create the number in the subaccount
      const twilioNumber = await client.incomingPhoneNumbers.create({
        phoneNumber: inventoryNumber.phone_number,
        friendlyName: friendlyName || `Rented ${inventoryNumber.phone_number}`,
        voiceUrl: subaccount.webhook_url || `${process.env.WEBHOOK_URL}/api/voice`,
        voiceMethod: 'POST',
        smsUrl: subaccount.webhook_url || `${process.env.WEBHOOK_URL}/api/sms`,
        smsMethod: 'POST',
        statusCallback: `${process.env.WEBHOOK_URL}/api/voice-status`,
        statusCallbackMethod: 'POST'
      }, { accountSid: subaccount.subaccount_sid });

      // Calculate rental dates
      const rentalStartDate = new Date();
      const rentalEndDate = new Date(rentalStartDate);
      rentalEndDate.setMonth(rentalEndDate.getMonth() + rentalMonths);

      // Calculate total cost
      const setupCost = parseFloat(inventoryNumber.setup_cost || '0');
      const monthlyCost = parseFloat(inventoryNumber.monthly_cost || '1');
      const totalCost = setupCost + (monthlyCost * rentalMonths);

      // Create rental record
      const { data: rentalRecord, error: rentalError } = await supabase
        .from('rented_phone_numbers')
        .insert({
          user_id: user.id,
          subaccount_id: subaccountId,
          phone_number: inventoryNumber.phone_number,
          phone_number_sid: twilioNumber.sid,
          friendly_name: friendlyName || `Rented ${inventoryNumber.phone_number}`,
          phone_number_type: inventoryNumber.phone_number_type,
          country_code: inventoryNumber.country_code,
          area_code: inventoryNumber.area_code,
          city: inventoryNumber.city,
          region: inventoryNumber.region,
          rental_status: 'active',
          rental_start_date: rentalStartDate.toISOString(),
          rental_end_date: rentalEndDate.toISOString(),
          monthly_cost: monthlyCost,
          setup_cost: setupCost,
          voice_url: subaccount.webhook_url || `${process.env.WEBHOOK_URL}/api/voice`,
          sms_url: subaccount.webhook_url || `${process.env.WEBHOOK_URL}/api/sms`,
          voice_enabled: inventoryNumber.voice_enabled,
          sms_enabled: inventoryNumber.sms_enabled,
          mms_enabled: inventoryNumber.mms_enabled,
          fax_enabled: inventoryNumber.fax_enabled,
          purchase_date: rentalStartDate.toISOString()
        })
        .select()
        .single();

      if (rentalError) {
        console.error('Rental record creation error:', rentalError);
        
        // Try to release the Twilio number if rental record creation failed
        try {
          await client.incomingPhoneNumbers(twilioNumber.sid).remove();
        } catch (releaseError) {
          console.error('Error releasing Twilio number:', releaseError);
        }
        
        throw new Error('Üüri kirje loomine ebaõnnestus');
      }

      // Mark number as rented in inventory
      const { error: updateInventoryError } = await supabase
        .from('phone_number_inventory')
        .update({
          availability_status: 'rented',
          last_rented_at: rentalStartDate.toISOString(),
          times_rented: (inventoryNumber.times_rented || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', phoneNumberId);

      if (updateInventoryError) {
        console.error('Inventory update error:', updateInventoryError);
        // Continue - this is not critical
      }

      // Create initial usage tracking record
      const usageMonth = rentalStartDate.toISOString().substr(0, 7); // YYYY-MM format
      const { error: usageError } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: user.id,
          subaccount_id: subaccountId,
          phone_number_id: rentalRecord.id,
          usage_date: rentalStartDate.toISOString().substr(0, 10), // YYYY-MM-DD
          usage_month: usageMonth
        });

      if (usageError) {
        console.error('Usage tracking creation error:', usageError);
        // Continue - this is not critical
      }

      return NextResponse.json({
        success: true,
        rental: {
          id: rentalRecord.id,
          phoneNumber: rentalRecord.phone_number,
          phoneNumberSid: rentalRecord.phone_number_sid,
          friendlyName: rentalRecord.friendly_name,
          type: rentalRecord.phone_number_type,
          countryCode: rentalRecord.country_code,
          areaCode: rentalRecord.area_code,
          city: rentalRecord.city,
          region: rentalRecord.region,
          status: rentalRecord.rental_status,
          rentalStartDate: rentalRecord.rental_start_date,
          rentalEndDate: rentalRecord.rental_end_date,
          monthlyCost: rentalRecord.monthly_cost,
          setupCost: rentalRecord.setup_cost,
          totalCost: totalCost,
          capabilities: {
            voice: rentalRecord.voice_enabled,
            sms: rentalRecord.sms_enabled,
            mms: rentalRecord.mms_enabled,
            fax: rentalRecord.fax_enabled
          },
          createdAt: rentalRecord.created_at
        }
      });

    } catch (error: any) {
      console.error('Error during rental process:', error);
      
      // Release the reservation
      await supabase
        .from('phone_number_inventory')
        .update({
          availability_status: 'available',
          reserved_until: null,
          reserved_for_user_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', phoneNumberId);

      throw error;
    }

  } catch (error: any) {
    console.error('Error renting phone number:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Telefoni numbri üürimisel tekkis viga'
    }, { status: 500 });
  }
} 