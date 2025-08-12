import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@/utils/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const body = await request.json();
    const { friendlyName, status, notes } = body;

    // Get current subaccount from database
    const { data: currentSubaccount, error: fetchError } = await supabase
      .from('user_subaccounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentSubaccount) {
      return NextResponse.json({
        success: false,
        error: 'Subkonto ei leitud'
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (friendlyName) {
      updateData.subaccount_friendly_name = friendlyName;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Handle status changes
    if (status && status !== currentSubaccount.subaccount_status) {
      updateData.subaccount_status = status;
      
      if (status === 'suspended') {
        updateData.suspended_at = new Date().toISOString();
      } else if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      } else if (status === 'active') {
        updateData.suspended_at = null;
        updateData.closed_at = null;
      }

      // Update status in Twilio if needed
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        try {
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          
          if (status === 'suspended') {
            await client.api.accounts(currentSubaccount.subaccount_sid).update({
              status: 'suspended'
            });
          } else if (status === 'closed') {
            await client.api.accounts(currentSubaccount.subaccount_sid).update({
              status: 'closed'
            });
          } else if (status === 'active') {
            await client.api.accounts(currentSubaccount.subaccount_sid).update({
              status: 'active'
            });
          }
        } catch (twilioError) {
          console.error('Twilio update error:', twilioError);
          // Continue with database update even if Twilio fails
        }
      }
    }

    // Update friendly name in Twilio if needed
    if (friendlyName && friendlyName !== currentSubaccount.subaccount_friendly_name) {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        try {
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          await client.api.accounts(currentSubaccount.subaccount_sid).update({
            friendlyName: friendlyName
          });
        } catch (twilioError) {
          console.error('Twilio update error:', twilioError);
          // Continue with database update even if Twilio fails
        }
      }
    }

    // Update subaccount in database
    const { data: updatedSubaccount, error: updateError } = await supabase
      .from('user_subaccounts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Andmebaasi viga: ' + updateError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subaccount: {
        id: updatedSubaccount.id,
        subaccount_sid: updatedSubaccount.subaccount_sid,
        friendly_name: updatedSubaccount.subaccount_friendly_name,
        status: updatedSubaccount.subaccount_status,
        twiml_app_sid: updatedSubaccount.twiml_app_sid,
        webhook_url: updatedSubaccount.webhook_url,
        created_at: updatedSubaccount.created_at,
        updated_at: updatedSubaccount.updated_at,
        suspended_at: updatedSubaccount.suspended_at,
        closed_at: updatedSubaccount.closed_at,
        notes: updatedSubaccount.notes
      }
    });

  } catch (error: any) {
    console.error('Error updating subaccount:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Subkonto uuendamisel tekkis viga'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;

    // Get current subaccount from database
    const { data: currentSubaccount, error: fetchError } = await supabase
      .from('user_subaccounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentSubaccount) {
      return NextResponse.json({
        success: false,
        error: 'Subkonto ei leitud'
      }, { status: 404 });
    }

    // Check if subaccount has active rented numbers
    const { data: rentedNumbers, error: rentedError } = await supabase
      .from('rented_phone_numbers')
      .select('id')
      .eq('subaccount_id', id)
      .eq('rental_status', 'active');

    if (rentedError) {
      console.error('Error checking rented numbers:', rentedError);
      return NextResponse.json({
        success: false,
        error: 'Viga üüritud numbrite kontrollimisel'
      }, { status: 500 });
    }

    if (rentedNumbers && rentedNumbers.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Subkontot ei saa kustutada - sellel on aktiivseid üüritud numbreid'
      }, { status: 400 });
    }

    // Close subaccount in Twilio first
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.api.accounts(currentSubaccount.subaccount_sid).update({
          status: 'closed'
        });
      } catch (twilioError) {
        console.error('Twilio close error:', twilioError);
        // Continue with database deletion even if Twilio fails
      }
    }

    // Mark as closed in database instead of deleting (for audit trail)
    const { error: updateError } = await supabase
      .from('user_subaccounts')
      .update({
        subaccount_status: 'closed',
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Andmebaasi viga: ' + updateError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Subkonto edukalt suletud'
    });

  } catch (error: any) {
    console.error('Error deleting subaccount:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Subkonto kustutamisel tekkis viga'
    }, { status: 500 });
  }
} 