import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/utils/supabase/server'
import Navbar from '@/app/testcomps/components/navbar'
import MainFooter from '@/app/testcomps/components/MainFooter'
import TwilioVoiceProvider from '@/components/twilio/TwilioVoiceProvider'
import Script from 'next/script'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'WeColdCall',
    template: 'WeColdCall - %s',
  },
}

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Twilio SDK is now imported via NPM inside TwilioVoiceProvider */}
      {/* Global Twilio Voice Provider for all protected routes */}
      <TwilioVoiceProvider />
      {/* Top navigation */}
      <Navbar />
      {/* Page content */}
      <main className="flex-1 w-full bg-[#F4F6F6]">
        {children}
      </main>
      {/* Footer */}
      <MainFooter />
    </div>
  )
}
