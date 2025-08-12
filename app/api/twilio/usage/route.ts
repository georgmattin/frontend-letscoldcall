import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const twilio = require('twilio');

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Twilio config
    const { data: twilioConfig, error: configError } = await supabase
      .from('user_twilio_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (configError || !twilioConfig) {
      return NextResponse.json({ 
        hasConfig: false,
        message: 'Twilio configuration not found'
      }, { status: 200 });
    }

    // Get date range from query parameters
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    // Set end date to tomorrow to include all of today's calls
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = url.searchParams.get('endDate') || tomorrow.toISOString().split('T')[0];

    try {
      // Initialize Twilio client
      const client = twilio(twilioConfig.account_sid, twilioConfig.auth_token);

      // Fetch all calls for detailed statistics
      const calls = await client.calls.list({
        startTimeAfter: new Date(startDate),
        startTimeBefore: new Date(endDate),
        limit: 1000 // Get more calls for accurate statistics
      });

      console.log('🔍 Twilio calls found:', calls.length);

      // Process calls to get detailed statistics
      const callStats = {
        totalCalls: 0,
        outboundCalls: 0,
        inboundCalls: 0,
        totalCallTime: 0, // in minutes
        outboundCallTime: 0, // in minutes
        inboundCallTime: 0, // in minutes
        totalCost: 0,
        outboundCost: 0,
        inboundCost: 0,
        answeredCalls: 0,
        notAnsweredCalls: 0,
        failedCalls: 0,
        busyCalls: 0
      };

      // Process each call
      calls.forEach((call: any) => {
        // Kontrollime, kas see on päris kõne (mitte brauseri ühendus)
        const isRealCall = !call.from.includes('client:');
        if (!isRealCall) return; // Skipime brauseri ühendused

        const duration = parseInt(call.duration) || 0;
        const durationMinutes = duration / 60;
        const cost = Math.abs(parseFloat(call.price) || 0);
        const isOutbound = call.direction?.includes('outbound') || call.direction === 'outbound-api';
        const isRealInbound = !isOutbound;
        
        // Loendame ainult päris kõnesid
        callStats.totalCalls++;
        callStats.totalCallTime += durationMinutes;
        callStats.totalCost += cost;

        if (isOutbound) {
          callStats.outboundCalls++;
          callStats.outboundCallTime += durationMinutes;
          callStats.outboundCost += cost;
        } else if (isRealInbound) {
          callStats.inboundCalls++;
          callStats.inboundCallTime += durationMinutes;
          callStats.inboundCost += cost;
        }

        // Kategoriseeri kõned staatuse järgi (ainult päris kõned)
        if (call.status === 'completed') {
          callStats.answeredCalls++;
        } else if (call.status === 'no-answer') {
          callStats.notAnsweredCalls++;
        } else if (call.status === 'busy') {
          callStats.busyCalls++;
        } else if (call.status === 'failed' || call.status === 'canceled') {
          callStats.failedCalls++;
        }

        console.log('Processing call:', {
          isRealCall,
          direction: isOutbound ? 'outbound' : 'inbound',
          status: call.status,
          from: call.from,
          to: call.to,
          duration: durationMinutes.toFixed(1) + 'min'
        });

        console.log(`📞 Call: ${call.direction}, ${durationMinutes.toFixed(1)}min, $${cost.toFixed(4)}, ${call.status}`);
      });

      // Format statistics for display
      const aggregatedUsage = {
        voice: {
          outboundCalls: callStats.outboundCalls,
          inboundCalls: callStats.inboundCalls,
          outboundMinutes: Math.round(callStats.outboundCallTime * 10) / 10, // 1 decimal place
          inboundMinutes: Math.round(callStats.inboundCallTime * 10) / 10,
          outboundCost: callStats.outboundCost,
          inboundCost: callStats.inboundCost
        },
        recording: {
          minutes: 0,
          cost: 0
        },
        sms: {
          sent: 0,
          received: 0,
          outboundCost: 0,
          inboundCost: 0
        },
        total: {
          cost: callStats.totalCost,
          activities: callStats.totalCalls,
          calls: callStats.totalCalls,
          minutes: Math.round(callStats.totalCallTime * 10) / 10,
          successRate: callStats.totalCalls > 0 ? (callStats.answeredCalls / callStats.totalCalls) : 0
        }
      };

      console.log('📊 Aggregated stats:', {
        totalCalls: callStats.totalCalls,
        outbound: `${callStats.outboundCalls} calls, ${callStats.outboundCallTime.toFixed(1)} min`,
        inbound: `${callStats.inboundCalls} calls, ${callStats.inboundCallTime.toFixed(1)} min`,
        totalTime: `${callStats.totalCallTime.toFixed(1)} minutes`,
        totalCost: `$${callStats.totalCost.toFixed(4)}`
      });

      // Get recent calls for display (last 10)
      // Map all calls for display
      const recentCalls = calls.map((call: any) => ({
        sid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        price: call.price,
        priceUnit: call.priceUnit,
        direction: call.direction,
        type: call.type
      }));

      return NextResponse.json({
        success: true,
        hasConfig: true,
        accountInfo: {
          accountSid: twilioConfig.account_sid,
          friendlyName: twilioConfig.friendly_name,
          phoneNumber: twilioConfig.phone_number
        },
        dateRange: {
          startDate,
          endDate
        },
        usage: aggregatedUsage,
        recentCalls: recentCalls,
        totalCallsFound: calls.length,
                 statistics: {
           totalCalls: callStats.totalCalls,
           outboundCalls: callStats.outboundCalls,
           inboundCalls: callStats.inboundCalls,
           totalCallTime: Math.round(callStats.totalCallTime * 10) / 10,
           outboundCallTime: Math.round(callStats.outboundCallTime * 10) / 10,
           inboundCallTime: Math.round(callStats.inboundCallTime * 10) / 10,
           totalCost: Math.round(callStats.totalCost * 10000) / 10000,
           successRate: Math.round((callStats.answeredCalls / Math.max(callStats.totalCalls, 1)) * 1000) / 10,
           answeredCalls: callStats.answeredCalls,
           notAnsweredCalls: callStats.notAnsweredCalls,
           failedCalls: callStats.failedCalls,
           busyCalls: callStats.busyCalls
         }
      });

    } catch (twilioError: any) {
      console.error('❌ Twilio API Error:', twilioError);
      return NextResponse.json({
        error: 'Failed to fetch Twilio usage data',
        details: twilioError.message,
        hasConfig: true
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Error fetching Twilio usage:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
} 