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
    const { reason, immediate = false } = body;

    // Get rental record
    const { data: rental, error: rentalError } = await supabase
      .from('rented_phone_numbers')
      .select(`
        *,
        user_subaccounts!inner(
          subaccount_sid,
          api_key,
          api_secret
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (rentalError || !rental) {
      return NextResponse.json({
        success: false,
        error: 'Üüri kirje ei leitud'
      }, { status: 404 });
    }

    if (rental.rental_status === 'cancelled' || rental.rental_status === 'expired') {
      return NextResponse.json({
        success: false,
        error: 'Üür on juba tühistatud või aegunud'
      }, { status: 400 });
    }

    const now = new Date();
    const rentalEnd = new Date(rental.rental_end_date);
    
    // Determine cancellation date
    let cancellationDate;
    if (immediate) {
      cancellationDate = now;
    } else {
      // Cancel at the end of the current billing period
      cancellationDate = rentalEnd;
    }

    try {
      // Remove number from Twilio if immediate cancellation
      if (immediate && rental.phone_number_sid) {
        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
          console.warn('Twilio configuration missing for number release');
        } else {
          try {
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            
            // Release the phone number from Twilio
            await client.incomingPhoneNumbers(rental.phone_number_sid).remove();
          } catch (twilioError) {
            console.error('Error releasing Twilio number:', twilioError);
            // Continue with cancellation even if Twilio fails
          }
        }
      }

      // Update rental status
      const updateData: any = {
        rental_status: immediate ? 'cancelled' : 'pending_cancellation',
        updated_at: now.toISOString()
      };

      if (immediate) {
        updateData.rental_end_date = now.toISOString();
      } else {
        // Keep the original end date but mark as pending cancellation
        updateData.notes = (rental.notes || '') + `\nCancellation scheduled for ${rentalEnd.toISOString().split('T')[0]}. Reason: ${reason || 'Not specified'}`;
      }

      if (reason) {
        updateData.notes = (rental.notes || '') + `\nCancellation reason: ${reason}`;
      }

      const { data: updatedRental, error: updateError } = await supabase
        .from('rented_phone_numbers')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating rental:', updateError);
        return NextResponse.json({
          success: false,
          error: 'Üüri uuendamisel tekkis viga: ' + updateError.message
        }, { status: 500 });
      }

      // If immediate cancellation, return the number to inventory
      if (immediate) {
        const { error: inventoryError } = await supabase
          .from('phone_number_inventory')
          .update({
            availability_status: 'available',
            reserved_until: null,
            reserved_for_user_id: null,
            updated_at: now.toISOString()
          })
          .eq('phone_number', rental.phone_number);

        if (inventoryError) {
          console.error('Error updating inventory:', inventoryError);
          // Continue - this is not critical for the cancellation
        }

        // Update usage tracking to close the current period
        const { error: usageError } = await supabase
          .from('usage_tracking')
          .update({
            updated_at: now.toISOString()
          })
          .eq('user_id', user.id)
          .eq('phone_number_id', id);

        if (usageError) {
          console.error('Error updating usage tracking:', usageError);
          // Continue - this is not critical
        }
      }

      return NextResponse.json({
        success: true,
        rental: {
          id: updatedRental.id,
          phoneNumber: updatedRental.phone_number,
          status: updatedRental.rental_status,
          rentalEndDate: updatedRental.rental_end_date,
          cancelledAt: immediate ? now.toISOString() : null,
          scheduledCancellationDate: immediate ? null : rentalEnd.toISOString(),
          notes: updatedRental.notes,
          updatedAt: updatedRental.updated_at
        },
        message: immediate 
          ? 'Üür on kohe tühistatud ja number vabastatud'
          : `Üür tühistatakse ${rentalEnd.toISOString().split('T')[0]} kuupäeval`
      });

    } catch (error: any) {
      console.error('Error during cancellation process:', error);
      throw error;
    }

  } catch (error: any) {
    console.error('Error cancelling rental:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Üüri tühistamisel tekkis viga'
    }, { status: 500 });
  }
} 