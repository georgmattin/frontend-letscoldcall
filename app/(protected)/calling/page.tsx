 'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import SessionSummaryPopup from '@/components/session-summary-popup'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { PackageLimitDialog } from "@/components/ui/package-limit-dialog"
import CallAnalyticsToggle from './components/call-analytics-toggle'
import ScriptSection from './components/script-section'
import NotesTabsHeader from './components/notes-tabs-header'
import NotesEditor from './components/notes-editor'
import TranscriptionPanel from './components/transcription-panel'
import AISuggestionsPanel from './components/ai-suggestions-panel'
import AudioPlayerBar from './components/audio-player-bar'
import CallSummaryPanel from './components/call-summary-panel'
import CallNotesSection from './call-notes-section'
import IncomingCall from '../../../incoming-call'
import ContactCard from './components/contact-card'
import AudioSettingsModal from './components/audio-settings-modal'
import { canPerformAction, updateUsage, getPackageInfo } from '@/lib/package-limits'
import { replaceScriptVariables, extractFirstName, type ScriptVariables } from '@/lib/script-utils'
import { getLocalTimeFromPhoneNumber } from '@/lib/timezone-utils'
import { createGoogleCalendarEvent, formatCallbackEvent, formatMeetingEvent, checkGoogleCalendarIntegration } from '@/lib/google-calendar-utils'
import { 
  Edit, 
  ChevronUp, 
  ChevronDown, 
  Phone, 
  PhoneOff,
  Volume2, 
  Check, 
  Calendar, 
  Clock,
  Mic,
  MicOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Globe,
  Loader2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Copy,
  FileText,
  History
} from "lucide-react"

import { Open_Sans } from "next/font/google"
import { useToast } from '@/components/ui/use-toast'
import { getActiveConnection, clearActiveConnection } from '@/components/twilio/connectionStore'

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
})

// Twilio Voice SDK types
declare global {
  interface Window {
    Device?: any;
    Twilio?: any;
  }
}

// Script types
type Script = {
  id: number
  name: string
  content: string
  objections: any[] | null
  category: string | null
  description: string | null
  linked_lists: string[] | null
}

type ScriptObjection = {
  id: number
  objection: string
  response: string
  reason: string
}

