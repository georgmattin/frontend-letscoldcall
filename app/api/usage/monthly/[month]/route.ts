import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { month: string } }
) {
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

    const { month } = params; // Expected format: YYYY-MM
    const { searchParams } = new URL(request.url);
    const subaccountId = searchParams.get('subaccountId');

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({
        success: false,
        error: 'Kuu formaat peab olema YYYY-MM'
      }, { status: 400 });
    }

    // Build query for monthly usage data
    let usageQuery = supabase
      .from('usage_tracking')
      .select(`
        *,
        rented_phone_numbers!inner(
          phone_number,
          friendly_name,
          phone_number_type,
          monthly_cost
        ),
        user_subaccounts!inner(
          id,
          subaccount_friendly_name,
          subaccount_status
        )
      `)
      .eq('user_id', user.id)
      .eq('usage_month', month);

    if (subaccountId) {
      usageQuery = usageQuery.eq('subaccount_id', subaccountId);
    }

    usageQuery = usageQuery.order('usage_date', { ascending: true });

    const { data: usageData, error: usageError } = await usageQuery;

    if (usageError) {
      console.error('Usage data error:', usageError);
      return NextResponse.json({
        success: false,
        error: 'Kasutusandmete pärimisel tekkis viga: ' + usageError.message
      }, { status: 500 });
    }

    // Get rental costs for the month
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-31`; // Will be adjusted by date logic

    const { data: rentals, error: rentalError } = await supabase
      .from('rented_phone_numbers')
      .select(`
        id,
        phone_number,
        friendly_name,
        monthly_cost,
        rental_start_date,
        rental_end_date,
        rental_status,
        subaccount_id,
        user_subaccounts!inner(
          subaccount_friendly_name
        )
      `)
      .eq('user_id', user.id)
      .lte('rental_start_date', monthEnd)
      .gte('rental_end_date', monthStart);

    if (rentalError) {
      console.error('Rental data error:', rentalError);
    }

    // Calculate monthly summary
    const summary = {
      month: month,
      totalVoiceCalls: 0,
      totalVoiceMinutes: 0,
      totalVoiceCost: 0,
      totalSms: 0,
      totalSmsCost: 0,
      totalMms: 0,
      totalMmsCost: 0,
      totalRecordingMinutes: 0,
      totalRecordingCost: 0,
      totalUsageCost: 0,
      totalRentalCost: 0,
      totalCost: 0,
      uniquePhoneNumbers: new Set(),
      uniqueSubaccounts: new Set(),
      activeDays: new Set()
    };

    const subaccountBreakdown: { [subaccountId: string]: any } = {};
    const phoneNumberBreakdown: { [phoneNumberId: string]: any } = {};
    const dailyBreakdown: { [date: string]: any } = {};

    // Process usage data
    usageData?.forEach(usage => {
      // Summary statistics
      summary.totalVoiceCalls += (usage.voice_calls_made || 0) + (usage.voice_calls_received || 0);
      summary.totalVoiceMinutes += parseFloat(usage.voice_minutes_outbound || '0') + parseFloat(usage.voice_minutes_inbound || '0');
      summary.totalVoiceCost += parseFloat(usage.voice_cost_outbound || '0') + parseFloat(usage.voice_cost_inbound || '0');
      summary.totalSms += (usage.sms_sent || 0) + (usage.sms_received || 0);
      summary.totalSmsCost += parseFloat(usage.sms_cost_outbound || '0') + parseFloat(usage.sms_cost_inbound || '0');
      summary.totalMms += (usage.mms_sent || 0) + (usage.mms_received || 0);
      summary.totalMmsCost += parseFloat(usage.mms_cost_outbound || '0') + parseFloat(usage.mms_cost_inbound || '0');
      summary.totalRecordingMinutes += parseFloat(usage.recording_minutes || '0');
      summary.totalRecordingCost += parseFloat(usage.recording_cost || '0');
      summary.totalUsageCost += parseFloat(usage.total_cost || '0');
      summary.uniquePhoneNumbers.add(usage.phone_number_id);
      summary.uniqueSubaccounts.add(usage.subaccount_id);
      summary.activeDays.add(usage.usage_date);

      // Subaccount breakdown
      const subaccountId = usage.subaccount_id;
      if (!subaccountBreakdown[subaccountId]) {
        subaccountBreakdown[subaccountId] = {
          subaccountId: subaccountId,
          subaccountName: usage.user_subaccounts?.subaccount_friendly_name,
          voiceCalls: 0,
          voiceMinutes: 0,
          voiceCost: 0,
          sms: 0,
          smsCost: 0,
          mms: 0,
          mmsCost: 0,
          recordingMinutes: 0,
          recordingCost: 0,
          usageCost: 0,
          rentalCost: 0,
          totalCost: 0,
          phoneNumbers: new Set()
        };
      }

      subaccountBreakdown[subaccountId].voiceCalls += (usage.voice_calls_made || 0) + (usage.voice_calls_received || 0);
      subaccountBreakdown[subaccountId].voiceMinutes += parseFloat(usage.voice_minutes_outbound || '0') + parseFloat(usage.voice_minutes_inbound || '0');
      subaccountBreakdown[subaccountId].voiceCost += parseFloat(usage.voice_cost_outbound || '0') + parseFloat(usage.voice_cost_inbound || '0');
      subaccountBreakdown[subaccountId].sms += (usage.sms_sent || 0) + (usage.sms_received || 0);
      subaccountBreakdown[subaccountId].smsCost += parseFloat(usage.sms_cost_outbound || '0') + parseFloat(usage.sms_cost_inbound || '0');
      subaccountBreakdown[subaccountId].mms += (usage.mms_sent || 0) + (usage.mms_received || 0);
      subaccountBreakdown[subaccountId].mmsCost += parseFloat(usage.mms_cost_outbound || '0') + parseFloat(usage.mms_cost_inbound || '0');
      subaccountBreakdown[subaccountId].recordingMinutes += parseFloat(usage.recording_minutes || '0');
      subaccountBreakdown[subaccountId].recordingCost += parseFloat(usage.recording_cost || '0');
      subaccountBreakdown[subaccountId].usageCost += parseFloat(usage.total_cost || '0');
      subaccountBreakdown[subaccountId].phoneNumbers.add(usage.phone_number_id);

      // Phone number breakdown
      const phoneNumberId = usage.phone_number_id;
      if (!phoneNumberBreakdown[phoneNumberId]) {
        phoneNumberBreakdown[phoneNumberId] = {
          phoneNumberId: phoneNumberId,
          phoneNumber: usage.rented_phone_numbers?.phone_number,
          friendlyName: usage.rented_phone_numbers?.friendly_name,
          type: usage.rented_phone_numbers?.phone_number_type,
          monthlyCost: parseFloat(usage.rented_phone_numbers?.monthly_cost || '0'),
          voiceCalls: 0,
          voiceMinutes: 0,
          voiceCost: 0,
          sms: 0,
          smsCost: 0,
          mms: 0,
          mmsCost: 0,
          recordingMinutes: 0,
          recordingCost: 0,
          usageCost: 0,
          totalCost: 0
        };
      }

      phoneNumberBreakdown[phoneNumberId].voiceCalls += (usage.voice_calls_made || 0) + (usage.voice_calls_received || 0);
      phoneNumberBreakdown[phoneNumberId].voiceMinutes += parseFloat(usage.voice_minutes_outbound || '0') + parseFloat(usage.voice_minutes_inbound || '0');
      phoneNumberBreakdown[phoneNumberId].voiceCost += parseFloat(usage.voice_cost_outbound || '0') + parseFloat(usage.voice_cost_inbound || '0');
      phoneNumberBreakdown[phoneNumberId].sms += (usage.sms_sent || 0) + (usage.sms_received || 0);
      phoneNumberBreakdown[phoneNumberId].smsCost += parseFloat(usage.sms_cost_outbound || '0') + parseFloat(usage.sms_cost_inbound || '0');
      phoneNumberBreakdown[phoneNumberId].mms += (usage.mms_sent || 0) + (usage.mms_received || 0);
      phoneNumberBreakdown[phoneNumberId].mmsCost += parseFloat(usage.mms_cost_outbound || '0') + parseFloat(usage.mms_cost_inbound || '0');
      phoneNumberBreakdown[phoneNumberId].recordingMinutes += parseFloat(usage.recording_minutes || '0');
      phoneNumberBreakdown[phoneNumberId].recordingCost += parseFloat(usage.recording_cost || '0');
      phoneNumberBreakdown[phoneNumberId].usageCost += parseFloat(usage.total_cost || '0');

      // Daily breakdown
      const date = usage.usage_date;
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = {
          date: date,
          voiceCalls: 0,
          voiceMinutes: 0,
          voiceCost: 0,
          sms: 0,
          smsCost: 0,
          totalCost: 0
        };
      }

      dailyBreakdown[date].voiceCalls += (usage.voice_calls_made || 0) + (usage.voice_calls_received || 0);
      dailyBreakdown[date].voiceMinutes += parseFloat(usage.voice_minutes_outbound || '0') + parseFloat(usage.voice_minutes_inbound || '0');
      dailyBreakdown[date].voiceCost += parseFloat(usage.voice_cost_outbound || '0') + parseFloat(usage.voice_cost_inbound || '0');
      dailyBreakdown[date].sms += (usage.sms_sent || 0) + (usage.sms_received || 0);
      dailyBreakdown[date].smsCost += parseFloat(usage.sms_cost_outbound || '0') + parseFloat(usage.sms_cost_inbound || '0');
      dailyBreakdown[date].totalCost += parseFloat(usage.total_cost || '0');
    });

    // Calculate rental costs and add to breakdowns
    rentals?.forEach(rental => {
      const monthlyCost = parseFloat(rental.monthly_cost || '0');
      summary.totalRentalCost += monthlyCost;
      
      if (subaccountBreakdown[rental.subaccount_id]) {
        subaccountBreakdown[rental.subaccount_id].rentalCost += monthlyCost;
        subaccountBreakdown[rental.subaccount_id].totalCost += monthlyCost;
      }

      if (phoneNumberBreakdown[rental.id]) {
        phoneNumberBreakdown[rental.id].totalCost = phoneNumberBreakdown[rental.id].usageCost + monthlyCost;
      }
    });

    // Finalize summary
    summary.totalCost = summary.totalUsageCost + summary.totalRentalCost;
    summary.uniquePhoneNumbers = summary.uniquePhoneNumbers.size;
    summary.uniqueSubaccounts = summary.uniqueSubaccounts.size;
    summary.activeDays = summary.activeDays.size;

    // Finalize subaccount breakdown
    Object.values(subaccountBreakdown).forEach((sub: any) => {
      sub.phoneNumbers = sub.phoneNumbers.size;
      sub.totalCost = sub.usageCost + sub.rentalCost;
    });

    return NextResponse.json({
      success: true,
      report: {
        month: month,
        generatedAt: new Date().toISOString(),
        summary: summary,
        subaccountBreakdown: Object.values(subaccountBreakdown).sort((a: any, b: any) => b.totalCost - a.totalCost),
        phoneNumberBreakdown: Object.values(phoneNumberBreakdown).sort((a: any, b: any) => b.totalCost - a.totalCost),
        dailyBreakdown: Object.values(dailyBreakdown).sort((a: any, b: any) => a.date.localeCompare(b.date))
      },
      filters: {
        month: month,
        subaccountId: subaccountId
      }
    });

  } catch (error: any) {
    console.error('Error generating monthly report:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Kuuaruande genereerimisel tekkis viga'
    }, { status: 500 });
  }
} 