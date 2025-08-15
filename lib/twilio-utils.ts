import twilio from 'twilio';
import { createClient } from '@/utils/supabase/server';

export interface TwilioConfig {
  account_sid: string;
  auth_token?: string;
  api_key?: string;
  api_secret?: string;
  phone_number: string;
  twiml_app_sid?: string;
  webhook_url?: string;
  friendly_name?: string;
  source: 'user_config' | 'global_config';
}

export async function getUserTwilioConfig(userId: string): Promise<TwilioConfig | null> {
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

    return {
      account_sid: config.account_sid,
      auth_token: config.auth_token,
      api_key: config.api_key,
      api_secret: config.api_secret,
      phone_number: config.phone_number,
      twiml_app_sid: config.twiml_app_sid,
      webhook_url: config.webhook_url,
      friendly_name: config.friendly_name,
      source: 'user_config'
    };
  } else {
    // Use global configuration
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('Süsteemi Twilio konfiguratsioon puudub. Palun valige "Kasuta oma Twilio konfiguratsiooni" või võtke ühendust administraatoriga.');
    }

    return {
      account_sid: process.env.TWILIO_ACCOUNT_SID,
      auth_token: process.env.TWILIO_AUTH_TOKEN,
      api_key: process.env.TWILIO_API_KEY,
      api_secret: process.env.TWILIO_API_SECRET,
      phone_number: process.env.TWILIO_PHONE_NUMBER || '',
      twiml_app_sid: process.env.TWILIO_TWIML_APP_SID,
      webhook_url: process.env.TWILIO_VOICE_WEBHOOK_URL,
      friendly_name: 'Süsteemi konfiguratsioon',
      source: 'global_config'
    };
  }
}

export async function getTwilioClient(userId: string) {
  const config = await getUserTwilioConfig(userId);

  if (!config) {
    throw new Error('Twilio konfiguratsioon puudub.');
  }

  // Prefer API Key SID/Secret scoped to user's (sub)account; fallback to Auth Token only if present
  if (config.api_key && config.api_secret && config.account_sid) {
    console.log(' Twilio client: using API Key/Secret with subaccount context');
    return twilio(config.api_key, config.api_secret, {
      accountSid: config.account_sid,
      timeout: 30000,
      region: 'us1',
    } as any);
  }

  if (config.auth_token && config.account_sid) {
    console.log(' Twilio client: using Auth Token with subaccount context');
    return twilio(config.account_sid, config.auth_token, {
      timeout: 30000,
      region: 'us1'
    });
  }

  console.log(' Twilio credentials incomplete (no API key/secret or auth token).');
  throw new Error('Twilio kredentsiaalid on puudulikud (API Key/Secret või Auth Token).');
}

export async function getUserTwilioPreference(userId: string): Promise<'global' | 'own'> {
  const supabase = await createClient();
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('twilio_config_preference, use_own_twilio_config')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return 'global'; // Default to global
  }

  return profile.twilio_config_preference === 'own' || profile.use_own_twilio_config === true 
    ? 'own' 
    : 'global';
} 