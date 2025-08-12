import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('⚡ REAALAJAS KASUTUSE SALVESTAMINE alustatud...');
    
    const { 
      callSid, 
      duration, 
      phoneNumber, 
      direction = 'outbound',
      callStatus = 'completed'
    } = await request.json();

    if (!callSid || !duration || !phoneNumber) {
      console.error('❌ Puuduvad kohustuslikud parameetrid:', { callSid, duration, phoneNumber });
      return NextResponse.json({
        success: false,
        error: 'Puuduvad kohustuslikud parameetrid: callSid, duration, phoneNumber'
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Kasutaja pole autenditud:', authError?.message);
      return NextResponse.json({
        success: false,
        error: 'Kasutaja pole autenditud'
      }, { status: 401 });
    }

    console.log('👤 Salvestame kasutust kasutajale:', user.email);
    console.log('📞 Kõne andmed:', { callSid, duration, phoneNumber, direction, callStatus });

    // Find the rental record for this phone number and user
    const { data: rental, error: rentalError } = await supabase
      .from('rented_phone_numbers')
      .select(`
        id,
        user_id,
        subaccount_id,
        phone_number,
        rental_status
      `)
      .eq('phone_number', phoneNumber)
      .eq('user_id', user.id)
      .eq('rental_status', 'active')
      .single();

    if (rentalError || !rental) {
      console.error('❌ Aktiivseid üüritud numbreid ei leitud:', rentalError?.message);
      return NextResponse.json({
        success: false,
        error: 'Telefoni number ei ole üüritud või pole aktiivne'
      }, { status: 404 });
    }

    console.log('✅ Leitud telefoni number:', rental.phone_number);

    // Calculate call minutes (round up)
    const callDurationSeconds = parseInt(duration.toString());
    const callMinutes = Math.ceil(callDurationSeconds / 60);
    const isOutbound = direction === 'outbound';

    console.log('📊 Kõne statistika:', {
      kestusSekundites: callDurationSeconds,
      minuteid: callMinutes,
      väljuvKõne: isOutbound
    });

    // Get current date info
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
    const usageDate = now.toISOString().slice(0, 10); // YYYY-MM-DD format

    // Get user's active subscription first
    const { data: subscription, error: subError } = await supabase
      .from('user_call_subscriptions')
      .select(`
        id,
        package_id,
        status,
        billing_cycle_start,
        billing_cycle_end,
        call_packages (
          package_name,
          package_display_name,
          monthly_minutes,
          per_minute_cost
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('is_default', true)
      .single();

    if (subError || !subscription) {
      console.error('❌ Aktiivset tellimust ei leitud:', subError?.message);
      return NextResponse.json({
        success: false,
        error: 'Kasutajal pole aktiivset tellimust'
      }, { status: 404 });
    }

    console.log('📦 Kasutaja pakett:', subscription.call_packages?.package_name);

    // Update/create daily usage tracking
    const { data: existingUsage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', user.id)
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
          user_id: user.id,
          subaccount_id: rental.subaccount_id,
          phone_number_id: rental.id,
          usage_date: usageDate,
          usage_month: currentMonth,
          voice_calls_made: isOutbound ? 1 : 0,
          voice_calls_received: isOutbound ? 0 : 1,
          voice_minutes_outbound: isOutbound ? callMinutes : 0,
          voice_minutes_inbound: isOutbound ? 0 : callMinutes,
          voice_cost_outbound: isOutbound ? callMinutes * 0.0075 : 0,
          voice_cost_inbound: isOutbound ? 0 : callMinutes * 0.0075,
          total_cost: callMinutes * 0.0075
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Uue kasutuse kirje loomine ebaõnnestus:', createError);
        return NextResponse.json({
          success: false,
          error: 'Kasutuse kirje loomine ebaõnnestus'
        }, { status: 500 });
      }
      dailyUsageRecord = newRecord;
    } else if (!usageError && existingUsage) {
      // Update existing daily usage record
      const updateData = {
        voice_calls_made: existingUsage.voice_calls_made + (isOutbound ? 1 : 0),
        voice_calls_received: existingUsage.voice_calls_received + (isOutbound ? 0 : 1),
        voice_minutes_outbound: parseFloat(existingUsage.voice_minutes_outbound || '0') + (isOutbound ? callMinutes : 0),
        voice_minutes_inbound: parseFloat(existingUsage.voice_minutes_inbound || '0') + (isOutbound ? 0 : callMinutes),
        voice_cost_outbound: parseFloat(existingUsage.voice_cost_outbound || '0') + (isOutbound ? callMinutes * 0.0075 : 0),
        voice_cost_inbound: parseFloat(existingUsage.voice_cost_inbound || '0') + (isOutbound ? 0 : callMinutes * 0.0075),
        updated_at: new Date().toISOString()
      };

      updateData.total_cost = updateData.voice_cost_outbound + updateData.voice_cost_inbound + 
        parseFloat(existingUsage.sms_cost_outbound || '0') + parseFloat(existingUsage.sms_cost_inbound || '0') +
        parseFloat(existingUsage.mms_cost_outbound || '0') + parseFloat(existingUsage.mms_cost_inbound || '0') +
        parseFloat(existingUsage.recording_cost || '0');

      const { data: updatedRecord, error: updateError } = await supabase
        .from('usage_tracking')
        .update(updateData)
        .eq('id', existingUsage.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Kasutuse kirje uuendamine ebaõnnestus:', updateError);
        return NextResponse.json({
          success: false,
          error: 'Kasutuse kirje uuendamine ebaõnnestus'
        }, { status: 500 });
      }
      dailyUsageRecord = updatedRecord;
    } else {
      console.error('❌ Kasutuse kirje laadimine ebaõnnestus:', usageError);
      return NextResponse.json({
        success: false,
        error: 'Kasutuse kirje laadimine ebaõnnestus'
      }, { status: 500 });
    }

    console.log('✅ Päevane kasutus uuendatud');

    // Update/create monthly usage
    const { data: monthlyUsage, error: monthlyError } = await supabase
      .from('user_monthly_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_id', subscription.id)
      .gte('usage_month', currentMonth + '-01')
      .lt('usage_month', new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10))
      .single();

    let newTotalMinutes;
    const packageMinutes = subscription.call_packages?.monthly_minutes || 0;

    if (monthlyError && monthlyError.code === 'PGRST116') {
      // Create new monthly usage record
      newTotalMinutes = callMinutes;
      
      console.log('🆕 Loome uue kuupõhise kasutuse kirje...');
      const { error: createMonthlyError } = await supabase
        .from('user_monthly_usage')
        .insert({
          user_id: user.id,
          subscription_id: subscription.id,
          usage_month: currentMonth + '-01',
          total_minutes_used: newTotalMinutes,
          total_calls_made: isOutbound ? 1 : 0,
          total_calls_received: isOutbound ? 0 : 1,
          package_monthly_minutes: packageMinutes,
          overage_minutes: Math.max(0, newTotalMinutes - packageMinutes),
          overage_cost: Math.max(0, newTotalMinutes - packageMinutes) * parseFloat(subscription.call_packages?.per_minute_cost?.toString() || '0.02')
        });

      if (createMonthlyError) {
        console.error('❌ Kuupõhise kasutuse loomine ebaõnnestus:', createMonthlyError);
      } else {
        console.log('✅ Uus kuupõhine kasutuse kirje loodud');
      }
    } else if (!monthlyError && monthlyUsage) {
      // Update existing monthly usage record
      newTotalMinutes = parseFloat(monthlyUsage.total_minutes_used.toString()) + callMinutes;
      
      const { error: updateMonthlyError } = await supabase
        .from('user_monthly_usage')
        .update({
          total_minutes_used: newTotalMinutes,
          total_calls_made: monthlyUsage.total_calls_made + (isOutbound ? 1 : 0),
          total_calls_received: monthlyUsage.total_calls_received + (isOutbound ? 0 : 1),
          overage_minutes: Math.max(0, newTotalMinutes - packageMinutes),
          overage_cost: Math.max(0, newTotalMinutes - packageMinutes) * parseFloat(subscription.call_packages?.per_minute_cost?.toString() || '0.02'),
          last_updated: new Date().toISOString()
        })
        .eq('id', monthlyUsage.id);

      if (updateMonthlyError) {
        console.error('❌ Kuupõhise kasutuse uuendamine ebaõnnestus:', updateMonthlyError);
      } else {
        console.log('✅ Kuupõhine kasutus uuendatud');
      }
    }

    // Update phone number stats
    const { error: phoneUpdateError } = await supabase
      .from('rented_phone_numbers')
      .update({
        last_used_at: new Date().toISOString(),
        total_calls: (rental.total_calls || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', rental.id);

    if (phoneUpdateError) {
      console.error('❌ Telefoni numbri uuendamine ebaõnnestus:', phoneUpdateError);
    }

    // Calculate current usage status
    const isUnlimited = packageMinutes === 999999;
    const remainingMinutes = isUnlimited ? 999999 : Math.max(0, packageMinutes - (newTotalMinutes || callMinutes));
    const usagePercentage = isUnlimited ? 0 : ((newTotalMinutes || callMinutes) / packageMinutes) * 100;
    const hasExceededLimit = !isUnlimited && (newTotalMinutes || callMinutes) > packageMinutes;

    console.log(`✅ Kasutuse salvestamine lõpetatud (${Date.now() - startTime}ms):`, {
      callSid,
      minuteid: callMinutes,
      kokku: newTotalMinutes || callMinutes,
      paketis: packageMinutes,
      jäänud: remainingMinutes,
      üleliigne: hasExceededLimit
    });

    return NextResponse.json({
      success: true,
      usage: {
        callMinutes,
        totalMonthlyMinutes: newTotalMinutes || callMinutes,
        packageMinutes,
        remainingMinutes: isUnlimited ? 'Unlimited' : remainingMinutes,
        usagePercentage: Math.round(usagePercentage * 10) / 10,
        hasExceededLimit,
        isUnlimited,
        overage: Math.max(0, (newTotalMinutes || callMinutes) - packageMinutes),
        overageCost: Math.max(0, (newTotalMinutes || callMinutes) - packageMinutes) * parseFloat(subscription.call_packages?.per_minute_cost?.toString() || '0.02')
      },
      call: {
        sid: callSid,
        duration: callDurationSeconds,
        minutes: callMinutes,
        direction,
        status: callStatus
      },
      warnings: usagePercentage >= 90 && !isUnlimited ? ['Olete kasutanud üle 90% oma kuulimiidist'] : []
    });

  } catch (error: any) {
    console.error('❌ Viga kasutuse salvestamisel:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Serveri viga kasutuse salvestamisel',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Kasutuse salvestamise endpoint GET kutse');
    
    return NextResponse.json({
      message: 'Kasutuse salvestamise endpoint töötab',
      endpoints: {
        POST: 'Salvesta kõne kasutus reaalajas',
        parameters: ['callSid', 'duration', 'phoneNumber', 'direction?', 'callStatus?']
      }
    });
    
  } catch (error: any) {
    console.error('❌ Viga GET endpointis:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Serveri viga'
    }, { status: 500 });
  }
} 