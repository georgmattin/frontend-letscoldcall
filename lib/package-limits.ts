import { createClient } from '@/utils/supabase/client'

export interface PackageLimits {
  monthly_call_minutes: number
  max_recordings_access: number
  max_call_scripts: number
  max_contact_lists: number
  max_contacts_per_list: number
  max_total_contacts: number
  max_transcription_access: number
  max_call_summary_generations: number
  max_call_suggestions_generations: number
  max_script_generations: number
  max_objection_generations: number
}

export interface CurrentUsage {
  call_minutes_used: number
  recordings_accessed: number
  active_call_scripts: number
  active_contact_lists: number
  total_contacts: number
  transcription_access_used: number
  call_summary_generations_used: number
  call_suggestions_generations_used: number
  script_generations_used: number
  objection_generations_used: number
}

export interface PackageInfo {
  hasSubscription: boolean
  package?: {
    id: number
    name: string
    display_name: string
    description: string
    limits: PackageLimits
  }
  currentUsage?: CurrentUsage
  subscription?: {
    id: string
    status: string
    billing_cycle_start: string
    billing_cycle_end: string
  }
  usage_id?: string
}

// Get user's package information and current usage
export async function getPackageInfo(): Promise<PackageInfo> {
  try {
    const response = await fetch('/api/package-limits', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { hasSubscription: false }
      }
      throw new Error('Failed to fetch package info')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching package info:', error)
    return { hasSubscription: false }
  }
}

// Check if user can perform a specific action
export async function canPerformAction(action: string, amount: number = 1): Promise<{
  allowed: boolean
  reason?: string
  current?: number
  limit?: number
}> {
  const packageInfo = await getPackageInfo()
  
  if (!packageInfo.hasSubscription || !packageInfo.package || !packageInfo.currentUsage) {
    return { allowed: false, reason: 'No active subscription found' }
  }

  const { limits } = packageInfo.package
  const { currentUsage } = packageInfo

  switch (action) {
    case 'call_minutes':
      const totalMinutes = currentUsage.call_minutes_used + amount
      return {
        allowed: totalMinutes <= limits.monthly_call_minutes,
        reason: totalMinutes > limits.monthly_call_minutes ? 'Monthly call minutes limit exceeded' : undefined,
        current: currentUsage.call_minutes_used,
        limit: limits.monthly_call_minutes
      }

    case 'recording_access':
      return {
        allowed: currentUsage.recordings_accessed < limits.max_recordings_access,
        reason: currentUsage.recordings_accessed >= limits.max_recordings_access ? 'Recording access limit reached' : undefined,
        current: currentUsage.recordings_accessed,
        limit: limits.max_recordings_access
      }

    case 'create_script':
      return {
        allowed: currentUsage.active_call_scripts < limits.max_call_scripts,
        reason: currentUsage.active_call_scripts >= limits.max_call_scripts ? 'Call scripts limit reached' : undefined,
        current: currentUsage.active_call_scripts,
        limit: limits.max_call_scripts
      }

    case 'create_contact_list':
      return {
        allowed: currentUsage.active_contact_lists < limits.max_contact_lists,
        reason: currentUsage.active_contact_lists >= limits.max_contact_lists ? 'Contact lists limit reached' : undefined,
        current: currentUsage.active_contact_lists,
        limit: limits.max_contact_lists
      }

    case 'add_contacts':
      const totalContacts = currentUsage.total_contacts + amount
      return {
        allowed: totalContacts <= limits.max_total_contacts,
        reason: totalContacts > limits.max_total_contacts ? 'Total contacts limit exceeded' : undefined,
        current: currentUsage.total_contacts,
        limit: limits.max_total_contacts
      }

    case 'transcription_access':
      return {
        allowed: currentUsage.transcription_access_used < limits.max_transcription_access,
        reason: currentUsage.transcription_access_used >= limits.max_transcription_access ? 'Transcription access limit reached' : undefined,
        current: currentUsage.transcription_access_used,
        limit: limits.max_transcription_access
      }

    case 'call_summary_generation':
      return {
        allowed: currentUsage.call_summary_generations_used < limits.max_call_summary_generations,
        reason: currentUsage.call_summary_generations_used >= limits.max_call_summary_generations ? 'Call summary generations limit reached' : undefined,
        current: currentUsage.call_summary_generations_used,
        limit: limits.max_call_summary_generations
      }

    case 'call_suggestions_generation':
      return {
        allowed: currentUsage.call_suggestions_generations_used < limits.max_call_suggestions_generations,
        reason: currentUsage.call_suggestions_generations_used >= limits.max_call_suggestions_generations ? 'Call suggestions generations limit reached' : undefined,
        current: currentUsage.call_suggestions_generations_used,
        limit: limits.max_call_suggestions_generations
      }

    case 'script_generation':
      return {
        allowed: currentUsage.script_generations_used < limits.max_script_generations,
        reason: currentUsage.script_generations_used >= limits.max_script_generations ? 'Script generations limit reached' : undefined,
        current: currentUsage.script_generations_used,
        limit: limits.max_script_generations
      }

    case 'objection_generation':
      return {
        allowed: currentUsage.objection_generations_used < limits.max_objection_generations,
        reason: currentUsage.objection_generations_used >= limits.max_objection_generations ? 'Objection generations limit reached' : undefined,
        current: currentUsage.objection_generations_used,
        limit: limits.max_objection_generations
      }

    default:
      return { allowed: false, reason: 'Unknown action' }
  }
}

// Update usage after performing an action
export async function updateUsage(action: string, increment: number = 1): Promise<boolean> {
  try {
    const response = await fetch('/api/package-limits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, increment }),
    })

    if (!response.ok) {
      throw new Error('Failed to update usage')
    }

    return true
  } catch (error) {
    console.error('Error updating usage:', error)
    return false
  }
}

// Assign default starter package to user
export async function assignDefaultPackage(): Promise<boolean> {
  try {
    const response = await fetch('/api/assign-default-package', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to assign default package')
    }

    return true
  } catch (error) {
    console.error('Error assigning default package:', error)
    return false
  }
}

// Get usage percentage for a specific limit
export function getUsagePercentage(current: number, limit: number): number {
  if (limit === 0) return 100
  return Math.min((current / limit) * 100, 100)
}

// Get color based on usage percentage
export function getUsageColor(percentage: number): string {
  if (percentage < 50) return 'text-green-600'
  if (percentage < 80) return 'text-yellow-600'
  return 'text-red-600'
}

// Format usage display text
export function formatUsageDisplay(current: number, limit: number, unit: string = ''): string {
  return `${current}${unit} / ${limit}${unit}`
} 