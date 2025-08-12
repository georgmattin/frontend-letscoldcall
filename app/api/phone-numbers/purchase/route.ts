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

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { 
      phoneNumber, 
      friendlyName,
      voiceUrl,
      smsUrl,
      addressSid,
      bundleSid 
    } = body;

    if (!phoneNumber) {
      return NextResponse.json({
        success: false,
        error: 'Phone number is required'
      }, { status: 400 });
    }

    // Validate phone number format (E.164)
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phoneNumber)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid phone number format. Must be in E.164 format (e.g., +1234567890)'
      }, { status: 400 });
    }

    // Purchase the phone number
    const incomingPhoneNumber = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
      friendlyName: friendlyName || `Purchased ${phoneNumber}`,
      voiceUrl: voiceUrl || process.env.TWILIO_VOICE_WEBHOOK_URL || '',
      voiceMethod: 'POST',
      smsUrl: smsUrl || process.env.TWILIO_SMS_WEBHOOK_URL || '',
      smsMethod: 'POST',
      addressSid: addressSid || undefined,
      bundleSid: bundleSid || undefined
    });

    return NextResponse.json({
      success: true,
      phoneNumber: {
        sid: incomingPhoneNumber.sid,
        phoneNumber: incomingPhoneNumber.phoneNumber,
        friendlyName: incomingPhoneNumber.friendlyName,
        capabilities: incomingPhoneNumber.capabilities,
        voiceUrl: incomingPhoneNumber.voiceUrl,
        smsUrl: incomingPhoneNumber.smsUrl,
        dateCreated: incomingPhoneNumber.dateCreated,
        status: 'purchased'
      }
    });

  } catch (error: any) {
    console.error('Error purchasing phone number:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to purchase phone number',
      code: error.code
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get list of purchased phone numbers
    const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({
      limit: 100
    });

    const formattedNumbers = incomingPhoneNumbers.map(number => ({
      sid: number.sid,
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName,
      capabilities: number.capabilities,
      voiceUrl: number.voiceUrl,
      smsUrl: number.smsUrl,
      dateCreated: number.dateCreated,
      dateUpdated: number.dateUpdated
    }));

    return NextResponse.json({
      success: true,
      numbers: formattedNumbers,
      count: formattedNumbers.length
    });

  } catch (error: any) {
    console.error('Error fetching phone numbers:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch phone numbers'
    }, { status: 500 });
  }
} 