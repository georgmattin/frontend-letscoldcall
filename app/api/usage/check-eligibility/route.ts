import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import twilio from 'twilio';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Kontrollime kasutaja kõneminutite õigusi...');
    
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Kasutaja pole autenditud:', authError?.message);
      return NextResponse.json({
        success: false,
        error: 'Kasutaja pole autenditud',
        canMakeCall: false
      }, { status: 401 });
    }

    console.log('👤 Kontrollime kasutajat:', user.email);

    // Get user's active subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        package_id,
        status,
        billing_cycle_start,
        billing_cycle_end,
        package_types (
          package_name,
          package_display_name,
          monthly_call_minutes,
          monthly_cost,
          per_minute_cost,
          max_concurrent_calls
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      console.error('❌ Aktiivset tellimust ei leitud:', subError?.message);
      return NextResponse.json({
        success: false,
        error: 'Aktiivset tellimust ei leitud',
        message: 'Palun valige endale sobiv pakett',
        canMakeCall: false,
        needsSubscription: true
      }, { status: 404 });
    }

    console.log('📦 Leitud tellimus:', subscription.package_types?.package_name);

    // Get Twilio config for call minutes
    let usedMinutes = 0;
    try {
      // Get user's Twilio config
      const { data: twilioConfig, error: configError } = await supabase
        .from('user_twilio_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (configError || !twilioConfig) {
        console.log('⚠️ No Twilio config found, using 0 minutes');
      } else {
        // Calculate current month date range
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endDate = tomorrow;

        console.log('Twilio date range:', { 
          startDate: startDate.toISOString().split('T')[0], 
          endDate: endDate.toISOString().split('T')[0] 
        });

        // Use Twilio API directly
        const client = twilio(twilioConfig.account_sid, twilioConfig.auth_token);

        // Fetch calls for this month
        const calls = await client.calls.list({
          startTimeAfter: startDate,
          startTimeBefore: endDate,
          limit: 1000
        });

        console.log('🔍 Twilio calls found:', calls.length);

        // Calculate total call time (excluding browser connections)
        let totalCallTime = 0;
        calls.forEach((call: any) => {
          // Skip browser connections (client: calls)
          const isRealCall = !call.from.includes('client:');
          if (!isRealCall) return;

          const duration = parseInt(call.duration) || 0;
          const durationMinutes = duration / 60;
          totalCallTime += durationMinutes;
        });

        usedMinutes = Math.round(totalCallTime * 10) / 10; // Round to 1 decimal
        console.log('✅ Total Twilio call minutes:', usedMinutes);
      }
    } catch (error) {
      console.error('Error fetching Twilio call minutes:', error);
      console.log('⚠️ Using 0 call minutes due to error');
    }

    // Calculate usage
    const packageMinutes = subscription.package_types?.monthly_call_minutes || 0;
    const remainingMinutes = Math.max(0, packageMinutes - usedMinutes);
    const usagePercentage = packageMinutes > 0 ? (usedMinutes / packageMinutes) * 100 : 0;

    // Check if user can make calls
    const canMakeCall = packageMinutes === 999999 || remainingMinutes > 0; // Unlimited package or has minutes left
    const isUnlimited = packageMinutes === 999999;

    console.log('📊 Kasutuse statistika:', {
      packageMinutes,
      usedMinutes,
      remainingMinutes,
      usagePercentage: usagePercentage.toFixed(1) + '%',
      canMakeCall
    });

    const response = {
      success: true,
      canMakeCall,
      isUnlimited,
      packageInfo: {
        name: subscription.package_types?.package_display_name,
        monthlyMinutes: packageMinutes,
        maxConcurrentCalls: subscription.package_types?.max_concurrent_calls || 1
      },
      usage: {
        currentMonthUsed: usedMinutes,
        remainingMinutes: isUnlimited ? 'Unlimited' : remainingMinutes,
        usagePercentage: isUnlimited ? 0 : usagePercentage,
        overage: Math.max(0, usedMinutes - packageMinutes),
        overageCost: Math.max(0, usedMinutes - packageMinutes) * parseFloat(subscription.package_types?.per_minute_cost?.toString() || '0')
      },
      billingCycle: {
        start: subscription.billing_cycle_start,
        end: subscription.billing_cycle_end
      },
      warnings: []
    };

    // Add warnings based on usage
    if (!isUnlimited) {
      if (usagePercentage >= 90) {
        response.warnings.push('Olete kasutanud üle 90% oma kuulimiidist');
      } else if (usagePercentage >= 75) {
        response.warnings.push('Olete kasutanud üle 75% oma kuulimiidist');
      }
      
      if (usedMinutes > packageMinutes) {
        response.warnings.push(`Teil on üleliigseid minuteid: ${(usedMinutes - packageMinutes).toFixed(1)} min`);
      }
    }

    console.log(`✅ Kasutuse kontroll lõpetatud (${Date.now() - startTime}ms)`);
    
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Viga kasutuse kontrollimisel:', error);
    
    return NextResponse.json({
      success: false,
      error: error?.message || 'Serveri viga kasutuse kontrollimisel',
      message: 'Viga kasutuse kontrollimisel. Palun proovige hiljem uuesti.',
      canMakeCall: false,
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { estimatedMinutes = 1 } = await request.json();
    console.log(`🔍 Kontrollime kas saab teha ${estimatedMinutes} minutilist kõnet...`);
    
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Kasutaja pole autenditud',
        message: 'Palun logige uuesti sisse',
        canMakeCall: false
      }, { status: 401 });
    }

    // Get current eligibility
    const eligibilityResponse = await fetch(new URL('/api/usage/check-eligibility', request.url), {
      method: 'GET',
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      }
    });

    if (!eligibilityResponse.ok) {
      const errorData = await eligibilityResponse.json();
      return NextResponse.json({
        success: false,
        error: errorData.error || 'Kasutuse kontroll ebaõnnestus',
        message: errorData.message || 'Viga kasutuse kontrollimisel',
        canMakeCall: false,
        details: errorData.details || 'Unknown error'
      }, { status: eligibilityResponse.status });
    }

    const eligibility = await eligibilityResponse.json();
    
    if (!eligibility.success) {
      return NextResponse.json({
        ...eligibility,
        message: eligibility.message || 'Viga kasutuse kontrollimisel'
      });
    }

    // Check if estimated call would exceed limits
    const wouldExceedLimit = !eligibility.isUnlimited && 
      typeof eligibility.usage.remainingMinutes === 'number' && 
      estimatedMinutes > eligibility.usage.remainingMinutes;

    console.log(`✅ Minutite kontroll lõpetatud (${Date.now() - startTime}ms)`);
    
    return NextResponse.json({
      ...eligibility,
      canMakeCall: eligibility.canMakeCall && !wouldExceedLimit,
      wouldExceedLimit,
      estimatedMinutes
    });

  } catch (error: any) {
    console.error('❌ Viga kasutuse kontrollimisel:', error);
    
    return NextResponse.json({
      success: false,
      error: error?.message || 'Serveri viga kasutuse kontrollimisel',
      message: 'Viga kasutuse kontrollimisel. Palun proovige hiljem uuesti.',
      canMakeCall: false,
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
} 