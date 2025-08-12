import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let subaccountSid: string | null = null;
  
  try {
    console.log('🚀 Alustame subaccounti loomist...');
    
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Autentimine ebaõnnestus:', authError?.message);
      return NextResponse.json({
        success: false,
        error: 'Kasutaja pole autenditud'
      }, { status: 401 });
    }

    console.log('✅ Kasutaja autenditud:', user.email);

    const body = await request.json();
    const { friendlyName } = body;

    if (!friendlyName) {
      console.error('❌ Puudub subkonto nimi');
      return NextResponse.json({
        success: false,
        error: 'Subkonto nimi on kohustuslik'
      }, { status: 400 });
    }

    console.log('📝 Subkonto nimi:', friendlyName);

    // Use main Twilio account to create subaccount
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ Twilio konfiguratsioon puudub süsteemis');
      return NextResponse.json({
        success: false,
        error: 'Twilio konfiguratsioon puudub süsteemis'
      }, { status: 500 });
    }

    console.log('🔧 Twilio konfiguratsioon leitud, loome klienti...');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    console.log('📞 Loome Twilio subaccounti...');
    // Create subaccount in Twilio
    const subaccount = await client.api.accounts.create({
      friendlyName: friendlyName
    });

    subaccountSid = subaccount.sid;
    console.log('✅ Twilio subaccount loodud:', subaccountSid);

    console.log('🔑 Loome API võtme subaccountile...');
    // Create API key for the subaccount
    const apiKey = await client.newKeys.create({
      friendlyName: `API Key for ${friendlyName}`,
    }, { accountSid: subaccount.sid });

    console.log('✅ API võti loodud:', apiKey.sid);

    console.log('📱 Loome TwiML rakenduse...');
    // Create TwiML Application for the subaccount
    const twimlApp = await client.applications.create({
      friendlyName: `TwiML App for ${friendlyName}`,
      voiceUrl: process.env.WEBHOOK_URL + '/api/voice',
      voiceMethod: 'POST',
      statusCallback: process.env.WEBHOOK_URL + '/api/voice-status',
      statusCallbackMethod: 'POST'
    }, { accountSid: subaccount.sid });

    console.log('✅ TwiML rakendus loodud:', twimlApp.sid);

    console.log('💾 Salvestame subaccounti andmebaasi...');
    // Save subaccount to database
    const { data: savedSubaccount, error: dbError } = await supabase
      .from('user_subaccounts')
      .insert({
        user_id: user.id,
        subaccount_sid: subaccount.sid,
        subaccount_friendly_name: friendlyName,
        subaccount_status: 'active',
        api_key: apiKey.sid,
        api_secret: apiKey.secret,
        twiml_app_sid: twimlApp.sid,
        webhook_url: process.env.WEBHOOK_URL + '/api/voice'
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Andmebaasi viga:', dbError);
      
      // Try to clean up Twilio resources if database save fails
      console.log('🧹 Üritame Twilio ressursse puhastada...');
      try {
        await client.api.accounts(subaccount.sid).update({ status: 'closed' });
        console.log('✅ Twilio subaccount suletud pärast andmebaasi viga');
      } catch (cleanupError) {
        console.error('❌ Twilio ressursside puhastamine ebaõnnestus:', cleanupError);
      }
      
      return NextResponse.json({
        success: false,
        error: 'Andmebaasi viga: ' + dbError.message
      }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    console.log(`🎉 SUBACCOUNTI LOOMINE ÕNNESTUS! Aeg: ${duration}ms`);
    console.log('📊 Loodud subaccount:', {
      id: savedSubaccount.id,
      subaccount_sid: savedSubaccount.subaccount_sid,
      friendly_name: savedSubaccount.subaccount_friendly_name,
      user_email: user.email
    });

    return NextResponse.json({
      success: true,
      subaccount: {
        id: savedSubaccount.id,
        subaccount_sid: savedSubaccount.subaccount_sid,
        friendly_name: savedSubaccount.subaccount_friendly_name,
        status: savedSubaccount.subaccount_status,
        twiml_app_sid: savedSubaccount.twiml_app_sid,
        created_at: savedSubaccount.created_at
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`💥 SUBACCOUNTI LOOMINE EBAÕNNESTUS! Aeg: ${duration}ms`);
    console.error('❌ Viga:', error);
    
    // Log specific error details
    if (error.code) {
      console.error('🔢 Twilio veakood:', error.code);
      console.error('📝 Twilio vea kirjeldus:', error.message);
    }

    // Try to clean up if we have a subaccount SID but failed later
    if (subaccountSid) {
      console.log('🧹 Üritame pooleldi loodud subaccounti puhastada:', subaccountSid);
      try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
        await client.api.accounts(subaccountSid).update({ status: 'closed' });
        console.log('✅ Pooleldi loodud subaccount suletud');
      } catch (cleanupError) {
        console.error('❌ Pooleldi loodud subaccounti puhastamine ebaõnnestus:', cleanupError);
      }
    }
    
    // Handle specific Twilio errors
    if (error.code === 20003) {
      console.error('❌ Ebapiisav õigus subkonto loomiseks');
      return NextResponse.json({
        success: false,
        error: 'Ebapiisav õigus subkonto loomiseks. Palun kontrollige Twilio konto seadeid.'
      }, { status: 403 });
    }

    if (error.code === 20005) {
      console.error('❌ Twilio konto ei ole aktiivne');
      return NextResponse.json({
        success: false,
        error: 'Twilio konto ei ole aktiivne. Palun aktiveerige oma Twilio konto.'
      }, { status: 403 });
    }

    if (error.code === 20429) {
      console.error('❌ Liiga palju päringuid');
      return NextResponse.json({
        success: false,
        error: 'Liiga palju päringuid. Palun proovige mõne hetke pärast uuesti.'
      }, { status: 429 });
    }

    // Generic error response
    const errorMessage = error.message || 'Subkonto loomisel tekkis tundmatu viga';
    console.error('❌ Üldine viga:', errorMessage);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
} 