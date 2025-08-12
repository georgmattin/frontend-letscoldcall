'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setMessage('Failed to send reset email. Please try again.')
      } else {
        // Redirect to login page with success message
        router.push('/login?message=Password reset link sent!')
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ fontFamily: 'Open Sans, sans-serif', backgroundColor: '#FFFFFF' }}>
        {/* Logo in top-left corner */}
        <div className="absolute top-6 left-6">
          <Image 
            src="/Logo-full-green.svg" 
            alt="WeColdCall Logo" 
            width={150} 
            height={50}
            className="w-auto"
          />
        </div>

        {/* Centered forgot password form */}
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="flex flex-col items-center">
            {/* Header */}
            <div className="text-center mb-8 flex flex-col items-center">
              <h1 className="font-bold text-[#003333] mb-2" style={{ fontSize: '39.81px', whiteSpace: 'nowrap' }}>
                Forgot your password?
              </h1>
              <p className="font-medium text-[#003333]" style={{ fontSize: '19.2px', whiteSpace: 'nowrap' }}>
                Enter the email you created your account to reset the password
              </p>
            </div>

            {/* Message */}
            {message && (
              <Alert className={`mb-6 ${success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`} style={{ width: '288px' }}>
                <AlertDescription className={success ? 'text-green-700' : 'text-red-700'}>
                  {message}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Forgot password form */}
            <form onSubmit={handleResetPassword} className="space-y-4 flex flex-col items-center">
              <div>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="E-Mail Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-transparent px-3 placeholder:text-[#B6B6B6] text-[#003333]"
                  style={{ width: '280px', height: '52px', fontSize: '19.2px' }}
                  required 
                />
              </div>

              {/* Send Instructions button */}
              <Button 
                type="submit"
                disabled={isLoading}
                className="text-white rounded-md font-semibold transition-colors flex items-center justify-center"
                style={{ 
                  width: '288px', 
                  height: '50px', 
                  fontSize: '16px', 
                  backgroundColor: '#059669' 
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = '#047857';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }
                }}
              >
                {isLoading ? 'Sending...' : 'Send Instructions'}
              </Button>
            </form>

            {/* Back to Login link */}
            <div className="mt-6 flex items-center justify-center" style={{ width: '288px' }}>
              <Link 
                href="/login" 
                className="flex items-center gap-2 text-[16px] font-semibold hover:underline"
                style={{ color: '#059669' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back To Login
              </Link>
            </div>

            {/* Sign up link */}
            <div className="mt-8 text-center" style={{ width: '288px' }}>
              <p className="text-[16px] text-[#003333]">
                Don't have an account?{" "}
                <Link 
                  href="/register" 
                  className="font-semibold hover:underline"
                  style={{ color: '#059669' }}
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}