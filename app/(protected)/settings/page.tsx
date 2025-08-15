'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2, Settings, X, Calendar, ExternalLink, CheckCircle, XCircle, Activity, Brain, FileText, MessageSquare, Mic, DollarSign, Clock, PhoneCall, Users, BarChart3 } from 'lucide-react'
import { Open_Sans } from 'next/font/google'
import MyAccountTab from './components/MyAccountTab'
import DailyGoalsTab from './components/DailyGoalsTab'
import IntegrationsTab from './components/IntegrationsTab'
import ScriptSettingsTab from './components/ScriptSettingsTab'
import BillingInvoicesTab, { SETTINGS_UPGRADE_PACKAGES } from './components/BillingInvoicesTab'
import UsageLimitsTab from './components/UsageLimitsTab'
import TwilioSettingsTab from './components/TwilioSettingsTab'
import TwilioConfigModal from './components/TwilioConfigModal'
import SettingsTabsNav from './components/SettingsTabsNav'

const openSans = Open_Sans({ subsets: ['latin'] })

interface TwilioUsageStats {
  hasConfig: boolean
  accountInfo?: {
    accountSid: string
    friendlyName: string
    phoneNumber: string
  }
  statistics?: {
    totalCalls: number
    outboundCalls: number
    inboundCalls: number
    totalCallTime: number
    outboundCallTime: number
    inboundCallTime: number
    totalCost: number
    successRate: number
    answeredCalls: number
    notAnsweredCalls: number
    failedCalls: number
    busyCalls: number
  }
}

