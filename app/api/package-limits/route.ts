import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import twilio from 'twilio'

export async function GET(request: NextRequest) {
  try {
    console.log('Package limits API called')
    const supabase = await createClient()
    
    // Get authenticated user
    console.log('Getting authenticated user...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('User authenticated:', user.id)

    // Get user's active subscription with package details
    console.log('Fetching subscription...')
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        package_types (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('is_default', true)
      .maybeSingle()

    console.log('Subscription query result:', { subscription, subError })

    if (subError) {
      console.error('Error fetching subscription:', subError)
      return NextResponse.json({ error: 'Error fetching subscription' }, { status: 500 })
    }

    if (!subscription) {
      console.log('No subscription found')
      return NextResponse.json({ 
        error: 'No active subscription found',
        hasSubscription: false 
      }, { status: 404 })
    }

    console.log('Subscription found:', subscription.id)

    // Get current usage for this period
    const currentPeriodStart = new Date()
    currentPeriodStart.setDate(1)
    currentPeriodStart.setHours(0, 0, 0, 0)
    
    console.log('Fetching usage for period starting:', currentPeriodStart.toISOString())
    
    const { data: usage, error: usageError } = await supabase
      .from('user_package_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('subscription_id', subscription.id)
      .gte('period_start', currentPeriodStart.toISOString())
      .maybeSingle()

    console.log('Usage query result:', { usage, usageError })

    if (usageError) {
      console.error('Error fetching usage:', usageError)
      return NextResponse.json({ error: 'Error fetching usage' }, { status: 500 })
    }

    // Don't automatically create usage record - it will be created when user actually uses AI features
    let currentUsage = usage
    if (!currentUsage) {
      console.log('No usage record found - will be created when user uses AI features')
      // Create a temporary usage object with zero values for calculations
      currentUsage = {
        id: 'temp',
        user_id: user.id,
        subscription_id: subscription.id,
        period_start: currentPeriodStart.toISOString(),
        period_end: new Date(currentPeriodStart.getFullYear(), currentPeriodStart.getMonth() + 1, 0, 23, 59, 59).toISOString(),
        script_generations: 0,
        objection_generations: 0,
        call_summary_generations: 0,
        ai_suggestions_generations: 0,
        transcription_access: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    console.log('Using usage record:', currentUsage.id)

    // Get actual counts from database - with error handling
    let scriptsCount = 0, contactListsCount = 0, totalContactsCount = 0, recordingsCount = 0
    let scriptGenerationsCount = 0, objectionGenerationsCount = 0, callSummaryGenerationsCount = 0, 
        aiSuggestionsGenerationsCount = 0, transcriptionAccessCount = 0

    console.log('Fetching counts...')
    try {
      // Get basic counts
      const [scriptsResult, contactListsResult, contactsResult, recordingsResult] = await Promise.allSettled([
        supabase.from('scripts').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'active'),
        supabase.from('contact_lists').select('id', { count: 'exact' }).eq('user_id', user.id).eq('status', 'active'),
        supabase.from('contacts').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('call_history').select('id', { count: 'exact' }).eq('user_id', user.id).eq('recording_available', true)
      ])

      // Get AI usage counts for current month
      const currentPeriodStart = new Date()
      currentPeriodStart.setDate(1)
      currentPeriodStart.setHours(0, 0, 0, 0)

      const { data: aiUsageData, error: aiUsageError } = await supabase
        .from('user_ai_usage_tracking')
        .select('action_type')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', currentPeriodStart.toISOString())

      if (!aiUsageError && aiUsageData) {
        scriptGenerationsCount = aiUsageData.filter(d => d.action_type === 'script_generation').length
        objectionGenerationsCount = aiUsageData.filter(d => d.action_type === 'objection_generation').length
        callSummaryGenerationsCount = aiUsageData.filter(d => d.action_type === 'call_summary_generation').length
        aiSuggestionsGenerationsCount = aiUsageData.filter(d => d.action_type === 'ai_suggestions_generation').length
        transcriptionAccessCount = aiUsageData.filter(d => d.action_type === 'transcription_processing').length
      }

      console.log('Count results:', {
        scripts: scriptsResult,
        contactLists: contactListsResult,
        contacts: contactsResult,
        recordings: recordingsResult,
        aiUsage: {
          scripts: scriptGenerationsCount,
          objections: objectionGenerationsCount,
          summaries: callSummaryGenerationsCount,
          suggestions: aiSuggestionsGenerationsCount,
          transcriptions: transcriptionAccessCount
        }
      })

      if (scriptsResult.status === 'fulfilled' && !scriptsResult.value.error) {
        scriptsCount = scriptsResult.value.count || 0
        console.log('✅ Scripts count extracted:', scriptsCount)
      } else {
        console.error('❌ Scripts query failed:', scriptsResult.status === 'fulfilled' ? scriptsResult.value.error : scriptsResult.reason)
      }
      
      if (contactListsResult.status === 'fulfilled' && !contactListsResult.value.error) {
        contactListsCount = contactListsResult.value.count || 0
        console.log('✅ Contact lists count extracted:', contactListsCount)
      } else {
        console.error('❌ Contact lists query failed:', contactListsResult.status === 'fulfilled' ? contactListsResult.value.error : contactListsResult.reason)
      }
      
      if (contactsResult.status === 'fulfilled' && !contactsResult.value.error) {
        totalContactsCount = contactsResult.value.count || 0
        console.log('✅ Contacts count extracted:', totalContactsCount)
      } else {
        console.error('❌ Contacts query failed:', contactsResult.status === 'fulfilled' ? contactsResult.value.error : contactsResult.reason)
      }
      
      if (recordingsResult.status === 'fulfilled' && !recordingsResult.value.error) {
        recordingsCount = recordingsResult.value.count || 0
        console.log('✅ Recordings count extracted:', recordingsCount)
      } else {
        console.error('❌ Recordings query failed:', recordingsResult.status === 'fulfilled' ? recordingsResult.value.error : recordingsResult.reason)
      }
    } catch (error) {
      console.error('Error fetching counts:', error)
      // Continue with 0 counts rather than failing the entire request
    }

    console.log('Final counts:', { scriptsCount, contactListsCount, totalContactsCount, recordingsCount })

    // Get call minutes from Twilio API (current month)
    let callMinutesUsed = 0
    console.log('Fetching call minutes from Twilio...')
    try {
      // Get user's Twilio config
      const { data: twilioConfig, error: configError } = await supabase
        .from('user_twilio_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (configError || !twilioConfig) {
        console.log('⚠️ No Twilio config found, using 0 minutes')
      } else {
        // Calculate current month date range
        const now = new Date()
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const endDate = tomorrow

        console.log('Twilio date range:', { 
          startDate: startDate.toISOString().split('T')[0], 
          endDate: endDate.toISOString().split('T')[0] 
        })

        // Build Twilio client for the user's subaccount.
        // Prefer API Key SID/Secret + accountSid (best practice). Fall back to Auth Token if explicitly stored.
        let client: ReturnType<typeof twilio>
        const subAccountSid = (twilioConfig as any).account_sid
        const apiKeySid = (twilioConfig as any).api_key
        const apiKeySecret = (twilioConfig as any).api_secret
        const authToken = (twilioConfig as any).auth_token

        if (apiKeySid && apiKeySecret && subAccountSid) {
          console.log('🔐 Using API Key credentials for Twilio minutes fetch (scoped to subaccount)')
          client = twilio(apiKeySid, apiKeySecret, { accountSid: subAccountSid })
        } else if (authToken && subAccountSid) {
          console.log('🔐 Using Auth Token credentials for Twilio minutes fetch (subaccount)')
          client = twilio(subAccountSid, authToken)
        } else {
          console.log('⚠️ Twilio credentials incomplete (no API key/secret or auth token). Skipping minutes fetch.')
          client = undefined as any
        }

        // Fetch calls for this month (only if client available), explicitly scoping to subaccount
        const calls = client && subAccountSid
          ? await client.api.accounts(subAccountSid).calls.list({
              startTimeAfter: startDate as any,
              startTimeBefore: endDate as any,
              limit: 1000,
            } as any)
          : []

        console.log('🔍 Twilio calls found:', calls.length)

        // Calculate total call time (excluding browser connections)
        let totalCallTime = 0
        calls.forEach((call: any) => {
          // Skip browser connections (client: calls)
          const isRealCall = !call.from.includes('client:')
          if (!isRealCall) return

          const duration = parseInt(call.duration) || 0
          const durationMinutes = duration / 60
          totalCallTime += durationMinutes
        })

        callMinutesUsed = Math.round(totalCallTime * 10) / 10 // Round to 1 decimal
        console.log('✅ Total Twilio call minutes:', callMinutesUsed)
      }
    } catch (error) {
      console.error('Error fetching Twilio call minutes:', error)
      console.log('⚠️ Using 0 call minutes due to error')
    }

    const packageInfo = subscription.package_types
    
    console.log('Package info:', packageInfo)

    const response = {
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        billing_cycle_start: subscription.billing_cycle_start,
        billing_cycle_end: subscription.billing_cycle_end
      },
      package: {
        id: packageInfo.id,
        name: packageInfo.package_name,
        display_name: packageInfo.package_display_name,
        description: packageInfo.description,
        limits: {
          monthly_call_minutes: packageInfo.monthly_call_minutes,
          max_recordings_access: packageInfo.max_recordings_access,
          max_call_scripts: packageInfo.max_call_scripts,
          max_contact_lists: packageInfo.max_contact_lists,
          max_contacts_per_list: packageInfo.max_contacts_per_list,
          max_total_contacts: packageInfo.max_total_contacts,
          max_transcription_access: packageInfo.max_transcription_access,
          max_call_summary_generations: packageInfo.max_call_summary_generations,
          max_call_suggestions_generations: packageInfo.max_call_suggestions_generations,
          max_script_generations: packageInfo.max_script_generations,
          max_objection_generations: packageInfo.max_objection_generations
        }
      },
      currentUsage: {
        call_minutes_used: callMinutesUsed,
        recordings_accessed: recordingsCount,
        active_call_scripts: scriptsCount,
        active_contact_lists: contactListsCount,
        total_contacts: totalContactsCount,
        transcription_access_used: transcriptionAccessCount,
        call_summary_generations_used: callSummaryGenerationsCount,
        call_suggestions_generations_used: aiSuggestionsGenerationsCount,
        script_generations_used: scriptGenerationsCount,
        objection_generations_used: objectionGenerationsCount
      },
      usage_id: currentUsage.id
    }

    console.log('Sending response:', response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching package limits:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { action, increment = 1 } = await request.json()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current usage record
    const currentPeriodStart = new Date()
    currentPeriodStart.setDate(1)
    currentPeriodStart.setHours(0, 0, 0, 0)

    const { data: usage, error: usageError } = await supabase
      .from('user_package_usage')
      .select('*')
      .eq('user_id', user.id)
      .gte('period_start', currentPeriodStart.toISOString())
      .maybeSingle()

    if (usageError) {
      return NextResponse.json({ error: 'Error fetching usage' }, { status: 500 })
    }

    // If no usage record exists for current period, create one now
    let effectiveUsage = usage
    if (!effectiveUsage) {
      // Fetch active subscription (same logic as GET)
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('is_default', true)
        .maybeSingle()

      if (subError || !subscription) {
        return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
      }

      const periodStart = new Date()
      periodStart.setDate(1)
      periodStart.setHours(0, 0, 0, 0)
      const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59)

      // Initialize fields expected by updates below with 0 values
      const insertPayload: any = {
        user_id: user.id,
        subscription_id: subscription.id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        recordings_accessed: 0,
        transcription_access_used: 0,
        call_summary_generations_used: 0,
        call_suggestions_generations_used: 0,
        script_generations_used: 0,
        objection_generations_used: 0,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      }

      const { data: created, error: createErr } = await supabase
        .from('user_package_usage')
        .insert(insertPayload)
        .select('*')
        .single()

      if (createErr || !created) {
        return NextResponse.json({ error: 'Error creating usage record' }, { status: 500 })
      }

      effectiveUsage = created
    }

    // Update the appropriate usage field
    const updates: any = { last_updated: new Date().toISOString() }
    
    switch (action) {
      case 'recording_access':
        updates.recordings_accessed = (effectiveUsage.recordings_accessed || 0) + increment
        break
      case 'transcription_processing':
        updates.transcription_access_used = (effectiveUsage.transcription_access_used || 0) + increment
        break
      case 'call_summary_generation':
        updates.call_summary_generations_used = (effectiveUsage.call_summary_generations_used || 0) + increment
        break
      case 'call_suggestions_generation':
        updates.call_suggestions_generations_used = (effectiveUsage.call_suggestions_generations_used || 0) + increment
        break
      case 'script_generation':
        updates.script_generations_used = (effectiveUsage.script_generations_used || 0) + increment
        break
      case 'objection_generation':
        updates.objection_generations_used = (effectiveUsage.objection_generations_used || 0) + increment
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update usage record
    const { error: updateError } = await supabase
      .from('user_package_usage')
      .update(updates)
      .eq('id', effectiveUsage.id)

    if (updateError) {
      return NextResponse.json({ error: 'Error updating usage' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating usage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 