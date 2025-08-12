"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import OnboardingSidebar from '@/components/OnboardingSidebar'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    // Start redirecting after 3 seconds
    const timer = setTimeout(() => {
      setRedirecting(true)
      router.push('/dashboard')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

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
              {redirecting ? 'Redirecting you to dashboard...' : 'Redirecting you to dashboard ...'}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
 