"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Phone, 
  CreditCard, 
  Settings, 
  ArrowRight, 
  Users, 
  Shield,
  Loader2,
  MapPin,
  DollarSign,
  Eye,
  EyeOff
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { getStripe } from '@/lib/stripe'
import Image from 'next/image'
import OnboardingSidebar from '@/components/OnboardingSidebar'
import PackageSelection from '@/components/PackageSelection'

interface PhoneNumber {
  phoneNumber: string
  friendlyName: string
  locality: string
  region: string
  country: string
  postalCode: string
  capabilities: {
    voice: boolean
    SMS: boolean
    MMS: boolean
  }
  beta: boolean
  pricing: {
    monthlyPrice: number
    setupPrice: number
    currency: string
    priceUnit: string
  }
}

export default function OnboardingPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'choice' | 'own-twilio' | 'rent-number' | 'select-package' | 'select-package-own' | 'payment' | 'setup-complete'>('choice')
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const prevStepRef = useRef<typeof step | null>(null)
  const [selectedOption, setSelectedOption] = useState<'own' | 'rent' | ''>('')
  
  // Rent number flow state
  const [searchLoading, setSearchLoading] = useState(false)
  const [availableNumbers, setAvailableNumbers] = useState<PhoneNumber[]>([])
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null)
  const [rentLoading, setRentLoading] = useState(false)
  const [searchFilters, setSearchFilters] = useState({
    country: 'US',
    areaCode: '',
    city: '',
    type: 'local'
  })

  // Package selection state
  const [selectedPackage, setSelectedPackage] = useState<'basic' | 'standard' | 'premium' | 'basic_own' | 'standard_own' | 'premium_own' | ''>('')
  const [packageLoading, setPackageLoading] = useState(false)
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string | null>(null)

  // Own Twilio flow state
  const [twilioConfig, setTwilioConfig] = useState({
    account_sid: '',
    auth_token: '',
    phone_number: '',
    friendly_name: '',
    api_key: '',
    api_secret: '',
    twiml_app_sid: ''
  })
  const [configLoading, setConfigLoading] = useState(false)
  const [loadingOption, setLoadingOption] = useState<'own' | 'rent' | null>(null)

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Password visibility state
  const [showAuthToken, setShowAuthToken] = useState(false)
  const [showApiSecret, setShowApiSecret] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // Package data for rented numbers
  const rentedPackages = [
    {
      id: 'basic',
      name: 'Basic',
      price: 0.00,
      features: [
        'Up to 55 call minutes per month',
        'Up to 3 call scripts',
        'Up to 2 contact lists',
        'Up to 250 contacts per list',
        'Up to 500 total contacts',
        'Up to 5 transcription access per month',
        'Up to 5 call summaries per month',
        'Up to 3 AI suggestions per month',
        'Up to 3 script generations per month',
        'Up to 3 objection generations per month',
        'Up to 2 concurrent calls',
        'Basic support'
      ]
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 29.99,
      features: [
        'Up to 500 call minutes per month',
        'Up to 10 call scripts',
        'Up to 10 contact lists',
        'Up to 1000 contacts per list',
        'Up to 5000 total contacts',
        'Up to 25 transcription access per month',
        'Up to 25 call summaries per month',
        'Up to 15 AI suggestions per month',
        'Up to 15 script generations per month',
        'Up to 15 objection generations per month',
        'Up to 5 concurrent calls',
        'Priority support'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 99.99,
      features: [
        'Up to 2000 call minutes per month',
        'Up to 50 call scripts',
        'Up to 50 contact lists',
        'Up to 5000 contacts per list',
        'Up to 25000 total contacts',
        'Up to 100 transcription access per month',
        'Up to 100 call summaries per month',
        'Up to 50 AI suggestions per month',
        'Up to 50 script generations per month',
        'Up to 50 objection generations per month',
        'Up to 20 concurrent calls',
        'Premium support with dedicated account manager'
      ]
    }
  ]

  // Package data for own Twilio numbers
  const ownPackages = [
    {
      id: 'basic_own',
      name: 'Basic',
      price: 29.99,
      features: [
        'Unlimited call minutes',
        '5 Call Scripts',
        '2 Contact Lists',
        'Up to 250 contacts per list',
        'Up to 500 total contacts',
        'Up to 5 transcription access per month',
        'Up to 5 call summaries per month',
        'Up to 3 AI suggestions per month',
        'Up to 3 script generations per month',
        'Up to 3 objection generations per month',
        'Unlimited concurrent calls',
        'Basic support'
      ]
    },
    {
      id: 'standard_own',
      name: 'Standard',
      price: 39.99,
      features: [
        'Unlimited call minutes',
        'Up to 10 call scripts',
        'Up to 10 contact lists',
        'Up to 1000 contacts per list',
        'Up to 5000 total contacts',
        'Up to 25 transcription access per month',
        'Up to 25 call summaries per month',
        'Up to 15 AI suggestions per month',
        'Up to 15 script generations per month',
        'Up to 15 objection generations per month',
        'Unlimited concurrent calls',
        'Priority support'
      ]
    },
    {
      id: 'premium_own',
      name: 'Premium',
      price: 149.99,
      features: [
        'Unlimited call minutes',
        'Up to 50 call scripts',
        'Up to 50 contact lists',
        'Up to 5000 contacts per list',
        'Up to 25000 total contacts',
        'Up to 100 transcription access per month',
        'Up to 100 call summaries per month',
        'Up to 50 AI suggestions per month',
        'Up to 50 script generations per month',
        'Up to 50 objection generations per month',
        'Unlimited concurrent calls',
        'Premium support with dedicated account manager'
      ]
    }
  ]

  // Add country options
  const countryOptions = [
    { value: 'US', label: 'United States' },
    { value: 'EE', label: 'Estonia' }
  ]

  // Add number type options
  const numberTypeOptions = {
    US: ['local', 'tollfree'],
    EE: ['local', 'mobile']
  }

  // Function to get available number types for selected country
  const getAvailableNumberTypes = (country: string) => {
    return numberTypeOptions[country as keyof typeof numberTypeOptions] || ['local']
  }

  // Update search filters when country changes
  const handleCountryChange = (value: string) => {
    setSearchFilters(prev => ({
      ...prev,
      country: value,
      type: 'local', // Reset to default type when country changes
      areaCode: '', // Reset area code
      city: '' // Reset city
    }))
    setAvailableNumbers([]) // Clear previous search results
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
          router.push('/login')
          return
        }

        setUser(session.user)
        // If user already completed onboarding, send to dashboard immediately
        try {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('onboarding_status')
            .eq('id', session.user.id)
            .maybeSingle()
          const done = (profile?.onboarding_status || '').toLowerCase() === 'yes'
          if (done) {
            router.replace('/dashboard')
            return
          }
          if (profileErr) {
            console.warn('Failed to fetch onboarding_status on onboarding page:', profileErr.message)
          }
        } catch (e) {
          console.warn('Unexpected error checking onboarding_status on onboarding page:', e)
        }
        // Load persisted onboarding progress for this user
        try {
          const { data: progress } = await supabase
            .from('onboarding_progress')
            .select('current_step, completed_steps')
            .eq('user_id', session.user.id)
            .maybeSingle()
          if (progress?.current_step) {
            setStep(progress.current_step as typeof step)
          }
          if (Array.isArray(progress?.completed_steps)) {
            setCompletedSteps(progress!.completed_steps as string[])
          }
        } catch (e) {
          console.warn('Failed to load onboarding progress:', e)
        }
      } catch (error) {
        console.error('Auth error:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  // Persist onboarding progress whenever step changes (append previous step to completed_steps)
  useEffect(() => {
    const saveProgress = async () => {
      if (!user) return
      try {
        // Determine updated completed steps list
        const prev = prevStepRef.current
        let newCompleted = completedSteps
        if (prev && prev !== step && !completedSteps.includes(prev)) {
          newCompleted = [...completedSteps, prev]
          setCompletedSteps(newCompleted)
        }
        await supabase
          .from('onboarding_progress')
          .upsert(
            {
              user_id: user.id,
              current_step: step,
              completed_steps: newCompleted,
            },
            { onConflict: 'user_id' }
          )
        // update prev step pointer
        prevStepRef.current = step
      } catch (e) {
        console.warn('Failed to save onboarding progress:', e)
      }
    }
    saveProgress()
  }, [step, user, supabase, completedSteps])

  // Search for available numbers
  const searchNumbers = async () => {
    setSearchLoading(true)
    setMessage(null)
    
    try {
      const params = new URLSearchParams({
        country: searchFilters.country,
        type: searchFilters.type,
        limit: '10'
      })
      
      if (searchFilters.areaCode) params.append('areaCode', searchFilters.areaCode)
      if (searchFilters.city) params.append('city', searchFilters.city)

      const response = await fetch(`/api/rent-number/search?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setAvailableNumbers(data.phoneNumbers || [])
        if (data.phoneNumbers?.length === 0) {
          setMessage({ type: 'error', text: 'Numbreid ei leitud. Proovige muuta otsingukriteeriumeid.' })
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Numbrite otsimine ebaõnnestus' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Võrguühenduse viga' })
    } finally {
      setSearchLoading(false)
    }
  }

  // Select number (save selection without purchasing)
  const selectNumber = async () => {
    if (!selectedNumber) return
    
    setRentLoading(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/rent-number/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: selectedNumber.phoneNumber,
          friendlyName: `Selected by ${user.email}`,
          pricing: selectedNumber.pricing,
          locality: selectedNumber.locality,
          region: selectedNumber.region,
          country: selectedNumber.country,
          capabilities: selectedNumber.capabilities
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSelectedPhoneNumberId(data.selectionId) // Store the selection ID
        setMessage(null)
        setStep('select-package')
      } else {
        setMessage({ type: 'error', text: data.error || 'Numbri valimine ebaõnnestus' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Võrguühenduse viga' })
    } finally {
      setRentLoading(false)
    }
  }

  // Select package and proceed to payment (for rented numbers)
  const selectPackage = async (packageId?: string) => {
    const pkgId = packageId || selectedPackage
    if (!pkgId || !selectedPhoneNumberId) {
      setMessage({ type: 'error', text: 'Please select a package and phone number first' })
      return
    }
    
    setPackageLoading(true)
    setMessage(null)
    
    try {
      // Create Stripe checkout session for rented number package
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkgId,
          packageName: rentedPackages.find(p => p.id === pkgId)?.name || '',
          packagePrice: rentedPackages.find(p => p.id === pkgId)?.price || 0,
          phoneNumberSelectionId: selectedPhoneNumberId,
          returnUrl: `${window.location.origin}/dashboard`
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create checkout session' })
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      setMessage({ type: 'error', text: 'An error occurred while processing payment' })
    } finally {
      setPackageLoading(false)
    }
  }

  // Select package for own Twilio configuration
  const selectPackageOwn = async () => {
    if (!selectedPackage) return
    
    setPackageLoading(true)
    setMessage(null)
    
    try {
      // Create Stripe checkout session for own Twilio package
      const response = await fetch('/api/stripe/checkout-session-own', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage,
          packageName: ownPackages.find(p => p.id === selectedPackage)?.name || '',
          packagePrice: ownPackages.find(p => p.id === selectedPackage)?.price || 0,
          returnUrl: `${window.location.origin}/dashboard`
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create checkout session' })
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      setMessage({ type: 'error', text: 'An error occurred while processing payment' })
    } finally {
      setPackageLoading(false)
    }
  }

  // Save own Twilio config
  const saveOwnTwilioConfig = async () => {
    setConfigLoading(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/twilio/user-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(twilioConfig)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage(null)
        setStep('select-package-own')
      } else {
        setMessage({ type: 'error', text: data.error || 'Konfiguratsiooni salvestamine ebaõnnestus' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Võrguühenduse viga' })
    } finally {
      setConfigLoading(false)
    }
  }

  const handleNext = async (option: 'own' | 'rent') => {
    setLoadingOption(option)
    setMessage(null)
    
    if (option === 'own') {
      setStep('own-twilio')
      setLoadingOption(null)
    } else if (option === 'rent') {
      // Create subaccount BEFORE showing number selection
      
      console.log('🚀 Alustame subaccounti loomist onboarding lehel...')
      
      try {
        const response = await fetch('/api/rent-number/create-subaccount', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            friendlyName: `${user.email} - Rented Numbers`
          })
        })

        const data = await response.json()

        console.log('📊 Subaccounti loomise vastus:', { success: data.success, error: data.error })

        if (!response.ok) {
          console.error('❌ HTTP viga subaccounti loomisel:', response.status, response.statusText)
          setMessage({ 
            type: 'error', 
            text: `Subaccounti loomine ebaõnnestus (HTTP ${response.status}): ${data.error || 'Tundmatu viga'}` 
          })
          return // STOP here - do not proceed to number selection
        }

        if (data.success) {
          console.log('✅ Subaccount edukalt loodud onboarding lehel:', data.subaccount?.subaccount_sid)
          setMessage(null)
          // Only proceed to number selection if subaccount creation was successful
          setStep('rent-number')
        } else {
          console.error('❌ Subaccounti loomine ebaõnnestus onboarding lehel:', data.error)
          setMessage({ 
            type: 'error', 
            text: data.error || 'Subaccounti loomine ebaõnnestus. Palun proovige uuesti või võtke meiega ühendust.' 
          })
          // DO NOT proceed to rent-number step if creation failed
          return
        }
      } catch (error: any) {
        console.error('💥 Võrguühenduse viga subaccounti loomisel:', error)
        setMessage({ 
          type: 'error', 
          text: 'Võrguühenduse viga. Palun kontrollige internetiühendust ja proovige uuesti.' 
        })
        // DO NOT proceed to rent-number step if there was a network error
        return
      } finally {
        setLoadingOption(null)
      }
    }
  }

  const goToDashboard = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#059669] mx-auto"></div>
          <p className="mt-4 text-[#003333]">Laadin...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
      <div className="min-h-screen relative" style={{ fontFamily: 'Open Sans, sans-serif', backgroundColor: '#FFFFFF' }}>
        {/* Logo in top-left corner - positioned absolutely over everything */}
        <div className="fixed top-6 left-6 z-50">
          <Image 
            src="/Logo-full-green.svg" 
            alt="WeColdCall Logo" 
            width={150} 
            height={50}
            className="w-auto"
          />
        </div>

        {/* Step 1: Choice */}
        {step === 'choice' && (
          <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Progress indicator */}
            <OnboardingSidebar currentStep={1} />

            {/* Main content */}
            <div className="absolute inset-0 flex items-center justify-center px-4 py-8 lg:py-0">
              <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="text-center mb-12">
                  <h1 className="font-bold text-[#003333]" style={{ fontSize: '39.81px' }}>
                    How Are You Going To Use Our App?
                  </h1>
                  <p className="font-medium text-[#003333]" style={{ fontSize: '19.2px' }}>
                    We'll streamline your setup process accordingly
                  </p>
                </div>

                                 {/* Two options with OR in between */}
                 <div className="flex flex-col lg:flex-row items-center justify-center gap-8 max-w-5xl mx-auto">
                   {/* Option A: Bring Your OWN Twilio Number */}
                   <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 text-left w-full lg:w-[320px]">
                     <h3 className="font-bold text-[#003333] mb-4" style={{ fontSize: '24px' }}>
                       Bring Your OWN<br />Twilio Number
                     </h3>
                     <p className="text-[#003333] mb-8" style={{ fontSize: '16px' }}>
                       Connect your Twilio account and use your own number and billing
                     </p>
                     <Button 
                       onClick={() => {
                         setSelectedOption('own')
                         handleNext('own')
                       }}
                       disabled={loadingOption !== null}
                       className="w-full text-white rounded-md font-semibold transition-colors flex items-center justify-center"
                       style={{ 
                         height: '50px', 
                         fontSize: '16px', 
                         backgroundColor: '#059669',
                         borderRadius: '11px'
                       }}
                       onMouseEnter={(e) => {
                         if (loadingOption === null) {
                           e.currentTarget.style.backgroundColor = '#047857';
                         }
                       }}
                       onMouseLeave={(e) => {
                         if (loadingOption === null) {
                           e.currentTarget.style.backgroundColor = '#059669';
                         }
                       }}
                     >
                       {loadingOption === 'own' ? 'Setting up...' : 'Select And Continue'}
                     </Button>
                   </div>

                   {/* OR divider */}
                   <div className="flex items-center justify-center lg:flex-col">
                     <div className="flex flex-col items-center">
                       <div className="w-[0.1px] h-[150px] bg-[#253053]/20 mb-3"></div>
                       <span className="text-[#003333] font-medium bg-white px-4 py-2 rounded-full" style={{ fontSize: '18px' }}>OR</span>
                       <div className="w-[0.1px] h-[150px] bg-[#253053]/20 mt-3"></div>
                     </div>
                   </div>

                   {/* Option B: Rent a phone number FROM US */}
                   <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 text-left w-full lg:w-[320px]">
                     <h3 className="font-bold text-[#003333] mb-4" style={{ fontSize: '24px' }}>
                       Rent a phone<br />number FROM US
                     </h3>
                     <p className="text-[#003333] mb-8" style={{ fontSize: '16px' }}>
                       Rent a dedicated US number from us and start calling in 5 minutes
                     </p>
                     <Button 
                       onClick={() => {
                         setSelectedOption('rent')
                         handleNext('rent')
                       }}
                       disabled={loadingOption !== null}
                       className="w-full text-white rounded-md font-semibold transition-colors flex items-center justify-center"
                       style={{ 
                         height: '50px', 
                         fontSize: '16px', 
                         backgroundColor: '#059669',
                         borderRadius: '11px'
                       }}
                       onMouseEnter={(e) => {
                         if (loadingOption === null) {
                           e.currentTarget.style.backgroundColor = '#047857';
                         }
                       }}
                       onMouseLeave={(e) => {
                         if (loadingOption === null) {
                           e.currentTarget.style.backgroundColor = '#059669';
                         }
                       }}
                     >
                       {loadingOption === 'rent' ? 'Setting up...' : 'Select And Continue'}
                     </Button>
                   </div>
                 </div>

                {/* Message */}
                {message && (
                  <div className="mt-8 flex justify-center">
                    <Alert className={`border-red-200 bg-red-50 max-w-md`}>
                      <AlertDescription className="text-red-700">
                        {message.text}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

                {/* Step 2: Rent Number Selection */}
        {step === 'rent-number' && (
          <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Progress indicator */}
            <OnboardingSidebar currentStep={2} />

            {/* Main content */}
            <div className="absolute inset-0 flex items-start justify-center px-4 py-8 lg:py-12 overflow-y-auto">
              <div className="w-full max-w-4xl">
                {/* Header */}
                <div className="text-center mb-12">
                  <h1 className="font-bold text-[#003333]" style={{ fontSize: '39.81px' }}>
                    Select A Phone Number
                  </h1>
                  <p className="font-medium text-[#003333]" style={{ fontSize: '19.2px' }}>
                    You can select 1 phone number that is included within your package
                  </p>
                </div>

                {/* Phone Number Selection Content */}
                <div className=" rounded-lg p-8 max-w-[550px] mx-auto">
                  {/* Search Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-[#003333] mb-2">Type:</label>
                      <RadioGroup value={searchFilters.type} onValueChange={(value) => setSearchFilters(prev => ({ ...prev, type: value }))}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mobile" id="mobile" />
                          <Label htmlFor="mobile">Mobile</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="local" id="local" />
                          <Label htmlFor="local">Local</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#003333] mb-2">Country:</label>
                      <Select value={searchFilters.country} onValueChange={handleCountryChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#003333] mb-2">Area Code:</label>
                      <Input
                        value={searchFilters.areaCode}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, areaCode: e.target.value }))}
                        placeholder="+ 415"
                      />
                    </div>
                  </div>

                  {/* Search Button */}
                  <Button 
                    onClick={searchNumbers}
                    disabled={searchLoading}
                    className="w-full mb-6 text-white rounded-md font-semibold transition-colors"
                    style={{ 
                      height: '50px', 
                      fontSize: '16px', 
                      backgroundColor: '#059669' 
                    }}
                    onMouseEnter={(e) => {
                      if (!searchLoading) {
                        e.currentTarget.style.backgroundColor = '#047857';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!searchLoading) {
                        e.currentTarget.style.backgroundColor = '#059669';
                      }
                    }}
                  >
                    {searchLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      'Search Numbers'
                    )}
                  </Button>

                  {/* Available Numbers */}
                  {availableNumbers.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <h3 className="text-sm font-medium text-[#003333]">Numbers available:</h3>
                      <RadioGroup value={selectedNumber?.phoneNumber || ''} onValueChange={(value) => {
                        const number = availableNumbers.find(n => n.phoneNumber === value)
                        setSelectedNumber(number || null)
                      }}>
                        {availableNumbers.map((number) => (
                          <div key={number.phoneNumber} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md hover:border-[#059669]">
                            <RadioGroupItem value={number.phoneNumber} id={number.phoneNumber} />
                            <div className="flex-1">
                              <div className="font-medium text-[#003333]">{number.phoneNumber}</div>
                              <div className="text-sm text-[#003333]">{number.locality} {number.region} {number.country}</div>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                  {/* Select Button */}
                  {selectedNumber && (
                    <Button 
                      onClick={selectNumber}
                      disabled={rentLoading}
                      className="w-full text-white rounded-md font-semibold transition-colors"
                      style={{ 
                        height: '50px', 
                        fontSize: '16px', 
                        backgroundColor: '#059669' 
                      }}
                      onMouseEnter={(e) => {
                        if (!rentLoading) {
                          e.currentTarget.style.backgroundColor = '#047857';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!rentLoading) {
                          e.currentTarget.style.backgroundColor = '#059669';
                        }
                      }}
                    >
                      {rentLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Selecting...
                        </>
                      ) : (
                        'Select And Continue'
                      )}
                    </Button>
                  )}

                  {/* Message */}
                  {message && (
                    <div className="mt-4">
                      <Alert className={`border-${message.type === 'error' ? 'red' : 'green'}-200 bg-${message.type === 'error' ? 'red' : 'green'}-50`}>
                        <AlertDescription className={`text-${message.type === 'error' ? 'red' : 'green'}-700`}>
                          {message.text}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Package Selection */}
        {step === 'select-package' && (
          <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Progress indicator */}
            <OnboardingSidebar currentStep={3} />

            {/* Main content */}
            <div className="absolute inset-0 flex items-start justify-center px-4 py-8 lg:py-12 overflow-y-auto">
              <PackageSelection
                title="Choose A Package"
                subtitle="Each package has the exact same features but different quotas"
                packages={rentedPackages.map(p => ({
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  features: p.features.slice(0, 4),
                  highlighted: p.name === 'Standard'
                }))}
                loading={packageLoading}
                message={message}
                onSelect={(id) => {
                  setSelectedPackage(id as any)
                  selectPackage(id)
                }}
              />
            </div>
          </div>
        )}

        {/* Step 2: Own Twilio Configuration */}
        {step === 'own-twilio' && (
          <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Progress indicator */}
            <OnboardingSidebar currentStep={2} />

            {/* Main content */}
            <div className="absolute inset-0 flex items-start justify-center px-4 py-8 lg:py-12 overflow-y-auto">
              <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-12">
                  <h1 className="font-bold text-[#003333]" style={{ fontSize: '39.81px' }}>
                    Twilio Configuration
                  </h1>
                  <p className="font-medium text-[#003333]" style={{ fontSize: '19.2px' }}>
                    Enter your Twilio credentials. <a href="#" className="underline" style={{ color: '#059669' }}>Watch a tutorial.</a>
                  </p>
                </div>

                {/* Configuration Form */}
                <div className="rounded-lg p-8 max-w-[550px] mx-auto">
                  <div className="space-y-6">
                    {/* Give it a name */}
                    <div>
                      <label className="block text-sm font-medium text-[#003333] mb-2">Give it a name</label>
                      <Input
                        value={twilioConfig.friendly_name || ''}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, friendly_name: e.target.value }))}
                        placeholder="e.g Twilio Configuration #1"
                        className="h-12"
                        style={{ fontSize: '16px' }}
                      />
                    </div>

                    {/* Account SID */}
                    <div>
                      <label className="block text-sm font-medium text-[#003333] mb-2">Account SID</label>
                      <Input
                        value={twilioConfig.account_sid}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, account_sid: e.target.value }))}
                        placeholder="AC XXX XXX XXX"
                        className="h-12"
                        style={{ fontSize: '16px' }}
                      />
                    </div>

                    {/* Auth token */}
                    <div>
                      <label className="block text-sm font-medium text-[#003333] mb-2">Auth token</label>
                      <div className="relative">
                        <Input
                          type={showAuthToken ? "text" : "password"}
                          value={twilioConfig.auth_token}
                          onChange={(e) => setTwilioConfig(prev => ({ ...prev, auth_token: e.target.value }))}
                          placeholder="Twilio AUTH TOKEN"
                          className="h-12 pr-12"
                          style={{ fontSize: '16px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showAuthToken ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    {/* Phone number */}
                    <div>
                      <label className="block text-sm font-medium text-[#003333] mb-2">Phone number</label>
                      <Input
                        value={twilioConfig.phone_number}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, phone_number: e.target.value }))}
                        placeholder="Twilio phone number"
                        className="h-12"
                        style={{ fontSize: '16px' }}
                      />
                    </div>

                    {/* API Key SID */}
                    <div>
                      <label className="block text-sm font-medium text-[#003333] mb-2">API Key SID</label>
                      <Input
                        value={twilioConfig.api_key || ''}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, api_key: e.target.value }))}
                        placeholder="SK XXX XXX XXX"
                        className="h-12"
                        style={{ fontSize: '16px' }}
                      />
                    </div>

                    {/* API Secret */}
                    <div>
                      <label className="block text-sm font-medium text-[#003333] mb-2">API Secret</label>
                      <div className="relative">
                        <Input
                          type={showApiSecret ? "text" : "password"}
                          value={twilioConfig.api_secret || ''}
                          onChange={(e) => setTwilioConfig(prev => ({ ...prev, api_secret: e.target.value }))}
                          placeholder="SK XXX XXX XXX"
                          className="h-12 pr-12"
                          style={{ fontSize: '16px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiSecret(!showApiSecret)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showApiSecret ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    {/* TwiML APP SID */}
                    <div>
                      <label className="block text-sm font-medium text-[#003333] mb-2">TwiML APP SID</label>
                      <Input
                        value={twilioConfig.twiml_app_sid || ''}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, twiml_app_sid: e.target.value }))}
                        placeholder="SK XXX XXX XXX"
                        className="h-12"
                        style={{ fontSize: '16px' }}
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button 
                    onClick={saveOwnTwilioConfig}
                    disabled={configLoading}
                    className="w-full mt-8 text-white rounded-md font-semibold transition-colors"
                    style={{ 
                      height: '50px', 
                      fontSize: '16px', 
                      backgroundColor: '#059669',
                      borderRadius: '11px' 
                    }}
                    onMouseEnter={(e) => {
                      if (!configLoading) { e.currentTarget.style.backgroundColor = '#047857'; }
                    }}
                    onMouseLeave={(e) => {
                      if (!configLoading) { e.currentTarget.style.backgroundColor = '#059669'; }
                    }}
                  >
                    {configLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save And Continue'
                    )}
                  </Button>

                  {/* Message */}
                  {message && (
                    <div className="mt-4">
                      <Alert className={`border-${message.type === 'error' ? 'red' : 'green'}-200 bg-${message.type === 'error' ? 'red' : 'green'}-50`}>
                        <AlertDescription className={`text-${message.type === 'error' ? 'red' : 'green'}-700`}>
                          {message.text}
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Package Selection for Own Twilio */}
        {step === 'select-package-own' && (
          <div className="min-h-screen flex flex-col lg:flex-row">
            {/* Progress indicator */}
            <OnboardingSidebar currentStep={3} />

            {/* Main content */}
            <div className="absolute inset-0 flex items-start justify-center px-4 py-8 lg:py-12 overflow-y-auto">
              <PackageSelection
                title="Choose A Package"
                subtitle="Each package has the exact same features but different quotas"
                packages={ownPackages.map(p => ({
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  features: p.features.slice(0, 4),
                  highlighted: p.name === 'Standard'
                }))}
                loading={packageLoading}
                message={message}
                onSelect={(id) => {
                  setSelectedPackage(id as any)
                  selectPackageOwn()
                }}
              />
            </div>
          </div>
        )}

        {/* All other steps with old design for now... */}
        {!['choice', 'rent-number', 'select-package', 'select-package-own', 'own-twilio'].includes(step) && (
          <div className="py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Tere tulemast!</h1>
                <p className="mt-2 text-lg text-gray-600">
                  Seadigem teie telefonimüügi süsteem valmis
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="flex justify-center mb-8 overflow-x-auto">
                <div className="flex items-center space-x-2 min-w-max">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                    step === 'choice' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    1
                  </div>
                  <div className="w-8 h-0.5 bg-gray-200"></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                    ['own-twilio', 'rent-number'].includes(step) ? 'bg-blue-600 text-white' 
                    : ['select-package', 'payment', 'setup-complete'].includes(step) ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }`}>
                    2
                  </div>
                  <div className="w-8 h-0.5 bg-gray-200"></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                    step === 'select-package' ? 'bg-blue-600 text-white'
                    : ['payment', 'setup-complete'].includes(step) ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }`}>
                    3
                  </div>
                  <div className="w-8 h-0.5 bg-gray-200"></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                    step === 'payment' ? 'bg-blue-600 text-white'
                    : step === 'setup-complete' ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }`}>
                    4
                  </div>
                  <div className="w-8 h-0.5 bg-gray-200"></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm ${
                    step === 'setup-complete' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    5
                  </div>
                </div>
              </div>

              {/* Rest of the steps remain unchanged... */}
              {/* I'll keep the existing step implementations for now */}
            </div>
          </div>
        )}
      </div>
    </>
  )
} 