export default function CallingPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [listId, setListId] = useState<string | null>(null)
  // One-on-one single contact mode support
  const [mode, setMode] = useState<string | null>(null)
  const [singleContactId, setSingleContactId] = useState<string | null>(null)
  const isSingleMode = mode === 'single'
  // Ensure we only evaluate redirects after query params are read on client
  const [paramsLoaded, setParamsLoaded] = useState(false)

  // Read query params client-side to avoid Suspense boundary requirements
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSessionId(params.get('sessionId'))
    setListId(params.get('listId'))
    setMode(params.get('mode'))
    setSingleContactId(params.get('contactId'))
    const chId = params.get('callHistoryId')
    if (chId) {
      setCurrentCallHistoryId(chId)
      currentCallHistoryIdRef.current = chId
    }
    setParamsLoaded(true)
  }, [])
  if (isSingleMode) {
    console.log('🔒 Single-contact mode enabled', { singleContactId })
  }

  // Session ready state
  const [sessionReady, setSessionReady] = useState(false)
  const [showReadyToStartPopup, setShowReadyToStartPopup] = useState(false)
  const [audioContextResumed, setAudioContextResumed] = useState(false)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)

  // Contact and campaign data
  const [contactList, setContactList] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [currentContactIndex, setCurrentContactIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // User settings for script variables
  const [userSettings, setUserSettings] = useState<{
    callerName: string
    companyName: string
  }>({
    callerName: '',
    companyName: ''
  })

  // Scripts
  const [scripts, setScripts] = useState<Script[]>([])
  const [selectedScriptId, setSelectedScriptId] = useState<number | null>(null)
  const [selectedScript, setSelectedScript] = useState<Script | null>(null)
  const [scriptObjections, setScriptObjections] = useState<ScriptObjection[]>([])
  const [loadingScripts, setLoadingScripts] = useState(false)

  // Twilio states
  const [twilioDevice, setTwilioDevice] = useState<any>(null)
  const [twilioReady, setTwilioReady] = useState(false)
  const [activeConnection, setActiveConnection] = useState<any>(null)
  const [callSid, setCallSid] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  // Incoming call popup state
  const [showIncomingCall, setShowIncomingCall] = useState(false)
  const [incomingConnection, setIncomingConnection] = useState<any>(null)
  const [incomingCaller, setIncomingCaller] = useState<{
    name?: string
    number?: string
  } | null>(null)

  // Audio device management
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([])
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedInputDevice, setSelectedInputDevice] = useState<string | null>(null)
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string | null>(null)
  const [devicesLoaded, setDevicesLoaded] = useState(false)
  const [showAudioSettings, setShowAudioSettings] = useState(false)

  // Call states
  const [callStarted, setCallStarted] = useState(false)
  const [currentCallHistoryId, setCurrentCallHistoryId] = useState<string | null>(null)
  const currentCallHistoryIdRef = useRef<string | null>(null)
  const twilioDeviceRef = useRef<any>(null)
  const activeConnectionRef = useRef<any>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())
  const callEndHandledRef = useRef(false)

  // Recording states
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const [isLoadingRecording, setIsLoadingRecording] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [recordingAvailable, setRecordingAvailable] = useState(false)

  // UI states
  const [activeTab, setActiveTab] = useState("script")
  const [isScriptCollapsed, setIsScriptCollapsed] = useState(false)
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(false)
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false)

  // In single-contact mode, ensure analytics stays hidden
  useEffect(() => {
    if (isSingleMode && isAnalyticsExpanded) {
      setIsAnalyticsExpanded(false)
    }
  }, [isSingleMode, isAnalyticsExpanded])

  // Check active subscription/package on load
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const info = await getPackageInfo()
        if (!cancelled && (!info || !info.hasSubscription)) {
          // Redirect with a flag; dashboard will show the toast via ShowToastOnParam
          router.push('/dashboard?msg=package_required')
        }
      } catch (err) {
        console.error('Failed to verify subscription/package:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router, toast])

  // In single-contact mode, jump to the specific contact ID when contacts are loaded/refreshed
  useEffect(() => {
    if (!isSingleMode) return
    if (!singleContactId) return
    if (!contacts || contacts.length === 0) return
    const idx = contacts.findIndex(c => String(c.id) === String(singleContactId))
    if (idx >= 0 && idx !== currentContactIndex) {
      console.log('🎯 Single-contact mode: focusing contact index', idx, 'for contactId', singleContactId)
      setCurrentContactIndex(idx)
    }
  }, [isSingleMode, singleContactId, contacts, currentContactIndex])

  // Notes section states
  const [notesTab, setNotesTab] = useState("notes")
  const [notes, setNotes] = useState("")
  const [selectedOutcome, setSelectedOutcome] = useState("")
  const [callEnded, setCallEnded] = useState(false)
  const [showAudioPlayer, setShowAudioPlayer] = useState(false)
  const [finalCallDuration, setFinalCallDuration] = useState(0)
  
  // AI states
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false)
  const [transcription, setTranscription] = useState("")
  const [isLoadingAISuggestions, setIsLoadingAISuggestions] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    id: number;
    category: string;
    title: string;
    description: string;
    whatToSay: string;
    priority: string;
  }>>([])
  const [isGeneratingCallSummary, setIsGeneratingCallSummary] = useState(false)
  const [callSummary, setCallSummary] = useState("")
  const [autoLoadAI, setAutoLoadAI] = useState(true)

  // Local time state
  const [localTimeInfo, setLocalTimeInfo] = useState<{
    location: string
    time: string
    timezone: string
  } | null>(null)
  
  // Recording playback states
  const [isPlayingRecording, setIsPlayingRecording] = useState(false)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const [recordingCurrentTime, setRecordingCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0)

  // Track which ended call's recording we intend to show and any pending loader timeout
  const focusedEndedCallSidRef = useRef<string | null>(null)
  const postCallLoadTimeoutRef = useRef<number | null>(null)

  // Ensure we don't reuse previous call's recording state
  const resetRecordingState = useCallback(() => {
    try {
      // Cancel any pending post-call recording load
      if (postCallLoadTimeoutRef.current) {
        clearTimeout(postCallLoadTimeoutRef.current)
        postCallLoadTimeoutRef.current = null
      }
      focusedEndedCallSidRef.current = null
      setRecordingUrl(null)
      setRecordingAvailable(false)
      setRecordingError(null)
      setIsPlayingRecording(false)
      setRecordingCurrentTime(0)
      setRecordingDuration(0)
      setRecordingProgress(0)
      const audio = document.getElementById('recording-audio') as HTMLAudioElement | null
      if (audio) {
        try { audio.pause() } catch {}
        audio.src = ''
        try { audio.load() } catch {}
      }
    } catch {}
  }, [])

  // Form states for scheduling
  const [callbackDate, setCallbackDate] = useState("")
  const [callbackTime, setCallbackTime] = useState("")
  const [meetingDate, setMeetingDate] = useState("")
  const [meetingTime, setMeetingTime] = useState("")
  const [notInterestedReason, setNotInterestedReason] = useState("")

  // Session tracking
  const [totalCallsInSession, setTotalCallsInSession] = useState(0)
  const [successfulCallsInSession, setSuccessfulCallsInSession] = useState(0)
  
  // Google Calendar integration
  const [hasGoogleCalendarIntegration, setHasGoogleCalendarIntegration] = useState(false)
  const [googleCalendarEmail, setGoogleCalendarEmail] = useState<string | undefined>(undefined)
  
  // Notes saving state
  const [notesSaved, setNotesSaved] = useState(false)
  
  // Calendar button states
  const [isAddingCallbackToCalendar, setIsAddingCallbackToCalendar] = useState(false)
  const [callbackAddedToCalendar, setCallbackAddedToCalendar] = useState(false)
  const [isAddingMeetingToCalendar, setIsAddingMeetingToCalendar] = useState(false)
  const [meetingAddedToCalendar, setMeetingAddedToCalendar] = useState(false)
  
  // Save button states
  const [isSavingCallback, setIsSavingCallback] = useState(false)
  const [callbackSaved, setCallbackSaved] = useState(false)
  const [isSavingMeeting, setIsSavingMeeting] = useState(false)
  const [meetingSaved, setMeetingSaved] = useState(false)
  
  // Google Calendar success states
  const [callbackAddedToGoogleCalendar, setCallbackAddedToGoogleCalendar] = useState(false)
  const [meetingAddedToGoogleCalendar, setMeetingAddedToGoogleCalendar] = useState(false)
  
  // Refs for auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingContactListDataRef = useRef(false)
  const reloadContactListDataRef = useRef<(() => Promise<void>) | null>(null)

  // Package limit dialogs
  const [showCallMinutesDialog, setShowCallMinutesDialog] = useState(false)
  const [packageLimitInfo, setPackageLimitInfo] = useState<{current?: number, limit?: number}>({})
  
  // Transcription usage tracking
  const [transcriptionUsage, setTranscriptionUsage] = useState<{current: number, limit: number}>({current: 0, limit: 0})
  const [canGenerateTranscription, setCanGenerateTranscription] = useState(false)
  const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [isWaitingForTranscription, setIsWaitingForTranscription] = useState(false)
  const [isCheckingTranscription, setIsCheckingTranscription] = useState(false)
  const [isTranscriptionReadyInBackend, setIsTranscriptionReadyInBackend] = useState(false)

  // AI Suggestions usage tracking
  const [suggestionsUsage, setSuggestionsUsage] = useState<{current: number, limit: number}>({current: 0, limit: 0})
  const [canGenerateAISuggestions, setCanGenerateAISuggestions] = useState(false)
  
  // Call Summary usage tracking
  const [summaryUsage, setSummaryUsage] = useState<{current: number, limit: number}>({ current: 0, limit: 0 })

  // Twilio configuration validation states
  const [twilioConfigError, setTwilioConfigError] = useState<string | null>(null)
  const [isValidatingTwilioConfig, setIsValidatingTwilioConfig] = useState(true)
  const [twilioError, setTwilioError] = useState<string | null>(null)

  // Call timer
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const callDurationRef = useRef<number>(0)

  // Watchdog: if a call is started but we lose the active connection or it closes without firing events,
  // force the UI into the ended state so sections react properly (helps especially for incoming calls)
  useEffect(() => {
    if (!callStarted || callEnded) return
    let ticksWithoutConn = 0
    const id = setInterval(() => {
      try {
        const conn = activeConnectionRef.current as any
        const status = typeof conn?.status === 'function' ? conn.status() : undefined
        const isClosed = status === 'closed' || status === 'disconnected' || status === 'pending' || status === undefined
        const noConn = !conn
        if (noConn || isClosed) {
          ticksWithoutConn += 1
        } else {
          ticksWithoutConn = 0
        }
        if (ticksWithoutConn >= 2) { // ~2 seconds without a live connection
          console.log('🧭 Watchdog: forcing UI to call-ended state')
          try { if (timerRef.current) clearInterval(timerRef.current) } catch {}
          const duration = callDurationRef.current || 0
          setFinalCallDuration(duration)
          setCallStarted(false)
          setCallEnded(true)
          setIsScriptCollapsed(true)
          setIsNotesCollapsed(false)
          setActiveConnection(null)
          activeConnectionRef.current = null
          try { clearActiveConnection() } catch {}
        }
      } catch (e) {
        console.warn('Watchdog error', e)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [callStarted, callEnded])

  // Calling statistics
  const [sessionStats, setSessionStats] = useState({
    totalContacts: 0,
    contactsCompleted: 0,
    contactsInterested: 0,
    contactsNotInterested: 0,
    callbacks: 0,
    callbacksScheduled: 0,
    meetingsScheduled: 0,
    noAnswers: 0,
    wrongNumbers: 0,
    busy: 0,
    gatekeeper: 0,
    notAvailable: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    sold: 0,
    leftVoicemail: 0,
    doNotCall: 0,
    contactsSkipped: 0,
    totalCallTime: 0
  })

  // Debug: Render counter to track re-renders (reduced logging)
  const renderCountRef = useRef(0)
  renderCountRef.current += 1
  // Only log every 10th render to reduce console noise
  if (renderCountRef.current % 10 === 0) {
    console.log('🔄 Component render #', renderCountRef.current, 'sessionStats interested:', sessionStats.contactsInterested)
  }

  // Client-side mounting state to prevent hydration mismatches
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Adopt global gesture enablement from TwilioVoiceProvider: if the tab
  // already captured a user gesture, consider the session ready here too.
  useEffect(() => {
    try {
      const enabled = typeof window !== 'undefined' && window.sessionStorage.getItem('twilio_audio_gesture') === '1'
      if (enabled) {
        setSessionReady(true)
      }
    } catch {}
  }, [])

  // Observe the global Twilio Device created by TwilioVoiceProvider and reflect
  // its readiness locally so the Call button can enable.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const dev: any = (window as any).__twilioDevice || (window as any).Device
    if (!dev) return

    // If device is already ready, sync immediately
    try {
      if ((dev as any)?.state === 'ready') {
        setTwilioReady(true)
        setTwilioDevice(dev)
        twilioDeviceRef.current = dev
        setTwilioError(null)
        // Try to hydrate any existing accepted connection immediately
        try {
          const existingConn = getActiveConnection()
          if (existingConn && !activeConnectionRef.current) {
            console.log('♻️ Hydrating accepted incoming call after redirect')
            setActiveConnection(existingConn)
            activeConnectionRef.current = existingConn
            setIsConnecting(false)
            setCallStarted(true)
            try { if (timerRef.current) { clearInterval(timerRef.current) } } catch {}
            callDurationRef.current = callDurationRef.current || 0
            timerRef.current = setInterval(() => {
              callDurationRef.current += 1
              setCallDuration(callDurationRef.current)
            }, 1000) as unknown as NodeJS.Timeout
            try {
              existingConn.on && existingConn.on('disconnect', () => {
                console.log('🔚 Remote disconnected (hydrated connection)')
                try { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } } catch {}
                const duration = callDurationRef.current || 0
                setFinalCallDuration(duration)
                setCallStarted(false)
                setCallEnded(true)
                setIsConnecting(false)
                setIsScriptCollapsed(true)
                setIsNotesCollapsed(false)
                setActiveConnection(null)
                activeConnectionRef.current = null
                try { clearActiveConnection() } catch {}
              })
            } catch (e) { console.warn('Failed to bind disconnect on hydrated connection', e) }
          }
        } catch (e) { console.warn('Hydration check for existing Twilio connection failed', e) }
      }
    } catch {}

    const onReady = () => {
      setTwilioReady(true)
      setTwilioDevice(dev)
      twilioDeviceRef.current = dev
      setTwilioError(null)
      console.log('🔉 Twilio Device ready (calling page)')
      // Attempt hydration on ready as well
      try {
        const existingConn = getActiveConnection()
        if (existingConn && !activeConnectionRef.current) {
          console.log('♻️ Hydrating accepted incoming call after device ready')
          setActiveConnection(existingConn)
          activeConnectionRef.current = existingConn
          setIsConnecting(false)
          setCallStarted(true)
          try { if (timerRef.current) { clearInterval(timerRef.current) } } catch {}
          callDurationRef.current = callDurationRef.current || 0
          timerRef.current = setInterval(() => {
            callDurationRef.current += 1
            setCallDuration(callDurationRef.current)
          }, 1000) as unknown as NodeJS.Timeout
          try {
            existingConn.on && existingConn.on('disconnect', () => {
              console.log('🔚 Remote disconnected (hydrated connection on ready)')
              try { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } } catch {}
              const duration = callDurationRef.current || 0
              setFinalCallDuration(duration)
              setCallStarted(false)
              setCallEnded(true)
              setIsConnecting(false)
              setIsScriptCollapsed(true)
              setIsNotesCollapsed(false)
              setActiveConnection(null)
              activeConnectionRef.current = null
              try { clearActiveConnection() } catch {}
            })
          } catch {}
        }
      } catch {}

      // Do not re-register 'ready' inside the handler; outer scope handles listener lifecycle
    }

    try { dev.on && dev.on('ready', onReady) } catch {}
    return () => {
      try { dev.off && dev.off('ready', onReady) } catch {}
    }
  }, [])

  // Late hydration fallback: poll briefly after mount to detect an already-active connection
  useEffect(() => {
    let attempts = 0
    const maxAttempts = 10
    const interval = setInterval(() => {
      attempts += 1
      if (activeConnectionRef.current || callStarted) {
        clearInterval(interval)
        return
      }
      try {
        const conn = getActiveConnection() || (typeof window !== 'undefined' ? (window as any).__twilioActiveConnection : null)
        if (conn) {
          console.log('♻️ Hydrating active connection via late poll')
          setActiveConnection(conn)
          activeConnectionRef.current = conn
          setIsConnecting(false)
          setCallStarted(true)
          try { if (timerRef.current) { clearInterval(timerRef.current) } } catch {}
          callDurationRef.current = callDurationRef.current || 0
          timerRef.current = setInterval(() => {
            callDurationRef.current += 1
            setCallDuration(callDurationRef.current)
          }, 1000) as unknown as NodeJS.Timeout
          try {
            conn.on && conn.on('disconnect', () => {
              console.log('🔚 Remote disconnected (hydrated via late poll)')
              try { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } } catch {}
              const duration = callDurationRef.current || 0
              setFinalCallDuration(duration)
              setCallStarted(false)
              setCallEnded(true)
              setIsConnecting(false)
              setIsScriptCollapsed(true)
              setIsNotesCollapsed(false)
              setActiveConnection(null)
              activeConnectionRef.current = null
              try { clearActiveConnection() } catch {}
            })
          } catch {}
          clearInterval(interval)
        }
      } catch {}
      if (attempts >= maxAttempts) {
        clearInterval(interval)
      }
    }, 300)
    return () => { try { clearInterval(interval) } catch {} }
  }, [callStarted])

  // Attach Twilio Device incoming call listeners (works if a Device instance is exposed on window or state)
  useEffect(() => {
    const device: any = (twilioDevice as any) || (typeof window !== 'undefined' && (window as any).Device)
    if (!device) return
    // If the global provider owns incoming-call UI, skip attaching here to avoid duplicate popups
    try {
      const owner = (typeof window !== 'undefined' && (window as any).__twilioIncomingUIOwner) || ''
      if (owner === 'provider') {
        console.log('ℹ️ Skipping incoming handlers on calling page (provider owns UI)')
        return
      }
    } catch {}

    const onIncoming = (connection: any) => {
      try {
        console.log('📞 Incoming call (protected/calling):', connection)
        const from = connection.parameters?.From || connection.customParameters?.get?.('From') || 'Unknown'
        setIncomingCaller({ name: 'Unknown caller', number: from })
        setIncomingConnection(connection)
        setShowIncomingCall(true)
      } catch (e) {
        console.error('❌ Error handling incoming call:', e)
      }
    }

    const onCancel = () => {
      console.log('🚫 Incoming call canceled')
      setShowIncomingCall(false)
      setIncomingConnection(null)
      setIncomingCaller(null)
      // Defensive: if we somehow had an active/started call on incoming flow, reflect end state
      if (callStarted && !callEnded) {
        console.log('🛡️ Cancel triggered while callStarted=true; finalizing end state')
        try { if (timerRef.current) clearInterval(timerRef.current) } catch {}
        setCallStarted(false)
        setCallEnded(true)
        setIsScriptCollapsed(true)
        setIsNotesCollapsed(false)
        setActiveConnection(null)
        activeConnectionRef.current = null
        try { clearActiveConnection() } catch {}
      }
    }
    const onReject = onCancel
    // Fallback: if device emits a disconnect while handling incoming flows,
    // ensure UI reflects call end (script collapsed, notes expanded)
    const onDisconnect = () => {
      console.log('🔚 Device disconnect (incoming flow fallback)')
      setShowIncomingCall(false)
      setIncomingConnection(null)
      setIncomingCaller(null)
      // Reflect end state in UI just in case connection-specific handlers were missed
      setCallStarted(false)
      setCallEnded(true)
      setIsScriptCollapsed(true)
      setIsNotesCollapsed(false)
    }

    device.on && device.on('incoming', onIncoming)
    device.on && device.on('cancel', onCancel)
    device.on && device.on('reject', onReject)
    device.on && device.on('disconnect', onDisconnect)

    return () => {
      try {
        device.off && device.off('incoming', onIncoming)
        device.off && device.off('cancel', onCancel)
        device.off && device.off('reject', onReject)
        device.off && device.off('disconnect', onDisconnect)
      } catch {}
    }
  }, [twilioDevice])

  // Reflect active call state and update call_history for one-on-one flow
  useEffect(() => {
    const device: any = (twilioDevice as any) || (typeof window !== 'undefined' && (window as any).Device)
    if (!device) return

    const handleConnect = async (connection: any) => {
      try {
        console.log('🔗 Twilio connect (calling page)', connection)
        // New call connected: clear any previous recording state
        try { resetRecordingState() } catch {}
        setActiveConnection(connection)
        activeConnectionRef.current = connection
        setCallStarted(true)
        setCallEnded(false)
        // While in call, keep script visible for guidance
        setIsScriptCollapsed(false)

        // Capture CallSid if available
        const sid = connection?.parameters?.CallSid || (connection as any)?.callSid || null
        if (sid) setCallSid(String(sid))

        // Start duration timer
        try { if (timerRef.current) clearInterval(timerRef.current) } catch {}
        callDurationRef.current = 0
        setCallDuration(0)
        timerRef.current = setInterval(() => {
          callDurationRef.current += 1
          setCallDuration(callDurationRef.current)
        }, 1000) as unknown as NodeJS.Timeout

        // Mark answered in call_history if we have the id
        const chId = currentCallHistoryIdRef.current || currentCallHistoryId
        if (chId) {
          const { error } = await supabase
            .from('call_history')
            .update({
              call_outcome: 'answered',
            })
            .eq('id', chId)
          if (error) console.warn('⚠️ Failed to mark answered in call_history:', error)
        }
      } catch (e) {
        console.warn('⚠️ Error in handleConnect:', e)
      }
    }

    const handleDisconnect = async (_connection: any) => {
      try {
        if (callEndHandledRef.current) {
          console.log('🔁 Disconnect received but already handled – forcing UI sync')
          try { if (timerRef.current) clearInterval(timerRef.current) } catch {}
          const duration = callDurationRef.current || 0
          setFinalCallDuration(duration)
          setCallStarted(false)
          setCallEnded(true)
          setIsScriptCollapsed(true)
          setIsNotesCollapsed(false)
          setActiveConnection(null)
          activeConnectionRef.current = null
          try { clearActiveConnection() } catch {}
          return
        }
        callEndHandledRef.current = true
        console.log('🔚 Twilio disconnect (calling page)')

        // Stop timer
        try { if (timerRef.current) clearInterval(timerRef.current) } catch {}
        const duration = callDurationRef.current || 0
        setFinalCallDuration(duration)
        setCallStarted(false)
        setCallEnded(true)
        // Collapse script section after call ends (matches list-calling UX)
        setIsScriptCollapsed(true)
        // Ensure notes section is expanded and usable after call ends
        setIsNotesCollapsed(false)
        setActiveConnection(null)
        activeConnectionRef.current = null
        try { clearActiveConnection() } catch {}

        // Update call_history end fields
        const chId = currentCallHistoryIdRef.current || currentCallHistoryId
        if (chId) {
          const { error } = await supabase
            .from('call_history')
            .update({
              ended_at: new Date().toISOString(),
              duration: duration,
            })
            .eq('id', chId)
          if (error) console.warn('⚠️ Failed to update call end in call_history:', error)
        }
      } catch (e) {
        console.warn('⚠️ Error in handleDisconnect:', e)
      } finally {
        // Reset guard shortly after to allow subsequent calls
        setTimeout(() => { callEndHandledRef.current = false }, 500)
      }
    }

    try {
      device.on && device.on('connect', handleConnect)
      device.on && device.on('disconnect', handleDisconnect)
    } catch {}

    return () => {
      try {
        device.off && device.off('connect', handleConnect)
        device.off && device.off('disconnect', handleDisconnect)
      } catch {}
    }
  }, [twilioDevice, supabase, currentCallHistoryId])

  // Hydrate from an already-active connection when arriving via redirect
  useEffect(() => {
    const device: any = (twilioDevice as any) || (typeof window !== 'undefined' && (window as any).Device)
    if (!device) return

    let conn: any = null
    try {
      if (typeof device.activeConnection === 'function') {
        conn = device.activeConnection()
      } else if (device.activeConnection) {
        conn = device.activeConnection
      } else if (device.connections) {
        const list = Array.isArray(device.connections) ? device.connections : Array.from(device.connections)
        conn = list?.find((c: any) => {
          try {
            const st = typeof c.status === 'function' ? c.status() : c.state
            return st === 'open' || st === 'connected' || c.isActive
          } catch { return false }
        })
      }
    } catch {}

    if (!conn) return

    console.log('♻️ Hydrating from existing Twilio connection')
    setActiveConnection(conn)
    activeConnectionRef.current = conn
    setCallStarted(true)
    setCallEnded(false)
    setIsScriptCollapsed(false)

    // Capture CallSid
    try {
      const sid = conn?.parameters?.CallSid || conn?.callSid || null
      if (sid) setCallSid(String(sid))
    } catch {}

    // Start timer if not started
    try { if (timerRef.current) clearInterval(timerRef.current) } catch {}
    callDurationRef.current = callDurationRef.current || 0
    setCallDuration(callDurationRef.current)
    timerRef.current = setInterval(() => {
      callDurationRef.current += 1
      setCallDuration(callDurationRef.current)
    }, 1000) as unknown as NodeJS.Timeout

    // Ensure disconnect updates state and DB
    const handleHydratedDisconnect = async () => {
      try {
        if (callEndHandledRef.current) {
          console.log('🔁 Hydrated disconnect received but already handled – forcing UI sync')
          try { if (timerRef.current) clearInterval(timerRef.current) } catch {}
          const duration = callDurationRef.current || 0
          setFinalCallDuration(duration)
          setCallStarted(false)
          setCallEnded(true)
          setIsScriptCollapsed(true)
          setIsNotesCollapsed(false)
          setActiveConnection(null)
          activeConnectionRef.current = null
          try { clearActiveConnection() } catch {}
          return
        }
        callEndHandledRef.current = true
        console.log('🔚 Hydrated connection disconnected')
        try { if (timerRef.current) clearInterval(timerRef.current) } catch {}
        const duration = callDurationRef.current || 0
        setFinalCallDuration(duration)
        setCallStarted(false)
        setCallEnded(true)
        setIsScriptCollapsed(true)
        // Ensure notes section is expanded and usable after call ends (hydrated)
        setIsNotesCollapsed(false)
        setActiveConnection(null)
        activeConnectionRef.current = null
        try { clearActiveConnection() } catch {}
        const ch = currentCallHistoryIdRef.current || currentCallHistoryId
        if (ch) {
          const { error } = await supabase
            .from('call_history')
            .update({ ended_at: new Date().toISOString(), duration })
            .eq('id', ch)
          if (error) console.warn('⚠️ Failed to update call end (hydrated):', error)
        }
      } finally {
        setTimeout(() => { callEndHandledRef.current = false }, 500)
      }
    }
    try { conn.on && conn.on('disconnect', handleHydratedDisconnect) } catch {}

    return () => {
      try { conn.off && conn.off('disconnect', handleHydratedDisconnect) } catch {}
    }
  }, [twilioDevice, supabase, currentCallHistoryId])

  // Handlers for popup actions
  const handleIncomingAccept = useCallback(() => {
    if (!incomingConnection) return
    try {
      console.log('✅ Accepting incoming call...')
      // Clear previous recording before starting a new call
      try { resetRecordingState() } catch {}
      incomingConnection.accept()
      setActiveConnection(incomingConnection)
      activeConnectionRef.current = incomingConnection
      // Reflect active call in UI immediately when accepting from this page
      setCallStarted(true)
      setCallEnded(false)
      setIsScriptCollapsed(false)
      // Capture CallSid if available and start timer here too (defensive)
      const sid = (incomingConnection as any)?.parameters?.CallSid || (incomingConnection as any)?.callSid || null
      if (sid) setCallSid(String(sid))
      try { if (timerRef.current) clearInterval(timerRef.current) } catch {}
      callDurationRef.current = 0
      setCallDuration(0)
      timerRef.current = setInterval(() => {
        callDurationRef.current += 1
        setCallDuration(callDurationRef.current)
      }, 1000) as unknown as NodeJS.Timeout
      // Mark answered on the known call_history id
      const chId = currentCallHistoryIdRef.current || currentCallHistoryId
      if (chId) {
        supabase
          .from('call_history')
          .update({ call_outcome: 'answered' })
          .eq('id', chId)
          .then(({ error }) => { if (error) console.warn('⚠️ Failed to mark answered (accept handler):', error) })
      }

      // Attach disconnect listener directly to this connection to ensure UI sync
      const handleConnDisconnect = async () => {
        try {
          if (callEndHandledRef.current) {
            console.log('🔁 Incoming-conn disconnect received but already handled – forcing UI sync')
            try { if (timerRef.current) clearInterval(timerRef.current) } catch {}
            const duration = callDurationRef.current || 0
            setFinalCallDuration(duration)
            setCallStarted(false)
            setCallEnded(true)
            setIsScriptCollapsed(true)
            setIsNotesCollapsed(false)
            setActiveConnection(null)
            activeConnectionRef.current = null
            try { clearActiveConnection() } catch {}
            return
          }
          callEndHandledRef.current = true
          console.log('🔚 Incoming accepted connection disconnected')
          try { if (timerRef.current) clearInterval(timerRef.current) } catch {}
          const duration = callDurationRef.current || 0
          setFinalCallDuration(duration)
          setCallStarted(false)
          setCallEnded(true)
          setIsScriptCollapsed(true)
          // Ensure notes section is expanded and usable after call ends (incoming accepted)
          setIsNotesCollapsed(false)
          setActiveConnection(null)
          activeConnectionRef.current = null
          try { clearActiveConnection() } catch {}
          const ch = currentCallHistoryIdRef.current || currentCallHistoryId
          if (ch) {
            const { error } = await supabase
              .from('call_history')
              .update({ ended_at: new Date().toISOString(), duration })
              .eq('id', ch)
            if (error) console.warn('⚠️ Failed to update call end (conn listener):', error)
          }
        } finally {
          setTimeout(() => { callEndHandledRef.current = false }, 500)
        }
      }
      try {
        incomingConnection.on && incomingConnection.on('disconnect', handleConnDisconnect)
      } catch {}
    } catch (e) {
      console.error('❌ Failed to accept incoming call:', e)
    } finally {
      setShowIncomingCall(false)
      setIncomingConnection(null)
    }
  }, [incomingConnection])

  // Reset recording state whenever the current call history id changes
  useEffect(() => {
    if (!currentCallHistoryId) return
    try { resetRecordingState() } catch {}
  }, [currentCallHistoryId, resetRecordingState])

  const handleIncomingReject = useCallback(() => {
    if (!incomingConnection) return
    try {
      console.log('⛔ Rejecting incoming call...')
      incomingConnection.reject()
    } catch (e) {
      console.error('❌ Failed to reject incoming call:', e)
    } finally {
      setShowIncomingCall(false)
      setIncomingConnection(null)
    }
  }, [incomingConnection])

  // Session summary popup state
  const [showSessionSummary, setShowSessionSummary] = useState(false)

  // Realtime channels
  const [realtimeChannels, setRealtimeChannels] = useState<RealtimeChannel[]>([])
  const channelsRef = useRef<RealtimeChannel[]>([])

  // Check if phone number is toll-free
  const isTollFreeNumber = (phoneNumber: string) => {
    if (!phoneNumber) return false
    
    // Remove all non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '')
    
    // Check for US/Canada toll-free prefixes
    const tollFreePrefixes = ['800', '888', '877', '866', '855', '844', '833', '822']
    
    // Check if the number starts with +1 and then a toll-free prefix
    if (cleanNumber.startsWith('1') && cleanNumber.length === 11) {
      const areaCode = cleanNumber.substring(1, 4)
      return tollFreePrefixes.includes(areaCode)
    }
    
    // Check if it's a 10-digit number starting with toll-free prefix
    if (cleanNumber.length === 10) {
      const areaCode = cleanNumber.substring(0, 3)
      return tollFreePrefixes.includes(areaCode)
    }
    
    return false
  }

  // Setup Realtime subscriptions for real-time analytics - DISABLED (using manual refresh instead)
  /*
  const setupRealtimeSubscriptions = useCallback(async () => {
    if (!listId) return

    console.log('🔄 Setting up realtime subscriptions for analytics')
    
    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel)
    })
    channelsRef.current = []

    try {
      // Subscribe to contacts table changes
      const contactsChannel = supabase
        .channel(`contacts-${listId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contacts',
            filter: `contact_list_id=eq.${listId}`
          },
          (payload) => {
            console.log('📡 Contacts table change:', payload)
            // Refresh contacts data when status changes
            if (payload.eventType === 'UPDATE' && payload.new?.status !== payload.old?.status) {
              console.log('🔄 Contact status changed, refreshing data')
              console.log('📡 Triggering reloadContactListData from contacts table change')
              // Use a stable reference to avoid dependency issues
              reloadContactListDataRef.current?.()
            }
          }
        )
        .subscribe()

      // Subscribe to call_history table changes
      const callHistoryChannel = supabase
        .channel(`call-history-${listId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'call_history',
            filter: `contact_list_id=eq.${listId}`
          },
          (payload) => {
            console.log('📡 Call history change:', payload)
            // Refresh data when call outcomes are added/updated
            if (payload.eventType === 'INSERT' || 
                (payload.eventType === 'UPDATE' && payload.new?.call_outcome !== payload.old?.call_outcome)) {
              console.log('🔄 Call history updated, refreshing analytics')
              // Small delay to ensure database is consistent
              setTimeout(() => {
                console.log('📡 Triggering reloadContactListData from call_history table change (after 100ms delay)')
                // Use a stable reference to avoid dependency issues
                reloadContactListDataRef.current?.()
              }, 100)
            }
          }
        )
        .subscribe()

      // Store channels for cleanup
      channelsRef.current = [contactsChannel, callHistoryChannel]
      setRealtimeChannels([contactsChannel, callHistoryChannel])

      console.log('✅ Realtime subscriptions setup complete')
    } catch (error) {
      console.error('❌ Error setting up realtime subscriptions:', error)
    }
  }, [listId, supabase])
  */

  // Cleanup realtime subscriptions - DISABLED (using manual refresh instead)
  /*
  const cleanupRealtimeSubscriptions = useCallback(() => {
    console.log('🧹 Cleaning up realtime subscriptions')
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel)
    })
    channelsRef.current = []
    setRealtimeChannels([])
  }, [supabase])
  */

  // Reload contact list data for realtime updates
  const reloadContactListData = useCallback(async () => {
    console.log('🔍 reloadContactListData called - listId:', listId, 'isLoading:', isLoadingContactListDataRef.current)
    
    if (!listId) {
      console.log('⚠️ Cannot reload data - listId is missing:', listId)
      return
    }
    
    if (isLoadingContactListDataRef.current) {
      console.log('⚠️ Cannot reload data - already loading (flag is true)')
      return
    }

    console.log('🔄 Setting loading flag to true')
    isLoadingContactListDataRef.current = true
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('❌ User not authenticated for data reload')
        console.log('🔄 Resetting loading flag to false (no user)')
        isLoadingContactListDataRef.current = false
        return
      }

      console.log('🔄 Reloading contact list data for realtime update')

      // Reload contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('contact_list_id', listId)
        .order('created_at')
        .limit(50000)

      if (contactsError) {
        console.error('❌ Error reloading contacts:', contactsError)
        console.log('🔄 Resetting loading flag to false (contacts error)')
        isLoadingContactListDataRef.current = false
        return
      }

      setContacts(contactsData || [])
      
      // Recalculate statistics
      const contactStats = {
        totalContacts: contactsData?.length || 0,
        contactsCompleted: 0,
        contactsInterested: 0,
        contactsNotInterested: 0,
        callbacks: 0,
        callbacksScheduled: 0,
        meetingsScheduled: 0,
        noAnswers: 0,
        wrongNumbers: 0,
        busy: 0,
        gatekeeper: 0,
        notAvailable: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        sold: 0,
        leftVoicemail: 0,
        doNotCall: 0,
        contactsSkipped: 0,
        totalCallTime: 0
      }
      
      // Get updated call history
      const { data: callHistoryData } = await supabase
        .from('call_history')
        .select('*')
        .eq('contact_list_id', listId)
        .eq('user_id', user.id)
        .limit(50000)
        
      if (callHistoryData && callHistoryData.length > 0) {
        // Get unique contact IDs that have been processed
        const processedContactIds = new Set()
        
        // Calculate statistics from call history
        callHistoryData.forEach(call => {
          // Count unique completed contacts (not individual calls)
          if (call.contact_id) {
            processedContactIds.add(call.contact_id)
          }
          
          if (call.duration) {
            contactStats.totalCallTime += call.duration
          }
          
          if (call.call_outcome === 'interested') {
            contactStats.contactsInterested++
          } else if (call.call_outcome === 'not-interested') {
            contactStats.contactsNotInterested++
          } else if (call.call_outcome === 'positive') {
            contactStats.positive++
          } else if (call.call_outcome === 'neutral') {
            contactStats.neutral++
          } else if (call.call_outcome === 'negative') {
            contactStats.negative++
          } else if (call.call_outcome === 'callback') {
            contactStats.callbacks++
          } else if (call.call_outcome === 'callback_scheduled') {
            contactStats.callbacksScheduled++
          } else if (call.call_outcome === 'meeting-scheduled') {
            contactStats.meetingsScheduled++
          } else if (call.call_outcome === 'no-answer') {
            contactStats.noAnswers++
          } else if (call.call_outcome === 'busy') {
            contactStats.busy++
          } else if (call.call_outcome === 'gatekeeper') {
            contactStats.gatekeeper++
          } else if (call.call_outcome === 'wrong-number') {
            contactStats.wrongNumbers++
          } else if (call.call_outcome === 'not-available') {
            contactStats.notAvailable++
          } else if (call.call_outcome === 'left-voicemail') {
            contactStats.leftVoicemail++
          } else if (call.call_outcome === 'sold') {
            contactStats.sold++
          } else if (call.call_outcome === 'do-not-call') {
            contactStats.doNotCall++
          } else if (call.call_outcome === 'skipped') {
            contactStats.contactsSkipped++
          }
        })
        
        // Set contactsCompleted to the number of unique contacts processed
        contactStats.contactsCompleted = processedContactIds.size
        console.log('📊 Reloaded - Unique contacts processed:', processedContactIds.size)
      }
      
      setSessionStats(contactStats)
      console.log('✅ Contact list data reloaded successfully')
      console.log('📊 Final statistics:', contactStats)
      
    } catch (error) {
      console.error('❌ Error reloading contact list data:', error)
    } finally {
      console.log('🔄 Resetting loading flag to false (finally block)')
      isLoadingContactListDataRef.current = false
    }
  }, [listId, supabase])

  // Update the ref whenever the function changes
  useEffect(() => {
    reloadContactListDataRef.current = reloadContactListData
  }, [reloadContactListData])

  // Debug: Monitor listId changes
  useEffect(() => {
    console.log('🔍 listId changed:', listId, 'type:', typeof listId)
    if (!listId) {
      console.log('⚠️ listId is null/undefined - this will prevent realtime reloads')
    }
  }, [listId])

  // Debug: Monitor sessionStats changes to track UI updates
  useEffect(() => {
    console.log('📊 sessionStats changed - UI should re-render:', sessionStats)
    console.log('📊 Key values - Interested:', sessionStats.contactsInterested, 'Not Interested:', sessionStats.contactsNotInterested, 'Completed:', sessionStats.contactsCompleted)
  }, [sessionStats])

  // Navigation functions
  const goToNextContact = async () => {
    if (currentContactIndex < contacts.length - 1) {
      // Before moving to the next contact, ensure the current contact is marked as processed
      // This could be either because a call was made and outcome selected, or because it was skipped
      const currentContact = contacts[currentContactIndex];
      let contactStatus = 'pending';
      
      // Check if this contact has a call outcome already
      if (callEnded && selectedOutcome) {
        contactStatus = 'completed';
        console.log('📊 Contact marked as completed with outcome:', selectedOutcome);
      } else if (currentCallHistoryId || currentCallHistoryIdRef.current) {
        // Check if there's a call history record for this contact
        // Use either the state or ref value, whichever is available
        const historyId = currentCallHistoryIdRef.current || currentCallHistoryId || null;
        console.log('🔍 Checking call history with ID:', historyId);
        
        const { data: callHistory } = await supabase
          .from('call_history')
          .select('call_outcome')
          .eq('id', historyId)
          .single();
          
        if (callHistory?.call_outcome) {
          // Important: If the outcome is 'skipped', set the status accordingly
          contactStatus = callHistory.call_outcome === 'skipped' ? 'skipped' : 'completed';
          console.log(`📊 Contact marked as ${contactStatus} based on call history:`, callHistory.call_outcome);
        }
      }
      
      // Update contact_lists table with timestamp only (no more session tracking)
      if (listId) {
        try {
          console.log('💾 Updating contact_lists timestamp after navigation');
          const { error } = await supabase
            .from('contact_lists')
            .update({ 
              updated_at: new Date().toISOString()
            })
            .eq('id', parseInt(listId as string));
            
          if (error) {
            console.error('❌ Error updating contact list timestamp in goToNextContact:', error);
          } else {
            console.log('✅ Contact list timestamp updated in goToNextContact');
          }
        } catch (updateError) {
          console.error('❌ Exception updating contact list timestamp in goToNextContact:', updateError);
        }
      }
      
      // Update the current contact index
      setCurrentContactIndex(prev => prev + 1);
      resetCallState();
      console.log(`📞 Moving to next contact: ${currentContactIndex + 2}/${contacts.length}`);
      
      // Save contact list progress when moving to next contact
      // Use await instead of setTimeout to ensure it completes before continuing
      await saveContactListProgress();
      console.log('💾 Contact list progress saved after navigation')
    } else {
      console.log('📞 Reached end of contact list');
      handleSessionEnd();
    }
  }

  const goToPreviousContact = () => {
    if (currentContactIndex > 0) {
      setCurrentContactIndex(prev => prev - 1)
      resetCallState()
      console.log(`📞 Moving to previous contact: ${currentContactIndex}/${contacts.length}`)
    }
  }

  // Reset call state when moving between contacts
  const resetCallState = () => {
    setCallStarted(false)
    setCallEnded(false)
    setIsConnecting(false)
    setCallDuration(0)
    
    // Check if call just ended before resetting the flag
    const callJustEnded = callEndHandledRef.current
    
    // Reset the call end flag
    callEndHandledRef.current = false
    
    // Only reset call history ID if no active call AND call hasn't just ended
    // Don't clear if call just ended to preserve ID for database update
    if (!callStarted && !isConnecting && !activeConnection && !callJustEnded) {
      console.log('📝 Clearing call history ID in resetCallState')
      setCurrentCallHistoryId(null)
      currentCallHistoryIdRef.current = null
    } else {
      console.log('📝 NOT clearing call history ID in resetCallState - preserving for database update')
    }
    setActiveConnection(null)
    setNotes('')
    setSelectedOutcome('')
    setShowAudioPlayer(false)
    setTranscription('')
    setAiSuggestions([])
    
    // Reset Google Calendar success states
    setCallbackAddedToGoogleCalendar(false)
    setMeetingAddedToGoogleCalendar(false)
    
    // Reset notes tab to "notes" when starting a new call
    setNotesTab("notes")
    
    // Expand script section when moving to next contact
    setIsScriptCollapsed(false)
    
    // Clear timer and reset duration ref
    if (timerRef.current) {
      console.log('📝 Clearing timer in resetCallState')
      clearInterval(timerRef.current)
      timerRef.current = null
      // Reset duration ref only when moving between contacts (not during call end)
      if (!callJustEnded) {
        callDurationRef.current = 0
        console.log('📝 Reset duration ref to 0 in resetCallState')
      } else {
        console.log('📝 NOT resetting duration ref - call just ended')
      }
    }
  }

  // Format duration helper function (renamed to avoid conflicts)
  const formatCallDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${remainingSeconds}s`
    }
  }

  // End the calling session
  const handleSessionEnd = async () => {
    console.log('📊 Calling ended')
    console.log('📊 Final calling statistics:', sessionStats)
    
    // Update the timestamp on the contact list
    await saveContactListProgress()
    console.log('💾 Contact list timestamp updated')
    
    // Redirect back to contact list
    router.push(`/contact-lists/list/${listId}?callingComplete=true`)
  }
  
  // Note: handleCallingPause function is defined later in the file

  // Function to recalculate contactsCompleted from contacts array
  const recalculateContactsCompleted = () => {
    const completedCount = contacts.filter(c => c.status === 'called').length
    const skippedCount = contacts.filter(c => c.status === 'skipped').length
    
    setSessionStats(prev => ({
      ...prev,
      contactsCompleted: completedCount,
      contactsSkipped: skippedCount
    }))
    
    console.log('📊 Recalculated contactsCompleted:', completedCount, 'contactsSkipped:', skippedCount)
  }

  // Function to refresh analytics data
  const refreshAnalytics = async () => {
    if (!listId) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      console.log('🔄 Refreshing analytics data...')

      // Calculate statistics based on contact statuses
      const contactStats = {
        totalContacts: contacts.length || 0,
        contactsCompleted: 0,
        contactsInterested: 0,
        contactsNotInterested: 0,
        callbacks: 0,
        callbacksScheduled: 0,
        meetingsScheduled: 0,
        noAnswers: 0,
        wrongNumbers: 0,
        busy: 0,
        gatekeeper: 0,
        notAvailable: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        sold: 0,
        leftVoicemail: 0,
        doNotCall: 0,
        contactsSkipped: 0,
        totalCallTime: 0
      }
      
      // Get call history for this list to calculate statistics
      const { data: callHistoryData } = await supabase
        .from('call_history')
        .select('*')
        .eq('contact_list_id', listId)
        .eq('user_id', user.id)
        .limit(50000)
        
      if (callHistoryData && callHistoryData.length > 0) {
        console.log('📊 Found call history, calculating stats')
        
        // Get unique contact IDs that have been processed
        const processedContactIds = new Set()
        
        // Calculate statistics from call history
        callHistoryData.forEach(call => {
          // Count unique completed contacts (not individual calls)
          if (call.contact_id) {
            processedContactIds.add(call.contact_id)
          }
          
          // Add call duration to total time
          if (call.duration) {
            contactStats.totalCallTime += call.duration
          }
          
          // Count different call outcomes
          if (call.call_outcome === 'interested') {
            contactStats.contactsInterested++
          } else if (call.call_outcome === 'not-interested') {
            contactStats.contactsNotInterested++
          } else if (call.call_outcome === 'positive') {
            contactStats.positive++
          } else if (call.call_outcome === 'neutral') {
            contactStats.neutral++
          } else if (call.call_outcome === 'negative') {
            contactStats.negative++
          } else if (call.call_outcome === 'callback') {
            contactStats.callbacks++
          } else if (call.call_outcome === 'callback_scheduled') {
            contactStats.callbacksScheduled++
          } else if (call.call_outcome === 'meeting-scheduled') {
            contactStats.meetingsScheduled++
          } else if (call.call_outcome === 'no-answer') {
            contactStats.noAnswers++
          } else if (call.call_outcome === 'busy') {
            contactStats.busy++
          } else if (call.call_outcome === 'gatekeeper') {
            contactStats.gatekeeper++
          } else if (call.call_outcome === 'wrong-number') {
            contactStats.wrongNumbers++
          } else if (call.call_outcome === 'not-available') {
            contactStats.notAvailable++
          } else if (call.call_outcome === 'left-voicemail') {
            contactStats.leftVoicemail++
          } else if (call.call_outcome === 'sold') {
            contactStats.sold++
          } else if (call.call_outcome === 'do-not-call') {
            contactStats.doNotCall++
          } else if (call.call_outcome === 'skipped') {
            contactStats.contactsSkipped++
          }
        })
        
        // Set contactsCompleted to the number of unique contacts processed
        contactStats.contactsCompleted = processedContactIds.size
        console.log('📊 Unique contacts processed:', processedContactIds.size)
      } else {
        console.log('📊 No call history found, starting fresh')
      }
      
      // Set the calculated statistics
      setSessionStats(contactStats)
      console.log('✅ Analytics refreshed successfully')
      
    } catch (error) {
      console.error('Error refreshing analytics:', error)
    }
  }

  const updateSessionStats = (outcome: string, callDurationSeconds?: number) => {
    console.log('📊 updateSessionStats:', outcome, 'interested before:', sessionStats.contactsInterested)
    
    setSessionStats(prev => {
      const updated = { ...prev }
      // DON'T automatically increment contactsCompleted here - it should be calculated from unique contacts
      // updated.contactsCompleted = prev.contactsCompleted + 1
      
      // Add call duration to total call time
      if (callDurationSeconds) {
        updated.totalCallTime = prev.totalCallTime + callDurationSeconds
      }
      
      if (outcome === 'interested') {
        updated.contactsInterested = prev.contactsInterested + 1
      } else if (outcome === 'not-interested') {
        updated.contactsNotInterested = prev.contactsNotInterested + 1
      } else if (outcome === 'positive') {
        updated.positive = (prev.positive || 0) + 1
      } else if (outcome === 'neutral') {
        updated.neutral = (prev.neutral || 0) + 1
      } else if (outcome === 'negative') {
        updated.negative = (prev.negative || 0) + 1
      } else if (outcome === 'callback') {
        updated.callbacks = prev.callbacks + 1
      } else if (outcome === 'callback_scheduled') {
        updated.callbacksScheduled = prev.callbacksScheduled + 1
      } else if (outcome === 'meeting-scheduled') {
        updated.meetingsScheduled = prev.meetingsScheduled + 1
      } else if (outcome === 'no-answer') {
        updated.noAnswers = prev.noAnswers + 1
      } else if (outcome === 'busy') {
        updated.busy = (prev.busy || 0) + 1
      } else if (outcome === 'gatekeeper') {
        updated.gatekeeper = (prev.gatekeeper || 0) + 1
      } else if (outcome === 'wrong-number') {
        updated.wrongNumbers = prev.wrongNumbers + 1
      } else if (outcome === 'not-available') {
        updated.notAvailable = (prev.notAvailable || 0) + 1
      } else if (outcome === 'left-voicemail') {
        updated.leftVoicemail = (prev.leftVoicemail || 0) + 1
      } else if (outcome === 'sold') {
        updated.sold = (prev.sold || 0) + 1
      } else if (outcome === 'do-not-call') {
        updated.doNotCall = (prev.doNotCall || 0) + 1
      }
      
      console.log('📊 sessionStats updated - interested after:', updated.contactsInterested)
      return updated
    })
    
    // Recalculate contactsCompleted after updating other stats
    setTimeout(() => {
      recalculateContactsCompleted()
    }, 100)
  }

  // Handle skipping the current contact
  const handleSkipContact = async () => {
    // Track skipped contact in statistics
    setSessionStats(prev => ({
      ...prev,
      contactsSkipped: prev.contactsSkipped + 1
    }))
    console.log('📊 Contact skipped, updating stats')
    
    // Create a call history record for the skipped contact
    const currentContact = contacts[currentContactIndex];
    if (currentContact && currentContact.id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Fetch minimal Twilio config to get outbound caller number for audit completeness
          let outboundCallerNumber: string | null = null
          try {
            const { data: twilioConfig, error: twilioErr } = await supabase
              .from('user_twilio_configs')
              .select('phone_number')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .maybeSingle()
            if (twilioErr) {
              console.warn('⚠️ Could not load Twilio config for skipped contact from_phone:', twilioErr)
            } else if (twilioConfig?.phone_number) {
              outboundCallerNumber = twilioConfig.phone_number
            }
          } catch (cfgErr) {
            console.warn('⚠️ Exception while loading Twilio config for skipped contact:', cfgErr)
          }

          // Create a complete call history record for the skipped contact
          // Include all relevant fields, not just the required ones
          const { data, error } = await supabase
            .from('call_history')
            .insert({
              user_id: user.id,
              contact_list_id: parseInt(listId || '0'),
              session_id: sessionId || '',
              contact_id: currentContact.id,
              contact_name: currentContact.name || 'Unknown',
              contact_phone: currentContact.phone || '',
              contact_email: currentContact.email || null,
              contact_company: currentContact.company || null,
              contact_position: currentContact.position || null,
              contact_location: currentContact.location || null,
              from_phone: outboundCallerNumber || null,
              call_outcome: 'skipped',
              started_at: new Date().toISOString(),
              ended_at: new Date().toISOString(), // Same as started_at for skipped contacts
              duration: 0, // No duration for skipped calls
              notes: '', // Empty notes for skipped calls
              recording_available: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select('id')
            .single();
          
          if (error) {
            console.error('❌ Error recording skipped contact:', error);
          } else if (data) {
            console.log('✅ Skipped contact recorded in call history:', data.id);
            setCurrentCallHistoryId(data.id);
            // Store in ref for immediate access
            currentCallHistoryIdRef.current = data.id;
          }
          
          // IMPORTANT: Update the contact status in contacts table to 'skipped'
          if (currentContact && currentContact.id) {
            console.log('🔧 Updating contact status to skipped for contact ID:', currentContact.id);
            
            try {
              const { data: updateContactData, error: updateContactError } = await supabase
                .from('contacts')
                .update({ 
                  status: 'skipped',
                  updated_at: new Date().toISOString()
                })
                .eq('id', currentContact.id)
                .select();
                
              if (updateContactError) {
                console.error('❌ Error updating contact status to skipped:', updateContactError);
              } else {
                console.log('✅ Contact status updated to skipped:', updateContactData);
              }
            } catch (updateContactCatchError) {
              console.error('❌ Exception in contact status update:', updateContactCatchError);
            }
          }
          
          // Update the contact_lists table with timestamp
          if (listId) {
            console.log('🔧 Updating contact list timestamp for list ID:', listId);
            
            try {
              const { data: updateData, error: updateError } = await supabase
                .from('contact_lists')
                .update({ 
                  updated_at: new Date().toISOString()
                })
                .eq('id', parseInt(listId))
                .select();
                
              if (updateError) {
                console.error('❌ Error updating contact list timestamp:', updateError);
              } else {
                console.log('✅ Contact list timestamp updated:', updateData);
              }
            } catch (updateCatchError) {
              console.error('❌ Exception in contact list update:', updateCatchError);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in skip contact handling:', error);
      }
    }
    
    // Wait for the database updates to complete before navigating
    console.log('⏳ Waiting for database updates to complete before navigation');
    
    // Save contact list progress before moving to next contact
    // This ensures all updates are persisted properly
    await saveContactListProgress();
    console.log('✅ Contact list progress saved before navigation');
    
    // Recalculate contactsCompleted and contactsSkipped after database updates
    setTimeout(() => {
      recalculateContactsCompleted();
    }, 200); // Wait a bit longer for database updates to complete
    
    // Move to next contact
    goToNextContact();
  }

  // Update contact list timestamp
  const saveContactListProgress = async () => {
    try {
      // Just update the timestamp to mark that this list was recently used
      if (listId) {
        const { error } = await supabase
          .from('contact_lists')
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq('id', listId)
        
        if (error) {
          console.error('❌ Error updating contact list timestamp:', error)
        } else {
          console.log('✅ Contact list timestamp updated')
        }
      }
    } catch (error) {
      console.error('❌ Error in saveContactListProgress:', error)
    }
  }

  // Check if we have required parameters (skip in single-contact mode)
  useEffect(() => {
    if (isSingleMode) return
    // Wait until URL params have been parsed on client
    if (!paramsLoaded) return
    if (!sessionId || !listId) {
      console.error('Missing required parameters:', { sessionId, listId })
      router.push('/contact-lists')
      return
    }
  }, [isSingleMode, paramsLoaded, sessionId, listId, router])

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Load contact list data
  useEffect(() => {
    async function loadContactListData() {
      if (!listId) return
      
      // Prevent multiple simultaneous calls
      if (isLoadingContactListDataRef.current) {
        console.log('⚠️ loadContactListData already running, skipping...')
        return
      }
      
      isLoadingContactListDataRef.current = true
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        console.log('🔄 Loading contact list data for:', { listId })

        // Load contact list
        const { data: list, error: listError } = await supabase
          .from('contact_lists')
          .select('*')
          .eq('id', listId)
          .eq('user_id', user.id)
          .single()

        if (listError) {
          console.error('Error loading contact list:', listError)
          router.push('/contact-lists')
          return
        }

        setContactList(list)

        // Load contacts from the list
        const { data: contactsData, error: contactsError } = await supabase
          .from('contacts')
          .select('*')
          .eq('contact_list_id', listId)
          .order('created_at')
          .limit(50000)

        if (contactsError) throw contactsError

        setContacts(contactsData || [])
        
        // Calculate statistics based on contact statuses
        const contactStats = {
          totalContacts: contactsData?.length || 0,
          contactsCompleted: 0,
          contactsInterested: 0,
          contactsNotInterested: 0,
          callbacks: 0,
          callbacksScheduled: 0,
          meetingsScheduled: 0,
          noAnswers: 0,
          wrongNumbers: 0,
          contactsSkipped: 0,
          totalCallTime: 0
        }
        
        // Get call history for this list to calculate statistics
        const { data: callHistoryData } = await supabase
          .from('call_history')
          .select('*')
          .eq('contact_list_id', listId)
          .eq('user_id', user.id)
          .limit(50000)
          
        if (callHistoryData && callHistoryData.length > 0) {
          console.log('📊 Found call history, calculating stats')
          
          // Get unique contact IDs that have been processed
          const processedContactIds = new Set()
          
          // Calculate statistics from call history
          callHistoryData.forEach(call => {
            // Count unique completed contacts (not individual calls)
            if (call.contact_id) {
              processedContactIds.add(call.contact_id)
            }
            
            // Add call duration to total time
            if (call.duration) {
              contactStats.totalCallTime += call.duration
            }
            
            // Count different call outcomes
            if (call.call_outcome === 'interested') {
              contactStats.contactsInterested++
            } else if (call.call_outcome === 'not-interested') {
              contactStats.contactsNotInterested++
            } else if (call.call_outcome === 'callback') {
              contactStats.callbacks++
            } else if (call.call_outcome === 'callback_scheduled') {
              contactStats.callbacksScheduled++
            } else if (call.call_outcome === 'meeting-scheduled') {
              contactStats.meetingsScheduled++
            } else if (call.call_outcome === 'no-answer') {
              contactStats.noAnswers++
            } else if (call.call_outcome === 'wrong-number') {
              contactStats.wrongNumbers++
            } else if (call.call_outcome === 'skipped') {
              contactStats.contactsSkipped++
            }
          })
          
          // Set contactsCompleted to the number of unique contacts processed
          contactStats.contactsCompleted = processedContactIds.size
          console.log('📊 Unique contacts processed:', processedContactIds.size)
        } else {
          console.log('📊 No call history found, starting fresh')
        }
        
        // Set the calculated statistics
        setSessionStats(contactStats)
        
        // Find the first not_called contact based on created_at order
        let startIndex = 0;
        
        if (contactsData && contactsData.length > 0) {
          // Sort contacts by created_at (oldest first)
          const sortedContacts = [...contactsData].sort((a, b) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
          
          // Find the index of the first not_called contact
          const notCalledIndex = sortedContacts.findIndex(contact => contact.status === 'not_called');
          
          if (notCalledIndex !== -1) {
            // Find this contact's index in the original contactsData array
            const notCalledContact = sortedContacts[notCalledIndex];
            startIndex = contactsData.findIndex(contact => contact.id === notCalledContact.id);
            console.log('📞 Found first not_called contact at index:', startIndex);
          } else {
            console.log('📞 No not_called contacts found, starting from the beginning');
            startIndex = 0;
          }
        } else {
          console.log('📞 No contacts available');
        }
        
        console.log('📞 Starting from index:', startIndex);
        
        setCurrentContactIndex(startIndex)
        
        // Load user settings for script variables
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserSettings({
            callerName: profile.caller_name || 'Sales Rep',
            companyName: profile.company_name || 'Company'
          })
        }

        // Load scripts
        await loadContactListScripts(listId, user.id)
        
        // Check Google Calendar integration
        const { data: googleIntegration } = await supabase
          .from('google_calendar_integrations')
          .select('is_active, google_email')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()
        
        const hasIntegration = !!googleIntegration
        setHasGoogleCalendarIntegration(hasIntegration)
        if (hasIntegration && googleIntegration.google_email) {
          setGoogleCalendarEmail(googleIntegration.google_email)
        }
        console.log(
          hasIntegration
            ? '📅 Google Calendar integration: true'
            : '📅 No active Google Calendar integration found'
        )

        // Check transcription and AI suggestions usage and limits
        await checkTranscriptionUsage()
        await checkAISuggestionsUsage()
        console.log('📊 Usage limits checked')

        console.log('✅ Contact list data loaded successfully')
        
        // Realtime subscriptions removed - using manual refresh instead
        // await setupRealtimeSubscriptions()
        
      } catch (error) {
        console.error('Error loading contact list data:', error)
        router.push('/contact-lists')
      } finally {
        setLoading(false)
        isLoadingContactListDataRef.current = false
        // Only show popup if Twilio is not ready and popup is not already shown
        if (!twilioReady && !showReadyToStartPopup) {
          setShowReadyToStartPopup(true)
        }
      }
    }

    loadContactListData()
    
    // Realtime subscriptions cleanup removed - using manual refresh instead
    // return () => {
    //   console.log('🧹 Component unmounting - cleaning up realtime subscriptions')
    //   channelsRef.current.forEach(channel => {
    //     supabase.removeChannel(channel)
    //   })
    //   channelsRef.current = []
    // }
  }, [listId, router])

  // Load scripts associated with contact list
  const loadContactListScripts = async (listId: string, userId: string) => {
    setLoadingScripts(true)
    try {
      // Load scripts linked to this contact list
      let scriptsData: Script[] = []
      
      const { data: linkedScripts, error: linkedError } = await supabase
        .from('scripts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .contains('linked_lists', [listId])
        .order('created_at', { ascending: false })

      if (!linkedError && linkedScripts) {
        scriptsData = [...scriptsData, ...linkedScripts]
      }

      // Load general scripts (no linked lists)
      const { data: generalScripts, error: generalError } = await supabase
        .from('scripts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .is('linked_lists', null)
        .order('created_at', { ascending: false })

      if (!generalError && generalScripts) {
        scriptsData = [...scriptsData, ...generalScripts]
      }

      // Remove duplicates
      scriptsData = scriptsData.filter((script, index, self) => 
        index === self.findIndex((s) => s.id === script.id)
      )

      setScripts(scriptsData || [])
      
      // Auto-select first script if available
      if (scriptsData && scriptsData.length > 0) {
        const firstScript = scriptsData[0]
        setSelectedScriptId(firstScript.id)
        setSelectedScript(firstScript)
        
        if (firstScript.objections && Array.isArray(firstScript.objections)) {
          setScriptObjections(firstScript.objections)
        } else {
          setScriptObjections([])
        }
      }
    } catch (error) {
      console.error('Error loading scripts:', error)
    } finally {
      setLoadingScripts(false)
    }
  }

  // Check transcription usage and limits
  const checkTranscriptionUsage = async () => {
    try {
      console.log('📊 Checking transcription usage...')
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No authenticated user')
        setCanGenerateTranscription(false)
        return
      }

      // Get user's subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('package_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!subscription?.package_id) {
        console.error('No active subscription found')
        setCanGenerateTranscription(false)
        return
      }

      // Get package limits
      const { data: packageType } = await supabase
        .from('package_types')
        .select('max_transcription_access')
        .eq('id', subscription.package_id)
        .single()

      const maxTranscriptions = packageType?.max_transcription_access || 0
      console.log('📊 Max transcriptions allowed:', maxTranscriptions)

      // Count current month's transcription usage from user_ai_usage_tracking
      const currentDate = new Date()
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      
      const { data: usageData, error: usageError } = await supabase
        .from('user_ai_usage_tracking')
        .select('id')
        .eq('user_id', user.id)
        .eq('action_type', 'transcription_processing')
        .gte('created_at', startOfMonth.toISOString())

      if (usageError) {
        console.error('Error fetching transcription usage:', usageError)
        setCanGenerateTranscription(false)
        return
      }

      const currentUsage = usageData?.length || 0
      const canGenerate = currentUsage < maxTranscriptions
      
      console.log('📊 Transcription usage result:', {
        current: currentUsage,
        limit: maxTranscriptions,
        allowed: canGenerate
      })
      
      setCanGenerateTranscription(canGenerate)
      setTranscriptionUsage({
        current: currentUsage,
        limit: maxTranscriptions
      })
      
      console.log('📊 Updated transcription usage state:', {
        allowed: canGenerate,
        current: currentUsage,
        limit: maxTranscriptions
      })
    } catch (error) {
      console.error('Error checking transcription usage:', error)
      setCanGenerateTranscription(false)
    }
  }

  // Load transcription usage on component mount
  useEffect(() => {
    checkTranscriptionUsage()
  }, [])

  // Setup Supabase realtime listener for transcription updates
  useEffect(() => {
    if (!callSid) return

    console.log('🔄 Setting up realtime listener for call SID:', callSid)
    
    const channel = supabase
      .channel('recordings-transcription')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recordings',
          filter: `call_sid=eq.${callSid}`
        },
        (payload) => {
          console.log('🔄 Realtime transcription update:', payload)
          const newRecord = payload.new as any
          
          // Check if transcription_text was added
          if (newRecord.transcription_text && !transcription) {
            console.log('✅ Transcription text available via realtime')
            setIsTranscriptionReadyInBackend(true)
            setIsWaitingForTranscription(false)
            setTranscriptionStatus('completed')
          } else if (!newRecord.transcription_text) {
            console.log('⏳ Transcription still processing via realtime')
            setIsWaitingForTranscription(true)
            setTranscriptionStatus(newRecord.transcription_status || 'processing')
          }
          
          // Update transcription status
          if (newRecord.transcription_status) {
            setTranscriptionStatus(newRecord.transcription_status)
          }
        }
      )
      .subscribe()

    return () => {
      console.log('🔄 Cleaning up realtime listener')
      supabase.removeChannel(channel)
    }
  }, [callSid, supabase])

  // Validate Twilio configuration
  useEffect(() => {
    async function validateTwilioConfig() {
      try {
        setIsValidatingTwilioConfig(true)
        setTwilioConfigError(null)
        
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setTwilioConfigError('User not authenticated')
          return
        }

        const { data: config, error: configError } = await supabase
          .from('user_twilio_configs')
          .select('account_sid, auth_token, api_key, api_secret, twiml_app_sid, phone_number, friendly_name')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()

        if (configError) {
          setTwilioConfigError('Error loading Twilio configuration')
          return
        }

        if (!config) {
          setTwilioConfigError('No Twilio configuration found. Please configure Twilio in Settings.')
          return
        }

        // Validate required fields
        const requiredFields = {
          'Account SID': config.account_sid,
          'Auth Token': config.auth_token,
          'API Key': config.api_key,
          'API Secret': config.api_secret,
          'TwiML App SID': config.twiml_app_sid,
          'Phone Number': config.phone_number
        }

        const missingFields = Object.entries(requiredFields)
          .filter(([_, value]) => !value)
          .map(([field, _]) => field)

        if (missingFields.length > 0) {
          setTwilioConfigError(`Missing required Twilio fields: ${missingFields.join(', ')}`)
          return
        }

        setTwilioConfigError(null)

      } catch (error: any) {
        setTwilioConfigError('Error validating Twilio configuration')
      } finally {
        setIsValidatingTwilioConfig(false)
      }
    }

    validateTwilioConfig()
  }, [supabase])

  // Generate transcript - only if transcription is available
  const loadCallTranscription = async () => {
    if (!callSid) {
      console.log('❌ No call SID available for transcription')
      return
    }

    try {
      setIsGeneratingTranscript(true)
      
      // Check if user can access transcription
      if (!canGenerateTranscription) {
        console.log('❌ Transcription access limit reached')
        alert(`Transcription limit reached. You have used ${transcriptionUsage.current}/${transcriptionUsage.limit} transcriptions this month.`)
        setIsGeneratingTranscript(false)
        return
      }

      console.log('🎙️ Getting transcription for call SID:', callSid)
      
      // Fetch transcription from recordings table
      const response = await fetch(`/api/recordings/transcription/${callSid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log('❌ No recording found for call SID:', callSid)
          setTranscription('No recording available for this call.')
          setIsGeneratingTranscript(false)
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Transcription data:', data)

      if (data.transcription_text) {
        // Transcription is available - proceed with generation
        console.log('✅ Transcription available, generating...')
        setTranscription(data.transcription_text)
        setTranscriptionStatus('completed')
        
        // Save transcription to call_history table
        try {
          const historyId = currentCallHistoryIdRef.current || currentCallHistoryId
          if (historyId) {
            const updateResponse = await fetch(`/api/call-history/${historyId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transcription: data.transcription_text
              })
            })

            if (updateResponse.ok) {
              console.log('✅ Transcription saved to call history')
            } else {
              console.error('❌ Failed to save transcription to call history')
            }
          }
        } catch (historyError) {
          console.error('❌ Error saving transcription to call history:', historyError)
        }
        
        // Note: Usage tracking is handled separately in generateTranscriptionWithUsageTracking
      } else {
        // No transcription available - do nothing
        console.log('⚠️ No transcription available, button click ignored')
      }

    } catch (error) {
      console.error('❌ Error getting transcription:', error)
      setTranscription('Error getting transcription. Please try again.')
    } finally {
      setIsGeneratingTranscript(false)
    }
  }

  // Generate transcription with usage tracking (only called when user clicks Generate button)
  const generateTranscriptionWithUsageTracking = async () => {
    if (!callSid && !currentCallHistoryId) {
      console.log('❌ No call SID or call history ID available for transcription generation')
      return
    }

    setIsGeneratingTranscript(true)
    
    try {
      console.log('🔍 Loading transcription from database...')
      
      // Load transcription directly from recordings table
      const { data: recordingData, error: recordingError } = await supabase
        .from('recordings')
        .select('transcription_text')
        .eq('call_sid', callSid)
        .single()
      
      if (recordingError) {
        console.error('❌ Error loading transcription from recordings:', recordingError)
        return
      }
      
      if (recordingData?.transcription_text) {
        console.log('✅ Transcription loaded from database')
        setTranscription(recordingData.transcription_text)
        
        // Add usage tracking
        console.log('📊 Adding usage tracking for transcription generation...')
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.error('No authenticated user for usage tracking')
          return
        }

        // Save usage to user_ai_usage_tracking table
        const { error: usageError } = await supabase
          .from('user_ai_usage_tracking')
          .insert({
            user_id: user.id,
            action_type: 'transcription_processing',
            related_record_id: currentCallHistoryIdRef.current || currentCallHistoryId,
            related_record_type: 'call_history',
            status: 'completed',
            completed_at: new Date().toISOString(),
            metadata: {
              call_sid: callSid,
              transcription_length: recordingData.transcription_text?.length || 0
            }
          })

        if (usageError) {
          console.error('❌ Usage tracking failed:', usageError)
        } else {
          console.log('✅ Usage tracked for transcription processing')
          console.log('📊 Refreshing transcription usage data...')
          await checkTranscriptionUsage()
          console.log('📊 Transcription usage data refreshed')
        }
      } else {
        console.log('⚠️ No transcription text found in database')
      }
      
    } catch (error) {
      console.error('❌ Error in generateTranscriptionWithUsageTracking:', error)
    } finally {
      setIsGeneratingTranscript(false)
    }
  }

  // Check transcription availability when tab is clicked
  const checkTranscriptionAvailability = async () => {
    if (!callSid && !currentCallHistoryId) {
      console.log('❌ No call SID or call history ID available for transcription check')
      return
    }

    setIsCheckingTranscription(true)
    
    try {
      console.log('🔍 Checking transcription availability in database...')
      
      // First try to get transcription from call_history table
      let transcriptionData = null
      
      if (currentCallHistoryId) {
        const { data: callHistory, error: historyError } = await supabase
          .from('call_history')
          .select('ai_transcript')
          .eq('id', currentCallHistoryId)
          .single()
        
        if (!historyError && callHistory?.ai_transcript) {
          transcriptionData = callHistory.ai_transcript
          console.log('✅ Found existing transcription in call_history')
        }
      }
      
      // If not found in call_history, check transcriptions table
      if (!transcriptionData && callSid) {
        const { data: transcriptionRecord, error: transcriptionError } = await supabase
          .from('transcriptions')
          .select('transcription_text')
          .eq('call_sid', callSid)
          .single()
        
        if (!transcriptionError && transcriptionRecord?.transcription_text) {
          transcriptionData = transcriptionRecord.transcription_text
          console.log('✅ Found existing transcription in transcriptions table')
        }
      }
      
      // If not found in transcriptions table, check recordings table
      if (!transcriptionData && callSid) {
        const { data: recordingData, error: recordingError } = await supabase
          .from('recordings')
          .select('transcription_status, transcription_text')
          .eq('call_sid', callSid)
          .single()
        
        if (!recordingError && recordingData) {
          if (recordingData.transcription_text) {
            transcriptionData = recordingData.transcription_text
            console.log('✅ Found existing transcription in recordings table')
          } else if (recordingData.transcription_status === 'processing') {
            console.log('⏳ Transcription is being processed, setting up realtime listener...')
            setIsWaitingForTranscription(true)
            setupTranscriptionRealtimeListener()
            setIsCheckingTranscription(false)
            return
          } else {
            console.log('ℹ️ Transcription not yet started, will show generate button')
          }
        }
      }
      
      if (transcriptionData) {
        // Set the existing transcription
        setTranscription(transcriptionData)
        setIsWaitingForTranscription(false)
        console.log('✅ Loaded existing transcription from database')
      } else {
        console.log('ℹ️ No existing transcription found in database')
        setIsWaitingForTranscription(false) // Show the generate button
      }
      
    } catch (error) {
      console.error('❌ Error checking transcription availability:', error)
      setIsWaitingForTranscription(false) // Show the generate button on error
    } finally {
      setIsCheckingTranscription(false)
    }
  }

  // Setup realtime listener for transcription updates
  const setupTranscriptionRealtimeListener = async () => {
    if (!callSid) {
      console.log('❌ No call SID for realtime listener')
      return
    }

    console.log('🔊 Setting up realtime listener for transcription:', callSid)
    
    // Reset states when starting to listen
    setIsTranscriptionReadyInBackend(false)
    setIsWaitingForTranscription(true)
    setTranscription('') // Clear any existing transcription
    
    // First check if transcription already exists in database
    try {
      const { data: recordingData, error } = await supabase
        .from('recordings')
        .select('transcription_text')
        .eq('call_sid', callSid)
        .single()
      
      if (!error && recordingData?.transcription_text) {
        console.log('✅ Transcription already exists in backend')
        setIsTranscriptionReadyInBackend(true)
        setIsWaitingForTranscription(false)
        return // Don't set up listener if transcription already exists
      }
    } catch (error) {
      console.log('🔍 No existing transcription found, setting up listener')
    }
    
    // Subscribe to recordings table changes for this call_sid
    const subscription = supabase
      .channel('transcription-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recordings',
          filter: `call_sid=eq.${callSid}`
        },
        (payload) => {
          console.log('🔊 Realtime transcription update:', payload)
          
          const newData = payload.new as any
          if (newData.transcription_text) {
            console.log('✅ Transcription ready in backend via realtime update')
            setIsTranscriptionReadyInBackend(true)
            setIsWaitingForTranscription(false)
            setTranscriptionStatus('completed')
            
            // Don't set transcription text yet - wait for user to click generate button
            // setTranscription(newData.transcription_text) - REMOVED
            
            // Unsubscribe after receiving the transcription
            subscription.unsubscribe()
          } else if (newData.transcription_status === 'failed') {
            console.log('❌ Transcription failed via realtime update')
            setIsWaitingForTranscription(false)
            setTranscriptionStatus('failed')
            
            // Unsubscribe after failure
            subscription.unsubscribe()
          }
        }
      )
      .subscribe()

    // Set up cleanup timeout (5 minutes max wait)
    setTimeout(() => {
      console.log('⏰ Transcription realtime listener timeout')
      subscription.unsubscribe()
      setIsWaitingForTranscription(false)
    }, 5 * 60 * 1000) // 5 minutes
  }

  // Check initial transcription status after call ends
  const checkInitialTranscriptionStatus = async (callSidToCheck: string) => {
    try {
      console.log('🔍 Checking initial transcription status for:', callSidToCheck)
      
      const response = await fetch(`/api/recordings/transcription/${callSidToCheck}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Initial transcription status:', data.transcription_status)
        
        setTranscriptionStatus(data.transcription_status || 'idle')
        
        if (data.transcription_status === 'processing') {
          setIsWaitingForTranscription(true)
          console.log('⏳ Transcription is processing, will wait for realtime update')
        } else if (data.transcription_text) {
          setTranscription(data.transcription_text)
          setTranscriptionStatus('completed')
          console.log('✅ Transcription already available')
        }
      } else {
        console.log('⚠️ Could not check initial transcription status')
      }
    } catch (error) {
      console.error('❌ Error checking initial transcription status:', error)
    }
  }

  // Current contact helper
  const contact = contacts.length > 0 && currentContactIndex >= 0 && currentContactIndex < contacts.length 
    ? contacts[currentContactIndex] 
    : { name: 'Loading...', phone: '', company: '', position: '', email: '' }

  // Utility functions
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }



  // Save call outcome to database
  const saveCallOutcomeToDatabase = async (outcome: string) => {
    if (!currentCallHistoryId) {
      console.log('No call history ID to save outcome')
      return false
    }

    try {
      const success = await updateCallHistoryRecord(currentCallHistoryId, {
        call_outcome: outcome,
        updated_at: new Date().toISOString()
      })

      if (success) {
        console.log('✅ Call outcome saved:', outcome)
        // Special side effect: if marked as Do Not Call, flag the contact
        if (outcome === 'do-not-call' && contact && (contact as any).id) {
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              const { error: dncError } = await supabase
                .from('contacts')
                .update({ do_not_call: true, updated_at: new Date().toISOString() })
                .eq('id', (contact as any).id)
                .eq('user_id', user.id)
              if (dncError) {
                console.warn('⚠️ Failed to set Do Not Call flag on contact:', dncError)
              } else {
                console.log('🚫 Contact flagged as Do Not Call')
              }
            }
          } catch (sideEffectError) {
            console.warn('⚠️ Error applying Do Not Call side effect:', sideEffectError)
          }
        }
        return true
      }
    } catch (error) {
      console.error('❌ Error saving call outcome:', error)
    }
    return false
  }

  // Save callback to database
  const saveCallbackToDatabase = async (callbackDate: string, callbackTime: string, reason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('No user found for saving callback')
        return false
      }

      const callbackData = {
        user_id: user.id,
        call_history_id: currentCallHistoryId,
        contact_name: contact.name,
        contact_phone: contact.phone,
        contact_email: contact.email || null,
        contact_company: contact.company || null,
        callback_date: callbackDate,
        callback_time: callbackTime,
        status: 'scheduled',
        reason: reason || null,
        notes: notes.trim() || null
      }

      const { data, error } = await supabase
        .from('callbacks')
        .insert(callbackData)
        .select('id')
        .single()

      if (error) {
        console.error('Error saving callback:', error)
        return false
      }

      console.log('✅ Callback saved to database:', data.id)

      // Try to add to Google Calendar if connected
      try {
        if (hasGoogleCalendarIntegration) {
          console.log('📅 Adding callback to Google Calendar...')
          const eventData = formatCallbackEvent(contact, callbackDate, callbackTime, reason)
          const calendarResult = await createGoogleCalendarEvent(eventData)
          
          if (calendarResult.success) {
            console.log('✅ Callback added to Google Calendar')
            setCallbackAddedToGoogleCalendar(true)
          } else {
            console.warn('⚠️ Failed to add callback to Google Calendar:', calendarResult.error)
          }
        } else {
          console.log('📅 Google Calendar integration not active, skipping calendar add')
        }
      } catch (calendarError) {
        console.warn('⚠️ Google Calendar integration error for callback:', calendarError)
      }

      return true
    } catch (error) {
      console.error('Error in saveCallbackToDatabase:', error)
      return false
    }
  }

  // Save meeting to database
  const saveMeetingToDatabase = async (meetingDate: string, meetingTime: string, meetingNotes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('No user found for saving meeting')
        return false
      }

      const meetingData = {
        user_id: user.id,
        call_history_id: currentCallHistoryId,
        contact_name: contact.name,
        contact_phone: contact.phone,
        contact_email: contact.email || null,
        contact_company: contact.company || null,
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        status: 'scheduled',
        notes: meetingNotes || notes.trim() || null
      }

      const { data, error } = await supabase
        .from('meetings')
        .insert(meetingData)
        .select('id')
        .single()

      if (error) {
        console.error('Error saving meeting:', error)
        return false
      }

      console.log('✅ Meeting saved to database:', data.id)

      // Try to add to Google Calendar if connected
      try {
        if (hasGoogleCalendarIntegration) {
          console.log('📅 Adding meeting to Google Calendar...')
          const eventData = formatMeetingEvent(contact, meetingDate, meetingTime, meetingNotes)
          const calendarResult = await createGoogleCalendarEvent(eventData)
          
          if (calendarResult.success) {
            console.log('✅ Meeting added to Google Calendar')
            setMeetingAddedToGoogleCalendar(true)
          } else {
            console.warn('⚠️ Failed to add meeting to Google Calendar:', calendarResult.error)
          }
        } else {
          console.log('📅 Google Calendar integration not active, skipping calendar add')
        }
      } catch (calendarError) {
        console.warn('⚠️ Google Calendar integration error for meeting:', calendarError)
      }

      return true
    } catch (error) {
      console.error('Error in saveMeetingToDatabase:', error)
      return false
    }
  }

  // Load recording for a specific call (or fallback to current state/history)
  const loadCallRecording = async (requestedCallSid?: string) => {
    // Try to get call_sid from multiple sources
    let currentCallSid = requestedCallSid || callSid

    // If callSid from state is null, try to get it from call history
    const historyId = currentCallHistoryIdRef.current || currentCallHistoryId
    if (!currentCallSid && historyId) {
      try {
        console.log('🔍 Call SID not available in state, fetching from call history for recording:', historyId)
        const { data: callHistory, error } = await supabase
          .from('call_history')
          .select('call_sid')
          .eq('id', historyId)
          .single()

        if (error || !callHistory?.call_sid) {
          console.error('❌ Could not get call SID from call history for recording:', error)
          setRecordingError('Could not find call SID')
          return
        }

        currentCallSid = callHistory.call_sid
        console.log('✅ Got call SID from call history for recording:', currentCallSid)
      } catch (error) {
        console.error('❌ Error fetching call SID from call history for recording:', error)
        setRecordingError('Error fetching call SID')
        return
      }
    }

    if (!currentCallSid) {
      console.error('No call SID available')
      setRecordingError('No call SID available')
      return
    }

    setIsLoadingRecording(true)
    setRecordingError(null)

    try {
      console.log('🎵 Loading recording for call SID:', currentCallSid)
      
      const response = await fetch(`/api/recordings/recording/${currentCallSid}`)
      
      if (response.ok) {
        const recordingData = await response.json()
        // Only apply if we're still focused on this ended call's recording
        if (focusedEndedCallSidRef.current && focusedEndedCallSidRef.current !== currentCallSid) {
          console.log('⏭️ Skipping recording apply; focus moved to different callSid:', focusedEndedCallSidRef.current)
          return
        }
        setRecordingUrl(recordingData.recording_url)
        setRecordingAvailable(true)
        console.log('✅ Recording loaded successfully:', recordingData.recording_sid)
        
        // Set the audio element source
        const audioElement = document.getElementById('recording-audio') as HTMLAudioElement
        if (audioElement && recordingData.recording_url) {
          audioElement.src = recordingData.recording_url
          audioElement.load() // Force reload of the audio element
        }
      } else {
        const errorData = await response.json()
        console.error('❌ Failed to load recording:', errorData.error)
        setRecordingAvailable(false)
        setRecordingError(errorData.error || 'Failed to load recording')
      }
    } catch (error: any) {
      console.error('❌ Error loading recording:', error)
      setRecordingAvailable(false)
      setRecordingError('Failed to load recording')
    } finally {
      setIsLoadingRecording(false)
    }
  }

  // Handle recording playback (based on original implementation)
  const handlePlayPauseRecording = () => {
    const audioElement = document.getElementById('recording-audio') as HTMLAudioElement
    if (audioElement) {
      if (isPlayingRecording) {
        audioElement.pause()
        setIsPlayingRecording(false)
      } else {
        audioElement.play()
        setIsPlayingRecording(true)
      }
    }
  }



  // Generate AI call summary
  const generateCallSummary = async (transcriptionText?: string) => {
    const textToAnalyze = transcriptionText || transcription
    
    if (!textToAnalyze || textToAnalyze.trim() === '') {
      console.log('❌ No transcription available for call summary')
      return
    }

    setIsGeneratingCallSummary(true)
    
    try {
      console.log('📝 Requesting call summary generation...')
      
      const response = await fetch('/api/ai-analysis-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription: textToAnalyze,
          contactName: contact.name,
          contactCompany: contact.company,
          contactPosition: contact.position,
          requestType: 'call_summary'
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Call summary generated:', result)
        
        // Generate formatted summary based on AI analysis
        const summaryText = `CALL SUMMARY:
• ${result.summary || `Spoke with ${contact.name} from ${contact.company}`}

${result.pain_points && result.pain_points.length > 0 ? `PAIN POINTS IDENTIFIED:
${result.pain_points.map((point: any) => `• ${point}`).join('\n')}

` : ''}${result.solutions && result.solutions.length > 0 ? `SOLUTION PRESENTED:
${result.solutions.map((solution: any) => `• ${solution}`).join('\n')}

` : ''}${result.next_steps && result.next_steps.length > 0 ? `AGREEMENTS & NEXT STEPS:
${result.next_steps.map((step: any) => `• ${step}`).join('\n')}

` : ''}CUSTOMER SENTIMENT:
• ${result.sentiment || 'Engagement level noted'}
• Decision maker: ${contact.position || 'Role to be confirmed'}
${result.timeline ? `• ${result.timeline}` : ''}

${result.follow_up_actions && result.follow_up_actions.length > 0 ? `FOLLOW-UP ACTIONS:
${result.follow_up_actions.map((action: any) => `• ${action}`).join('\n')}

` : ''}CALL OUTCOME: ${result.outcome || 'Call completed successfully'}`

        setCallSummary(summaryText)
        
        // Save AI summary to call history
        if (currentCallHistoryId) {
          console.log('💾 Saving AI summary to call history...')
          await updateCallHistoryRecord(currentCallHistoryId, {
            ai_summary: summaryText,
            ai_analysis_generated_at: new Date().toISOString()
          })
          console.log('✅ AI summary saved successfully')
        }
        
      } else {
        const errorData = await response.json()
        console.error('❌ Call summary generation failed:', errorData.error)
        
        // Fallback summary
        const basicSummary = `CALL SUMMARY:
• Spoke with ${contact.name} from ${contact.company}
• Call duration: ${formatDuration(finalCallDuration)}
• Date: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}

CONTACT INFORMATION:
• Name: ${contact.name}
• Company: ${contact.company}
• Position: ${contact.position || 'Not specified'}
• Phone: ${contact.phone}

CALL OUTCOME: Call completed - transcription available for detailed review

NOTE: AI analysis failed - please review transcription manually for detailed insights.`
        
        setCallSummary(basicSummary)
        
        // Save basic summary to call history
        if (currentCallHistoryId) {
          await updateCallHistoryRecord(currentCallHistoryId, {
            ai_summary: basicSummary,
            ai_analysis_generated_at: new Date().toISOString()
          })
        }
      }
    } catch (error: any) {
      console.error('❌ Error generating call summary:', error)
      
      // Fallback summary for errors
      const errorSummary = `CALL SUMMARY:
• Spoke with ${contact.name} from ${contact.company}
• Call duration: ${formatDuration(finalCallDuration)}

CALL OUTCOME: Call completed successfully

ERROR: Could not generate AI summary - manual review of transcription recommended.`
      
      setCallSummary(errorSummary)
    } finally {
      setIsGeneratingCallSummary(false)
    }
  }

  // Check Call Summary usage and limits
  const checkCallSummaryUsage = async () => {
    try {
      const result = await canPerformAction('call_summary_generation')
      setSummaryUsage({
        current: result.current || 0,
        limit: result.limit || 0
      })
      console.log('📊 Call Summary usage:', result)
    } catch (error) {
      console.error('❌ Error checking Call Summary usage:', error)
    }
  }

  // Generate Call Summary with usage tracking and package limits check
  const generateCallSummaryWithUsageTracking = async (transcriptionText?: string) => {
    try {
      const canPerform = await canPerformAction('call_summary_generation')
      if (!canPerform.allowed) {
        console.log('❌ Call Summary generation not allowed:', canPerform.reason)
        alert(canPerform.reason || 'Call summary generation limit reached. Please upgrade your package.')
        return
      }

      await generateCallSummary(transcriptionText)

      await updateUsage('call_summary_generation', 1)
      console.log('📊 Call Summary usage updated')

      await checkCallSummaryUsage()
    } catch (error) {
      console.error('❌ Error in generateCallSummaryWithUsageTracking:', error)
    }
  }

  // Check AI suggestions usage and limits
  const checkAISuggestionsUsage = async () => {
    try {
      const result = await canPerformAction('call_suggestions_generation')
      setSuggestionsUsage({
        current: result.current || 0,
        limit: result.limit || 0
      })
      setCanGenerateAISuggestions(result.allowed)
      console.log('📊 AI Suggestions usage:', result)
    } catch (error) {
      console.error('❌ Error checking AI suggestions usage:', error)
      setCanGenerateAISuggestions(false)
    }
  }

  // Generate AI suggestions with usage tracking and package limits check
  const generateAISuggestionsWithUsageTracking = async (transcriptionText?: string) => {
    try {
      // Check if user can perform this action
      const canPerform = await canPerformAction('call_suggestions_generation')
      
      if (!canPerform.allowed) {
        console.log('❌ AI Suggestions generation not allowed:', canPerform.reason)
        alert(canPerform.reason || 'AI Suggestions generation limit reached. Please upgrade your package.')
        return
      }

      // Generate AI suggestions (this will handle loading state)
      await loadAISuggestions(transcriptionText)
      
      // Track usage
      await updateUsage('call_suggestions_generation', 1)
      console.log('📊 AI Suggestions usage updated')
      
      // Refresh usage limits
      await checkAISuggestionsUsage()
      
    } catch (error) {
      console.error('❌ Error in generateAISuggestionsWithUsageTracking:', error)
    }
  }

  // Load AI suggestions for the call
  const loadAISuggestions = async (transcriptionText?: string) => {
    const textToAnalyze = transcriptionText || transcription
    
    if (!textToAnalyze || textToAnalyze.trim() === '') {
      console.log('❌ No transcription available for AI analysis')
      return
    }

    setIsLoadingAISuggestions(true)
    
    try {
      console.log('🤖 Requesting AI analysis...')
      
      const response = await fetch('/api/ai-analysis-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription: textToAnalyze,
          contactName: contact.name,
          contactCompany: contact.company,
          contactPosition: contact.position
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ AI suggestions generated:', result)
        
        if (result.suggestions && Array.isArray(result.suggestions)) {
          setAiSuggestions(result.suggestions)
          
          // Save AI suggestions to call history
          if (currentCallHistoryId) {
            console.log('💾 Saving AI suggestions to call history...')
            await updateCallHistoryRecord(currentCallHistoryId, {
              ai_suggestions: result.suggestions,
              ai_suggestions_generated_at: new Date().toISOString()
            })
            console.log('✅ AI suggestions saved to call history')
          }
        }
        
      } else {
        const errorData = await response.json()
        console.error('❌ AI suggestions generation failed:', errorData.error)
        
        // Fallback suggestions
        setAiSuggestions([
          {
            id: 1,
            category: "General",
            title: "Call Completed Successfully",
            description: "The call was completed and recorded. Review the transcription for detailed insights.",
            whatToSay: "Follow up based on the conversation content.",
            priority: "medium"
          }
        ])
      }
    } catch (error: any) {
      console.error('❌ Error loading AI suggestions:', error)
      setAiSuggestions([])
    } finally {
      setIsLoadingAISuggestions(false)
    }
  }

  // Save notes to database
  const saveNotesToDatabase = async () => {
    console.log('🔍 saveNotesToDatabase called:', { currentCallHistoryId, notes: notes.length })
    
    if (!currentCallHistoryId || !notes.trim()) {
      console.log('❌ Skipping save - no call history ID or empty notes')
      return
    }
    
    try {
      console.log('💾 Saving notes to database...')
      
      const { error } = await supabase
        .from('call_history')
        .update({ notes: notes.trim() })
        .eq('id', currentCallHistoryId)
      
      if (error) {
        console.error('❌ Error saving notes:', error)
        return
      }
      
      console.log('✅ Notes saved successfully')
      setNotesSaved(true)
      
      // Hide the "Notes saved" message after 3 seconds
      setTimeout(() => {
        setNotesSaved(false)
      }, 3000)
      
    } catch (error) {
      console.error('❌ Error saving notes:', error)
    }
  }

  // Handle session start
  const handleStartSession = async () => {
    try {
      console.log('🎯 User gesture received - starting calling...')
      
      // First, try to resume AudioContext with user gesture
      if (typeof window !== 'undefined') {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          if (audioContext.state === 'suspended') {
            await audioContext.resume()
            console.log('✅ AudioContext resumed successfully')
          }
          audioContext.close()
          setAudioContextResumed(true)
        } catch (error) {
          console.error('⚠️ Could not resume AudioContext:', error)
        }
      }

      // Request audio permissions
      await requestAudioPermissions()
      
      // Close the popup and mark session as ready
      setShowReadyToStartPopup(false)
      setSessionReady(true)
      setIsRequestingPermission(true)
      
      console.log('✅ Session ready, Twilio will initialize now')
      
    } catch (error) {
      console.error('❌ Error starting session:', error)
      setTwilioError('Failed to start session. Please try again.')
      setIsRequestingPermission(false)
      // Don't show popup again on error
      setShowReadyToStartPopup(false)
    }
  }

  // Request audio permissions
  const requestAudioPermissions = async () => {
    try {
      console.log('🎤 Requesting audio permissions...')
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false 
      })
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop())
      
      console.log('✅ Audio permissions granted')
      
    } catch (error) {
      console.error('❌ Audio permission denied:', error)
      setTwilioError('Microphone access is required for calling. Please allow microphone access and try again.')
    } finally {
      setIsRequestingPermission(false)
    }
  }

  // Add event listeners for page unload and route changes
  useEffect(() => {
    if (!sessionId || !listId) return
    
    console.log('🔄 Setting up page unload event listener for calling pause')
    
    // Handle beforeunload event (browser/tab close)
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('🚫 beforeunload event triggered - pausing calling')
      handleCallingPause()
      
      // Standard way to show confirmation dialog on page close
      // Note: Modern browsers ignore custom messages for security reasons
      event.preventDefault()
      event.returnValue = ''
    }
    
    // Add event listener for page unload
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [sessionId, listId])
  
  // Handle Next.js App Router navigation events
  useEffect(() => {
    if (!sessionId || !listId) return
    
    console.log('🔄 Setting up Next.js navigation event listener for calling pause')
    
    // This effect runs when the component is about to unmount due to navigation
    return () => {
      // Only run if we're not just refreshing the page
      const isNavigatingAway = !window.location.pathname.includes('/calling')
      
      if (isNavigatingAway) {
        console.log('🚫 Navigation detected - pausing calling')
        handleCallingPause()
      }
    }
  }, [sessionId, listId])

  // Load Twilio Voice SDK
  useEffect(() => {
    // Only initialize Twilio after user has confirmed they're ready to start
    if (!sessionReady) return

    const loadTwilioSDK = async () => {
      if (typeof window !== 'undefined' && !window.Twilio) {
        try {
          // Load Twilio SDK from the public folder
          await new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = '/twilio.min.js'
            script.onload = resolve
            script.onerror = reject
            document.head.appendChild(script)
          })
          console.log('✅ Twilio SDK loaded successfully')
          
          // Give a small delay to ensure Twilio is fully loaded
          setTimeout(() => {
            console.log('🔄 Triggering Twilio Device initialization after SDK load')
            if (window.Twilio && !twilioDevice) {
              initializeTwilioDevice()
            }
          }, 100)
        } catch (error) {
          console.error('❌ Failed to load Twilio SDK:', error)
          setTwilioError('Failed to load Twilio SDK. Please refresh the page.')
        }
      } else if (window.Twilio && !twilioDevice) {
        console.log('✅ Twilio SDK already available, initializing device')
        initializeTwilioDevice()
      }
    }

    loadTwilioSDK()
  }, [sessionReady, twilioDevice]) // Only run when sessionReady becomes true

  // Cleanup Twilio Device when component unmounts
  useEffect(() => {
    // Only return cleanup function - don't run cleanup on every render
    return () => {
      if (twilioDeviceRef.current) {
        console.log('🧹 Component unmount - cleaning up Twilio Device...')
        try {
          // Disconnect any active connections
          if (activeConnectionRef.current) {
            activeConnectionRef.current.disconnect()
            console.log('📞 Active connection disconnected')
          }
          
          // Destroy the Twilio Device
          if (twilioDeviceRef.current.destroy) {
            twilioDeviceRef.current.destroy()
            console.log('🗑️ Twilio Device destroyed')
          } else if (twilioDeviceRef.current.disconnectAll) {
            twilioDeviceRef.current.disconnectAll()
            console.log('🗑️ Twilio Device disconnected')
          }
          
        } catch (error) {
          console.error('❌ Error during Twilio cleanup:', error)
        }
      }
    }
  }, []) // Empty dependency array - only run on mount/unmount

  // End Calling: disconnect any active call, clean up Twilio device, and redirect to dashboard
  const handleEndCalling = useCallback(() => {
    try {
      if (activeConnectionRef.current) {
        try {
          activeConnectionRef.current.disconnect()
          console.log('📞 Active connection disconnected via End Calling')
        } catch (e) {
          console.error('❌ Failed to disconnect active connection:', e)
        }
      }
      if (twilioDeviceRef.current) {
        try {
          if (twilioDeviceRef.current.destroy) {
            twilioDeviceRef.current.destroy()
            console.log('🗑️ Twilio Device destroyed via End Calling')
          } else if (twilioDeviceRef.current.disconnectAll) {
            twilioDeviceRef.current.disconnectAll()
            console.log('🗑️ Twilio Device disconnected via End Calling')
          }
        } catch (e) {
          console.error('❌ Failed to cleanup Twilio Device:', e)
        }
      }
    } finally {
      router.push('/dashboard')
    }
  }, [router])

  // Cleanup on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (twilioDeviceRef.current) {
        console.log('🧹 Page unload - cleaning up Twilio Device...')
        try {
          if (activeConnectionRef.current) {
            activeConnectionRef.current.disconnect()
          }
          if (twilioDeviceRef.current.destroy) {
            twilioDeviceRef.current.destroy()
          } else if (twilioDeviceRef.current.disconnectAll) {
            twilioDeviceRef.current.disconnectAll()
          }
        } catch (error) {
          console.error('❌ Error during page unload cleanup:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, []) // Empty dependency array

  // Local time update effect
  useEffect(() => {
    const updateLocalTime = () => {
      if (contact.phone) {
        // Skip time calculation for toll-free numbers
        if (isTollFreeNumber(contact.phone)) {
          setLocalTimeInfo({
            location: 'Toll-Free',
            time: 'No timezone',
            timezone: 'N/A'
          })
        } else {
          const timeInfo = getLocalTimeFromPhoneNumber(contact.phone)
          setLocalTimeInfo(timeInfo)
        }
      }
    }

    // Update immediately
    updateLocalTime()

    // Update every 30 seconds to keep time current
    const interval = setInterval(updateLocalTime, 30000)

    return () => clearInterval(interval)
  }, [contact.phone])

  // Initialize Twilio Device
  const initializeTwilioDevice = async () => {
    console.log('🔄 initializeTwilioDevice called', {
      hasTwilio: !!window.Twilio,
      hasDevice: !!twilioDevice,
      twilioConstructor: window.Twilio?.Device
    })
    
    if (!window.Twilio || twilioDevice) {
      console.log('❌ Exiting early:', {
        noTwilio: !window.Twilio,
        hasDevice: !!twilioDevice
      })
      return
    }

    try {
      console.log('🔄 Initializing Twilio Device...')
      
      // Get access token from backend (which now uses user's Twilio config)
      console.log('📡 Fetching access token with user configuration...')
      
      // Get Supabase session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication session. Please log in.')
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/access-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'x-api-secret': process.env.NEXT_PUBLIC_API_SECRET || '',
          'Content-Type': 'application/json'
        }
      })
      
      console.log('📡 Access token response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Access token request failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        // Set config error if Twilio config is missing or authentication failed
        if (response.status === 404 || response.status === 400) {
          setConfigError('Twilio konfiguratsioon puudub. Palun seadistage Twilio andmed Settings lehel.')
          setTwilioError('Twilio configuration missing. Please configure Twilio in Settings.')
          return
        } else {
          throw new Error(`Failed to fetch access token: ${response.status} ${response.statusText}`)
        }
      }
      
      const tokenData = await response.json()
      console.log('✅ Access token received:', !!tokenData.token)
      
      // Initialize Twilio Device
      const device = new window.Twilio.Device(tokenData.token, {
        logLevel: 1,
        codecPreferences: ['opus', 'pcmu'],
        fakeLocalDTMF: true,
        enableRingingState: true,
        allowIncomingWhileBusy: false
      })
      
      console.log('📱 Twilio Device created, setting up event listeners...')
      
      // Device event listeners
      device.on('ready', () => {
        console.log('✅ Twilio Device is ready!')
        setTwilioReady(true)
        setTwilioError(null)
        setConfigError(null)
        setIsRequestingPermission(false)
        
        // Load available audio devices
        loadAudioDevices()
      })
      
      device.on('error', (error: any) => {
        console.error('❌ Twilio Device error:', error)
        setTwilioError(`Device error: ${error.message}`)
        setTwilioReady(false)
      })
      
      device.on('tokenWillExpire', () => {
        console.log('⚠️ Twilio token will expire')
      })
      
      device.on('registered', () => {
        console.log('✅ Twilio Device registered')
        // In newer Twilio SDK versions, 'registered' means the device is ready
        console.log('✅ Twilio Device is ready! (via registered event)')
        setTwilioReady(true)
        setTwilioError(null)
        setConfigError(null)
        setIsRequestingPermission(false)
        
        // Load available audio devices
        loadAudioDevices()
      })
      
      device.on('unregistered', () => {
        console.log('⚠️ Twilio Device unregistered')
      })
      
      // Add debug logging for all events
      const originalEmit = device.emit.bind(device)
      device.emit = function(event: string, ...args: any[]) {
        console.log(`📡 Twilio Device event: ${event}`, args.length > 0 ? args : '')
        return originalEmit(event, ...args)
      }
      
      device.on('connect', (connection: any) => {
        console.log('📞 Call connected!')
        setActiveConnection(connection)
        activeConnectionRef.current = connection
        setIsConnecting(false)
        setCallStarted(true)
        
        // Capture call SID for recording retrieval
        if (connection && connection.parameters && connection.parameters.CallSid) {
          const connectedCallSid = connection.parameters.CallSid
          setCallSid(connectedCallSid)
          console.log('📞 Call SID captured:', connectedCallSid)
          
          // Update call history record with call SID
          if (currentCallHistoryIdRef.current) {
            updateCallHistoryRecord(currentCallHistoryIdRef.current, {
              call_sid: connectedCallSid,
              updated_at: new Date().toISOString()
            }).then(() => {
              console.log('✅ Call history updated with call_sid:', connectedCallSid)
            }).catch((error) => {
              console.error('❌ Failed to update call history with call_sid:', error)
            })
          } else {
            console.log('⚠️ No current call history ID available for call_sid update')
          }
        } else {
          console.log('⚠️ No Call SID found in connection parameters')
        }
        
        // Start call timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
        timerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1)
        }, 1000)
      })
      
      device.on('disconnect', (connection: any) => {
        console.log('📞 Call disconnected (device listener):', connection)
        const disconnectCallSid = connection?.parameters?.CallSid
        console.log('📞 Disconnect event CallSid:', disconnectCallSid)
        handleCallEnd(disconnectCallSid)
      })
      
      device.on('cancel', (connection: any) => {
        console.log('📞 Call canceled (device listener):', connection)
        const cancelCallSid = connection?.parameters?.CallSid
        console.log('📞 Cancel event CallSid:', cancelCallSid)
        handleCallEnd(cancelCallSid)
      })

      device.on('reject', (connection: any) => {
        console.log('📞 Call rejected (device listener):', connection)
        const rejectCallSid = connection?.parameters?.CallSid
        console.log('📞 Reject event CallSid:', rejectCallSid)
        handleCallEnd(rejectCallSid)
      })
      
      // Store device reference
      setTwilioDevice(device)
      twilioDeviceRef.current = device
      console.log('📱 Twilio Device stored in state and ref')
      
      // Try to explicitly register the device
      try {
        console.log('📡 Attempting to register Twilio Device...')
        if (typeof device.register === 'function') {
          await device.register()
          console.log('✅ Device registration attempted')
        } else {
          console.log('ℹ️ Device.register() not available - device should auto-register')
        }
      } catch (regError: any) {
        console.error('❌ Device registration failed:', regError)
        setTwilioError(`Device registration failed: ${regError.message}`)
      }
      
    } catch (error: any) {
      console.error('❌ Failed to initialize Twilio Device:', error)
      setTwilioError(`Failed to initialize Twilio: ${error.message}`)
      setTwilioReady(false)
    }
  }

  // Load available audio devices
  const loadAudioDevices = async () => {
    try {
      console.log('🎤 Loading available audio devices...')
      
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(device => device.kind === 'audioinput')
      const audioOutputs = devices.filter(device => device.kind === 'audiooutput')
      
      console.log('🎤 Found audio devices:', { inputs: audioInputs.length, outputs: audioOutputs.length })
      
      setInputDevices(audioInputs)
      setOutputDevices(audioOutputs)
      
      // Set default devices if none selected
      if (audioInputs.length > 0 && !selectedInputDevice) {
        setSelectedInputDevice(audioInputs[0].deviceId)
        console.log('🎤 Set default input device:', audioInputs[0].label)
      }
      if (audioOutputs.length > 0 && !selectedOutputDevice) {
        setSelectedOutputDevice(audioOutputs[0].deviceId)
        console.log('🔊 Set default output device:', audioOutputs[0].label)
      }
      
      setDevicesLoaded(true)
      
      // Apply selected devices to Twilio
      await loadAudioPreferences(audioInputs, audioOutputs)
      
    } catch (error) {
      console.error('❌ Error loading audio devices:', error)
    }
  }

  // Apply audio preferences to Twilio device
  const loadAudioPreferences = async (inputDevices: MediaDeviceInfo[], outputDevices: MediaDeviceInfo[]) => {
    if (!twilioDevice || !twilioDevice.audio) return
    
    try {
      // Set input device (microphone)
      if (selectedInputDevice) {
        const inputDevice = inputDevices.find(d => d.deviceId === selectedInputDevice)
        if (inputDevice) {
          await twilioDevice.audio.setInputDevice(selectedInputDevice)
          console.log('✅ Twilio input device set:', inputDevice.label)
        }
      }
      
      // Set output device (speakers) - if supported
      if (selectedOutputDevice && twilioDevice.audio.setOutputDevice) {
        const outputDevice = outputDevices.find(d => d.deviceId === selectedOutputDevice)
        if (outputDevice) {
          await twilioDevice.audio.setOutputDevice(selectedOutputDevice)
          console.log('✅ Twilio output device set:', outputDevice.label)
        }
      }
    } catch (error) {
      console.error('❌ Error setting audio devices:', error)
    }
  }

  // Save audio device preferences
  const saveAudioPreferences = async (inputDeviceId: string, outputDeviceId: string) => {
    try {
      setSelectedInputDevice(inputDeviceId)
      setSelectedOutputDevice(outputDeviceId)
      
      // Apply to Twilio device immediately
      if (twilioDevice && twilioDevice.audio) {
        if (inputDeviceId) {
          await twilioDevice.audio.setInputDevice(inputDeviceId)
          console.log('✅ Input device updated:', inputDeviceId)
        }
        
        if (outputDeviceId && twilioDevice.audio.setOutputDevice) {
          await twilioDevice.audio.setOutputDevice(outputDeviceId)
          console.log('✅ Output device updated:', outputDeviceId)
        }
      }
      
      console.log('✅ Audio preferences saved')
      
    } catch (error) {
      console.error('❌ Error saving audio preferences:', error)
    }
  }

  // Create call history record
  const createCallHistoryRecord = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('No user found for call history')
        return null
      }

      // Fetch active Twilio phone number to store as from_phone (fallback to latest if no active)
      let outboundCallerNumber: string | null = null
      try {
        const { data: cfgActive, error: cfgErrActive } = await supabase
          .from('user_twilio_configs')
          .select('phone_number')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()
        if (cfgErrActive) {
          console.warn('⚠️ Could not load ACTIVE Twilio config for from_phone:', cfgErrActive)
        }
        if (cfgActive?.phone_number) {
          outboundCallerNumber = cfgActive.phone_number
          console.log('📞 Using ACTIVE Twilio number for from_phone:', outboundCallerNumber)
        } else {
          // Fallback: latest config by updated_at
          const { data: cfgLatest, error: cfgErrLatest } = await supabase
            .from('user_twilio_configs')
            .select('phone_number, updated_at')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle()
          if (cfgErrLatest) {
            console.warn('⚠️ Could not load LATEST Twilio config for from_phone:', cfgErrLatest)
          }
          if (cfgLatest?.phone_number) {
            outboundCallerNumber = cfgLatest.phone_number
            console.log('📞 Using LATEST Twilio number for from_phone:', outboundCallerNumber)
          } else {
            console.warn('⚠️ No Twilio phone_number found; from_phone will be null')
          }
        }
      } catch (e) {
        console.warn('⚠️ Exception while loading Twilio config for from_phone:', e)
      }

      // Ensure we have a session_id even in single-contact mode
      let effectiveSessionId = sessionId
      if (!effectiveSessionId && isSingleMode) {
        try {
          effectiveSessionId = (globalThis as any).crypto?.randomUUID?.() || `single-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        } catch {
          effectiveSessionId = `single-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        }
      }

      const callHistoryData: any = {
        user_id: user.id,
        contact_id: contact?.id || null,
        contact_name: contact?.name,
        contact_phone: contact?.phone,
        contact_company: contact?.company || null,
        contact_position: contact?.position || null,
        contact_email: contact?.email || null,
        contact_location: contact?.location || null,
        started_at: new Date().toISOString(),
        call_outcome: null,
        type: 'outgoing_call',
        from_phone: outboundCallerNumber || null
      }
      // Only include these when available to support single-contact mode without session/list
      if (listId) {
        const listIdNum = parseInt(listId as any, 10)
        if (!Number.isNaN(listIdNum)) {
          callHistoryData.contact_list_id = listIdNum
        }
      }
      if (effectiveSessionId) callHistoryData.session_id = effectiveSessionId

      console.log('📝 Inserting call history with data:', { ...callHistoryData, from_phone: callHistoryData.from_phone })

      const { data, error } = await supabase
        .from('call_history')
        .insert(callHistoryData)
        .select('id')
        .single()

      if (error) {
        console.error('Error creating call history:', error, (error as any)?.message, (error as any)?.details, (error as any)?.hint)
        return null
      }

      console.log('✅ Call history record created:', data.id)
      return data.id
    } catch (error) {
      console.error('Error in createCallHistoryRecord:', error)
      return null
    }
  }

  // Update call history record
  const updateCallHistoryRecord = async (historyId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('call_history')
        .update(updates)
        .eq('id', historyId)

      if (error) {
        console.error('Error updating call history:', error)
        return false
      }

      console.log('✅ Call history updated:', updates)
      return true
    } catch (error) {
      console.error('Error in updateCallHistoryRecord:', error)
      return false
    }
  }
  
  // This function has been moved to line 1558 to avoid duplicate declarations

  // Handle start call
  const handleStartCall = async () => {
    if (!twilioDevice || !twilioReady) {
      setTwilioError('Twilio Device not ready. Please refresh the page.')
      return
    }

    if (!contact.phone) {
      setTwilioError('No phone number available for this contact.')
      return
    }

    try {
      console.log('📞 Starting call to:', contact.phone)
      setIsConnecting(true)
      callEndHandledRef.current = false
      setTwilioError(null)
      
      // Expand script section when starting a new call (notes stays expanded)
      setIsScriptCollapsed(false)
      
      // Reset notes tab to "notes" when starting a new call
      setNotesTab("notes")

      // Ensure audio devices are properly set before making the call
      if (selectedInputDevice && twilioDevice.audio) {
        try {
          console.log('🎤 Setting input device before call:', selectedInputDevice)
          await twilioDevice.audio.setInputDevice(selectedInputDevice)
          console.log('✅ Input device set successfully before call')
        } catch (error: any) {
          console.error('❌ Failed to set input device before call:', error)
        }
      }
      
      if (selectedOutputDevice && twilioDevice.audio && twilioDevice.audio.setOutputDevice) {
        try {
          console.log('🔊 Setting output device before call:', selectedOutputDevice)
          await twilioDevice.audio.setOutputDevice(selectedOutputDevice)
          console.log('✅ Output device set successfully before call')
        } catch (error: any) {
          console.error('❌ Failed to set output device before call:', error)
        }
      }

      // Create call history record
      console.log('📝 Creating call history record...')
      const historyId = await createCallHistoryRecord()
      console.log('📝 Call history record created:', historyId)
      
      if (historyId) {
        setCurrentCallHistoryId(historyId)
        currentCallHistoryIdRef.current = historyId
        console.log('📝 Current call history ID set to:', historyId)
      }
      
      // IMPORTANT: Update the contact status in contacts table to 'called'
      if (contact && contact.id) {
        console.log('🔧 Updating contact status to called for contact ID:', contact.id);
        
        try {
          const { data: updateContactData, error: updateContactError } = await supabase
            .from('contacts')
            .update({ 
              status: 'called',
              updated_at: new Date().toISOString()
            })
            .eq('id', contact.id)
            .select();
            
          if (updateContactError) {
            console.error('❌ Error updating contact status to called:', updateContactError);
          } else {
            console.log('✅ Contact status updated to called:', updateContactData);
          }
        } catch (updateContactCatchError) {
          console.error('❌ Exception in contact status update:', updateContactCatchError);
        }
      }

      // Make the call with proper parameters
      const callParams = {
        To: contact.phone,
        params: {
          phoneNumber: contact.phone,
          called: contact.phone
        }
      }
      
      console.log('📞 Making call with params:', callParams)
      let connection
      try {
        connection = await twilioDevice.connect(callParams)
      } catch (err: any) {
        // Handle case where Device was destroyed (e.g., after HMR or token refresh)
        if (err?.name === 'InvalidStateError' || /destroyed/i.test(err?.message || '')) {
          console.warn('⚠️ Twilio Device invalid/destroyed. Reinitializing and retrying connect...')
          setTwilioReady(false)
          await initializeTwilioDevice()
          if (!twilioDevice) {
            throw err
          }
          connection = await twilioDevice.connect(callParams)
        } else {
          throw err
        }
      }

      console.log('📞 Call initiated:', connection)
      console.log('📞 Connection parameters:', connection.parameters)
      
      // Set the active connection immediately after call initiation
      setActiveConnection(connection)
      activeConnectionRef.current = connection
      setCallSid(connection.parameters?.CallSid || null)
      
      // Update call history with call_sid if available immediately
      if (historyId && connection.parameters?.CallSid) {
        console.log('📝 Updating call history with immediate CallSid:', connection.parameters.CallSid)
        const updateResult = await updateCallHistoryRecord(historyId, {
          call_sid: connection.parameters.CallSid
        })
        console.log('📝 Immediate update result:', updateResult)
      }
      
      // Start showing call controls immediately
      setIsConnecting(false)
      setCallStarted(true)
      
      // Start the call duration timer
      console.log('📞 Starting call duration timer...')
      setCallDuration(0) // Reset duration to 0
      callDurationRef.current = 0 // Reset ref to 0
      
      timerRef.current = setInterval(() => {
        callDurationRef.current += 1
        setCallDuration(prev => {
          console.log('⏱️ Timer tick - Ref:', callDurationRef.current, 'Previous state:', prev)
          return callDurationRef.current
        })
      }, 1000)
      
      console.log('📞 Timer started with ID:', timerRef.current)
      
      // Set up connection event listeners
      connection.on('disconnect', () => {
        console.log('📞 Call disconnected (direct listener)')
        const disconnectedCallSid = connection.parameters?.CallSid
        if (disconnectedCallSid) {
          setCallSid(disconnectedCallSid)
          handleCallEnd(disconnectedCallSid)
        } else {
          handleCallEnd()
        }
      })

      connection.on('cancel', () => {
        console.log('📞 Call canceled (direct listener)')
        handleCallEnd()
      })

      connection.on('reject', () => {
        console.log('📞 Call rejected (direct listener)')
        handleCallEnd()
      })

      connection.on('error', (error: any) => {
        console.error('❌ Connection error (direct listener):', error)
        handleCallEnd()
      })

      connection.on('mute', (muted: boolean) => {
        console.log('🔇 Mute status changed (direct listener):', muted)
        setIsMuted(muted)
      })
      
      console.log('📞 Call state updated - showing hang up controls')
      
    } catch (error) {
      console.error('❌ Failed to start call:', error)
      setIsConnecting(false)
      setTwilioError(error instanceof Error ? error.message : 'Failed to start call')
    }
  }

  // Handle calling pause when user leaves the page
  const handleCallingPause = async () => {
    console.log('🛑 Handling calling pause - user is leaving the page')
    
    try {
      // Only proceed if we have valid list ID
      if (!listId) {
        console.log('⚠️ Cannot pause calling - missing list ID')
        return
      }
      
      // Save current contact list progress
      console.log('💾 Saving contact list progress')
      await saveContactListProgress()
      
      console.log('✅ Contact list progress saved successfully')
    } catch (error) {
      console.error('❌ Error in handleCallingPause:', error)
    }
  }

  // Handle call end
  const handleCallEnd = async (passedCallSid?: string) => {
    console.log('🚨 handleCallEnd CALLED!')
    console.log('🔍 callEndHandledRef.current:', callEndHandledRef.current)
    console.log('🔍 currentCallHistoryId:', currentCallHistoryId)
    console.log('🔍 currentCallHistoryIdRef.current:', currentCallHistoryIdRef.current)
    console.log('🔍 callDuration at end:', callDuration)
    
    // Prevent multiple call end handling
    if (callEndHandledRef.current) {
      console.log('📞 Call end already handled, skipping...')
      return
    }
    
    console.log('📞 Handling call end')
    
    // Mark as handled immediately
    callEndHandledRef.current = true
    
    // Capture the current call duration from ref (more reliable than state)
    const currentDuration = callDurationRef.current
    console.log('📞 Captured current duration from ref:', currentDuration)
    console.log('📞 State duration for comparison:', callDuration)
    
    // Try to get call SID from multiple sources
    let finalCallSid = passedCallSid || callSid
    
    if (!finalCallSid && activeConnection && activeConnection.parameters?.CallSid) {
      finalCallSid = activeConnection.parameters.CallSid
      console.log('📞 Got call SID from activeConnection:', finalCallSid)
    }
    
    if (timerRef.current) {
      console.log('📞 Clearing timer with ID:', timerRef.current)
      console.log('📞 Final ref duration before clearing:', callDurationRef.current)
      clearInterval(timerRef.current)
      timerRef.current = null
      // Don't reset callDurationRef.current here - we need the value for database update
    } else {
      console.log('⚠️ No timer to clear - timerRef.current is null')
    }

    // Set final call duration from captured value
    setFinalCallDuration(currentDuration)
    setCallStarted(false)
    setIsConnecting(false)
    setActiveConnection(null)
    activeConnectionRef.current = null
    setCallEnded(true)
    setIsMuted(false)
    
    // Collapse script section and expand notes section when call ends
    setIsScriptCollapsed(true)
    setIsNotesCollapsed(false)

    // Update call history record with end data
    const historyIdToUse = currentCallHistoryIdRef.current || currentCallHistoryId
    console.log('📝 Trying to use history ID:', historyIdToUse)
    
    if (historyIdToUse) {
      console.log('📝 About to update call history with:', {
        historyIdToUse,
        currentCallHistoryId,
        currentCallHistoryIdRef: currentCallHistoryIdRef.current,
        capturedDuration: currentDuration,
        stateDuration: callDuration,
        finalCallSid,
        notes: notes ? notes.substring(0, 50) + '...' : null,
        selectedOutcome
      })
      
      const updateData: any = {
        ended_at: new Date().toISOString(),
        duration: currentDuration, // Use captured duration instead of state
        notes: notes || null
      }
      
      // Always include call_outcome if it's set
      if (selectedOutcome) {
        updateData.call_outcome = selectedOutcome
      }
      
      // Add call_sid if we have it
      if (finalCallSid) {
        updateData.call_sid = finalCallSid
        console.log('📝 Adding call_sid to end update:', finalCallSid)
      }
      
      console.log('📝 Final updateData:', updateData)
      
      try {
        const success = await updateCallHistoryRecord(historyIdToUse, updateData)
        console.log('📝 Call history update result:', success)
        
      } catch (error) {
        console.error('❌ Error updating call history:', error)
      }
    } else {
      console.error('❌ No call history ID available to update!')
      console.error('🔍 Debug info:', {
        currentCallHistoryId,
        currentCallHistoryIdRef: currentCallHistoryIdRef.current,
        finalCallSid
      })
    }

    // Update session stats
    setTotalCallsInSession(prev => prev + 1)
    
    // Check if this outcome is considered successful
    const isSuccessfulOutcome = selectedOutcome === 'interested' || selectedOutcome === 'meeting-scheduled'
    
    if (isSuccessfulOutcome) {
      setSuccessfulCallsInSession(prev => prev + 1)
    }

    console.log('📊 Updated session statistics')
    
    // Automatically save session data when call ends
    // This ensures data persistence even if user doesn't select an outcome
    try {
      console.log('💾 Saving contact list progress after call end')
      saveContactListProgress()
        .then(() => console.log('✅ Contact list progress saved after call end'))
        .catch(error => console.error('❌ Error saving contact list progress after call end:', error))
    } catch (error) {
      console.error('❌ Error initiating auto-save after call end:', error)
    }

    // Load recording and transcription after call ends
    if (finalCallSid) {
      console.log('🎵 Starting to load recording and transcription for call:', finalCallSid)
      
      // Update callSid state if it wasn't set during connect
      if (!callSid) {
        setCallSid(finalCallSid)
      }
      
      // Load recording and transcription with delay to allow Twilio processing
      if (postCallLoadTimeoutRef.current) {
        clearTimeout(postCallLoadTimeoutRef.current)
      }
      focusedEndedCallSidRef.current = finalCallSid
      postCallLoadTimeoutRef.current = window.setTimeout(() => {
        loadCallRecording(finalCallSid)
        
        // Check transcription status after call ends
        checkInitialTranscriptionStatus(finalCallSid)
      }, 3000) // 3 second delay for Twilio processing
    } else {
      console.log('⚠️ No call SID available for loading recording')
    }
  }

  // Handle end call button
  const handleEndCall = () => {
    if (activeConnection) {
      console.log('📞 Ending call via user action')
      activeConnection.disconnect()
    } else {
      console.log('📞 No active connection to end')
      handleCallEnd()
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (activeConnection && twilioDevice && twilioDevice.audio) {
      const newMutedState = !isMuted
      if (newMutedState) {
        activeConnection.mute()
      } else {
        activeConnection.mute(false)
      }
      setIsMuted(newMutedState)
      console.log('🔇 Mute toggled:', newMutedState)
    }
  }

  // Session management functions
  const handleContinueCalling = () => {
    setShowSessionSummary(false)
  }

  const handleEndSession = async () => {
    try {
      // Simply update contact list timestamp to reflect session end
      if (listId) {
        console.log('💾 Ending session, updating contact list timestamp')
        
        const { error } = await supabase
          .from('contact_lists')
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq('id', listId)
        
        if (error) {
          console.error('❌ Error updating contact list timestamp on session end:', error)
        } else {
          console.log('✅ Contact list timestamp updated on session end')
        }
      }

      // Create or update calling session record for statistics
      if (sessionId && listId) {
        console.log('💾 Saving session statistics on end')
        const sessionData = {
          session_id: sessionId,
          contact_list_id: parseInt(listId),
          user_id: (await supabase.auth.getUser()).data.user?.id,
          total_calls: sessionStats.contactsCompleted,
          successful_calls: sessionStats.contactsInterested + sessionStats.meetingsScheduled,
          contacts_interested: sessionStats.contactsInterested,
          contacts_not_interested: sessionStats.contactsNotInterested,
          callbacks_scheduled: sessionStats.callbacksScheduled,
          meetings_scheduled: sessionStats.meetingsScheduled,
          no_answers: sessionStats.noAnswers,
          wrong_numbers: sessionStats.wrongNumbers,
          contacts_skipped: sessionStats.contactsSkipped,
          total_call_time: sessionStats.totalCallTime,
          status: 'completed',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Try to update existing session first
        const { data: existingSession } = await supabase
          .from('calling_sessions')
          .select('id')
          .eq('session_id', sessionId)
          .maybeSingle()

        if (existingSession) {
          // Update existing session
          const { error } = await supabase
            .from('calling_sessions')
            .update(sessionData)
            .eq('session_id', sessionId)
          
          if (error) {
            console.error('Error updating calling session:', error)
          } else {
            console.log('✅ Calling session updated')
          }
        } else {
          // Create new session
          const { error } = await supabase
            .from('calling_sessions')
            .insert({
              ...sessionData,
              started_at: new Date().toISOString(),
              created_at: new Date().toISOString()
            })
          
          if (error) {
            console.error('Error creating calling session:', error)
          } else {
            console.log('✅ Calling session created')
          }
        }
      }

      // Navigate back to contact lists unless in single-contact mode
      if (!isSingleMode) {
        router.push('/contact-lists')
      }
    } catch (error) {
      console.error('Error ending session:', error)
      // Still navigate back even if there's an error, unless in single-contact mode
      if (!isSingleMode) {
        router.push('/contact-lists')
      }
    }
  }

  if (loading) {
    return (
      <div className={`${openSans.className} flex min-h-screen bg-[#F4F6F6]`}>
        <div className="flex-1">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading session...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${openSans.className} flex min-h-screen bg-[#F4F6F6]`}>
      
      {/* Incoming Call Popup */}
      <IncomingCall
        visible={showIncomingCall}
        callerName={incomingCaller?.name || 'Unknown caller'}
        callerNumber={incomingCaller?.number || ''}
        onAccept={handleIncomingAccept}
        onReject={handleIncomingReject}
      />
      




      {/* Main content area */}
      <div className="flex-1">
        <div className="w-full flex flex-col items-center" style={{ paddingTop: '40px' }}>
          {/* White rectangular box (extracted to reusable component) */}
          <CallAnalyticsToggle
            title={contactList?.name || 'Loading...'}
            onEndClick={handleEndCalling}
            isExpanded={isAnalyticsExpanded}
            onChangeExpanded={(next) => setIsAnalyticsExpanded(next)}
            onExpand={async () => {
              console.log('🔄 Auto-refresh triggered on analytics expand')
              setRefreshing(true)
              try {
                await refreshAnalytics()
                console.log('✅ Auto-refresh completed')
              } finally {
                setRefreshing(false)
              }
            }}
            sessionStats={sessionStats}
            contacts={contacts}
            isMounted={isMounted}
            formatCallDuration={formatCallDuration}
          />
          </div>

            

          {/* Container for two columns below */}
          <div 
            style={{ 
              width: '1082px',
              marginTop: '10px'
            }}
            className="flex gap-2 mx-auto"
          >
            {/* Left column with script box and notes below */}
            <div className="flex flex-col gap-[12px]">
              {/* Script section */}
              <ScriptSection
                loadingScripts={loadingScripts}
                scripts={scripts as any}
                selectedScript={selectedScript as any}
                selectedScriptId={selectedScriptId as any}
                onChangeScript={(scriptId) => {
                  const script = scripts.find(s => s.id === scriptId)
                  if (script) {
                    setSelectedScriptId(scriptId)
                    setSelectedScript(script)
                    if (script.objections && Array.isArray(script.objections)) {
                      setScriptObjections(script.objections)
                    } else {
                      setScriptObjections([])
                    }
                  }
                }}
                activeTab={activeTab as any}
                setActiveTab={(tab) => setActiveTab(tab as any)}
                isScriptCollapsed={isScriptCollapsed}
                onToggleCollapse={() => setIsScriptCollapsed(!isScriptCollapsed)}
                onEditScript={() => {
                  if (selectedScript && selectedScript.id) {
                    router.push(`/scripts/edit-script/${selectedScript.id}`)
                  } else {
                    alert('Please select a script first')
                  }
                }}
                contact={contact as any}
                callerName={userSettings.callerName}
                companyName={userSettings.companyName}
                scriptObjections={scriptObjections as any}
              />

              {/* Notes section - replaced with reusable CallNotesSection */}
              <CallNotesSection
                isNotesCollapsed={isNotesCollapsed}
                setIsNotesCollapsed={setIsNotesCollapsed}
                notesTab={notesTab}
                setNotesTab={(tab: string) => {
                  if (tab === 'transcription') {
                    setNotesTab('transcription')
                    if (callEnded) {
                      setupTranscriptionRealtimeListener()
                    }
                  } else if (tab === 'summary') {
                    setNotesTab('summary')
                    checkCallSummaryUsage()
                  } else {
                    setNotesTab(tab)
                  }
                }}
                callEnded={callEnded}
                showAudioPlayer={showAudioPlayer}
                setShowAudioPlayer={setShowAudioPlayer}
                isLoadingRecording={isLoadingRecording}
                recordingError={recordingError}
                recordingAvailable={recordingAvailable}
                recordingUrl={recordingUrl}
                recordingCurrentTime={recordingCurrentTime}
                setRecordingCurrentTime={setRecordingCurrentTime}
                recordingDuration={recordingDuration}
                setRecordingDuration={setRecordingDuration}
                recordingProgress={recordingProgress}
                setRecordingProgress={setRecordingProgress}
                isPlayingRecording={isPlayingRecording}
                setIsPlayingRecording={setIsPlayingRecording}
                playbackSpeed={playbackSpeed}
                setPlaybackSpeed={setPlaybackSpeed}
                notes={notes}
                setNotes={setNotes}
                notesSaved={notesSaved}
                setNotesSaved={setNotesSaved}
                autoSaveTimeoutRef={autoSaveTimeoutRef}
                transcription={transcription}
                isGeneratingTranscript={isGeneratingTranscript}
                autoLoadAI={autoLoadAI}
                setAutoLoadAI={setAutoLoadAI}
                aiSuggestions={aiSuggestions}
                isLoadingAISuggestions={isLoadingAISuggestions}
                callSummary={callSummary}
                isGeneratingCallSummary={isGeneratingCallSummary}
                transcriptionUsage={transcriptionUsage}
                suggestionsUsage={suggestionsUsage}
                summaryUsage={summaryUsage}
                selectedOutcome={selectedOutcome}
                setSelectedOutcome={setSelectedOutcome}
                readOnlyNotes={false}
                callbackDate={callbackDate}
                setCallbackDate={setCallbackDate}
                callbackTime={callbackTime}
                setCallbackTime={setCallbackTime}
                isSavingCallback={isSavingCallback}
                setIsSavingCallback={setIsSavingCallback}
                callbackSaved={callbackSaved}
                setCallbackSaved={setCallbackSaved}
                isAddingCallbackToCalendar={isAddingCallbackToCalendar}
                setIsAddingCallbackToCalendar={setIsAddingCallbackToCalendar}
                callbackAddedToCalendar={callbackAddedToCalendar}
                setCallbackAddedToCalendar={setCallbackAddedToCalendar}
                hasGoogleCalendarIntegration={hasGoogleCalendarIntegration}
                googleCalendarEmail={googleCalendarEmail}
                callbackAddedToGoogleCalendar={callbackAddedToGoogleCalendar}
                meetingDate={meetingDate}
                setMeetingDate={setMeetingDate}
                meetingTime={meetingTime}
                setMeetingTime={setMeetingTime}
                isSavingMeeting={isSavingMeeting}
                setIsSavingMeeting={setIsSavingMeeting}
                meetingSaved={meetingSaved}
                setMeetingSaved={setMeetingSaved}
                isAddingMeetingToCalendar={isAddingMeetingToCalendar}
                setIsAddingMeetingToCalendar={setIsAddingMeetingToCalendar}
                meetingAddedToCalendar={meetingAddedToCalendar}
                setMeetingAddedToCalendar={setMeetingAddedToCalendar}
                meetingAddedToGoogleCalendar={meetingAddedToGoogleCalendar}
                notInterestedReason={notInterestedReason}
                setNotInterestedReason={setNotInterestedReason}
                currentCallHistoryId={currentCallHistoryId}
                loadCallRecording={loadCallRecording}
                handlePlayPauseRecording={handlePlayPauseRecording}
                formatDuration={formatDuration}
                saveNotesToDatabase={saveNotesToDatabase}
                loadCallTranscription={() => generateTranscriptionWithUsageTracking()}
                loadAISuggestions={(t: string) => generateAISuggestionsWithUsageTracking(t)}
                generateCallSummary={(t?: string) => generateCallSummaryWithUsageTracking(t)}
                updateSessionStats={updateSessionStats}
                saveCallOutcomeToDatabase={saveCallOutcomeToDatabase}
                saveCallbackToDatabase={saveCallbackToDatabase}
                saveMeetingToDatabase={saveMeetingToDatabase}
                updateCallHistoryRecord={updateCallHistoryRecord}
                saveContactListProgress={saveContactListProgress}
              />
            </div>

            {/* Right side container with contact card and buttons */}
            <div className="flex flex-col sticky top-4 self-start" style={{ width: '354px' }}>
            <ContactCard
              contact={contact}
              callStarted={callStarted}
              isConnecting={isConnecting}
              isMuted={isMuted}
              callDuration={callDuration}
              sessionReady={sessionReady}
              twilioReady={twilioReady}
              localTimeInfo={localTimeInfo}
              onStartCall={handleStartCall}
              onToggleMute={toggleMute}
              onEndCall={handleEndCall}
              onOpenAudioSettings={() => setShowAudioSettings(true)}
              showNav={!isSingleMode}
              onPrev={goToPreviousContact}
              onNext={() => {
                if (!callStarted && !callEnded) {
                  alert('Please make a call to this contact first, or use Skip if you want to skip this contact.')
                  return
                }
                if (callEnded && !selectedOutcome) {
                  alert('Please select a call result before moving to the next contact.')
                  return
                }
                goToNextContact()
              }}
              onSkip={handleSkipContact}
              onEndSession={handleSessionEnd}
              disablePrev={currentContactIndex <= 0 || callStarted}
              disableNext={currentContactIndex >= contacts.length - 1 || callStarted || (!callStarted && !callEnded) || (callEnded && !selectedOutcome)}
              disableSkip={callStarted || currentContactIndex >= contacts.length - 1}
              showEndSession={currentContactIndex >= contacts.length - 1}
              disableEndSession={callStarted}
            />

            
            </div>
        </div>
        
        {/* Copyright footer */}
   
      </div>

      {/* Package Limit Dialogs */}
      <PackageLimitDialog
        open={showCallMinutesDialog}
        onOpenChange={setShowCallMinutesDialog}
        title="Call Minutes Limit Reached"
        description="You've used all your available call minutes for this month."
        currentUsage={packageLimitInfo.current}
        limit={packageLimitInfo.limit}
        featureName="call minutes"
        onUpgrade={() => router.push('/settings')}
      />

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        open={showAudioSettings}
        onClose={() => setShowAudioSettings(false)}
        inputDevices={inputDevices}
        outputDevices={outputDevices}
        selectedInputDevice={selectedInputDevice}
        selectedOutputDevice={selectedOutputDevice}
        saveAudioPreferences={(inputId, outputId) => saveAudioPreferences(inputId, outputId)}
        twilioReady={twilioReady}
        twilioError={twilioError}
      />

      {/* Twilio Error Display */}
      {twilioError && !showReadyToStartPopup && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Twilio Error</h3>
              <p className="text-sm text-red-700 mt-1">{twilioError}</p>
            </div>
            <button
              onClick={() => setTwilioError(null)}
              className="text-red-400 hover:text-red-600 ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Session Summary Popup */}
      <SessionSummaryPopup
        isOpen={showSessionSummary}
        onClose={() => setShowSessionSummary(false)}
        onContinueCalling={handleContinueCalling}
        onEndSession={handleEndSession}
        sessionStats={{
          ...sessionStats,
          totalCallTime: sessionStats.totalCallTime || 0,
          totalContacts: contacts.length,
          contactsCompleted: contacts.filter(c => c.status === 'called').length,
          contactsSkipped: contacts.filter(c => c.status === 'skipped').length
        }}
        contactListName={contactList?.name || 'Contact List'}
        processedContacts={contacts.filter(c => c.status !== 'not_called').length}
        totalContacts={contacts.length}
      />
    </div>
  )
} 
