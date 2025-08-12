import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@/utils/supabase/server';

// Use the main system Twilio account for number rentals
function getMainTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('Main Twilio configuration not found');
  }

  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    {
      timeout: 30000,
      region: 'us1'
    }
  );
}

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

    // Use main Twilio account for searching
    const client = getMainTwilioClient();

    const { searchParams } = new URL(request.url);
    const areaCode = searchParams.get('areaCode');
    const city = searchParams.get('city');
    const type = searchParams.get('type') || 'local';
    const limit = parseInt(searchParams.get('limit') || '10');
    const country = searchParams.get('country') || 'US';

    let availableNumbers;

    try {
      if (type === 'tollfree') {
        availableNumbers = await client
          .availablePhoneNumbers(country)
          .tollFree
          .list({
            voiceEnabled: true,
            smsEnabled: true,
            limit: limit
          });
      } else if (type === 'mobile' && country === 'EE') {
        // For Estonia, search for mobile numbers
        availableNumbers = await client
          .availablePhoneNumbers(country)
          .mobile
          .list({
            voiceEnabled: true,
            smsEnabled: true,
            limit: limit
          });
      } else {
        // Local numbers
        const searchOptions: any = {
          voiceEnabled: true,
          smsEnabled: true,
          limit: limit
        };

        if (areaCode) {
          searchOptions.areaCode = areaCode;
        }

        if (city) {
          searchOptions.inLocality = city;
        }

        availableNumbers = await client
          .availablePhoneNumbers(country)
          .local
          .list(searchOptions);
      }
    } catch (searchError: any) {
      console.error('Twilio search error:', searchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to search for available numbers. Please try different search criteria.',
        code: 'SEARCH_FAILED'
      }, { status: 400 });
    }

    const formattedNumbers = availableNumbers.map(number => {
      // Determine pricing based on number type and location
      let monthlyPrice = 1.00; // Default local number price
      let setupPrice = 1.00;   // Setup fee
      
      if (type === 'tollfree') {
        monthlyPrice = 2.00; // Toll-free numbers cost more
      } else if (type === 'mobile' && country === 'EE') {
        monthlyPrice = 3.00; // Estonian mobile numbers cost more
      }
      
      // Some regions might have different pricing
      if (number.isoCountry !== 'US') {
        monthlyPrice += 0.50; // International numbers slightly more
      }

      return {
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName || number.phoneNumber,
        locality: number.locality || '',
        region: number.region || '',
        country: number.isoCountry || country,
        postalCode: number.postalCode || '',
        capabilities: {
          voice: number.capabilities?.voice || false,
          SMS: number.capabilities?.sms || false,
          MMS: number.capabilities?.mms || false
        },
        beta: number.beta || false,
        pricing: {
          monthlyPrice: monthlyPrice,
          setupPrice: setupPrice,
          currency: 'USD',
          priceUnit: 'month'
        }
      };
    });

    return NextResponse.json({
      success: true,
      phoneNumbers: formattedNumbers,
      count: formattedNumbers.length
    });

  } catch (error: any) {
    console.error('Error searching phone numbers for rental:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to search phone numbers'
    }, { status: 500 });
  }
} 