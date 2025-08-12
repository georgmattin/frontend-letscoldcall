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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // active, suspended, cancelled, expired
    const subaccountId = searchParams.get('subaccountId');
    const phoneType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query for rented numbers
    let query = supabase
      .from('rented_phone_numbers')
      .select(`
        id,
        phone_number,
        phone_number_sid,
        friendly_name,
        phone_number_type,
        country_code,
        area_code,
        city,
        region,
        rental_status,
        rental_start_date,
        rental_end_date,
        monthly_cost,
        setup_cost,
        voice_url,
        sms_url,
        voice_enabled,
        sms_enabled,
        mms_enabled,
        fax_enabled,
        purchase_date,
        last_used_at,
        total_calls,
        total_sms,
        created_at,
        updated_at,
        notes,
        subaccount_id,
        user_subaccounts!inner(
          id,
          subaccount_friendly_name,
          subaccount_status
        )
      `)
      .eq('user_id', user.id);

    // Add filters if provided
    if (status) {
      query = query.eq('rental_status', status);
    }

    if (subaccountId) {
      query = query.eq('subaccount_id', subaccountId);
    }

    if (phoneType) {
      query = query.eq('phone_number_type', phoneType);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: rentedNumbers, error: dbError } = await query;

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Andmebaasi viga: ' + dbError.message
      }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('rented_phone_numbers')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (status) {
      countQuery = countQuery.eq('rental_status', status);
    }

    if (subaccountId) {
      countQuery = countQuery.eq('subaccount_id', subaccountId);
    }

    if (phoneType) {
      countQuery = countQuery.eq('phone_number_type', phoneType);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Count error:', countError);
    }

    // Calculate additional info for each number
    const formattedNumbers = rentedNumbers?.map(number => {
      const rentalStart = new Date(number.rental_start_date);
      const rentalEnd = new Date(number.rental_end_date);
      const now = new Date();
      
      const daysRemaining = Math.max(0, Math.ceil((rentalEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const isExpiringSoon = daysRemaining <= 7; // Expires within 7 days
      const isExpired = rentalEnd < now;
      
      return {
        id: number.id,
        phoneNumber: number.phone_number,
        phoneNumberSid: number.phone_number_sid,
        friendlyName: number.friendly_name,
        type: number.phone_number_type,
        countryCode: number.country_code,
        areaCode: number.area_code,
        city: number.city,
        region: number.region,
        status: number.rental_status,
        rental: {
          startDate: number.rental_start_date,
          endDate: number.rental_end_date,
          daysRemaining: daysRemaining,
          isExpiringSoon: isExpiringSoon,
          isExpired: isExpired,
          monthlyCost: parseFloat(number.monthly_cost || '0'),
          setupCost: parseFloat(number.setup_cost || '0')
        },
        capabilities: {
          voice: number.voice_enabled,
          sms: number.sms_enabled,
          mms: number.mms_enabled,
          fax: number.fax_enabled
        },
        configuration: {
          voiceUrl: number.voice_url,
          smsUrl: number.sms_url
        },
        usage: {
          totalCalls: number.total_calls || 0,
          totalSms: number.total_sms || 0,
          lastUsed: number.last_used_at
        },
        subaccount: {
          id: number.subaccount_id,
          name: number.user_subaccounts?.subaccount_friendly_name,
          status: number.user_subaccounts?.subaccount_status
        },
        purchaseDate: number.purchase_date,
        createdAt: number.created_at,
        updatedAt: number.updated_at,
        notes: number.notes
      };
    }) || [];

    // Calculate summary statistics
    const summary = {
      total: formattedNumbers.length,
      active: formattedNumbers.filter(n => n.status === 'active').length,
      suspended: formattedNumbers.filter(n => n.status === 'suspended').length,
      cancelled: formattedNumbers.filter(n => n.status === 'cancelled').length,
      expired: formattedNumbers.filter(n => n.status === 'expired').length,
      expiringSoon: formattedNumbers.filter(n => n.rental.isExpiringSoon && n.status === 'active').length,
      totalMonthlyCost: formattedNumbers
        .filter(n => n.status === 'active')
        .reduce((sum, n) => sum + n.rental.monthlyCost, 0)
    };

    return NextResponse.json({
      success: true,
      numbers: formattedNumbers,
      summary: summary,
      pagination: {
        total: count || 0,
        limit: limit,
        offset: offset,
        hasMore: (count || 0) > offset + limit
      },
      filters: {
        status: status,
        subaccountId: subaccountId,
        type: phoneType
      }
    });

  } catch (error: any) {
    console.error('Error fetching rented numbers:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Üüritud numbrite pärimisel tekkis viga'
    }, { status: 500 });
  }
} 