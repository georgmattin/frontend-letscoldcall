import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/utils/supabase/server'

export default async function OnboardingRouteLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('onboarding_status')
      .eq('id', session!.user.id)
      .maybeSingle()

    if (error) {
      console.error('Failed to fetch onboarding_status in onboarding layout:', error.message)
    }

    const done = (profile?.onboarding_status || '').toLowerCase() === 'yes'
    if (done) {
      redirect('/dashboard')
    }
  } catch (e) {
    console.warn('Unexpected error checking onboarding status in onboarding layout:', e)
  }

  return <>{children}</>
}
