import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('📊 KASUTUSE WEBHOOK SAADUD! Alustame kasutuse jälgimist...');
    
    const formData = await request.formData();
    
    // Extract Twilio webhook data
    const callSid = formData.get('CallSid') as string;
    const accountSid = formData.get('AccountSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string;
    const direction = formData.get('Direction') as string;
    const duration = formData.get('CallDuration') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingDuration = formData.get('RecordingDuration') as string;
    
    // SMS specific fields
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const numMedia = formData.get('NumMedia') as string;
    
    // For status callbacks, we need the original call/message SID
    const originalSid = callSid || messageSid;
    
    console.log('📊 Webhook andmed:', {
      callSid,
      accountSid,
      from,
      to,
      callStatus,
      direction,
      duration,
      messageSid,
      messageStatus,
      originalSid
    });

    if (!originalSid || !accountSid) {
      console.error('❌ Puuduvad webhook parameetrid:', { originalSid, accountSid });
      return NextResponse.json({
        success: false,
        error: 'Required webhook parameters missing'
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Find the phone number and user from the subaccount
    let phoneNumber = to;
    let isOutbound = direction === 'outbound';
    
    if (isOutbound) {
      phoneNumber = from;
    }

    console.log('📞 Otsingime telefoni numbrit:', phoneNumber, '(suund:', direction + ')');

    // Get the rental record for this phone number
    const { data: rental, error: rentalError } = await supabase
      .from('rented_phone_numbers')
      .select(`
        id,
        user_id,
        subaccount_id,
        phone_number,
        rental_status,
        total_calls,
        total_sms
      `)
      .eq('phone_number', phoneNumber)
      .eq('rental_status', 'active')
      .single();

    if (rentalError || !rental) {
      console.error('❌ Telefoni numbrit ei leitud meie andmebaasist:', rentalError?.message || 'No rental found');
      return NextResponse.json({
        success: false,
        error: 'Phone number not found in our system'
      }, { status: 404 });
    }

    console.log('✅ Leitud kasutaja:', rental.user_id, 'telefoni number:', rental.phone_number);

    // Get current month for tracking
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
    const usageDate = now.toISOString().slice(0, 10); // YYYY-MM-DD format

    // Get or create daily usage tracking record
    const { data: usageRecord, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', rental.user_id)
      .eq('subaccount_id', rental.subaccount_id)
      .eq('phone_number_id', rental.id)
      .eq('usage_date', usageDate)
      .eq('usage_month', currentMonth)
      .single();

    let dailyUsageRecord;
    if (usageError && usageError.code === 'PGRST116') {
      // Create new daily usage record
      console.log('🆕 Loome uue päevase kasutuse kirje...');
      const { data: newRecord, error: createError } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: rental.user_id,
          subaccount_id: rental.subaccount_id,
          phone_number_id: rental.id,
          usage_date: usageDate,
          usage_month: currentMonth
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Uue kasutuse kirje loomine ebaõnnestus:', createError);
        return NextResponse.json({ success: false }, { status: 500 });
      }
      dailyUsageRecord = newRecord;
    } else if (usageError) {
      console.error('❌ Kasutuse kirje laadimine ebaõnnestus:', usageError);
      return NextResponse.json({ success: false }, { status: 500 });
    } else {
      dailyUsageRecord = usageRecord;
    }

    // Prepare update data for daily usage
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    let callMinutes = 0;
    let shouldUpdateMonthly = false;

    if (callSid && (callStatus === 'completed' || callStatus === 'busy' || callStatus === 'no-answer')) {
      // Voice call completed
      const callDuration = parseInt(duration || '0');
      callMinutes = Math.ceil(callDuration / 60); // Round up to nearest minute
      
      console.log('📞 Kõne lõppes:', {
        callStatus,
        callDuration,
        callMinutes,
        isOutbound
      });
      
      if (isOutbound) {
        updateData.voice_calls_made = (dailyUsageRecord.voice_calls_made || 0) + 1;
        updateData.voice_minutes_outbound = parseFloat(dailyUsageRecord.voice_minutes_outbound || '0') + callMinutes;
        // Estimate cost - you might want to get actual cost from Twilio API
        updateData.voice_cost_outbound = parseFloat(dailyUsageRecord.voice_cost_outbound || '0') + (callMinutes * 0.0075); // $0.0075 per minute estimate
      } else {
        updateData.voice_calls_received = (dailyUsageRecord.voice_calls_received || 0) + 1;
        updateData.voice_minutes_inbound = parseFloat(dailyUsageRecord.voice_minutes_inbound || '0') + callMinutes;
        updateData.voice_cost_inbound = parseFloat(dailyUsageRecord.voice_cost_inbound || '0') + (callMinutes * 0.0075);
      }

      shouldUpdateMonthly = true;

      // Handle recording if present
      if (recordingUrl && recordingDuration) {
        const recDuration = parseInt(recordingDuration);
        const recMinutes = Math.ceil(recDuration / 60);
        updateData.recording_minutes = parseFloat(dailyUsageRecord.recording_minutes || '0') + recMinutes;
        updateData.recording_cost = parseFloat(dailyUsageRecord.recording_cost || '0') + (recMinutes * 0.0025); // $0.0025 per minute estimate
        
        console.log('🎙️ Salvestus lisatud:', {
          recordingDuration: recDuration,
          recordingMinutes: recMinutes
        });
      }
    }

    if (messageSid && messageStatus === 'delivered') {
      // SMS/MMS delivered
      const mediaCount = parseInt(numMedia || '0');
      
      console.log('💬 SMS/MMS edastatud:', {
        messageStatus,
        mediaCount,
        isOutbound
      });
      
      if (mediaCount > 0) {
        // MMS
        if (isOutbound) {
          updateData.mms_sent = (dailyUsageRecord.mms_sent || 0) + 1;
          updateData.mms_cost_outbound = parseFloat(dailyUsageRecord.mms_cost_outbound || '0') + 0.0075; // $0.0075 per MMS estimate
        } else {
          updateData.mms_received = (dailyUsageRecord.mms_received || 0) + 1;
          updateData.mms_cost_inbound = parseFloat(dailyUsageRecord.mms_cost_inbound || '0') + 0.0075;
        }
      } else {
        // SMS
        if (isOutbound) {
          updateData.sms_sent = (dailyUsageRecord.sms_sent || 0) + 1;
          updateData.sms_cost_outbound = parseFloat(dailyUsageRecord.sms_cost_outbound || '0') + 0.0075; // $0.0075 per SMS estimate
        } else {
          updateData.sms_received = (dailyUsageRecord.sms_received || 0) + 1;
          updateData.sms_cost_inbound = parseFloat(dailyUsageRecord.sms_cost_inbound || '0') + 0.0075;
        }
      }

      shouldUpdateMonthly = true;
    }

    // Calculate total cost
    updateData.total_cost = 
      parseFloat(updateData.voice_cost_outbound || dailyUsageRecord.voice_cost_outbound || '0') +
      parseFloat(updateData.voice_cost_inbound || dailyUsageRecord.voice_cost_inbound || '0') +
      parseFloat(updateData.sms_cost_outbound || dailyUsageRecord.sms_cost_outbound || '0') +
      parseFloat(updateData.sms_cost_inbound || dailyUsageRecord.sms_cost_inbound || '0') +
      parseFloat(updateData.mms_cost_outbound || dailyUsageRecord.mms_cost_outbound || '0') +
      parseFloat(updateData.mms_cost_inbound || dailyUsageRecord.mms_cost_inbound || '0') +
      parseFloat(updateData.recording_cost || dailyUsageRecord.recording_cost || '0');

    // Update the daily usage tracking record
    const { error: updateError } = await supabase
      .from('usage_tracking')
      .update(updateData)
      .eq('id', dailyUsageRecord.id);

    if (updateError) {
      console.error('❌ Päevase kasutuse uuendamine ebaõnnestus:', updateError);
      return NextResponse.json({ success: false }, { status: 500 });
    }

    console.log('✅ Päevane kasutus uuendatud edukalt');

    // Update monthly usage if needed
    if (shouldUpdateMonthly && callMinutes > 0) {
      console.log('📊 Uuendame kuupõhist kasutust...');
      
      // Get user's active subscription
      const { data: subscription, error: subError } = await supabase
        .from('user_call_subscriptions')
        .select('id, package_id, call_packages(monthly_minutes)')
        .eq('user_id', rental.user_id)
        .eq('status', 'active')
        .eq('is_default', true)
        .single();

      if (!subError && subscription) {
        const packageMinutes = Array.isArray((subscription as any).call_packages)
          ? (((subscription as any).call_packages[0]?.monthly_minutes) || 0)
          : (((subscription as any).call_packages?.monthly_minutes) || 0);
        // Get or create monthly usage record
        const { data: monthlyUsage, error: monthlyError } = await supabase
          .from('user_monthly_usage')
          .select('*')
          .eq('user_id', rental.user_id)
          .eq('subscription_id', subscription.id)
          .gte('usage_month', currentMonth + '-01')
          .lt('usage_month', new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10))
          .single();

        if (monthlyError && monthlyError.code === 'PGRST116') {
          // Create new monthly usage record
          console.log('🆕 Loome uue kuupõhise kasutuse kirje...');
          const { error: createMonthlyError } = await supabase
            .from('user_monthly_usage')
            .insert({
              user_id: rental.user_id,
              subscription_id: subscription.id,
              usage_month: currentMonth + '-01',
              total_minutes_used: callMinutes,
              total_calls_made: isOutbound ? 1 : 0,
              total_calls_received: isOutbound ? 0 : 1,
              package_monthly_minutes: packageMinutes,
              overage_minutes: Math.max(0, callMinutes - packageMinutes),
              overage_cost: Math.max(0, callMinutes - packageMinutes) * 0.02 // $0.02 per overage minute
            });

          if (createMonthlyError) {
            console.error('❌ Kuupõhise kasutuse kirje loomine ebaõnnestus:', createMonthlyError);
          } else {
            console.log('✅ Uus kuupõhine kasutuse kirje loodud');
          }
        } else if (!monthlyError && monthlyUsage) {
          // Update existing monthly usage record
          const newTotalMinutes = parseFloat(monthlyUsage.total_minutes_used.toString()) + callMinutes;
          
          const { error: updateMonthlyError } = await supabase
            .from('user_monthly_usage')
            .update({
              total_minutes_used: newTotalMinutes,
              total_calls_made: monthlyUsage.total_calls_made + (isOutbound ? 1 : 0),
              total_calls_received: monthlyUsage.total_calls_received + (isOutbound ? 0 : 1),
              overage_minutes: Math.max(0, newTotalMinutes - packageMinutes),
              overage_cost: Math.max(0, newTotalMinutes - packageMinutes) * 0.02,
              last_updated: new Date().toISOString()
            })
            .eq('id', monthlyUsage.id);

          if (updateMonthlyError) {
            console.error('❌ Kuupõhise kasutuse uuendamine ebaõnnestus:', updateMonthlyError);
          } else {
            console.log('✅ Kuupõhine kasutus uuendatud:', {
              uusKokku: newTotalMinutes,
              paketis: packageMinutes,
              üleliigne: Math.max(0, newTotalMinutes - packageMinutes)
            });
          }
        }
      } else {
        console.log('⚠️ Aktiivset tellimust ei leitud kuupõhise kasutuse jaoks');
      }
    }

    // Update the phone number's last used timestamp and usage counters
    const phoneUpdateData: any = {
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (callSid) {
      phoneUpdateData.total_calls = (rental.total_calls || 0) + 1;
    }
    
    if (messageSid) {
      phoneUpdateData.total_sms = (rental.total_sms || 0) + 1;
    }

    const { error: phoneUpdateError } = await supabase
      .from('rented_phone_numbers')
      .update(phoneUpdateData)
      .eq('id', rental.id);

    if (phoneUpdateError) {
      console.error('❌ Telefoni numbri statistika uuendamine ebaõnnestus:', phoneUpdateError);
      // Continue - this is not critical
    }

    console.log(`✅ Kasutuse jälgimine lõpetatud edukalt (${Date.now() - startTime}ms):`, {
      phoneNumber,
      callSid,
      messageSid,
      direction,
      status: callStatus || messageStatus,
      minutesUsed: callMinutes
    });

    return NextResponse.json({ 
      success: true,
      processed: {
        callSid,
        messageSid,
        minutesTracked: callMinutes,
        phoneNumber: rental.phone_number,
        userId: rental.user_id
      }
    });

  } catch (error: any) {
    console.error("❌ Viga kasutuse webhook'i töötlemisel:", error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Webhook processing failed'
    }, { status: 500 });
  }
} 