import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { action_type, related_record_id, related_record_type, metadata } = body

    // Validate required fields
    if (!action_type) {
      return NextResponse.json({ error: 'Action type is required' }, { status: 400 })
    }

    // Insert usage record
    const { data: usageRecord, error: insertError } = await supabase
      .from('user_ai_usage_tracking')
      .insert({
        user_id: user.id,
        action_type,
        related_record_id,
        related_record_type,
        metadata,
        status: 'completed',
        processing_duration_seconds: 0, // For transcriptions, this is instant
        input_tokens: 0, // Not applicable for transcriptions
        output_tokens: 0, // Not applicable for transcriptions
        ai_model_used: 'whisper', // Assuming we're using Whisper for transcriptions
        cost_estimate: 0.00, // Update this if we want to track transcription costs
        completed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting usage record:', insertError)
      return NextResponse.json({ error: 'Failed to track usage' }, { status: 500 })
    }

    // Also update the package usage counter
    const currentPeriodStart = new Date()
    currentPeriodStart.setDate(1)
    currentPeriodStart.setHours(0, 0, 0, 0)

    const { data: packageUsage, error: usageError } = await supabase
      .from('user_package_usage')
      .select('*')
      .eq('user_id', user.id)
      .gte('period_start', currentPeriodStart.toISOString())
      .maybeSingle()

    if (usageError) {
      console.error('Error fetching package usage:', usageError)
      // Continue despite error - the main tracking is already done
    } else if (packageUsage) {
      // Update the appropriate usage counter
      const updates: any = {}
      switch (action_type) {
        case 'transcription_access':
          updates.transcription_access_used = (packageUsage.transcription_access_used || 0) + 1
          break
        case 'call_summary_generation':
          updates.call_summary_generations_used = (packageUsage.call_summary_generations_used || 0) + 1
          break
        case 'call_suggestions_generation':
          updates.call_suggestions_generations_used = (packageUsage.call_suggestions_generations_used || 0) + 1
          break
        case 'script_generation':
          updates.script_generations_used = (packageUsage.script_generations_used || 0) + 1
          break
        case 'objection_generation':
          updates.objection_generations_used = (packageUsage.objection_generations_used || 0) + 1
          break
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('user_package_usage')
          .update(updates)
          .eq('id', packageUsage.id)

        if (updateError) {
          console.error('Error updating package usage:', updateError)
          // Continue despite error - the main tracking is already done
        }
      }
    }

    return NextResponse.json({ success: true, usage: usageRecord })

  } catch (error) {
    console.error('Error tracking AI usage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 