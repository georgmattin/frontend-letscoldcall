import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
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

    // Get user's subaccounts from database
    const { data: subaccounts, error: dbError } = await supabase
      .from('user_subaccounts')
      .select(`
        id,
        subaccount_sid,
        subaccount_friendly_name,
        subaccount_status,
        twiml_app_sid,
        webhook_url,
        created_at,
        updated_at,
        suspended_at,
        closed_at,
        notes
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Andmebaasi viga: ' + dbError.message
      }, { status: 500 });
    }

    // Format response
    const formattedSubaccounts = subaccounts?.map(sub => ({
      id: sub.id,
      subaccount_sid: sub.subaccount_sid,
      friendly_name: sub.subaccount_friendly_name,
      status: sub.subaccount_status,
      twiml_app_sid: sub.twiml_app_sid,
      webhook_url: sub.webhook_url,
      created_at: sub.created_at,
      updated_at: sub.updated_at,
      suspended_at: sub.suspended_at,
      closed_at: sub.closed_at,
      notes: sub.notes
    })) || [];

    return NextResponse.json({
      success: true,
      subaccounts: formattedSubaccounts,
      count: formattedSubaccounts.length
    });

  } catch (error: any) {
    console.error('Error fetching subaccounts:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Subkontode pärimisel tekkis viga'
    }, { status: 500 });
  }
} 