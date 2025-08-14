import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/utils/supabase/server'

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Require auth for onboarding
  if (!session) {
    redirect('/login')
  }

  // If already onboarded, go to dashboard before rendering page
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('onboarding_status')
      .eq('id', session!.user.id)
      .maybeSingle()

    if (error) {
      console.error('Failed to fetch onboarding_status in root onboarding layout:', error.message)
    }

    const done = (profile?.onboarding_status || '').toLowerCase() === 'yes'
    if (done) {
      redirect('/dashboard')
    }
  } catch (e) {
    console.warn('Unexpected error checking onboarding status in root onboarding layout:', e)
  }

  // Minimal wrapper: no protected Navbar/Footer here
  return (
    <div className="min-h-screen bg-[#111315] text-white">
      {children}
    </div>
  )
}
