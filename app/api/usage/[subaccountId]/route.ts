import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { subaccountId: string } }
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

    const { subaccountId } = params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const phoneNumberId = searchParams.get('phoneNumberId');

    // Verify subaccount belongs to user
    const { data: subaccount, error: subaccountError } = await supabase
      .from('user_subaccounts')
      .select('id, subaccount_friendly_name, subaccount_status')
      .eq('id', subaccountId)
      .eq('user_id', user.id)
      .single();

    if (subaccountError || !subaccount) {
      return NextResponse.json({
        success: false,
        error: 'Subkonto ei leitud'
      }, { status: 404 });
    }

    // Build query for usage data
    let usageQuery = supabase
      .from('usage_tracking')
      .select(`
        *,
        rented_phone_numbers!inner(
          phone_number,
          friendly_name,
          phone_number_type
        )
      `)
      .eq('user_id', user.id)
      .eq('subaccount_id', subaccountId);

    // Add date filters if provided
    if (startDate) {
      usageQuery = usageQuery.gte('usage_date', startDate);
    }

    if (endDate) {
      usageQuery = usageQuery.lte('usage_date', endDate);
    }

    if (phoneNumberId) {
      usageQuery = usageQuery.eq('phone_number_id', phoneNumberId);
    }

    usageQuery = usageQuery.order('usage_date', { ascending: false });

    const { data: usageData, error: usageError } = await usageQuery;

    if (usageError) {
      console.error('Usage data error:', usageError);
      return NextResponse.json({
        success: false,
        error: 'Kasutusandmete pärimisel tekkis viga: ' + usageError.message
      }, { status: 500 });
    }

    // Calculate summary statistics
    const summary = {
      totalVoiceCalls: 0,
      totalVoiceMinutes: 0,
      totalVoiceCost: 0,
      totalSms: 0,
      totalSmsCost: 0,
      totalMms: 0,
      totalMmsCost: 0,
      totalRecordingMinutes: 0,
      totalRecordingCost: 0,
      totalCost: 0,
      phoneNumbers: new Set(),
      dateRange: {
        start: null as string | null,
        end: null as string | null
      }
    };

    const dailyUsage: { [date: string]: any } = {};
    const phoneNumberUsage: { [phoneNumberId: string]: any } = {};

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
      summary.totalCost += parseFloat(usage.total_cost || '0');
      summary.phoneNumbers.add(usage.phone_number_id);

      // Date range
      if (!summary.dateRange.start || usage.usage_date < summary.dateRange.start) {
        summary.dateRange.start = usage.usage_date;
      }
      if (!summary.dateRange.end || usage.usage_date > summary.dateRange.end) {
        summary.dateRange.end = usage.usage_date;
      }

      // Daily usage breakdown
      const date = usage.usage_date;
      if (!dailyUsage[date]) {
        dailyUsage[date] = {
          date: date,
          voiceCalls: 0,
          voiceMinutes: 0,
          voiceCost: 0,
          sms: 0,
          smsCost: 0,
          mms: 0,
          mmsCost: 0,
          recordingMinutes: 0,
          recordingCost: 0,
          totalCost: 0
        };
      }

      dailyUsage[date].voiceCalls += (usage.voice_calls_made || 0) + (usage.voice_calls_received || 0);
      dailyUsage[date].voiceMinutes += parseFloat(usage.voice_minutes_outbound || '0') + parseFloat(usage.voice_minutes_inbound || '0');
      dailyUsage[date].voiceCost += parseFloat(usage.voice_cost_outbound || '0') + parseFloat(usage.voice_cost_inbound || '0');
      dailyUsage[date].sms += (usage.sms_sent || 0) + (usage.sms_received || 0);
      dailyUsage[date].smsCost += parseFloat(usage.sms_cost_outbound || '0') + parseFloat(usage.sms_cost_inbound || '0');
      dailyUsage[date].mms += (usage.mms_sent || 0) + (usage.mms_received || 0);
      dailyUsage[date].mmsCost += parseFloat(usage.mms_cost_outbound || '0') + parseFloat(usage.mms_cost_inbound || '0');
      dailyUsage[date].recordingMinutes += parseFloat(usage.recording_minutes || '0');
      dailyUsage[date].recordingCost += parseFloat(usage.recording_cost || '0');
      dailyUsage[date].totalCost += parseFloat(usage.total_cost || '0');

      // Phone number usage breakdown
      const phoneNumberId = usage.phone_number_id;
      if (!phoneNumberUsage[phoneNumberId]) {
        phoneNumberUsage[phoneNumberId] = {
          phoneNumberId: phoneNumberId,
          phoneNumber: usage.rented_phone_numbers?.phone_number,
          friendlyName: usage.rented_phone_numbers?.friendly_name,
          type: usage.rented_phone_numbers?.phone_number_type,
          voiceCalls: 0,
          voiceMinutes: 0,
          voiceCost: 0,
          sms: 0,
          smsCost: 0,
          mms: 0,
          mmsCost: 0,
          recordingMinutes: 0,
          recordingCost: 0,
          totalCost: 0
        };
      }

      phoneNumberUsage[phoneNumberId].voiceCalls += (usage.voice_calls_made || 0) + (usage.voice_calls_received || 0);
      phoneNumberUsage[phoneNumberId].voiceMinutes += parseFloat(usage.voice_minutes_outbound || '0') + parseFloat(usage.voice_minutes_inbound || '0');
      phoneNumberUsage[phoneNumberId].voiceCost += parseFloat(usage.voice_cost_outbound || '0') + parseFloat(usage.voice_cost_inbound || '0');
      phoneNumberUsage[phoneNumberId].sms += (usage.sms_sent || 0) + (usage.sms_received || 0);
      phoneNumberUsage[phoneNumberId].smsCost += parseFloat(usage.sms_cost_outbound || '0') + parseFloat(usage.sms_cost_inbound || '0');
      phoneNumberUsage[phoneNumberId].mms += (usage.mms_sent || 0) + (usage.mms_received || 0);
      phoneNumberUsage[phoneNumberId].mmsCost += parseFloat(usage.mms_cost_outbound || '0') + parseFloat(usage.mms_cost_inbound || '0');
      phoneNumberUsage[phoneNumberId].recordingMinutes += parseFloat(usage.recording_minutes || '0');
      phoneNumberUsage[phoneNumberId].recordingCost += parseFloat(usage.recording_cost || '0');
      phoneNumberUsage[phoneNumberId].totalCost += parseFloat(usage.total_cost || '0');
    });

    // Convert phone numbers Set to count
    summary.phoneNumbers = summary.phoneNumbers.size;

    return NextResponse.json({
      success: true,
      subaccount: {
        id: subaccount.id,
        name: subaccount.subaccount_friendly_name,
        status: subaccount.subaccount_status
      },
      summary: summary,
      dailyUsage: Object.values(dailyUsage).sort((a: any, b: any) => b.date.localeCompare(a.date)),
      phoneNumberUsage: Object.values(phoneNumberUsage).sort((a: any, b: any) => b.totalCost - a.totalCost),
      filters: {
        startDate: startDate,
        endDate: endDate,
        phoneNumberId: phoneNumberId
      }
    });

  } catch (error: any) {
    console.error('Error fetching usage data:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Kasutusandmete pärimisel tekkis viga'
    }, { status: 500 });
  }
} 