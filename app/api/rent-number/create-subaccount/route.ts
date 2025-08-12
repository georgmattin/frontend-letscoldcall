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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let subaccountSid: string | null = null;

  try {
    console.log('🚀 Alustame numbrite renti subaccounti loomist...');
    
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Autentimine ebaõnnestus (rent-number):', authError?.message);
      return NextResponse.json({
        success: false,
        error: 'Kasutaja pole autenditud'
      }, { status: 401 });
    }

    console.log('✅ Kasutaja autenditud (rent-number):', user.email);

    const body = await request.json();
    const { friendlyName } = body;
    const finalFriendlyName = friendlyName || `${user.email} - Rented Numbers`;

    console.log('📝 Subkonto nimi (rent-number):', finalFriendlyName);

    // Use main Twilio account to create subaccount
    console.log('🔧 Loome Twilio klienti (rent-number)...');
    const client = getMainTwilioClient();

    console.log('📞 Loome Twilio subaccounti (rent-number)...');
    // Create subaccount
    const subaccount = await client.api.accounts.create({
      friendlyName: finalFriendlyName
    });

    subaccountSid = subaccount.sid;
    console.log('✅ Twilio subaccount loodud (rent-number):', subaccountSid);

    console.log('🔑 Loome API võtmed subaccountile (rent-number)...');
    // Create API keys for the subaccount
    const apiKey = await client.newKeys.create({
      friendlyName: `${user.email} - API Key`
    }, subaccount.sid);

    console.log('✅ API võti loodud (rent-number):', apiKey.sid);

    console.log('📱 Loome TwiML rakenduse (rent-number)...');
    // Create TwiML application for the subaccount using main client
    // but operate in subaccount's context
    const twimlApp = await client.api.accounts(subaccount.sid).applications.create({
      friendlyName: `${user.email} - Voice App`,
      voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/voice`,
      voiceMethod: 'POST',
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/voice/status`,
      statusCallbackMethod: 'POST'
    });

    console.log('✅ TwiML rakendus loodud (rent-number):', twimlApp.sid);

    console.log('💾 Salvestame subaccounti andmebaasi (rent-number)...');
    // Save subaccount info to database
    const { data: savedSubaccount, error: saveError } = await supabase
      .from('user_subaccounts')
      .insert({
        user_id: user.id,
        subaccount_sid: subaccount.sid,
        subaccount_friendly_name: subaccount.friendlyName,
        api_key: apiKey.sid,
        api_secret: apiKey.secret,
        twiml_app_sid: twimlApp.sid,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/voice`,
        subaccount_status: 'active'
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Andmebaasi viga (rent-number):', saveError);
      
      // Try to clean up the Twilio subaccount if database save fails
      console.log('🧹 Üritame Twilio subaccounti puhastada (rent-number)...');
      try {
        await client.api.accounts(subaccount.sid).update({ status: 'closed' });
        console.log('✅ Twilio subaccount suletud pärast andmebaasi viga (rent-number)');
      } catch (cleanupError) {
        console.error('❌ Twilio ressursside puhastamine ebaõnnestus (rent-number):', cleanupError);
      }
      
      return NextResponse.json({
        success: false,
        error: 'Andmebaasi salvestamine ebaõnnestus'
      }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    console.log(`🎉 RENT-NUMBER SUBACCOUNTI LOOMINE ÕNNESTUS! Aeg: ${duration}ms`);
    console.log('📊 Loodud rent-number subaccount:', {
      id: savedSubaccount.id,
      subaccount_sid: subaccount.sid,
      friendly_name: subaccount.friendlyName,
      user_email: user.email
    });

    return NextResponse.json({
      success: true,
      subaccount: {
        id: savedSubaccount.id,
        subaccount_sid: subaccount.sid,
        friendly_name: subaccount.friendlyName,
        api_key_sid: apiKey.sid,
        twiml_app_sid: twimlApp.sid,
        status: subaccount.status
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`💥 RENT-NUMBER SUBACCOUNTI LOOMINE EBAÕNNESTUS! Aeg: ${duration}ms`);
    console.error('❌ Viga (rent-number):', error);
    
    // Log specific error details
    if (error.code) {
      console.error('🔢 Twilio veakood (rent-number):', error.code);
      console.error('📝 Twilio vea kirjeldus (rent-number):', error.message);
    }

    // Try to clean up if we have a subaccount SID but failed later
    if (subaccountSid) {
      console.log('🧹 Üritame pooleldi loodud subaccounti puhastada (rent-number):', subaccountSid);
      try {
        const client = getMainTwilioClient();
        await client.api.accounts(subaccountSid).update({ status: 'closed' });
        console.log('✅ Pooleldi loodud subaccount suletud (rent-number)');
      } catch (cleanupError) {
        console.error('❌ Pooleldi loodud subaccounti puhastamine ebaõnnestus (rent-number):', cleanupError);
      }
    }
    
    // Handle specific Twilio errors
    if (error.code === 20003) {
      console.error('❌ Ebapiisav õigus subkonto loomiseks (rent-number)');
      return NextResponse.json({
        success: false,
        error: 'Ebapiisav õigus subkonto loomiseks. Palun kontrollige Twilio konto seadeid.'
      }, { status: 403 });
    }

    if (error.code === 20005) {
      console.error('❌ Twilio konto ei ole aktiivne (rent-number)');
      return NextResponse.json({
        success: false,
        error: 'Twilio konto ei ole aktiivne. Palun aktiveerige oma Twilio konto.'
      }, { status: 403 });
    }

    if (error.code === 20429) {
      console.error('❌ Liiga palju päringuid (rent-number)');
      return NextResponse.json({
        success: false,
        error: 'Liiga palju päringuid. Palun proovige mõne hetke pärast uuesti.'
      }, { status: 429 });
    }

    // Generic error response
    const errorMessage = error.message || 'Subkonto loomisel tekkis tundmatu viga';
    console.error('❌ Üldine viga (rent-number):', errorMessage);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
} 