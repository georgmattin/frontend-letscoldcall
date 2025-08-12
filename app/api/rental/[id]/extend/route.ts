import { NextRequest, NextResponse } from 'next/server';
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
    const { extensionMonths = 1 } = body;

    if (extensionMonths < 1 || extensionMonths > 12) {
      return NextResponse.json({
        success: false,
        error: 'Pikenduse aeg peab olema vahemikus 1-12 kuud'
      }, { status: 400 });
    }

    // Get rental record
    const { data: rental, error: rentalError } = await supabase
      .from('rented_phone_numbers')
      .select(`
        *,
        user_subaccounts!inner(
          id,
          subaccount_friendly_name,
          subaccount_status
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

    if (rental.rental_status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Ainult aktiivseid üüre saab pikendada'
      }, { status: 400 });
    }

    if (rental.user_subaccounts?.subaccount_status !== 'active') {
      return NextResponse.json({
        success: false,
        error: 'Subkonto pole aktiivne'
      }, { status: 400 });
    }

    const now = new Date();
    const currentEndDate = new Date(rental.rental_end_date);
    
    // Calculate new end date
    const extensionStartDate = currentEndDate > now ? currentEndDate : now;
    const newEndDate = new Date(extensionStartDate);
    newEndDate.setMonth(newEndDate.getMonth() + extensionMonths);

    // Calculate extension cost
    const monthlyCost = parseFloat(rental.monthly_cost || '1');
    const extensionCost = monthlyCost * extensionMonths;

    try {
      // Update rental record
      const { data: updatedRental, error: updateError } = await supabase
        .from('rented_phone_numbers')
        .update({
          rental_end_date: newEndDate.toISOString(),
          updated_at: now.toISOString(),
          notes: (rental.notes || '') + `\nExtended by ${extensionMonths} month(s) on ${now.toISOString().split('T')[0]}. Cost: $${extensionCost.toFixed(2)}`
        })
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

      const daysRemaining = Math.max(0, Math.ceil((newEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      return NextResponse.json({
        success: true,
        rental: {
          id: updatedRental.id,
          phoneNumber: updatedRental.phone_number,
          friendlyName: updatedRental.friendly_name,
          status: updatedRental.rental_status,
          rental: {
            startDate: updatedRental.rental_start_date,
            endDate: updatedRental.rental_end_date,
            daysRemaining: daysRemaining,
            monthlyCost: parseFloat(updatedRental.monthly_cost || '0')
          },
          extension: {
            months: extensionMonths,
            cost: extensionCost,
            newEndDate: newEndDate.toISOString()
          },
          updatedAt: updatedRental.updated_at
        },
        message: `Üür pikendatud ${extensionMonths} kuud. Uus lõppkuupäev: ${newEndDate.toISOString().split('T')[0]}`
      });

    } catch (error: any) {
      console.error('Error during extension process:', error);
      throw error;
    }

  } catch (error: any) {
    console.error('Error extending rental:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Üüri pikendamisel tekkis viga'
    }, { status: 500 });
  }
}