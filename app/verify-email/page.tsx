'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string>('your email')
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Read query param in effect to avoid Suspense requirement for useSearchParams
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setEmail(params.get('email') || 'your email')
    }
  }, [])

  const handleResendConfirmation = async () => {
    setIsResending(true)
    setMessage(null)
    
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        setMessage('Failed to resend confirmation email. Please try again.')
      } else {
        setMessage('Confirmation email sent successfully!')
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ fontFamily: 'Source Sans Pro, sans-serif', backgroundColor: '#F9FAFB' }}>
        {/* Sticky logo in top-left corner - same as register page */}
        <div className="fixed top-6 left-6 z-10">
          <Image 
            src="/WeColdCall_logo_dark.png" 
            alt="WeColdCall" 
            width={120} 
            height={40}
            className="h-8 w-auto"
          />
        </div>

        {/* Scrollable content - same layout as register page */}
        <div className="flex justify-center px-4 py-8">
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* Header - same top margin as register page */}
            <div className="text-center mb-8" style={{ marginTop: '90px' }}>
              <h1 className="font-bold text-[#253053] mb-2" style={{ fontSize: '39.81px' }}>
                Verify Your Email
              </h1>
              <p className="font-medium text-[#253053] mb-4" style={{ fontSize: '19.2px' }}>
                You're in. An email has been sent to <span className="font-semibold">{email}</span>.
              </p>
              <p className="font-medium text-[#253053]" style={{ fontSize: '19.2px' }}>
                Hit confirm and you'll be ready to start working.
              </p>
            </div>

            {/* Didn't get email section */}
            <div className="text-center mb-6">
              <p className="font-medium text-[#253053] mb-4" style={{ fontSize: '19.2px' }}>
                Didn't get an email?
              </p>
              
              <Button 
                onClick={handleResendConfirmation}
                disabled={isResending}
                className="text-white rounded-md font-semibold transition-colors"
                style={{ 
                  width: '288px', 
                  height: '50px', 
                  fontSize: '16px', 
                  backgroundColor: '#0D8BFF' 
                }}
                onMouseEnter={(e) => {
                  if (!isResending) {
                    e.currentTarget.style.backgroundColor = '#253053';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isResending) {
                    e.currentTarget.style.backgroundColor = '#0D8BFF';
                  }
                }}
              >
                {isResending ? 'Sending...' : 'Resend Confirmation'}
              </Button>
            </div>

            {/* Message */}
            {message && (
              <div className={`p-3 rounded-md text-sm w-full max-w-[288px] ${
                message.includes('successfully') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
