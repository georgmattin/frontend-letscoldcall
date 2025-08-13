"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import OnboardingSidebar from '@/components/OnboardingSidebar'
import { createClient } from '@/utils/supabase/client'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)
  const [updating, setUpdating] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const markOnboardingAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.push('/login')
          return
        }

        const userId = session.user.id
        // Set onboarding_status to 'yes' on successful payment
        const { error } = await supabase
          .from('profiles')
          .update({ onboarding_status: 'yes', updated_at: new Date().toISOString() })
          .eq('id', userId)

        if (error) {
          // Log error but continue to redirect so the user can access the app
          console.error('Failed to set onboarding_status on payment success:', error.message)
        }
      } catch (e) {
        console.error('Unexpected error during payment success flow:', e)
      } finally {
        setUpdating(false)
        setRedirecting(true)
        router.push('/dashboard')
      }
    }

    markOnboardingAndRedirect()
  }, [router, supabase])

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      <div className="min-h-screen relative" style={{ fontFamily: 'Open Sans, sans-serif', backgroundColor: '#FFFFFF' }}>
        {/* Logo */}
        <div className="fixed top-6 left-6 z-50">
          <Image 
            src="/Logo-full-green.svg" 
            alt="WeColdCall Logo" 
            width={150} 
            height={50}
            className="w-auto"
          />
        </div>

        {/* Sidebar */}
        <OnboardingSidebar currentStep={3} forceAllCompleted labelColor="#059669" />

        {/* Main content */}
        <div 
          className="flex items-center justify-center min-h-screen"
          style={{ 
            position: 'absolute',
            left: '256px',
            right: '0',
            top: '0',
            bottom: '0'
          }}
        >
          <div className="text-center">
            <h1 className="font-bold text-[#003333] mb-4" style={{ fontSize: '39.81px' }}>
              Your account is ready
            </h1>
            <p className="font-medium text-[#003333]" style={{ fontSize: '19.2px' }}>
              {updating ? 'Finalizing your setup...' : redirecting ? 'Redirecting you to dashboard...' : 'Redirecting you to dashboard ...'}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
 