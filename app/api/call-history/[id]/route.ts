import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: callHistoryId } = await params
    const supabase = await createClient()
    const body = await request.json()

    console.log('📝 Updating call history:', callHistoryId, 'with data:', body)

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update call history record
    const { data, error } = await supabase
      .from('call_history')
      .update(body)
      .eq('id', callHistoryId)
      .eq('user_id', user.id) // Ensure user can only update their own records
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating call history:', error)
      return NextResponse.json({ error: 'Failed to update call history' }, { status: 500 })
    }

    console.log('✅ Call history updated successfully:', data.id)
    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Error in call history PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
