'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if we have valid session for password reset
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session check error:', error)
          setMessage('Invalid or expired reset link. Please request a new password reset.')
          setCheckingSession(false)
          return
        }

        if (session) {
          setIsValidSession(true)
        } else {
          setMessage('Invalid or expired reset link. Please request a new password reset.')
        }
      } catch (error) {
        console.error('Error checking session:', error)
        setMessage('An error occurred. Please try again.')
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [supabase.auth])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password || !confirmPassword) {
      setMessage('Please fill in all fields.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long.')
      return
    }

    setIsLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        console.error('Password reset error:', error)
        setMessage('Failed to reset password. Please try again.')
      } else {
        setMessage('Password successfully updated! Redirecting to login...')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      setMessage('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      <div className="min-h-screen bg-white" style={{ fontFamily: 'Open Sans, sans-serif' }}>
        {/* Logo */}
        <div className="absolute top-6 left-6">
          <Link href="/">
            <Image 
              src="/Logo-full-green.svg" 
              alt="WeColdCall Logo" 
              width={150} 
              height={50}
              className="w-auto"
            />
          </Link>
        </div>

        {/* Centered content */}
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-sm flex flex-col items-center">
            {checkingSession ? (
              /* Loading state */
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#059669]" />
                <p className="text-[#003333]" style={{ fontSize: '16px' }}>Verifying reset link...</p>
              </div>
            ) : !isValidSession ? (
              /* Invalid session view */
              <>
                <div className="text-center mb-8">
                  <h1 className="font-bold text-[#003333] mb-2" style={{ fontSize: '39.81px' }}>
                    Invalid Link
                  </h1>
                  <p className="font-medium text-[#003333]" style={{ fontSize: '19.2px' }}>
                    This password reset link is invalid or expired
                  </p>
                </div>

                {/* Error message */}
                {message && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md" style={{ width: '288px' }}>
                    <p className="text-red-600 text-sm">{message}</p>
                  </div>
                )}

                {/* Back to login button */}
                <Button 
                  onClick={() => router.push('/login')}
                  className="text-white rounded-md font-semibold transition-colors"
                  style={{ 
                    width: '288px', 
                    height: '50px', 
                    fontSize: '16px', 
                    backgroundColor: '#059669' 
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#047857';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }}
                >
                  Back to Login
                </Button>

                {/* Request new reset link */}
                <div className="mt-6 text-center">
                  <p className="text-[16px] text-[#003333]">
                    Need a new reset link?{" "}
                    <Link 
                      href="/forgot-password" 
                      className="font-semibold hover:underline"
                      style={{ color: '#059669' }}
                    >
                      Request here
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              /* Password reset form */
              <>
                <div className="text-center mb-8">
                  <h1 className="font-bold text-[#003333] mb-2" style={{ fontSize: '39.81px' }}>
                    Reset Password
                  </h1>
                  <p className="font-medium text-[#003333]" style={{ fontSize: '19.2px' }}>
                    Enter your new password
                  </p>
                </div>

                {/* Message */}
                {message && (
                  <div className={`mb-6 p-3 border rounded-md text-center ${
                    message.includes('successfully') 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`} style={{ width: '288px' }}>
                    <p className={`text-sm ${
                      message.includes('successfully') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {message}
                    </p>
                  </div>
                )}

                {/* Reset password form */}
                <form onSubmit={handleResetPassword} className="w-full flex flex-col items-center">
                  <div className="space-y-4 w-full flex flex-col items-center">
                    {/* New Password */}
                    <div className="w-full flex flex-col items-center">
                      <Label 
                        htmlFor="password" 
                        className="block text-sm font-medium text-[#003333] mb-1 text-left"
                        style={{ width: '288px' }}
                      >
                        New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="border border-gray-300 rounded-md focus:ring-2 focus:ring-[#059669] focus:border-transparent pr-12 text-[#003333] placeholder:text-[#B6B6B6]"
                          style={{ width: '288px', height: '50px', fontSize: '16px' }}
                          placeholder="Enter new password"
                          required
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          disabled={isLoading}
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="w-full flex flex-col items-center">
                      <Label 
                        htmlFor="confirmPassword" 
                        className="block text-sm font-medium text-[#003333] mb-1 text-left"
                        style={{ width: '288px' }}
                      >
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="border border-gray-300 rounded-md focus:ring-2 focus:ring-[#059669] focus:border-transparent pr-12 text-[#003333] placeholder:text-[#B6B6B6]"
                          style={{ width: '288px', height: '50px', fontSize: '16px' }}
                          placeholder="Confirm new password"
                          required
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          disabled={isLoading}
                        >
                          {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Reset password button */}
                  <Button 
                    type="submit"
                    disabled={isLoading}
                    className="mt-6 text-white rounded-md font-semibold transition-colors flex items-center justify-center"
                    style={{ 
                      width: '288px', 
                      height: '50px', 
                      fontSize: '16px', 
                      backgroundColor: isLoading ? '#B6B6B6' : '#059669' 
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
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </form>

                {/* Back to login link */}
                <div className="mt-8 text-center" style={{ width: '288px' }}>
                  <p className="text-[16px] text-[#003333]">
                    Remember your password?{" "}
                    <Link 
                      href="/login" 
                      className="font-semibold hover:underline"
                      style={{ color: '#059669' }}
                    >
                      Back to Login
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
