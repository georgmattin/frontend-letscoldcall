import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

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

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current_month'

    let dateFilter = {}
    const now = new Date()
    
    if (period === 'current_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      dateFilter = { 
        gte: startOfMonth.toISOString()
      }
    } else if (period === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      dateFilter = {
        gte: startOfLastMonth.toISOString(),
        lte: endOfLastMonth.toISOString()
      }
    }

    // Get AI usage tracking data
    let query = supabase
      .from('user_ai_usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (period !== 'all_time') {
      query = query.gte('created_at', dateFilter.gte!)
      if (dateFilter.lte) {
        query = query.lte('created_at', dateFilter.lte)
      }
    }

    const { data: usageData, error: usageError } = await query

    if (usageError) {
      console.error('❌ Error fetching usage data:', usageError)
      return NextResponse.json(
        { error: 'Failed to fetch usage statistics' },
        { status: 500 }
      )
    }

    // Calculate statistics
    const stats = {
      script_generations: usageData.filter(d => d.action_type === 'script_generation').length,
      objection_generations: usageData.filter(d => d.action_type === 'objection_generation').length,
      call_summary_generations: usageData.filter(d => d.action_type === 'call_summary_generation').length,
      ai_suggestions_generations: usageData.filter(d => d.action_type === 'ai_suggestions_generation').length,
      transcription_access: usageData.filter(d => d.action_type === 'transcription_access').length,
      total_estimated_cost: usageData.reduce((sum, d) => sum + (parseFloat(d.cost_estimate) || 0), 0),
      total_processing_time: usageData.reduce((sum, d) => sum + (parseFloat(d.processing_duration_seconds) || 0), 0),
      recent_activity: usageData.slice(0, 10).map(d => ({
        action_type: d.action_type,
        created_at: d.created_at,
        cost_estimate: parseFloat(d.cost_estimate) || 0,
        status: d.status
      })),
      summary: {
        total_actions: usageData.length,
        successful_actions: usageData.filter(d => d.status === 'completed').length,
        failed_actions: usageData.filter(d => d.status !== 'completed').length
      }
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error('Error fetching AI usage stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 