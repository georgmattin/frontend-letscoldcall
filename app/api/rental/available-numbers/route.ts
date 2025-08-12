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
    const phoneType = searchParams.get('type') || 'local'; // local, tollfree, mobile
    const countryCode = searchParams.get('country') || 'US';
    const areaCode = searchParams.get('areaCode');
    const city = searchParams.get('city');
    const region = searchParams.get('region');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query for available numbers
    let query = supabase
      .from('phone_number_inventory')
      .select(`
        id,
        phone_number,
        phone_number_type,
        country_code,
        area_code,
        city,
        region,
        postal_code,
        availability_status,
        setup_cost,
        monthly_cost,
        voice_enabled,
        sms_enabled,
        mms_enabled,
        fax_enabled,
        friendly_name,
        rate_center,
        latitude,
        longitude,
        address_requirements,
        beta
      `)
      .eq('availability_status', 'available')
      .eq('phone_number_type', phoneType)
      .eq('country_code', countryCode);

    // Add filters if provided
    if (areaCode) {
      query = query.eq('area_code', areaCode);
    }

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    if (region) {
      query = query.ilike('region', `%${region}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('monthly_cost', { ascending: true })
      .order('phone_number', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: availableNumbers, error: dbError } = await query;

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Andmebaasi viga: ' + dbError.message
      }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('phone_number_inventory')
      .select('id', { count: 'exact', head: true })
      .eq('availability_status', 'available')
      .eq('phone_number_type', phoneType)
      .eq('country_code', countryCode);

    if (areaCode) {
      countQuery = countQuery.eq('area_code', areaCode);
    }

    if (city) {
      countQuery = countQuery.ilike('city', `%${city}%`);
    }

    if (region) {
      countQuery = countQuery.ilike('region', `%${region}%`);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Count error:', countError);
    }

    // Format response
    const formattedNumbers = availableNumbers?.map(number => ({
      id: number.id,
      phoneNumber: number.phone_number,
      type: number.phone_number_type,
      countryCode: number.country_code,
      areaCode: number.area_code,
      city: number.city,
      region: number.region,
      postalCode: number.postal_code,
      setupCost: parseFloat(number.setup_cost || '0'),
      monthlyCost: parseFloat(number.monthly_cost || '1'),
      capabilities: {
        voice: number.voice_enabled,
        sms: number.sms_enabled,
        mms: number.mms_enabled,
        fax: number.fax_enabled
      },
      friendlyName: number.friendly_name,
      rateCenter: number.rate_center,
      location: {
        latitude: number.latitude ? parseFloat(number.latitude) : null,
        longitude: number.longitude ? parseFloat(number.longitude) : null
      },
      addressRequirements: number.address_requirements,
      beta: number.beta
    })) || [];

    return NextResponse.json({
      success: true,
      numbers: formattedNumbers,
      pagination: {
        total: count || 0,
        limit: limit,
        offset: offset,
        hasMore: (count || 0) > offset + limit
      },
      filters: {
        type: phoneType,
        country: countryCode,
        areaCode: areaCode,
        city: city,
        region: region
      }
    });

  } catch (error: any) {
    console.error('Error fetching available numbers:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Saadaolevate numbrite pärimisel tekkis viga'
    }, { status: 500 });
  }
} 