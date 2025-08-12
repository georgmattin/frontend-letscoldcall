import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@/utils/supabase/server';

async function getTwilioClient(userId: string) {
  const supabase = await createClient();
  
  // Get user's profile to check their Twilio preference
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('twilio_config_preference, use_own_twilio_config')
    .eq('id', userId)
    .single();

  // Default to global if no profile or preference found
  const useOwnConfig = profile?.twilio_config_preference === 'own' || profile?.use_own_twilio_config === true;

  if (useOwnConfig) {
    // User wants to use their own Twilio configuration
    const { data: config, error: configError } = await supabase
      .from('user_twilio_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      throw new Error('Teil on valitud oma Twilio konfiguratsiooni kasutamine, kuid vaikimisi konfiguratsioon puudub. Palun lisage Twilio konfiguratsioon Settings lehel.');
    }

    return twilio(config.account_sid, config.auth_token, {
      timeout: 30000,
      region: 'us1'
    });
  } else {
    // Use global configuration
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Süsteemi Twilio konfiguratsioon puudub. Palun valige "Kasuta oma Twilio konfiguratsiooni" või võtke ühendust administraatoriga.');
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

    // Get Twilio client based on user preference
    const client = await getTwilioClient(user.id);

    const { searchParams } = new URL(request.url);
    const areaCode = searchParams.get('areaCode');
    const type = searchParams.get('type') || 'local';
    const limit = parseInt(searchParams.get('limit') || '20');
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
      } else if (type === 'mobile') {
        try {
          availableNumbers = await client
            .availablePhoneNumbers(country)
            .mobile
            .list({
              voiceEnabled: true,
              smsEnabled: true,
              limit: limit
            });
        } catch (mobileError: any) {
          // Mobile numbers might not be available for this account
          if (mobileError.status === 404) {
            return NextResponse.json({
              success: false,
              error: 'Mobile numbers are not available for your Twilio account. Please try Local or Toll-Free numbers instead.',
              code: 'MOBILE_NOT_AVAILABLE'
            }, { status: 400 });
          }
          throw mobileError;
        }
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

        availableNumbers = await client
          .availablePhoneNumbers(country)
          .local
          .list(searchOptions);
      }
    } catch (searchError: any) {
      // Handle specific API errors
      if (searchError.status === 404) {
        return NextResponse.json({
          success: false,
          error: `${type === 'tollfree' ? 'Toll-free' : type === 'mobile' ? 'Mobile' : 'Local'} numbers are not available for the selected country or your account.`,
          code: 'RESOURCE_NOT_FOUND'
        }, { status: 400 });
      }
      throw searchError;
    }

    const formattedNumbers = availableNumbers.map(number => ({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      locality: number.locality,
      region: number.region,
      postalCode: number.postalCode,
      capabilities: {
        voice: number.capabilities.voice,
        sms: number.capabilities.sms,
        mms: number.capabilities.mms,
        fax: number.capabilities.fax
      },
      addressRequirements: number.addressRequirements,
      beta: number.beta,
      rateCenter: number.rateCenter,
      latitude: number.latitude,
      longitude: number.longitude
    }));

    return NextResponse.json({
      success: true,
      numbers: formattedNumbers,
      count: formattedNumbers.length
    });

  } catch (error: any) {
    console.error('Error searching phone numbers:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to search phone numbers',
      code: error.code
    }, { status: 500 });
  }
} 