'use client'

import { useTransition, useEffect, useState } from 'react'
import { login, signInWithGoogle } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Read query param in effect to avoid Suspense requirement for useSearchParams
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setMessage(params.get('message'))
    }
  }, [])

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          // Decide destination based on onboarding status
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_status')
            .eq('id', session.user.id)
            .maybeSingle()
          const done = (profile?.onboarding_status || '').toLowerCase() === 'yes'
          router.replace(done ? '/dashboard' : '/onboarding')
          return
        }
        setUser(null)
      } catch (error) {
        console.error('Error checking user session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  // Redirect on auth state changes (e.g., after successful login or OAuth callback)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_status')
            .eq('id', session.user.id)
            .maybeSingle()
          const done = (profile?.onboarding_status || '').toLowerCase() === 'yes'
          router.replace(done ? '/dashboard' : '/onboarding')
        } catch (e) {
          console.error('Profile check after auth change failed:', e)
          router.replace('/onboarding')
        }
      }
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const handleLogin = (formData: FormData) => {
    startTransition(() => {
      login(formData)
    })
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Google sign-in error:', error)
      setIsGoogleLoading(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      router.refresh()
    } catch (error) {
      console.error('Error logging out:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }
  
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      <div className="min-h-screen" style={{ fontFamily: 'Open Sans, sans-serif', backgroundColor: '#FFFFFF' }}>
        {/* Logo in top-left corner */}
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
            {loading ? (
              /* Loading state */
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#059669]" />
                <p className="text-[#003333]" style={{ fontSize: '16px' }}>Checking login status...</p>
              </div>
            ) : user ? (
              /* Already logged in view */
              <>
                <div className="text-center mb-8">
                  <h1 className="font-bold text-[#003333] mb-2" style={{ fontSize: '39.81px' }}>
                    Already logged in
                  </h1>
                  <p className="font-medium text-[#003333]" style={{ fontSize: '19.2px' }}>
                    Log out to log in with a different account
                  </p>
                </div>

                {/* Log out button */}
                <Button 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-white rounded-md font-semibold transition-colors flex items-center justify-center"
                  style={{ 
                    width: '288px', 
                    height: '50px', 
                    fontSize: '16px', 
                    backgroundColor: isLoggingOut ? '#B6B6B6' : '#059669' 
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoggingOut) {
                      e.currentTarget.style.backgroundColor = '#047857';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoggingOut) {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }
                  }}
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging out...
                    </>
                  ) : (
                    'Log out'
                  )}
                </Button>

                {/* Dashboard link */}
                <div className="mt-6 text-center">
                  <p className="text-[16px] text-[#003333]">
                    Or go to{" "}
                    <Link 
                      href="/dashboard" 
                      className="font-semibold hover:underline"
                      style={{ color: '#059669' }}
                    >
                      Dashboard
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              /* Login form view */
              <>
                <div className="text-center mb-8">
                  <h1 className="font-bold text-[#003333] mb-2" style={{ fontSize: '39.81px' }}>
                    Welcome back
                  </h1>
                  <p className="font-medium text-[#003333]" style={{ fontSize: '19.2px' }}>
                    Log in to your account
                  </p>
                </div>

            {/* Message */}
            {message && (
              <Alert 
                className={`mb-6 ${
                  message === 'Password reset link sent!' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`} 
                style={{ width: '288px' }}
              >
                <AlertDescription 
                  className={
                    message === 'Password reset link sent!' 
                      ? 'text-green-700' 
                      : 'text-red-700'
                  }
                >
                  {message}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Login form */}
            <form className="space-y-4 flex flex-col items-center">
              <div>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="E-Mail Address"
                  className="border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-transparent px-3 placeholder:text-[#B6B6B6] text-[#003333]"
                  style={{ width: '280px', height: '52px', fontSize: '19.2px' }}
                  required 
                />
              </div>
              
              <div className="relative">
                <Input 
                  id="password" 
                  name="password" 
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className="border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-transparent px-3 pr-12 placeholder:text-[#B6B6B6] text-[#003333]"
                  style={{ width: '280px', height: '52px', fontSize: '19.2px' }}
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Forgot password link */}
              <div className="text-right w-full" style={{ width: '280px' }}>
                <Link 
                  href="/forgot-password" 
                  className="text-[16px] font-semibold hover:underline"
                  style={{ color: '#059669' }}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Log In button */}
              <Button 
                formAction={isPending ? undefined : handleLogin}
                disabled={isPending}
                className={`text-white rounded-md font-semibold transition-colors flex items-center justify-center ${
                  isPending ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                }`}
                style={{ 
                  width: '288px', 
                  height: '50px', 
                  fontSize: '16px', 
                  backgroundColor: isPending ? '#B6B6B6' : '#059669' 
                }}
                onMouseEnter={(e) => {
                  if (!isPending) {
                    e.currentTarget.style.backgroundColor = '#047857';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isPending) {
                    e.currentTarget.style.backgroundColor = '#059669';
                  }
                }}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Log In'
                )}
              </Button>
            </form>
            
            {/* OR divider */}
            <div className="my-6 flex items-center" style={{ width: '288px' }}>
              <div className="flex-1 border-t border-gray-300"></div>
              <div className="px-3 text-sm text-gray-500">OR</div>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Google sign-in button */}
            <Button 
              variant="outline" 
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className={`border border-gray-300 rounded-md transition-colors flex items-center justify-center gap-2 ${
                isGoogleLoading ? 'cursor-not-allowed opacity-75 bg-gray-50' : 'hover:bg-gray-50 cursor-pointer'
              }`}
              style={{ width: '288px', height: '50px', fontSize: '16px' }}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in with Google...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

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
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
} 