export default function MyAccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // User data state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  
  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordAgain, setNewPasswordAgain] = useState('')
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordAgain, setShowPasswordAgain] = useState(false)
  
  // Active settings tab
  const [activeTab, setActiveTab] = useState('my-account')
  
  // Handle tab switching both locally and via URL sync
  const handleTabClick = (tab: string) => {
    const allowedTabs = ['my-account', 'billing', 'usage', 'twilio', 'scripts', 'integrations', 'daily-goals']
    if (!allowedTabs.includes(tab)) return
    if (tab !== activeTab) {
      setActiveTab(tab)
    }
    // Keep URL in sync so searchParams effect won't override local state
    const current = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null
    if (current !== tab) {
      // Use replace to avoid polluting history
      router.replace(`/settings?tab=${tab}`)
    }
  }
  
  // Package management state
  const [packageLoading, setPackageLoading] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<string>('')
  const [customerPortalLoading, setCustomerPortalLoading] = useState(false)
  
  // Twilio configs state
  const [twilioConfigs, setTwilioConfigs] = useState<any[]>([])
  const [loadingTwilioConfigs, setLoadingTwilioConfigs] = useState(false)
  const [showTwilioForm, setShowTwilioForm] = useState(false)
  const [editingTwilioConfig, setEditingTwilioConfig] = useState<any>(null)
  const [twilioFormData, setTwilioFormData] = useState({
    friendly_name: '',
    account_sid: '',
    auth_token: '',
    api_key: '',
    api_secret: '',
    phone_number: '',
    twiml_app_sid: '',
    is_default: false
  })

  // Google Calendar integration state
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false)
  const [loadingGoogleCalendar, setLoadingGoogleCalendar] = useState(false)
  const [googleCalendarInfo, setGoogleCalendarInfo] = useState<any>(null)
  const [calendars, setCalendars] = useState<any[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState('')
  const [calendarEvents, setCalendarEvents] = useState<any[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventFormData, setEventFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    attendees: ''
  })

  // Usage statistics state
  const [usageStats, setUsageStats] = useState<any>(null)
  
  // Daily goals state
  const [dailyGoals, setDailyGoals] = useState({
    calls_goal: 0,
    contacts_goal: 0,
    meetings_goal: 0,
    callbacks_goal: 0
  })
  const [dailyGoalsLoading, setDailyGoalsLoading] = useState(false)
  const [dailyGoalsSaving, setDailyGoalsSaving] = useState(false)

  // Scripts settings state
  const [scriptsLoading, setScriptsLoading] = useState(false)
  const [callerName, setCallerName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [position, setPosition] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [usageLoading, setUsageLoading] = useState(false)
  const [usagePeriod, setUsagePeriod] = useState('current_month')
  const [packageUsage, setPackageUsage] = useState<any>(null)
  const [twilioStats, setTwilioStats] = useState<TwilioUsageStats | null>(null)
  const [twilioLoading, setTwilioLoading] = useState(true)
  
  // Invoices state
  const [invoices, setInvoices] = useState<any[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  
  // Package data with database IDs (imported from BillingInvoicesTab to keep a single source of truth)
  const packages = SETTINGS_UPGRADE_PACKAGES
  

  // Get available upgrade packages based on current package
  const getAvailableUpgradePackages = () => {
    if (!subscription?.package_types?.id) return []
    
    const currentPackageId = parseInt(subscription.package_types.id.toString())
    return packages.filter(pkg => pkg.dbId > currentPackageId)
  }

  // Map tab keys to human-friendly titles for the browser tab
  const TAB_TITLES: Record<string, string> = {
    'my-account': 'My Account',
    billing: 'Billing & Invoices',
    usage: 'Usage',
    twilio: 'Twilio',
    scripts: 'Scripts Settings',
    integrations: 'Integrations',
    'daily-goals': 'Daily Goals',
  }

  const getTabTitle = (tab: string) => TAB_TITLES[tab] || 'Settings'

  // Keep activeTab in sync with URL query (reacts to Link navigations and history changes)
  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'my-account'
    const allowedTabs = ['my-account', 'billing', 'usage', 'twilio', 'scripts', 'integrations', 'daily-goals']
    if (allowedTabs.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Update the document title to reflect current tab (uses global template branding)
  useEffect(() => {
    const title = `WeColdCall - ${getTabTitle(activeTab)}`
    if (typeof document !== 'undefined') {
      document.title = title
    }
  }, [activeTab])

  // Get package features for upgrade packages (using real database structure)
  const getPackageFeaturesForUpgrade = async (packageId: number) => {
    try {
      const { data: packageData, error } = await supabase
        .from('package_types')
        .select('*')
        .eq('id', packageId)
        .single()
      
      if (error || !packageData) return { basicFeatures: [], aiFeatures: [] }
      
      const pkg = packageData
      const isUnlimited = [4, 5, 6].includes(packageId)
      
      // Helper functions
      const formatNumber = (num: number | null | undefined) => {
        if (num == null) return '0'
        return num.toLocaleString()
      }
      
      const isUnlimitedValue = (value: number | null | undefined) => {
        return value != null && value >= 9999999
      }
      
      const basicFeatures = []
      const aiFeatures = []
      
      // Basic Features
      basicFeatures.push('UNLIMITED calls (call minutes not incl.)')
      
      if (isUnlimitedValue(pkg.max_call_scripts)) {
        basicFeatures.push('Unlimited call Scripts')
      } else {
        basicFeatures.push(`${pkg.max_call_scripts || 0} call Scripts`)
      }
      
      if (isUnlimitedValue(pkg.max_contact_lists)) {
        basicFeatures.push('Unlimited contact lists')
      } else {
        basicFeatures.push(`${pkg.max_contact_lists || 0} contact lists`)
      }
      
      if (isUnlimitedValue(pkg.max_contacts_per_list)) {
        basicFeatures.push('Unlimited contacts per/list')
      } else {
        basicFeatures.push(`Up to ${formatNumber(pkg.max_contacts_per_list)} contacts per/list`)
      }
      
      if (isUnlimitedValue(pkg.max_total_contacts)) {
        basicFeatures.push('Unlimited total contacts')
      } else {
        basicFeatures.push(`Up to ${formatNumber(pkg.max_total_contacts)} total contacts`)
      }
      
      if (isUnlimitedValue(pkg.max_recordings_access)) {
        basicFeatures.push('Unlimited Call Recordings per/mo.')
      } else {
        basicFeatures.push(`${pkg.max_recordings_access || 0} Call Recordings per/mo.`)
      }
      
      // AI Features
      if (isUnlimitedValue(pkg.max_transcription_access)) {
        aiFeatures.push('Unlimited Call Transcription Gen. per/mo.')
      } else {
        aiFeatures.push(`${pkg.max_transcription_access || 0} Call Transcription Gen. per/mo.`)
      }
      
      if (isUnlimitedValue(pkg.max_call_summary_generations)) {
        aiFeatures.push('Unlimited Call Summarie Gen. per/mo.')
      } else {
        aiFeatures.push(`${pkg.max_call_summary_generations || 0} Call Summarie Gen. per/mo.`)
      }
      
      if (isUnlimitedValue(pkg.max_call_suggestions_generations)) {
        aiFeatures.push('Unlimited Call Suggestions Gen. per/mo.')
      } else {
        aiFeatures.push(`${pkg.max_call_suggestions_generations || 0} Call Suggestions Gen. per/mo.`)
      }
      
      if (isUnlimitedValue(pkg.max_script_generations)) {
        aiFeatures.push('Unlimited Call Script Gen. per/mo.')
      } else {
        aiFeatures.push(`${pkg.max_script_generations || 0} Call Script Gen. per/mo.`)
      }
      
      if (isUnlimitedValue(pkg.max_objection_generations)) {
        aiFeatures.push('Unlimited Call Script Objection Gen. per/mo.')
      } else {
        aiFeatures.push(`${pkg.max_objection_generations || 0} Call Script Objection Gen. per/mo.`)
      }
      
      return { basicFeatures, aiFeatures, packageData: pkg }
    } catch (error) {
      console.error('Error loading package features:', error)
      return { basicFeatures: [], aiFeatures: [] }
    }
  }

  // Upgrade Package Card Component
  const UpgradePackageCard = ({ packageInfo }: { packageInfo: any }) => {
    const [packageFeatures, setPackageFeatures] = useState<any>({ basicFeatures: [], aiFeatures: [] })
    const [loadingFeatures, setLoadingFeatures] = useState(true)

    useEffect(() => {
      const loadFeatures = async () => {
        setLoadingFeatures(true)
        const features = await getPackageFeaturesForUpgrade(packageInfo.dbId)
        setPackageFeatures(features)
        setLoadingFeatures(false)
      }
      loadFeatures()
    }, [packageInfo.dbId])

    return (
      <div className="rounded-lg p-6 border bg-white transition-colors" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
        {/* Package Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xl font-bold" style={{ color: '#003333' }}>
              {packageFeatures.packageData?.package_display_name || packageInfo.name}
            </h4>
            <span className="text-white text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: '#059669' }}>
              Upgrade
            </span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold" style={{ color: '#003333' }}>
              ${packageFeatures.packageData?.monthly_cost || packageInfo.price}
            </span>
            <span className="text-sm" style={{ color: '#003333' }}> / mo.</span>
          </div>
        
        </div>

        {/* Package Features */}
        {loadingFeatures ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#059669' }}></div>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {/* Basic Features */}
            {packageFeatures.basicFeatures.length > 0 && (
              <div>
                <h6 className="text-sm font-semibold mb-2" style={{ color: '#003333' }}>Basic features:</h6>
                <div className="space-y-1">
                  {packageFeatures.basicFeatures.map((feature: string, index: number) => (
                    <div key={`basic-${index}`} className="flex items-start">
                      <div className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style={{ color: '#059669' }}>✓</div>
                      <span className="text-sm" style={{ color: '#003333' }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* AI Features */}
            {packageFeatures.aiFeatures.length > 0 && (
              <div>
                <h6 className="text-sm font-semibold mb-2" style={{ color: '#003333' }}>AI Features:</h6>
                <div className="space-y-1">
                  {packageFeatures.aiFeatures.map((feature: string, index: number) => (
                    <div key={`ai-${index}`} className="flex items-start">
                      <div className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" style={{ color: '#059669' }}>✓</div>
                      <span className="text-sm" style={{ color: '#003333' }}>
                        <span className="text-white px-1.5 py-0.5 rounded text-xs font-bold mr-1" style={{ backgroundColor: '#059669' }}>
                          AI
                        </span>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upgrade Button */}
        <Button
          onClick={handleEditSubscription}
          disabled={customerPortalLoading}
          className="w-full text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#059669', borderRadius: '11px' }}
          onMouseEnter={(e) => { if (!customerPortalLoading) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#047857' } }}
          onMouseLeave={(e) => { if (!customerPortalLoading) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#059669' } }}
        >
          {customerPortalLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2" style={{ borderColor: '#059669', borderBottomColor: '#FFFFFF' }}></div>
              Opening portal...
            </>
          ) : (
            `Upgrade to ${packageFeatures.packageData?.package_display_name || packageInfo.name}`
          )}
        </Button>
      </div>
    )
  }

  useEffect(() => {
    loadUserData()
  }, [])

  // Load Twilio configs when tab changes to twilio
  useEffect(() => {
    if (activeTab === 'twilio' && user) {
      loadTwilioConfigs()
    }
  }, [activeTab, user])

  // Load usage stats when tab changes to usage
  useEffect(() => {
    if (activeTab === 'usage' && user) {
      loadUsageStats()
      loadPackageUsage()
      loadTwilioStats()
    }
  }, [activeTab, user, usagePeriod])

  // Load Google Calendar data when integrations tab is opened
  useEffect(() => {
    if (activeTab === 'integrations' && user) {
      loadCalendarData()
    }
  }, [activeTab, user])

  // Load profile data when scripts tab is opened
  useEffect(() => {
    if (activeTab === 'scripts' && user) {
      loadProfileData()
    }
  }, [activeTab, user])

  // Load invoices when billing tab is opened
  useEffect(() => {
    if (activeTab === 'billing' && user) {
      loadInvoices()
    }
  }, [activeTab, user])

  // Load daily goals when daily-goals tab is opened
  useEffect(() => {
    if (activeTab === 'daily-goals' && user) {
      loadDailyGoals()
    }
  }, [activeTab, user])

  // Note: activeTab is initialized from URL on mount and kept in sync via popstate listener above.
  // Avoid syncing from URL on each activeTab change to prevent stale URL overriding fresh state.

  // Handle Google Calendar success/error once on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')

    if (success === 'google_calendar_connected') {
      alert('Google Calendar connected successfully!')
      loadCalendarData()
      // Clean up URL
      window.history.replaceState({}, '', '/settings?tab=integrations')
    }

    if (error === 'google_auth_failed') {
      alert('Failed to connect Google Calendar. Please try again.')
      // Clean up URL
      window.history.replaceState({}, '', '/settings?tab=integrations')
    }
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        router.push('/login')
        return
      }

      setUser(user)
      setEmail(user.email || '')

      // Load profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setProfile(profile)
        setFirstName(profile.first_name || '')
        setLastName(profile.last_name || '')
      }

      // Load subscription data with package info
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          package_types (
            id,
            package_name,
            package_display_name,
            monthly_cost,
            monthly_call_minutes,
            max_recordings_access,
            max_call_scripts,
            max_contact_lists,
            max_contacts_per_list,
            max_total_contacts,
            max_transcription_access,
            max_call_summary_generations,
            max_call_suggestions_generations,
            max_script_generations,
            max_objection_generations,
            max_concurrent_calls,
            priority_support
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['active', 'canceled'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (subscription) {
        console.log('Loaded subscription:', subscription)
        console.log('Package types:', subscription.package_types)
        setSubscription(subscription)
        setSelectedPackage(subscription.package_id?.toString() || '')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInvoices = async () => {
    if (!user) return
    
    setLoadingInvoices(true)
    try {
      const response = await fetch('/api/stripe/invoices')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      } else {
        console.error('Failed to load invoices')
      }
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoadingInvoices(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      alert('Profile updated successfully!')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      alert('Error updating profile: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Load profile data for scripts settings
  const loadProfileData = async () => {
    if (!user) return

    setScriptsLoading(true)
    try {
      const response = await fetch('/api/profile')
      
      if (!response.ok) {
        throw new Error('Failed to load profile data')
      }

      const profileData = await response.json()
      
      setCallerName(profileData.caller_name || '')
      setCompanyName(profileData.company_name || '')
      setPosition(profileData.position || '')
      setPhoneNumber(profileData.phone_number || '')
    } catch (error) {
      console.error('Error loading profile data:', error)
      alert('Error loading profile data')
    } finally {
      setScriptsLoading(false)
    }
  }

  // Save scripts settings
  const saveScriptsSettings = async () => {
    if (!user) return

    if (!callerName.trim()) {
      alert('Caller name is required')
      return
    }

    if (!companyName.trim()) {
      alert('Company name is required')
      return
    }

    setScriptsLoading(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caller_name: callerName,
          company_name: companyName,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          position: position
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save profile')
      }

      alert('Script settings saved successfully!')
    } catch (error: any) {
      console.error('Error saving scripts settings:', error)
      alert('Error saving settings: ' + error.message)
    } finally {
      setScriptsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || !newPasswordAgain) {
      alert('Please fill in both password fields')
      return
    }

    if (newPassword !== newPasswordAgain) {
      alert('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setNewPassword('')
      setNewPasswordAgain('')
      alert('Password updated successfully!')
    } catch (error: any) {
      console.error('Error updating password:', error)
      alert('Error updating password: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handlePackageChange = async (packageId: string) => {
    if (!user || packageId === subscription?.package_id?.toString()) return

    setPackageLoading(true)
    try {
      // Create Stripe checkout session for package change
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: packageId,
          isUpgrade: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error: any) {
      console.error('Error changing package:', error)
      alert('Error changing package: ' + error.message)
    } finally {
      setPackageLoading(false)
    }
  }

  // Function to open Stripe Customer Portal
  const handleEditSubscription = async () => {
    if (!user) return
    console.log('🟢 handleEditSubscription clicked')

    // Open a tab synchronously to avoid popup blockers
    const portalTab = window.open('about:blank')
    setCustomerPortalLoading(true)
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // customerId optional; server will resolve if missing
          customerId: subscription?.stripe_customer_id || undefined,
          returnUrl: window.location.href
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create customer portal session')
      }

      const { url } = await response.json()
      if (portalTab) {
        portalTab.location.href = url
      } else {
        // Fallback: navigate current tab if popup blocked
        window.location.href = url
      }
    } catch (error: any) {
      console.error('Error opening customer portal:', error)
      if (portalTab && !portalTab.closed) {
        portalTab.close()
      }
      alert('Error opening customer portal: ' + (error?.message || 'Unknown error'))
    } finally {
      setCustomerPortalLoading(false)
    }
  }

  const getCurrentPackage = () => {
    if (!subscription?.package_types) return null
    return {
      id: subscription.package_types.id,
      name: subscription.package_types.package_display_name,
      price: parseFloat(subscription.package_types.monthly_cost),
      minutes: subscription.package_types.monthly_call_minutes
    }
  }

  // Helper function to format call minutes display
  const formatCallMinutes = (minutes: number | string, packageId?: number | string) => {
    const id = packageId ? parseInt(packageId.toString()) : null
    if (id && [4, 5, 6].includes(id)) {
      return 'Unlimited calls'
    }
    return `${minutes} minutes`
  }

  // Helper function to get current package features based on real database data
  const getCurrentPackageFeatures = () => {
    if (!subscription?.package_types) return { basicFeatures: [], aiFeatures: [] }
    
    const pkg = subscription.package_types
    const id = parseInt(pkg.id?.toString() || '0')
    const isUnlimited = [4, 5, 6].includes(id)
    
    // Helper function to safely format numbers
    const formatNumber = (num: number | null | undefined) => {
      if (num == null) return '0'
      return num.toLocaleString()
    }
    
    // Helper function to check if value is unlimited
    const isUnlimitedValue = (value: number | null | undefined) => {
      return value != null && value >= 9999999
    }
    
    const basicFeatures = []
    const aiFeatures = []
    
    // Basic Features
    // Call minutes - always show as UNLIMITED for display
    basicFeatures.push('UNLIMITED calls (call minutes not incl.)')
    
    // Call scripts
    if (isUnlimitedValue(pkg.max_call_scripts)) {
      basicFeatures.push('Unlimited call Scripts')
    } else {
      basicFeatures.push(`${pkg.max_call_scripts || 0} call Scripts`)
    }
    
    // Contact lists
    if (isUnlimitedValue(pkg.max_contact_lists)) {
      basicFeatures.push('Unlimited contact lists')
    } else {
      basicFeatures.push(`${pkg.max_contact_lists || 0} contact lists`)
    }
    
    // Contacts per list
    if (isUnlimitedValue(pkg.max_contacts_per_list)) {
      basicFeatures.push('Unlimited contacts per/list')
    } else {
      basicFeatures.push(`Up to ${formatNumber(pkg.max_contacts_per_list)} contacts per/list`)
    }
    
    // Total contacts
    if (isUnlimitedValue(pkg.max_total_contacts)) {
      basicFeatures.push('Unlimited total contacts')
    } else {
      basicFeatures.push(`Up to ${formatNumber(pkg.max_total_contacts)} total contacts`)
    }
    
    // Recording access
    if (isUnlimitedValue(pkg.max_recordings_access)) {
      basicFeatures.push('Unlimited Call Recordings per/mo.')
    } else {
      basicFeatures.push(`${pkg.max_recordings_access || 0} Call Recordings per/mo.`)
    }
    
    // AI Features
    // Transcription access
    if (isUnlimitedValue(pkg.max_transcription_access)) {
      aiFeatures.push('Unlimited Call Transcription Gen. per/mo.')
    } else {
      aiFeatures.push(`${pkg.max_transcription_access || 0} Call Transcription Gen. per/mo.`)
    }
    
    // Call summaries
    if (isUnlimitedValue(pkg.max_call_summary_generations)) {
      aiFeatures.push('Unlimited Call Summarie Gen. per/mo.')
    } else {
      aiFeatures.push(`${pkg.max_call_summary_generations || 0} Call Summarie Gen. per/mo.`)
    }
    
    // AI suggestions
    if (isUnlimitedValue(pkg.max_call_suggestions_generations)) {
      aiFeatures.push('Unlimited Call Suggestions Gen. per/mo.')
    } else {
      aiFeatures.push(`${pkg.max_call_suggestions_generations || 0} Call Suggestions Gen. per/mo.`)
    }
    
    // Script generations
    if (isUnlimitedValue(pkg.max_script_generations)) {
      aiFeatures.push('Unlimited Call Script Gen. per/mo.')
    } else {
      aiFeatures.push(`${pkg.max_script_generations || 0} Call Script Gen. per/mo.`)
    }
    
    // Objection handling
    if (isUnlimitedValue(pkg.max_objection_generations)) {
      aiFeatures.push('Unlimited Call Script Objection Gen. per/mo.')
    } else {
      aiFeatures.push(`${pkg.max_objection_generations || 0} Call Script Objection Gen. per/mo.`)
    }
    
    return { basicFeatures, aiFeatures }
  }

  // Load Twilio configurations
  const loadTwilioConfigs = async () => {
    if (!user) return
    
    setLoadingTwilioConfigs(true)
    try {
      const { data, error } = await supabase
        .from('user_twilio_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTwilioConfigs(data || [])
    } catch (error) {
      console.error('Error loading Twilio configs:', error)
    } finally {
      setLoadingTwilioConfigs(false)
    }
  }

  // Save Twilio configuration
  const saveTwilioConfig = async () => {
    if (!user) {
      alert('You must be logged in to save configuration')
      return
    }
    
    // Validation
    if (!twilioFormData.account_sid) {
      alert('Account SID is required')
      return
    }
    
    if (!twilioFormData.auth_token) {
      alert('Auth Token is required')
      return
    }
    
    if (!twilioFormData.phone_number) {
      alert('Phone Number is required')
      return
    }
    
    setSaving(true)
    try {
      if (editingTwilioConfig) {
        // Update existing config
        const updateData = {
          friendly_name: twilioFormData.friendly_name || 'Unnamed Configuration',
          account_sid: twilioFormData.account_sid,
          auth_token: twilioFormData.auth_token,
          api_key: twilioFormData.api_key || null,
          api_secret: twilioFormData.api_secret || null,
          phone_number: twilioFormData.phone_number,
          twiml_app_sid: twilioFormData.twiml_app_sid || null,
          is_default: twilioFormData.is_default,
          updated_at: new Date().toISOString()
        }

        // If setting as default, first unset all others
        if (twilioFormData.is_default) {
          await supabase
            .from('user_twilio_configs')
            .update({ is_default: false })
            .eq('user_id', user.id)
        }

        const { error } = await supabase
          .from('user_twilio_configs')
          .update(updateData)
          .eq('id', editingTwilioConfig.id)

        if (error) throw error
        alert('Twilio configuration updated successfully!')
      } else {
        // Create new config
        const insertData = {
          user_id: user.id,
          friendly_name: twilioFormData.friendly_name || 'Unnamed Configuration',
          account_sid: twilioFormData.account_sid,
          auth_token: twilioFormData.auth_token,
          api_key: twilioFormData.api_key || null,
          api_secret: twilioFormData.api_secret || null,
          phone_number: twilioFormData.phone_number,
          twiml_app_sid: twilioFormData.twiml_app_sid || null,
          is_default: twilioFormData.is_default,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // If setting as default, first unset all others
        if (twilioFormData.is_default) {
          await supabase
            .from('user_twilio_configs')
            .update({ is_default: false })
            .eq('user_id', user.id)
        }

        const { error } = await supabase
          .from('user_twilio_configs')
          .insert(insertData)

        if (error) throw error
        alert('Twilio configuration created successfully!')
      }

      // Reset form and reload configs
      setShowTwilioForm(false)
      setEditingTwilioConfig(null)
      resetTwilioForm()
      loadTwilioConfigs()
    } catch (error: any) {
      console.error('Error saving Twilio config:', error)
      alert('Error saving Twilio configuration: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  // Delete Twilio configuration
  const deleteTwilioConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this Twilio configuration?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('user_twilio_configs')
        .delete()
        .eq('id', configId)

      if (error) throw error
      
      alert('Twilio configuration deleted successfully!')
      loadTwilioConfigs()
    } catch (error: any) {
      console.error('Error deleting Twilio config:', error)
      alert('Error deleting Twilio configuration: ' + error.message)
    }
  }

  // Set as default configuration
  const setDefaultTwilioConfig = async (configId: string) => {
    if (!user) return

    try {
      // First, set all configs as non-default
      await supabase
        .from('user_twilio_configs')
        .update({ is_default: false })
        .eq('user_id', user.id)

      // Then set the selected one as default
      const { error } = await supabase
        .from('user_twilio_configs')
        .update({ is_default: true })
        .eq('id', configId)

      if (error) throw error
      
      alert('Default Twilio configuration updated!')
      loadTwilioConfigs()
    } catch (error: any) {
      console.error('Error setting default config:', error)
      alert('Error setting default configuration: ' + error.message)
    }
  }

  // Reset Twilio form
  const resetTwilioForm = () => {
    setTwilioFormData({
      friendly_name: '',
      account_sid: '',
      auth_token: '',
      api_key: '',
      api_secret: '',
      phone_number: '',
      twiml_app_sid: '',
      is_default: false
    })
  }

  // Load usage statistics
  const loadUsageStats = async () => {
    if (!user) return
    
    setUsageLoading(true)
    try {
      const response = await fetch(`/api/ai-usage/stats?period=${usagePeriod}`)
      const data = await response.json()
      setUsageStats(data.stats)
    } catch (error) {
      console.error('Error loading usage stats:', error)
    } finally {
      setUsageLoading(false)
    }
  }

  // Load Twilio statistics
  const loadTwilioStats = async () => {
    if (!user) return
    
    setTwilioLoading(true)
    try {
      // Calculate date range based on period
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      let startDate = ''
      let endDate = ''

      if (usagePeriod === 'current_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        endDate = tomorrow.toISOString().split('T')[0]
      } else if (usagePeriod === 'last_month') {
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        startDate = lastMonthStart.toISOString().split('T')[0]
        endDate = lastMonthEnd.toISOString().split('T')[0]
      } else { // all_time
        startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0]
        endDate = tomorrow.toISOString().split('T')[0]
      }
      
      const response = await fetch(`/api/twilio/usage?startDate=${startDate}&endDate=${endDate}`)
      const data = await response.json()
      setTwilioStats(data)
    } catch (err) {
      console.error('Error fetching Twilio usage stats:', err)
      setTwilioStats({ hasConfig: false })
    } finally {
      setTwilioLoading(false)
    }
  }

  // Load package usage information
  const loadPackageUsage = async () => {
    if (!user) return
    
    try {
      const response = await fetch('/api/package-limits')
      const data = await response.json()
      setPackageUsage(data)
    } catch (error) {
      console.error('Error loading package usage:', error)
    }
  }

  // Edit Twilio configuration
  const editTwilioConfig = (config: any) => {
    setTwilioFormData({
      friendly_name: config.friendly_name || '',
      account_sid: config.account_sid || '',
      auth_token: config.auth_token || '',
      api_key: config.api_key || '',
      api_secret: config.api_secret || '',
      phone_number: config.phone_number || '',
      twiml_app_sid: config.twiml_app_sid || '',
      is_default: config.is_default || false
    })
    setEditingTwilioConfig(config)
    setShowTwilioForm(true)
  }

  // Google Calendar functions
  const connectGoogleCalendar = async () => {
    if (!user) {
      alert('Please log in first')
      return
    }
    
    setLoadingGoogleCalendar(true)
    try {
      // Redirect to Google OAuth - the API route will handle authentication check
      window.location.href = '/api/google-calendar/auth'
    } catch (error) {
      console.error('Error connecting Google Calendar:', error)
      setLoadingGoogleCalendar(false)
    }
  }

  const disconnectGoogleCalendar = async () => {
    try {
      const response = await fetch('/api/google-calendar/events', {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setGoogleCalendarConnected(false)
        setGoogleCalendarInfo(null)
        setCalendars([])
        setSelectedCalendar('')
        setCalendarEvents([])
        alert('Google Calendar disconnected successfully!')
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error)
      alert('Error disconnecting Google Calendar')
    }
  }

  const loadCalendarData = async () => {
    try {
      console.log('🔄 Loading Google Calendar data...')
      const response = await fetch('/api/google-calendar/events')
      
      console.log('📡 Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Google Calendar data loaded:', data)
        
        setGoogleCalendarConnected(true)
        setGoogleCalendarInfo({
          email: data.integration.email,
          name: data.integration.name,
          connected_at: new Date().toISOString()
        })
        setCalendars(data.calendars.map((cal: any) => ({
          id: cal.id,
          name: cal.summary,
          primary: cal.primary || false
        })))
        setSelectedCalendar('primary')
        setCalendarEvents(data.events.map((event: any) => ({
          id: event.id,
          title: event.summary || 'No Title',
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          description: event.description || ''
        })))
      } else if (response.status === 404) {
        console.log('📭 Google Calendar not connected (404)')
        setGoogleCalendarConnected(false)
      } else if (response.status === 401) {
        console.log('🔒 User not authenticated (401)')
        setGoogleCalendarConnected(false)
      } else {
        console.error('❌ Failed to load Google Calendar data, status:', response.status)
        const errorText = await response.text()
        console.error('Error details:', errorText)
        setGoogleCalendarConnected(false)
      }
    } catch (error) {
      console.error('❌ Error loading Google Calendar data:', error)
      setGoogleCalendarConnected(false)
    }
  }

  const createCalendarEvent = async () => {
    try {
      if (!eventFormData.title || !eventFormData.start_date || !eventFormData.start_time) {
        alert('Please fill in required fields')
        return
      }

      const response = await fetch('/api/google-calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: eventFormData.title,
          description: eventFormData.description,
          startDate: eventFormData.start_date,
          startTime: eventFormData.start_time,
          endDate: eventFormData.end_date,
          endTime: eventFormData.end_time,
          attendees: eventFormData.attendees
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Add event to local state
        const newEvent = {
          id: data.event.id,
          title: data.event.title,
          start: data.event.start,
          end: data.event.end,
          description: eventFormData.description
        }

        setCalendarEvents(prev => [...prev, newEvent])
        setEventFormData({
          title: '',
          description: '',
          start_date: '',
          start_time: '',
          end_date: '',
          end_time: '',
          attendees: ''
        })
        setShowEventForm(false)
        alert('Event created successfully in Google Calendar!')
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create event')
      }
    } catch (error) {
      console.error('Error creating calendar event:', error)
      alert('Error creating event: ' + (error as Error).message)
    }
  }

  // Load daily goals
  const loadDailyGoals = async () => {
    if (!user) return
    
    try {
      setDailyGoalsLoading(true)
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (error) {
        console.error('Error loading daily goals:', error)
        return
      }
      
      if (data) {
        setDailyGoals({
          calls_goal: data.calls_goal || 0,
          contacts_goal: data.contacts_goal || 0,
          meetings_goal: data.meetings_goal || 0,
          callbacks_goal: data.callbacks_goal || 0
        })
      }
    } catch (error) {
      console.error('Error loading daily goals:', error)
    } finally {
      setDailyGoalsLoading(false)
    }
  }

  // Save daily goals
  const saveDailyGoals = async () => {
    if (!user) return
    
    try {
      setDailyGoalsSaving(true)
      
      // Check if user already has daily goals
      const { data: existingGoals } = await supabase
        .from('daily_goals')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (existingGoals) {
        // Update existing goals
        const { error } = await supabase
          .from('daily_goals')
          .update({
            ...dailyGoals,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
        
        if (error) throw error
      } else {
        // Create new goals
        const { error } = await supabase
          .from('daily_goals')
          .insert({
            user_id: user.id,
            ...dailyGoals
          })
        
        if (error) throw error
      }
      
      alert('Daily goals saved successfully!')
    } catch (error: any) {
      console.error('Error saving daily goals:', error)
      alert('Error saving daily goals: ' + (error.message || 'Unknown error'))
    } finally {
      setDailyGoalsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={`flex min-h-screen bg-gray-50 w-full ${openSans.className}`}>
        <div className="flex-1">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex min-h-screen bg-gray-50 w-full ${openSans.className}`}>
      <div className="flex-1">
        <div
          className={`pt-8 pb-8 pl-[70px] pr-[70px] bg-white border border-[#003333]/10 rounded-[10px] ${openSans.className}`}
          style={{ width: '100%', maxWidth: 1418, margin: '0 auto', marginTop: 40 }}
        >
          {/* Header */}
          <div className="mb-8 mt-0">
            <h1 className="text-[39.81px] font-bold text-[##253053] mb-2">Settings</h1>
          </div>

          {/* Horizontal Navigation Tabs */}
          <div className="mb-6">
            <div className="border-b border-[#003333]/10">
              <SettingsTabsNav activeTab={activeTab} onTabClick={handleTabClick} />
            </div>
          </div>

          {/* Content Area */}
          <div>
              {activeTab === 'my-account' && (
                <MyAccountTab
                  firstName={firstName}
                  lastName={lastName}
                  email={email}
                  newPassword={newPassword}
                  newPasswordAgain={newPasswordAgain}
                  setFirstName={setFirstName}
                  setLastName={setLastName}
                  setNewPassword={setNewPassword}
                  setNewPasswordAgain={setNewPasswordAgain}
                  saving={saving}
                  onSaveProfile={handleSaveProfile}
                  onChangePassword={handleChangePassword}
                />
              )}

              {/* Billing and Invoices Tab */}
              {activeTab === 'billing' && (
                <BillingInvoicesTab
                  subscription={subscription}
                  getCurrentPackage={getCurrentPackage}
                  getCurrentPackageFeatures={getCurrentPackageFeatures}
                  handleEditSubscription={handleEditSubscription}
                  customerPortalLoading={customerPortalLoading}
                  getAvailableUpgradePackages={getAvailableUpgradePackages}
                  loadingInvoices={loadingInvoices}
                  invoices={invoices}
                  renderUpgradeCard={(pkg) => (
                    <UpgradePackageCard key={pkg.id} packageInfo={pkg} />
                  )}
                />
              )}

              {/* Twilio Settings Tab */}
              {activeTab === 'twilio' && (
                <TwilioSettingsTab
                  loading={loadingTwilioConfigs}
                  configs={twilioConfigs}
                  onAdd={() => {
                    resetTwilioForm()
                    setEditingTwilioConfig(null)
                    setShowTwilioForm(true)
                  }}
                  onSetDefault={(id) => setDefaultTwilioConfig(id)}
                  onEdit={(config) => editTwilioConfig(config)}
                  onDelete={(id) => deleteTwilioConfig(id)}
                />
              )}

              {/* Integrations Tab */}
              {activeTab === 'integrations' && (
                <IntegrationsTab
                  googleCalendarConnected={googleCalendarConnected}
                  googleCalendarInfo={googleCalendarInfo}
                  loadingGoogleCalendar={loadingGoogleCalendar}
                  connectGoogleCalendar={connectGoogleCalendar}
                  disconnectGoogleCalendar={disconnectGoogleCalendar}
                />
              )}

              {/* Usage Statistics Tab */}
              {activeTab === 'usage' && (
                <UsageLimitsTab
                  usagePeriod={usagePeriod}
                  setUsagePeriod={setUsagePeriod}
                  usageLoading={usageLoading}
                  twilioLoading={twilioLoading}
                  twilioStats={twilioStats}
                  packageUsage={packageUsage}
                  usageStats={usageStats}
                />
              )}

              {/* Script Settings Tab */}
              {activeTab === 'scripts' && (
                <ScriptSettingsTab
                  callerName={callerName}
                  companyName={companyName}
                  setCallerName={setCallerName}
                  setCompanyName={setCompanyName}
                  scriptsLoading={scriptsLoading}
                  onSave={saveScriptsSettings}
                />
              )}

              {activeTab === 'daily-goals' && (
                <DailyGoalsTab
                  dailyGoals={dailyGoals}
                  setDailyGoals={setDailyGoals}
                  dailyGoalsLoading={dailyGoalsLoading}
                  dailyGoalsSaving={dailyGoalsSaving}
                  onSave={saveDailyGoals}
                />
              )}
          </div>
        </div>
      </div>

      {/* Twilio Configuration Modal */}
      {showTwilioForm && (
        <TwilioConfigModal
          editingConfig={editingTwilioConfig}
          formData={twilioFormData}
          setFormData={setTwilioFormData}
          saving={saving}
          onSave={saveTwilioConfig}
          onRequestClose={() => {
            setShowTwilioForm(false)
            setEditingTwilioConfig(null)
            resetTwilioForm()
          }}
        />
      )}

    </div>
  )
} 