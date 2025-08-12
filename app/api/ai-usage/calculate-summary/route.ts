import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { month, year, userId } = await request.json()
    
    // If userId is provided (admin function), use it; otherwise use current user
    const targetUserId = userId || user.id
    
    // Calculate month boundaries
    const targetMonth = month || new Date().getMonth() + 1
    const targetYear = year || new Date().getFullYear()
    
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1)
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999)
    
    console.log(`🔄 Calculating AI usage summary for user ${targetUserId}, month ${targetMonth}/${targetYear}`)

    // Get AI usage data for the specified month
    const { data: aiUsageData, error: aiUsageError } = await supabase
      .from('user_ai_usage_tracking')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString())

    if (aiUsageError) {
      console.error('❌ Error fetching AI usage data:', aiUsageError)
      return NextResponse.json(
        { error: 'Failed to fetch AI usage data' },
        { status: 500 }
      )
    }

    // Get recording data for the same period
    const { data: recordingsData, error: recordingsError } = await supabase
      .from('recordings')
      .select('duration, transcription_duration, transcription_status')
      .eq('user_id', targetUserId)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString())

    if (recordingsError) {
      console.error('❌ Error fetching recordings data:', recordingsError)
      return NextResponse.json(
        { error: 'Failed to fetch recordings data' },
        { status: 500 }
      )
    }

    // Calculate summary statistics
    const aiUsage = aiUsageData || []
    const recordings = recordingsData || []

    const summaryData = {
      user_id: targetUserId,
      summary_month: startOfMonth.toISOString().split('T')[0], // YYYY-MM-DD format
      
      // Recording and transcription metrics
      total_recording_minutes: recordings.reduce((sum, r) => sum + (r.duration || 0), 0) / 60,
      total_transcription_minutes: recordings.reduce((sum, r) => sum + (r.transcription_duration || 0), 0) / 60,
      recordings_count: recordings.length,
      transcriptions_count: recordings.filter(r => r.transcription_status === 'completed').length,
      
      // AI action counts
      script_generations_count: aiUsage.filter(u => u.action_type === 'script_generation').length,
      objection_generations_count: aiUsage.filter(u => u.action_type === 'objection_generation').length,
      call_summary_generations_count: aiUsage.filter(u => u.action_type === 'call_summary_generation').length,
      ai_suggestions_generations_count: aiUsage.filter(u => u.action_type === 'ai_suggestions_generation').length,
      
      // Token usage
      total_input_tokens: aiUsage.reduce((sum, u) => sum + (u.input_tokens || 0), 0),
      total_output_tokens: aiUsage.reduce((sum, u) => sum + (u.output_tokens || 0), 0),
      
      // Cost estimates
      estimated_ai_cost: aiUsage.reduce((sum, u) => sum + (u.cost_estimate || 0), 0),
      
      // Processing time
      total_processing_seconds: aiUsage.reduce((sum, u) => sum + (u.processing_duration_seconds || 0), 0),
      
      // Success rates
      successful_ai_actions: aiUsage.filter(u => u.status === 'completed').length,
      failed_ai_actions: aiUsage.filter(u => u.status === 'failed').length,
      total_ai_actions: aiUsage.length,
      
      // Metadata
      calculation_date: new Date().toISOString(),
      period_start: startOfMonth.toISOString(),
      period_end: endOfMonth.toISOString()
    }

    // Check if summary already exists for this month
    const { data: existingSummary, error: existingSummaryError } = await supabase
      .from('user_usage_summary')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('summary_month', summaryData.summary_month)
      .single()

    if (existingSummary) {
      // Update existing summary
      const { data: updatedSummary, error: updateError } = await supabase
        .from('user_usage_summary')
        .update(summaryData)
        .eq('id', existingSummary.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Error updating usage summary:', updateError)
        return NextResponse.json(
          { error: 'Failed to update usage summary' },
          { status: 500 }
        )
      }

      console.log('✅ Updated existing usage summary:', updatedSummary.id)
      return NextResponse.json({
        success: true,
        action: 'updated',
        summary: updatedSummary
      })
    } else {
      // Create new summary
      const { data: newSummary, error: insertError } = await supabase
        .from('user_usage_summary')
        .insert(summaryData)
        .select()
        .single()

      if (insertError) {
        console.error('❌ Error creating usage summary:', insertError)
        return NextResponse.json(
          { error: 'Failed to create usage summary' },
          { status: 500 }
        )
      }

      console.log('✅ Created new usage summary:', newSummary.id)
      return NextResponse.json({
        success: true,
        action: 'created',
        summary: newSummary
      })
    }

  } catch (error) {
    console.error('❌ Error in calculate summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's usage summaries
    const { data: summaries, error: summariesError } = await supabase
      .from('user_usage_summary')
      .select('*')
      .eq('user_id', user.id)
      .order('summary_month', { ascending: false })

    if (summariesError) {
      console.error('❌ Error fetching usage summaries:', summariesError)
      return NextResponse.json(
        { error: 'Failed to fetch usage summaries' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      summaries: summaries || []
    })

  } catch (error) {
    console.error('❌ Error in get summaries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 