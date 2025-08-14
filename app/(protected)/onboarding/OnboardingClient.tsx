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

export default function OnboardingClient() {
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

  const getAvailableNumberTypes = (country: string) => {
    return numberTypeOptions[country as keyof typeof numberTypeOptions] || ['local']
  }

  const handleCountryChange = (value: string) => {
    setSearchFilters(prev => ({
      ...prev,
      country: value,
      type: 'local',
      areaCode: '',
      city: ''
    }))
    setAvailableNumbers([])
  }

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session?.user) {
          router.push('/login')
          return
        }
        setUser(session.user)
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
      } catch (e) {
        console.error('Auth error:', e)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router, supabase])

  useEffect(() => {
    const saveProgress = async () => {
      if (!user) return
      try {
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
        prevStepRef.current = step
      } catch (e) {
        console.warn('Failed to save onboarding progress:', e)
      }
    }
    saveProgress()
  }, [step, user, supabase, completedSteps])

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
        setSelectedPhoneNumberId(data.selectionId)
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

  const purchasePackage = async () => {
    if (!selectedPackage) return
    setPackageLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/rent-number/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectionId: selectedPhoneNumberId,
          packageId: selectedPackage
        })
      })
      const data = await response.json()
      if (data.success) {
        const stripe = await getStripe()
        await stripe?.redirectToCheckout({ sessionId: data.sessionId })
      } else {
        setMessage({ type: 'error', text: data.error || 'Paketi ost ebaõnnestus' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Võrguühenduse viga' })
    } finally {
      setPackageLoading(false)
    }
  }

  const saveTwilioConfig = async () => {
    setConfigLoading(true)
    setMessage(null)
    try {
      const response = await fetch('/api/onboarding/twilio-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(twilioConfig)
      })
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Seaded salvestatud edukalt' })
        setStep('setup-complete')
      } else {
        setMessage({ type: 'error', text: data.error || 'Seadete salvestamine ebaõnnestus' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Võrguühenduse viga' })
    } finally {
      setConfigLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#111315] text-white">
      <div className="container mx-auto py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-4">
            <OnboardingSidebar currentStep={step} completedSteps={completedSteps} />
          </div>
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {step === 'choice' && (
              <Card className="bg-[#1A1D21] border-[#2A2F36]">
                <CardHeader>
                  <CardTitle className="text-2xl">Alustame seadistusega</CardTitle>
                  <CardDescription className="text-gray-400">
                    Vali, kuidas soovid meie süsteemi kasutada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className={`p-6 rounded-lg border ${selectedOption === 'own' ? 'border-[#0D8BFF]' : 'border-[#2A2F36]'} bg-[#16181C]`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Shield className="h-6 w-6 text-[#0D8BFF]" />
                          <h3 className="text-lg font-semibold">Kasuta enda Twiliot</h3>
                        </div>
                        <Badge variant="secondary" className="bg-[#0D8BFF]/10 text-[#0D8BFF]">Soovitatav</Badge>
                      </div>
                      <p className="mt-2 text-gray-400">Kiireim viis alustada, kui sul on olemas Twilio konto</p>
                      <div className="mt-4">
                        <Button onClick={() => { setSelectedOption('own'); setStep('own-twilio') }} className="w-full bg-[#0D8BFF] hover:bg-[#0b7adf]">
                          Valin enda Twilio <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className={`p-6 rounded-lg border ${selectedOption === 'rent' ? 'border-[#0D8BFF]' : 'border-[#2A2F36]'} bg-[#16181C]`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Phone className="h-6 w-6 text-[#0D8BFF]" />
                          <h3 className="text-lg font-semibold">Rendi number meie kaudu</h3>
                        </div>
                        <Badge variant="secondary" className="bg-[#0D8BFF]/10 text-[#0D8BFF]">Lihtsaim</Badge>
                      </div>
                      <p className="mt-2 text-gray-400">Me hoolitseme numbrite ja seadistuse eest sinu eest</p>
                      <div className="mt-4">
                        <Button onClick={() => { setSelectedOption('rent'); setStep('rent-number') }} className="w-full bg-[#0D8BFF] hover:bg-[#0b7adf]">
                          Valin rendi <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 'rent-number' && (
              <Card className="bg-[#1A1D21] border-[#2A2F36]">
                <CardHeader>
                  <CardTitle className="text-2xl">Vali telefoninumber</CardTitle>
                  <CardDescription className="text-gray-400">
                    Leia sobiv number oma riigis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Riik</Label>
                      <Select value={searchFilters.country} onValueChange={handleCountryChange}>
                        <SelectTrigger className="bg-[#16181C] border-[#2A2F36] text-white">
                          <SelectValue placeholder="Vali riik" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1D21] border-[#2A2F36] text-white">
                          {countryOptions.map((country) => (
                            <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300">Numbrityüp</Label>
                      <Select value={searchFilters.type} onValueChange={(value) => setSearchFilters(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger className="bg-[#16181C] border-[#2A2F36] text-white">
                          <SelectValue placeholder="Vali tüüp" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1D21] border-[#2A2F36] text-white">
                          {getAvailableNumberTypes(searchFilters.country).map((type) => (
                            <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {searchFilters.country === 'US' && searchFilters.type === 'local' && (
                      <div>
                        <Label className="text-gray-300">Piirkonna kood (optional)</Label>
                        <Input
                          value={searchFilters.areaCode}
                          onChange={(e) => setSearchFilters(prev => ({ ...prev, areaCode: e.target.value }))}
                          placeholder="Näiteks: 415"
                          className="bg-[#16181C] border-[#2A2F36] text-white"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-gray-300">Linn (optional)</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          value={searchFilters.city}
                          onChange={(e) => setSearchFilters(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="Näiteks: Tallinn"
                          className="pl-10 bg-[#16181C] border-[#2A2F36] text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button onClick={searchNumbers} disabled={searchLoading} className="bg-[#0D8BFF] hover:bg-[#0b7adf]">
                      {searchLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Otsin numbreid...</>) : 'Otsi numbreid'}
                    </Button>
                  </div>

                  {availableNumbers.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableNumbers.map((num) => (
                        <Card key={num.phoneNumber} className="bg-[#16181C] border-[#2A2F36]">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-lg font-semibold">{num.phoneNumber}</div>
                                <div className="text-sm text-gray-400">{num.locality}, {num.region}, {num.country}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-400 flex items-center justify-end gap-1">
                                  <DollarSign className="h-4 w-4" /> {num.pricing.monthlyPrice} / mo
                                </div>
                                <div className="text-xs text-gray-500">+ setup {num.pricing.setupPrice}</div>
                              </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                              <Button onClick={() => setSelectedNumber(num)} className="bg-[#0D8BFF] hover:bg-[#0b7adf]">Vali</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {selectedNumber && step === 'select-package' && (
              <PackageSelection
                selectedNumber={selectedNumber}
                selectedPackage={selectedPackage}
                setSelectedPackage={setSelectedPackage}
                onBack={() => setStep('rent-number')}
                onContinue={purchasePackage}
                loading={packageLoading}
              />
            )}

            {step === 'own-twilio' && (
              <Card className="bg-[#1A1D21] border-[#2A2F36]">
                <CardHeader>
                  <CardTitle className="text-2xl">Sisesta Twilio seadistused</CardTitle>
                  <CardDescription className="text-gray-400">Sinu andmeid hoitakse turvaliselt</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Account SID</Label>
                    <Input
                      value={twilioConfig.account_sid}
                      onChange={(e) => setTwilioConfig(prev => ({ ...prev, account_sid: e.target.value }))}
                      className="bg-[#16181C] border-[#2A2F36] text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Auth Token</Label>
                    <div className="relative">
                      <Input
                        type={showAuthToken ? 'text' : 'password'}
                        value={twilioConfig.auth_token}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, auth_token: e.target.value }))}
                        className="pr-10 bg-[#16181C] border-[#2A2F36] text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthToken(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300">API Key SID</Label>
                    <Input
                      value={twilioConfig.api_key}
                      onChange={(e) => setTwilioConfig(prev => ({ ...prev, api_key: e.target.value }))}
                      className="bg-[#16181C] border-[#2A2F36] text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">API Key Secret</Label>
                    <div className="relative">
                      <Input
                        type={showApiSecret ? 'text' : 'password'}
                        value={twilioConfig.api_secret}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, api_secret: e.target.value }))}
                        className="pr-10 bg-[#16181C] border-[#2A2F36] text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiSecret(v => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300">Twiml App SID</Label>
                    <Input
                      value={twilioConfig.twiml_app_sid}
                      onChange={(e) => setTwilioConfig(prev => ({ ...prev, twiml_app_sid: e.target.value }))}
                      className="bg-[#16181C] border-[#2A2F36] text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Telefoninumber</Label>
                    <Input
                      value={twilioConfig.phone_number}
                      onChange={(e) => setTwilioConfig(prev => ({ ...prev, phone_number: e.target.value }))}
                      placeholder="nt: +37255555555"
                      className="bg-[#16181C] border-[#2A2F36] text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Sõbralik nimi</Label>
                    <Input
                      value={twilioConfig.friendly_name}
                      onChange={(e) => setTwilioConfig(prev => ({ ...prev, friendly_name: e.target.value }))}
                      placeholder="Näiteks: Müügimeeskond"
                      className="bg-[#16181C] border-[#2A2F36] text-white"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveTwilioConfig} disabled={configLoading} className="bg-[#0D8BFF] hover:bg-[#0b7adf]">
                      {configLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvestan...</>) : 'Salvesta seaded'}
                    </Button>
                  </div>

                  {message && (
                    <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="bg-[#16181C] border-[#2A2F36] text-white">
                      <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 'setup-complete' && (
              <Card className="bg-[#1A1D21] border-[#2A2F36]">
                <CardHeader>
                  <CardTitle className="text-2xl">Seadistus lõpetatud</CardTitle>
                  <CardDescription className="text-gray-400">Oled valmis alustama!</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Users className="h-8 w-8 text-[#0D8BFF]" />
                      <div>
                        <div className="font-semibold">Kõik valmis</div>
                        <div className="text-gray-400 text-sm">Võid suunduda töölauale</div>
                      </div>
                    </div>
                    <Button onClick={() => router.push('/dashboard')} className="bg-[#0D8BFF] hover:bg-[#0b7adf]">
                      Ava Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
