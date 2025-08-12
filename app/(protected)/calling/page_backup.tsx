'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'
import UniversalSidebar from '@/components/universal-sidebar'
import SessionSummaryPopup from '@/components/session-summary-popup'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { PackageLimitDialog } from "@/components/ui/package-limit-dialog"
import { canPerformAction, updateUsage } from '@/lib/package-limits'
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  
  const sessionId = searchParams.get('sessionId')
  const listId = searchParams.get('listId')

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

  // Twilio configuration validation states
  const [twilioConfigError, setTwilioConfigError] = useState<string | null>(null)
  const [isValidatingTwilioConfig, setIsValidatingTwilioConfig] = useState(true)
  const [twilioError, setTwilioError] = useState<string | null>(null)

  // Call timer
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const callDurationRef = useRef<number>(0)

  // Calling statistics
  const [sessionStats, setSessionStats] = useState({
    totalContacts: 0,
    contactsCompleted: 0,
    contactsInterested: 0,
    contactsNotInterested: 0,
    callbacksScheduled: 0,
    meetingsScheduled: 0,
    noAnswers: 0,
    wrongNumbers: 0,
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
        callbacksScheduled: 0,
        meetingsScheduled: 0,
        noAnswers: 0,
        wrongNumbers: 0,
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
          } else if (call.call_outcome === 'not_interested') {
            contactStats.contactsNotInterested++
          } else if (call.call_outcome === 'callback_scheduled') {
            contactStats.callbacksScheduled++
          } else if (call.call_outcome === 'meeting_scheduled') {
            contactStats.meetingsScheduled++
          } else if (call.call_outcome === 'no_answer') {
            contactStats.noAnswers++
          } else if (call.call_outcome === 'wrong_number') {
            contactStats.wrongNumbers++
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
      
      // Recalculate contactsCompleted and contactsSkipped from contacts array
      setTimeout(() => {
        const completedCount = (contactsData || []).filter(c => c.status === 'called').length
        const skippedCount = (contactsData || []).filter(c => c.status === 'skipped').length
        
        setSessionStats(prev => ({
          ...prev,
          contactsCompleted: completedCount,
          contactsSkipped: skippedCount
        }))
        
        console.log('📊 Reloaded - Recalculated from contacts: completed:', completedCount, 'skipped:', skippedCount)
      }, 50)
      
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
      } else if (outcome === 'callback') {
        updated.callbacksScheduled = prev.callbacksScheduled + 1
      } else if (outcome === 'meeting-scheduled') {
        updated.meetingsScheduled = prev.meetingsScheduled + 1
      } else if (outcome === 'no-answer') {
        updated.noAnswers = prev.noAnswers + 1
      } else if (outcome === 'wrong-number') {
        updated.wrongNumbers = prev.wrongNumbers + 1
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

  // Check if we have required parameters
  useEffect(() => {
    if (!sessionId || !listId) {
      console.error('Missing required parameters:', { sessionId, listId })
      router.push('/contact-lists')
      return
    }
  }, [sessionId, listId, router])

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
            } else if (call.call_outcome === 'not_interested') {
              contactStats.contactsNotInterested++
            } else if (call.call_outcome === 'callback_scheduled') {
              contactStats.callbacksScheduled++
            } else if (call.call_outcome === 'meeting_scheduled') {
              contactStats.meetingsScheduled++
            } else if (call.call_outcome === 'no_answer') {
              contactStats.noAnswers++
            } else if (call.call_outcome === 'wrong_number') {
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
          .single()
        
        setHasGoogleCalendarIntegration(!!googleIntegration)
        if (googleIntegration?.google_email) {
          setGoogleCalendarEmail(googleIntegration.google_email)
        }
        console.log('📅 Google Calendar integration:', !!googleIntegration)

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

  // Load recording for current call (based on original implementation)
  const loadCallRecording = async () => {
    // Try to get call_sid from multiple sources
    let currentCallSid = callSid

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
      
      const response = await fetch('/api/ai-analysis', {
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
      
      const response = await fetch('/api/ai-analysis', {
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

      const callHistoryData = {
        user_id: user.id,
        contact_id: contact.id || null, // Link to contact if available
        contact_list_id: listId, // This was missing - required field!
        session_id: sessionId,
        contact_name: contact.name,
        contact_phone: contact.phone,
        contact_company: contact.company || null,
        contact_position: contact.position || null,
        contact_email: contact.email || null,
        contact_location: contact.location || null,
        started_at: new Date().toISOString(),
        call_outcome: null // Will be set when call ends
      }

      const { data, error } = await supabase
        .from('call_history')
        .insert(callHistoryData)
        .select('id')
        .single()

      if (error) {
        console.error('Error creating call history:', error)
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
      const connection = await twilioDevice.connect(callParams)

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
      setTimeout(() => {
        loadCallRecording()
        
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

      // Navigate back to contact lists
      router.push('/contact-lists')
    } catch (error) {
      console.error('Error ending session:', error)
      // Still navigate back even if there's an error
      router.push('/contact-lists')
    }
  }

  // Main component render
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <UniversalSidebar />
        <div className="flex-1" style={{ marginLeft: '250px' }}>
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
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <UniversalSidebar />
      
      {/* Session Start Popup */}
      {showReadyToStartPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Start Calling?</h2>
              <p className="text-gray-600 mb-6">
                We'll need access to your microphone to make calls. Click "Start Session" to begin.
              </p>
              
              {twilioConfigError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 text-sm">{twilioConfigError}</p>
                </div>
              )}
              
              {isValidatingTwilioConfig ? (
                <div className="flex items-center justify-center mb-4">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-gray-600">Validating Twilio configuration...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    onClick={handleStartSession}
                    disabled={!!twilioConfigError || isRequestingPermission}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                  >
                    {isRequestingPermission ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Starting Session...
                      </>
                    ) : (
                      'Start Session'
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => router.push('/contact-lists')}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Main content area */}
      <div className="flex-1" style={{ marginLeft: '250px' }}>
        <div style={{ paddingTop: '97px', paddingLeft: '67px', paddingRight: '136px' }}>
          {/* White rectangular box */}
          <div 
            className="bg-white border flex flex-col px-6"
            style={{ 
              width: '1082px', 
              height: isAnalyticsExpanded ? 'auto' : '80px',
              borderWidth: '0.5px',
              borderColor: '#f4f4f4',
              borderRadius: '10px'
            }}
          >
            {/* Top row with buttons */}
            <div className="flex items-center justify-between" style={{ height: '80px' }}>
              {/* Left: Contact List Name */}
              <div className="text-xl font-semibold text-gray-800">
                {contactList?.name || 'Loading...'}
              </div>

              {/* Right: End Calling and Analytics */}
              <div className="flex items-center gap-4">
                {/* End Calling with border */}
                <div 
                  onClick={() => setShowSessionSummary(true)}
                  className="flex items-center gap-2 border rounded px-3 py-2 cursor-pointer hover:bg-red-50" 
                  style={{ borderColor: '#E3170A' }}
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="#E3170A" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="font-medium" style={{ color: '#E3170A' }}>End Calling</span>
                </div>

                {/* Analytics with chevron */}
                <div 
                  onClick={() => setIsAnalyticsExpanded(!isAnalyticsExpanded)}
                  className="flex items-center gap-2 hover:border-[#1F2937] cursor-pointer bg-white border hover:text-[#1F2937] rounded-[5px] px-3 py-2" 
                 
                >
                  <img 
                    src="/analytics.png" 
                    alt="Analytics" 
                    className="w-5 h-5"
                  />
                  <span className="text-[#1F2937] font-medium">Analytics</span>
                  <ChevronDown className={`w-5 h-5 text-[#1F2937] transition-transform ${isAnalyticsExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

              {/* Analytics Section - appears when expanded */}
              {isAnalyticsExpanded && (
                <div className="mt-6 pt-6 pb-6 border-t border-gray-100">
                  {/* Refresh Button */}
                  <div className="flex justify-end mb-4">
                    <div 
                      onClick={async () => {
                        if (refreshing) return
                        console.log('🔄 Manual refresh triggered')
                        setRefreshing(true)
                        try {
                          await reloadContactListData()
                          console.log('✅ Manual refresh completed')
                        } finally {
                          setRefreshing(false)
                        }
                      }}
                      className={`flex items-center gap-2 border rounded-[5px] px-3 py-2 text-sm ${
                        refreshing 
                          ? 'cursor-not-allowed bg-gray-100 border-gray-300 text-gray-500' 
                          : 'cursor-pointer bg-white hover:border-[#1F2937] hover:text-[#1F2937] hover:bg-gray-50 text-[#1F2937]'
                      }`}
                      title={refreshing ? 'Refreshing...' : 'Refresh statistics'}
                    >
                      <svg 
                        className={`w-4 h-4 ${refreshing ? 'animate-spin text-gray-500' : 'text-[#1F2937]'}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className={`font-medium ${refreshing ? 'text-gray-500' : 'text-[#1F2937]'}`}>
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                      </span>
                    </div>
                  </div>

                  {/* Analytics Content */}
                  <div className={refreshing ? 'opacity-50 pointer-events-none' : ''}>
                      {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Progress: {sessionStats.contactsCompleted + (sessionStats.contactsSkipped || 0)} of {sessionStats.totalContacts} contacts
                      </span>
                      <span className="text-sm text-gray-500">
                        {sessionStats.totalContacts > 0 ? 
                          `${Math.round(((sessionStats.contactsCompleted + (sessionStats.contactsSkipped || 0)) / sessionStats.totalContacts) * 100)}% Complete` 
                          : '0% Complete'
                        }
                      </span>
                      </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: sessionStats.totalContacts > 0 ? 
                            `${Math.min(100, ((sessionStats.contactsCompleted + (sessionStats.contactsSkipped || 0)) / sessionStats.totalContacts) * 100)}%` 
                            : '0%' 
                        }}
                      ></div>
                      </div>
                    </div>

                  {/* Statistics Cards */}
                  <div className="grid grid-cols-5 gap-4 mb-6">
                    <div className="border rounded-lg p-4 text-center" style={{ borderColor: '#E5E7EB', borderWidth: '1px' }}>
                      <div className="text-3xl font-bold mb-2" style={{ color: '#253053', fontFamily: 'Source Sans Pro, sans-serif' }}>
                        {sessionStats.contactsInterested || 0}
                      </div>
                      <div className="text-sm" style={{ color: '#6B7280', fontFamily: 'Source Sans Pro, sans-serif' }}>
                        Interested
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 text-center" style={{ borderColor: '#E5E7EB', borderWidth: '1px' }}>
                      <div className="text-3xl font-bold mb-2" style={{ color: '#253053', fontFamily: 'Source Sans Pro, sans-serif' }}>
                        {sessionStats.contactsCompleted || 0}
                      </div>
                      <div className="text-sm" style={{ color: '#6B7280', fontFamily: 'Source Sans Pro, sans-serif' }}>
                        Calls Made
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 text-center" style={{ borderColor: '#E5E7EB', borderWidth: '1px' }}>
                      <div className="text-3xl font-bold mb-2" style={{ color: '#253053', fontFamily: 'Source Sans Pro, sans-serif' }}>
                        {sessionStats.contactsSkipped || 0}
                      </div>
                      <div className="text-sm" style={{ color: '#6B7280', fontFamily: 'Source Sans Pro, sans-serif' }}>
                        Skipped
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 text-center" style={{ borderColor: '#E5E7EB', borderWidth: '1px' }}>
                      <div className="text-3xl font-bold mb-2" style={{ color: '#253053', fontFamily: 'Source Sans Pro, sans-serif' }}>
                        {(() => {
                          const calledCount = sessionStats.contactsCompleted || 0;
                          const interestedCount = sessionStats.contactsInterested || 0;
                          return calledCount > 0 ? ((interestedCount / calledCount) * 100).toFixed(1) : 0;
                        })()}%
                      </div>
                      <div className="text-sm" style={{ color: '#6B7280', fontFamily: 'Source Sans Pro, sans-serif' }}>
                        Success Rate
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 text-center" style={{ borderColor: '#E5E7EB', borderWidth: '1px' }}>
                      <div className="text-3xl font-bold mb-2" style={{ color: '#253053', fontFamily: 'Source Sans Pro, sans-serif' }}>
                        {sessionStats.totalContacts - sessionStats.contactsCompleted - (sessionStats.contactsSkipped || 0)}
                      </div>
                      <div className="text-sm" style={{ color: '#6B7280', fontFamily: 'Source Sans Pro, sans-serif' }}>
                        Remaining
                      </div>
                    </div>
                  </div>

                  {/* Detailed Statistics */}
                  {isMounted && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4" style={{ borderColor: '#E5E7EB', borderWidth: '1px' }}>
                      <h4 className="text-lg font-semibold mb-3" style={{ color: '#253053' }}>Call Outcomes</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                            <span className="text-sm text-gray-700">Interested</span>
                          </div>
                          <span className="text-sm font-medium">{sessionStats.contactsInterested}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                            <span className="text-sm text-gray-700">Not Interested</span>
                          </div>
                          <span className="text-sm font-medium">{sessionStats.contactsNotInterested}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                            <span className="text-sm text-gray-700">Callbacks Scheduled</span>
                          </div>
                          <span className="text-sm font-medium">{sessionStats.callbacksScheduled}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-600 rounded-sm"></div>
                            <span className="text-sm text-gray-700">Meetings Scheduled</span>
                          </div>
                          <span className="text-sm font-medium">{sessionStats.meetingsScheduled}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gray-500 rounded-sm"></div>
                            <span className="text-sm text-gray-700">No Answer</span>
                          </div>
                          <span className="text-sm font-medium">{sessionStats.noAnswers || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                            <span className="text-sm text-gray-700">Wrong Numbers</span>
                          </div>
                          <span className="text-sm font-medium">{sessionStats.wrongNumbers || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4" style={{ borderColor: '#E5E7EB', borderWidth: '1px' }}>
                      <h4 className="text-lg font-semibold mb-3" style={{ color: '#253053' }}>Session Info</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-700">Total Contacts:</span>
                          <span className="text-sm font-medium">{contacts.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-700">Current Contact:</span>
                          <span className="text-sm font-medium">{(() => {
                            const firstNotCalledIndex = contacts.findIndex(c => c.status === 'not_called');
                            return firstNotCalledIndex >= 0 ? firstNotCalledIndex + 1 : contacts.length;
                          })()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-700">Completed:</span>
                          <span className="text-sm font-medium">{contacts.filter(c => c.status !== 'not_called').length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-700">Remaining:</span>
                          <span className="text-sm font-medium">{contacts.filter(c => c.status === 'not_called').length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-700">Total Call Time:</span>
                          <span className="text-sm font-medium">{formatCallDuration(sessionStats.totalCallTime)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              )}
            </div>

          {/* Container for two columns below */}
          <div 
            style={{ 
              width: '1082px',
              marginTop: '20px'
            }}
            className="flex gap-2"
          >
            {/* Left column with script box and notes below */}
            <div className="flex flex-col gap-5">
              {/* Script section */}
              <div 
                className="bg-white border p-6"
                style={{ 
                  width: '720px', 
                  minHeight: isScriptCollapsed ? 'auto' : '500px',
                  borderWidth: '0.5px',
                  borderColor: '#f4f4f4',
                  borderRadius: '10px'
                }}
              >
                {/* Header with dropdown and tabs */}
                <div className={`flex items-center gap-4 ${!isScriptCollapsed ? 'mb-6' : ''}`}>
                  {/* Left: Script Selection */}
                  <Select
                    value={selectedScriptId?.toString() || ""}
                    onValueChange={(value) => {
                      const scriptId = parseInt(value)
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
                    disabled={loadingScripts}
                  >
                    <SelectTrigger 
                      className="rounded-lg flex items-center transition-colors"
                          style={{ 
                        width: '173px',
                        height: '48px',
                        borderColor: '#f4f4f4',
                        borderWidth: '1px',
                            fontSize: '14px',
                            fontFamily: 'Source Sans Pro, sans-serif',
                            color: '#253053'
                          }}
                        >
                      <SelectValue placeholder={loadingScripts ? "Loading scripts..." : "Select script..."}>
                        {selectedScript && (
                          <span className="truncate">{selectedScript.name}</span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border border-gray-300 shadow-lg">
                      {loadingScripts ? (
                        <SelectItem value="loading" disabled className="text-sm font-medium">
                          Loading scripts...
                        </SelectItem>
                      ) : scripts.length === 0 ? (
                        <SelectItem value="no-scripts" disabled className="text-sm font-medium">
                          No scripts available
                        </SelectItem>
                      ) : (
                        scripts.map((script) => (
                          <SelectItem key={script.id} value={script.id.toString()} className="text-sm font-medium">
                            <span className="truncate">{script.name}</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {/* Center: Tabs with border */}
                  <div className="flex items-center gap-1 border border-[#f2f2f2] rounded-[5px] p-1">
                    <Button
                      onClick={() => setActiveTab("script")}
                      className={`h-[42px] px-4 text-[16px] font-medium rounded-lg ${
                        activeTab === "script" 
                          ? "bg-[#253053] text-white" 
                          : "bg-transparent text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      Script
                    </Button>
                    <Button
                      onClick={() => setActiveTab("objections")}
                      className={`h-[42px] px-4 text-[16px] font-medium rounded-lg ${
                        activeTab === "objections" 
                          ? "bg-[#253053] text-white" 
                          : "bg-transparent text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      Objections
                    </Button>
                  </div>

                  {/* Right: Icons with borders */}
                  <div className="flex items-center gap-2 ml-auto">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-[52px] w-[52px] p-0 border-[#f2f2f2]"
                      onClick={() => {
                        if (selectedScript) {
                          const confirmed = window.confirm(
                            'Are you sure you want to edit this script? This will end your current calling session.'
                          )
                          if (confirmed) {
                            router.push(`/scripts/edit-script/${selectedScript.id}`)
                          }
                        } else {
                          alert('Please select a script first')
                        }
                      }}
                      disabled={!selectedScript}
                    >
                      <Edit className="h-[42px] w-[42px] text-gray-600" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-[52px] w-[52px] p-0 border-[#f2f2f2]"
                      onClick={() => setIsScriptCollapsed(!isScriptCollapsed)}
                    >
                      {isScriptCollapsed ? (
                        <ChevronDown className="h-[42px] w-[42px] text-gray-600" />
                      ) : (
                        <ChevronUp className="h-[42px] w-[42px] text-gray-600" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Script Content */}
                {!isScriptCollapsed && (
                  <div className="border border-[#f2f2f2] rounded-[5px] p-4 h-96 overflow-y-auto">
                    {activeTab === "script" ? (
                    <div className="text-sm text-gray-800 leading-relaxed space-y-3">
                        {selectedScript ? (
                          <div 
                            className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-800 prose-strong:text-gray-800 prose-ul:text-gray-800 prose-ol:text-gray-800"
                            dangerouslySetInnerHTML={{ 
                            __html: (() => {
                              const variables = {
                                name: contact?.name ? contact.name.split(' ')[0] : 'Contact',
                                full_name: contact?.name || 'Contact',
                                company: contact?.company || '',
                                position: contact?.position || '',
                                email: contact?.email || '',
                                phone: contact?.phone || '',
                                my_name: userSettings.callerName,
                                my_company_name: userSettings.companyName,
                              }
                              
                              // Replace variables in the HTML content
                              return replaceScriptVariables(selectedScript.content, variables)
                            })()
                          }} />
                        ) : (
                          <p className="text-gray-500 italic">Select a script from the dropdown above to view its content.</p>
                        )}
                    </div>
                    ) : (
                      <div className="space-y-4">
                        {scriptObjections.length === 0 ? (
                          <div className="text-center text-gray-500 py-8">
                            {selectedScript ? "No objections defined for this script" : "Select a script to view objections"}
                          </div>
                        ) : (
                          scriptObjections.map((objection, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="font-bold text-sm text-gray-900 mb-2">
                                💬 "{objection.objection}"
                              </div>
                              <div className="text-sm text-gray-700 mb-3 leading-relaxed">
                                <strong>Response:</strong> {objection.response}
                              </div>
                              {objection.reason && (
                                <div className="text-xs text-gray-600 italic flex items-center gap-1">
                                  <span className="text-gray-500">💡</span>
                                  {objection.reason}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes section placeholder */}
              <div 
                className="bg-white border p-6"
                style={{ 
                  width: '720px', 
                  minHeight: isNotesCollapsed ? 'auto' : '409px',
                  borderWidth: '0.5px',
                  borderColor: '#f4f4f4',
                  borderRadius: '10px'
                }}
              >
                {/* Notes/AI Tabs Header */}
                <div className={`flex items-center justify-between ${!isNotesCollapsed ? 'mb-6' : ''}`}>
                  {/* Left: Tabs with border */}
                  <div className="flex items-center gap-1 border border-[#f2f2f2] rounded-[5px] p-1">
                    {/* Notes Tab */}
                    <Button
                      onClick={() => setNotesTab("notes")}
                      className={`h-[42px] px-4 text-[16px] font-medium rounded-lg ${
                        notesTab === "notes" 
                          ? "bg-[#253053] text-white" 
                          : "bg-transparent text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      Notes
                    </Button>
                    
                    {/* AI Transcription */}
                    <Button
                      onClick={() => {
                        setNotesTab("transcription")
                        // Setup realtime listener when tab is clicked
                        if (callEnded) {
                          setupTranscriptionRealtimeListener()
                        }
                      }}
                      className={`h-[42px] px-4 text-sm font-medium rounded-lg flex items-center gap-1 ${
                        notesTab === "transcription" 
                          ? "bg-[#253053] text-white" 
                          : "bg-transparent text-blue-600 hover:bg-blue-50"
                      }`}
                      disabled={!callEnded}
                    >
                      <div className="w-4 h-4 bg-blue-600 text-white text-xs rounded flex items-center justify-center font-bold">
                        AI
                      </div>
                      Transcription
                    </Button>
                    
                    {/* AI Suggestions */}
                    <Button
                      onClick={() => {
                        setNotesTab("suggestions")
                        // Don't auto-generate - user must click Generate button
                      }}
                      className={`h-[42px] px-4 text-sm font-medium rounded-lg flex items-center gap-1 ${
                        notesTab === "suggestions" 
                          ? "bg-[#253053] text-white" 
                          : "bg-transparent text-blue-600 hover:bg-blue-50"
                      }`}
                      disabled={!callEnded}
                    >
                      <div className="w-4 h-4 bg-blue-600 text-white text-xs rounded flex items-center justify-center font-bold">
                        AI
                      </div>
                      Suggestions
                    </Button>
                    
                    {/* AI Call Summary */}
                    <Button
                      onClick={() => {
                        setNotesTab("summary")
                        // Auto-generate call summary if transcription is available
                        if (callEnded && !callSummary && !isGeneratingCallSummary && transcription) {
                          generateCallSummary(transcription)
                        }
                      }}
                      className={`h-[42px] px-4 text-sm font-medium rounded-lg flex items-center gap-1 ${
                        notesTab === "summary" 
                          ? "bg-[#253053] text-white" 
                          : "bg-transparent text-blue-600 hover:bg-blue-50"
                      }`}
                      disabled={!callEnded}
                    >
                      <div className="w-4 h-4 bg-blue-600 text-white text-xs rounded flex items-center justify-center font-bold">
                        AI
                      </div>
                      Call Summary
                    </Button>
                  </div>
                  
                  {/* Right: Icons with borders */}
                  <div className="flex items-center gap-2 ml-auto">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-[52px] w-[52px] p-0 border-[#f2f2f2]"
                      onClick={() => setShowAudioPlayer(!showAudioPlayer)}
                      disabled={!callEnded}
                    >
                      <Volume2 className="h-[42px] w-[42px] text-gray-600" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-[52px] w-[52px] p-0 border-[#f2f2f2]"
                      onClick={() => setIsNotesCollapsed(!isNotesCollapsed)}
                    >
                      {isNotesCollapsed ? (
                        <ChevronDown className="h-[42px] w-[42px] text-gray-600" />
                      ) : (
                        <ChevronUp className="h-[42px] w-[42px] text-gray-600" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Audio Player Component - appears when Volume2 is clicked */}
                {!isNotesCollapsed && showAudioPlayer && callEnded && (
                  <div 
                    className="bg-white rounded-lg border border-[#f2f2f2] p-6 flex flex-col items-center justify-center mb-6"
                    style={{ 
                      width: '100%',
                      height: '200px'
                    }}
                  >
                    {/* Hidden audio element */}
                    <audio
                      id="recording-audio"
                      onTimeUpdate={(e) => {
                        const audio = e.target as HTMLAudioElement
                        if (audio.duration > 0) {
                          setRecordingCurrentTime(Math.floor(audio.currentTime))
                          setRecordingProgress((audio.currentTime / audio.duration) * 100)
                        }
                      }}
                      onEnded={() => {
                        setIsPlayingRecording(false)
                        setRecordingCurrentTime(0)
                        setRecordingProgress(0)
                      }}
                      onPlay={() => {
                        setIsPlayingRecording(true)
                      }}
                      onPause={() => {
                        setIsPlayingRecording(false)
                      }}
                      onLoadedMetadata={(e) => {
                        const audio = e.target as HTMLAudioElement
                        setRecordingDuration(Math.floor(audio.duration))
                        console.log('Recording loaded, duration:', audio.duration)
                      }}
                      onError={(e) => {
                        console.error('Audio playback error:', e)
                        setIsPlayingRecording(false)
                      }}
                      preload="metadata"
                      style={{ display: 'none' }}
                    />

                    {isLoadingRecording ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        <span>Loading recording...</span>
                      </div>
                    ) : recordingError ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="text-red-600 mb-2">⚠️ {recordingError}</div>
                        <button 
                          onClick={loadCallRecording}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Try again
                        </button>
                      </div>
                    ) : recordingAvailable && recordingUrl ? (
                      <>
                    {/* Progress Bar with Time */}
                    <div className="w-full max-w-md mb-6">
                      <div className="flex items-center justify-between text-blue-500 text-sm font-medium mb-2">
                            <span>{formatDuration(recordingCurrentTime)}</span>
                            <span>{formatDuration(recordingDuration)}</span>
                      </div>
                      <div className="relative">
                        <div className="w-full h-1 bg-gray-200 rounded-full"></div>
                            <div 
                              className="absolute top-0 left-0 h-1 bg-blue-500 rounded-full transition-all duration-300"
                              style={{ width: `${recordingProgress}%` }}
                            ></div>
                            <div 
                              className="absolute top-0 w-4 h-4 bg-blue-500 rounded-full transform -translate-y-1.5 -translate-x-2 cursor-pointer"
                              style={{ left: `${recordingProgress}%` }}
                              onClick={(e) => {
                                const audio = document.getElementById('recording-audio') as HTMLAudioElement
                                if (audio && audio.duration) {
                                  const rect = e.currentTarget.parentElement!.getBoundingClientRect()
                                  const clickX = e.clientX - rect.left
                                  const newTime = (clickX / rect.width) * audio.duration
                                  audio.currentTime = newTime
                                }
                              }}
                        ></div>
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center space-x-6 mb-6">
                      {/* Previous Button */}
                          <button 
                            onClick={() => {
                              const audio = document.getElementById('recording-audio') as HTMLAudioElement
                              if (audio) {
                                audio.currentTime = Math.max(0, audio.currentTime - 10)
                              }
                            }}
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                            title="Skip back 10 seconds"
                          >
                            <SkipBack className="w-6 h-6" />
                      </button>

                      {/* Play Button */}
                          <button 
                            onClick={handlePlayPauseRecording}
                            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 transition-colors"
                            disabled={!recordingUrl}
                          >
                            {isPlayingRecording ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                      </button>

                      {/* Next Button */}
                          <button 
                            onClick={() => {
                              const audio = document.getElementById('recording-audio') as HTMLAudioElement
                              if (audio) {
                                audio.currentTime = Math.min(audio.duration, audio.currentTime + 10)
                              }
                            }}
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                            title="Skip forward 10 seconds"
                          >
                            <SkipForward className="w-6 h-6" />
                      </button>
                    </div>

                    {/* Speed Controls */}
                    <div className="flex items-center space-x-4">
                          {[0.5, 1.0, 1.5, 2.0].map(speed => (
                            <button 
                              key={speed}
                              onClick={() => {
                                setPlaybackSpeed(speed)
                                const audio = document.getElementById('recording-audio') as HTMLAudioElement
                                if (audio) {
                                  audio.playbackRate = speed
                                }
                              }}
                              className={`px-2 py-1 text-xs font-bold rounded-lg border border-blue-200 ${
                                playbackSpeed === speed 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-white/70 hover:bg-white text-blue-700'
                              }`}
                            >
                              {speed}x
                      </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <div>
                          No recording available
                          {callEnded && (
                            <>
                              <br />
                              <button 
                                onClick={loadCallRecording}
                                className="mt-2 text-blue-500 hover:text-blue-700 underline"
                                disabled={isLoadingRecording}
                              >
                                {isLoadingRecording ? 'Loading...' : 'Load Recording'}
                      </button>
                            </>
                          )}
                    </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes Content Area */}
                {!isNotesCollapsed && (
                  <>
                    <div>
                      {notesTab === "notes" && (
                        <div>
                          <textarea
                            value={notes}
                            onChange={(e) => {
                              console.log('📝 Notes changed, length:', e.target.value.length)
                              setNotes(e.target.value)
                              // Reset saved state when user types
                              setNotesSaved(false)
                              // Auto-save notes after 2 seconds of inactivity
                              if (autoSaveTimeoutRef.current) {
                                clearTimeout(autoSaveTimeoutRef.current)
                              }
                              console.log('⏰ Setting auto-save timeout...')
                              autoSaveTimeoutRef.current = setTimeout(() => {
                                console.log('⏰ Auto-save timeout triggered')
                                saveNotesToDatabase()
                              }, 2000)
                            }}
                            className="w-full h-48 p-4 border border-[#f2f2f2] rounded-[5px] resize-none text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Notes you write here are automatically saved..."
                          />
                          
                          {/* Notes saved indicator */}
                          {notesSaved && (
                            <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                              <Check className="w-4 h-4" />
                              <span>Notes saved</span>
                            </div>
                          )}
                        </div>
                      )}
                      {notesTab === "transcription" && (
                        <div>
                          <div className="w-full h-48 p-4 border border-gray-300 rounded-lg text-sm text-gray-600 overflow-y-auto mb-3">
                            {isGeneratingTranscript ? (
                              <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                <span>Generating transcription...</span>
                              </div>
                            ) : transcription ? (
                              <div className="whitespace-pre-wrap">{transcription}</div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="mb-4">
                                  <h3 className="text-lg font-medium text-gray-700 mb-2">Generate AI Transcript</h3>
                                  <p className="text-gray-500 text-sm mb-4">
                                    Press the button to confirm.
                                  </p>
                                  
                                  {callEnded ? (
                                    <button 
                                      onClick={generateTranscriptionWithUsageTracking}
                                      disabled={!canGenerateTranscription || (!isTranscriptionReadyInBackend && !isWaitingForTranscription) || isGeneratingTranscript}
                                      className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                                        !canGenerateTranscription 
                                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                          : isTranscriptionReadyInBackend && !isGeneratingTranscript
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      }`}
                                    >
                                      {(isWaitingForTranscription || isGeneratingTranscript) && (
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                      )}
                                      {!canGenerateTranscription
                                        ? 'No Credits'
                                        : isWaitingForTranscription 
                                          ? 'Please Wait...' 
                                          : isGeneratingTranscript 
                                            ? 'Generating...' 
                                          : isTranscriptionReadyInBackend
                                            ? 'Generate Transcription'
                                            : 'Please Wait..'
                                      }
                                    </button>
                                  ) : (
                                    <p className="text-gray-400 text-sm">Complete your call to generate transcription</p>
                                  )}
                                  
                                  {/* Credits display */}
                                  <div className="mt-4">
                                    <span className="font-bold text-blue-600">
                                      {transcriptionUsage.current}/{transcriptionUsage.limit}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                      {notesTab === "suggestions" && (
                        <div>
                          <div className="w-full h-48 p-4 border border-gray-300 rounded-lg text-sm text-gray-600 overflow-y-auto mb-3">
                            {isLoadingAISuggestions ? (
                              <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                <span>Generating AI suggestions...</span>
                          </div>
                            ) : aiSuggestions.length > 0 ? (
                              <div className="space-y-3">
                                {aiSuggestions.map((suggestion, index) => (
                                  <div key={index} className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                    <div className="font-bold text-sm text-purple-900 mb-1">
                                      {suggestion.title}
                                    </div>
                                    <div className="text-xs text-purple-700 mb-2">
                                      {suggestion.description}
                                    </div>
                                    <div className="text-sm text-purple-800">
                                      <strong>What to say:</strong> {suggestion.whatToSay}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="mb-4">
                                  <h3 className="text-lg font-medium text-gray-700 mb-2">Generate AI Suggestions</h3>
                                  <p className="text-gray-500 text-sm mb-4">
                                    Get AI-powered suggestions based on your call transcription to improve follow-up actions.
                                  </p>
                                  
                                  {callEnded ? (
                                    !transcription ? (
                                      <p className="text-gray-400 text-sm">Generate a transcription first to get AI suggestions.</p>
                                    ) : (
                                      <button 
                                        onClick={() => generateAISuggestionsWithUsageTracking(transcription)}
                                        disabled={!canGenerateAISuggestions || isLoadingAISuggestions}
                                        className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                                          !canGenerateAISuggestions 
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : isLoadingAISuggestions
                                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                      >
                                        {isLoadingAISuggestions && (
                                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                        )}
                                        {!canGenerateAISuggestions
                                          ? 'No Credits'
                                          : isLoadingAISuggestions 
                                            ? 'Generating...' 
                                            : 'Generate Suggestions'
                                        }
                                      </button>
                                    )
                                  ) : (
                                    <p className="text-gray-400 text-sm">Complete your call to generate AI suggestions</p>
                                  )}
                                  
                                  {/* Credits display */}
                                  <div className="mt-4">
                                    <span className="font-bold text-blue-600">
                                      {suggestionsUsage.current}/{suggestionsUsage.limit}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                      {notesTab === "summary" && (
                        <div>
                          <div className="w-full h-48 p-4 border border-gray-300 rounded-lg text-sm text-gray-600 overflow-y-auto mb-3">
                            {isGeneratingCallSummary ? (
                              <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                <span>Generating call summary...</span>
                          </div>
                            ) : callSummary ? (
                              <div className="whitespace-pre-wrap">{callSummary}</div>
                            ) : (
                              <div className="text-center text-gray-400 py-8">
                                <div>
                                  {!callEnded ? (
                                    "AI call summary will appear here after the call ends..."
                                  ) : !transcription ? (
                                    <>
                                      Generate a transcription first to get AI call summary.
                                      <br />
                                      <span className="text-sm">Go to the AI Transcription tab and click "Generate Transcript".</span>
                                    </>
                                  ) : (
                                    <>
                                      AI call summary will appear here...
                                      <br />
                                      <button 
                                        onClick={() => generateCallSummary(transcription)}
                                        className="mt-2 text-blue-500 hover:text-blue-700 underline"
                                        disabled={isGeneratingCallSummary}
                                      >
                                        {isGeneratingCallSummary ? 'Generating...' : 'Generate Summary'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Call Summary Actions */}
                          {callEnded && (
                            <div className="flex justify-end">
                              <button
                                onClick={() => generateCallSummary(transcription)}
                                disabled={isGeneratingCallSummary || !transcription}
                                className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-md transition-colors disabled:opacity-50"
                              >
                                {isGeneratingCallSummary ? 'Generating...' : 'Generate Call Summary'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Call Result Section */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-800 mb-3">Call result</h3>
                      
                      <div>
                        <Select 
                          value={selectedOutcome} 
                          onValueChange={async (value) => {
                            // Only allow selection if call has ended
                            if (!callEnded) {
                              alert('Please make a call first before selecting an outcome.')
                              return
                            }
                            setSelectedOutcome(value)
                            updateSessionStats(value)
                            
                            // Save to database
                            const success = await saveCallOutcomeToDatabase(value)
                            if (success) {
                              console.log('✅ Call outcome saved:', value)
                              
                              // Automatically save contact list progress
                              try {
                                console.log('💾 Saving contact list progress after call outcome selection')
                                await saveContactListProgress()
                              } catch (error) {
                                console.error('❌ Error auto-saving contact list progress after call outcome:', error)
                              }
                            }
                          }}
                          disabled={!callEnded}
                        >
                          <SelectTrigger className={`h-10 rounded-[5px] border text-sm ${
                            !callEnded 
                              ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'border-gray-200 bg-white text-gray-900'
                          }`}>
                            <SelectValue placeholder={!callEnded ? "Make a call first" : "Select an outcome"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="interested">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                                <span>Interested</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="not-interested">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                                <span>Not Interested</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="callback">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                                <span>Callback Later</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="no-answer">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-gray-500 rounded-sm"></div>
                                <span>No Answer</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="meeting-scheduled">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-purple-600 rounded-sm"></div>
                                <span>Meeting Scheduled</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="wrong-number">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                                <span>Wrong Number</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {selectedOutcome && (
                          <div className="flex items-center justify-end gap-2 text-green-600 text-sm mt-2">
                            <Check className="w-4 h-4" />
                            <span>Outcome saved</span>
                          </div>
                        )}
                      </div>

                      {/* Schedule Callback Section - appears when "Callback Later" is selected */}
                      {selectedOutcome === "callback" && (
                        <div 
                          className="mt-4 p-4 rounded-lg"
                          style={{ 
                            backgroundColor: '#FFF8EE',
                            color: '#7C2D12'
                          }}
                        >
                          <h3 className="font-semibold text-base mb-1">Schedule Callback</h3>
                          <p className="text-sm mb-4">Set up a e-mail and in-app reminder to call back</p>
                          
                          <div className="flex gap-3 mb-4">
                            {/* Date Input */}
                            <div className="flex-1 relative">
                              <input
                                type="date"
                                value={callbackDate}
                                onChange={(e) => setCallbackDate(e.target.value)}
                                className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                style={{ 
                                  color: '#7C2D12',
                                  colorScheme: 'light'
                                }}
                              />
                              <Calendar className="absolute left-3 top-2.5 w-5 h-5 pointer-events-none" style={{ color: '#7C2D12' }} />
                            </div>
                            
                            {/* Time Input */}
                            <div className="flex-1 relative">
                              <input
                                type="time"
                                value={callbackTime}
                                onChange={(e) => setCallbackTime(e.target.value)}
                                className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                style={{ 
                                  color: '#7C2D12',
                                  colorScheme: 'light'
                                }}
                              />
                              <Clock className="absolute left-3 top-2.5 w-5 h-5 pointer-events-none" style={{ color: '#7C2D12' }} />
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {/* Save Button */}
                            <button 
                              onClick={async () => {
                                if (!callbackDate || !callbackTime) {
                                  alert('Please select both date and time for the callback')
                                  return
                                }
                                
                                console.log('💾 Starting callback save...')
                                setIsSavingCallback(true)
                                
                                const success = await saveCallbackToDatabase(callbackDate, callbackTime)
                                setIsSavingCallback(false)
                                
                                if (success) {
                                  console.log('✅ Callback saved successfully')
                                  setCallbackSaved(true)
                                  
                                  // Reset success state after 3 seconds
                                  setTimeout(() => {
                                    setCallbackSaved(false)
                                  }, 3000)
                                } else {
                                  alert('Failed to schedule callback. Please try again.')
                                }
                              }}
                              disabled={isSavingCallback || callbackSaved}
                              className="w-full h-10 text-white font-medium rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                              style={{ backgroundColor: '#FF4100' }}
                            >
                              {isSavingCallback ? (
                                <>
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Saving...
                                </>
                              ) : callbackSaved ? (
                                <>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Saved!
                                </>
                              ) : (
                                'Save'
                              )}
                            </button>
                            
                            {/* Google Calendar Integration */}
                            {hasGoogleCalendarIntegration ? (
                              <div className="w-full flex flex-col items-center justify-center text-sm text-gray-600">
                                <div>This will be automatically added to your Google Calendar</div>
                                {googleCalendarEmail && (
                                  <div className="text-xs text-gray-500 mt-1">({googleCalendarEmail})</div>
                                )}
                              </div>
                            ) : (
                              <button 
                                onClick={async () => {
                                  if (!callbackDate || !callbackTime) {
                                    alert('Please select both date and time first')
                                    return
                                  }
                                  
                                  console.log('🗓️ Starting callback calendar add...')
                                  setIsAddingCallbackToCalendar(true)
                                  
                                  // Simulate adding to calendar (replace with actual Google Calendar API call)
                                  setTimeout(() => {
                                    console.log('🗓️ Callback calendar add completed')
                                    setIsAddingCallbackToCalendar(false)
                                    setCallbackAddedToCalendar(true)
                                    
                                    // Reset after 3 seconds
                                    setTimeout(() => {
                                      setCallbackAddedToCalendar(false)
                                    }, 3000)
                                  }, 2000)
                                }}
                                disabled={isAddingCallbackToCalendar || callbackAddedToCalendar}
                                className="w-full h-10 bg-transparent border border-gray-300 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {isAddingCallbackToCalendar ? (
                                  <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Adding to Calendar...
                                  </>
                                ) : callbackAddedToCalendar ? (
                                  <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Added To Calendar
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Add To Google Calendar
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Callback Google Calendar Success Message */}
                      {selectedOutcome === "callback" && callbackAddedToGoogleCalendar && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Callback was added to Google Calendar
                          </div>
                        </div>
                      )}

                      {/* Schedule A Meeting Section - appears when "Meeting Scheduled" is selected */}
                      {selectedOutcome === "meeting-scheduled" && (
                        <div 
                          className="mt-4 p-4 rounded-lg"
                          style={{ 
                            backgroundColor: '#F3E8FF',
                            color: '#6B21A8'
                          }}
                        >
                          <h3 className="font-semibold text-base mb-1">Schedule A Meeting</h3>
                          <p className="text-sm mb-4">Set up a follow-up meeting</p>
                          
                          <div className="flex gap-3 mb-4">
                                                         {/* Date Input */}
                             <div className="flex-1 relative">
                               <input
                                 type="date"
                                 value={meetingDate}
                                 onChange={(e) => setMeetingDate(e.target.value)}
                                 className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                                 style={{ 
                                   color: '#6B21A8',
                                   colorScheme: 'light'
                                 }}
                               />
                               <Calendar className="absolute left-3 top-2.5 w-5 h-5 pointer-events-none" style={{ color: '#6B21A8' }} />
                             </div>
                             
                             {/* Time Input */}
                             <div className="flex-1 relative">
                               <input
                                 type="time"
                                 value={meetingTime}
                                 onChange={(e) => setMeetingTime(e.target.value)}
                                 className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600"
                                 style={{ 
                                   color: '#6B21A8',
                                   colorScheme: 'light'
                                 }}
                               />
                               <Clock className="absolute left-3 top-2.5 w-5 h-5 pointer-events-none" style={{ color: '#6B21A8' }} />
                             </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {/* Save Button */}
                            <button 
                              onClick={async () => {
                                if (!meetingDate || !meetingTime) {
                                  alert('Please select both date and time for the meeting')
                                  return
                                }
                                
                                console.log('💾 Starting meeting save...')
                                setIsSavingMeeting(true)
                                
                                const success = await saveMeetingToDatabase(meetingDate, meetingTime)
                                setIsSavingMeeting(false)
                                
                                if (success) {
                                  console.log('✅ Meeting saved successfully')
                                  setMeetingSaved(true)
                                  
                                  // Reset success state after 3 seconds
                                  setTimeout(() => {
                                    setMeetingSaved(false)
                                  }, 3000)
                                } else {
                                  alert('Failed to schedule meeting. Please try again.')
                                }
                              }}
                              disabled={isSavingMeeting || meetingSaved}
                              className="w-full h-10 text-white font-medium rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                              style={{ backgroundColor: '#6B21A8' }}
                            >
                              {isSavingMeeting ? (
                                <>
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Saving...
                                </>
                              ) : meetingSaved ? (
                                <>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Saved!
                                </>
                              ) : (
                                'Save'
                              )}
                            </button>
                            
                            {/* Google Calendar Integration */}
                            {hasGoogleCalendarIntegration ? (
                              <div className="w-full flex flex-col items-center justify-center text-sm text-gray-600">
                                <div>This will be automatically added to your Google Calendar</div>
                                {googleCalendarEmail && (
                                  <div className="text-xs text-gray-500 mt-1">({googleCalendarEmail})</div>
                                )}
                              </div>
                            ) : (
                              <button 
                                onClick={async () => {
                                  if (!meetingDate || !meetingTime) {
                                    alert('Please select both date and time first')
                                    return
                                  }
                                  
                                  console.log('🗓️ Starting meeting calendar add...')
                                  setIsAddingMeetingToCalendar(true)
                                  
                                  // Simulate adding to calendar (replace with actual Google Calendar API call)
                                  setTimeout(() => {
                                    console.log('🗓️ Meeting calendar add completed')
                                    setIsAddingMeetingToCalendar(false)
                                    setMeetingAddedToCalendar(true)
                                    
                                    // Reset after 3 seconds
                                    setTimeout(() => {
                                      setMeetingAddedToCalendar(false)
                                    }, 3000)
                                  }, 2000)
                                }}
                                disabled={isAddingMeetingToCalendar || meetingAddedToCalendar}
                                className="w-full h-10 bg-transparent font-medium rounded-lg text-sm transition-colors hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ 
                                  border: '1px solid #6B21A8',
                                  color: '#6B21A8'
                                }}
                              >
                                {isAddingMeetingToCalendar ? (
                                  <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Adding to Calendar...
                                  </>
                                ) : meetingAddedToCalendar ? (
                                  <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Added To Calendar
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Add To Google Calendar
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Meeting Google Calendar Success Message */}
                      {selectedOutcome === "meeting-scheduled" && meetingAddedToGoogleCalendar && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Meeting was added to Google Calendar
                          </div>
                        </div>
                      )}

                      {/* Add a Reason Section - appears when "Not Interested" is selected */}
                      {selectedOutcome === "not-interested" && (
                        <div 
                          className="mt-4 p-4 rounded-lg"
                          style={{ 
                            backgroundColor: '#FEF2F2',
                            color: '#B91C1C'
                          }}
                        >
                          <h3 className="font-semibold text-base mb-1">
                            Add a reason <span className="font-normal">(optional)</span>
                          </h3>
                          <p className="text-sm mb-4">Add reason for future reference</p>
                          
                          <div className="mb-4">
                            <textarea
                              placeholder='e.g "Already using competitor product"'
                              value={notInterestedReason}
                              onChange={(e) => setNotInterestedReason(e.target.value)}
                              rows={4}
                              className="w-full p-3 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                              style={{ 
                                color: '#B91C1C',
                                border: '1px solid #FF0000'
                              }}
                            />
                          </div>
                          
                          <button 
                            onClick={async () => {
                              if (!currentCallHistoryId) {
                                alert('No call history to save reason to')
                                return
                              }
                              
                              // Save the not interested reason as additional notes
                              const reasonNotes = notInterestedReason.trim() 
                                ? `Not interested reason: ${notInterestedReason.trim()}`
                                : 'Not interested (no reason provided)'
                              
                              const success = await updateCallHistoryRecord(currentCallHistoryId, {
                                notes: notes.trim() ? `${notes.trim()}\n\n${reasonNotes}` : reasonNotes,
                                updated_at: new Date().toISOString()
                              })
                              
                              if (success) {
                                alert('Reason saved successfully!')
                              } else {
                                alert('Failed to save reason. Please try again.')
                              }
                            }}
                            className="w-full h-10 text-white font-medium rounded-lg transition-colors hover:opacity-90"
                            style={{ backgroundColor: '#FF0000' }}
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right side container with contact card and buttons */}
            <div className="flex flex-col sticky top-4 self-start">
              {/* Contact card - 354px wide */}
              <div 
                className="bg-white border flex flex-col"
                style={{ 
                  width: '354px', 
                  height: 'fit-content',
                  minHeight: '500px',
                  borderWidth: '0.5px',
                  borderColor: '#f4f4f4',
                  borderRadius: '10px'
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      callStarted ? 'bg-red-500' : isConnecting ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      {callStarted ? 'In Call' : isConnecting ? 'Connecting...' : 'Ready To Call'}
                    </span>
                  </div>
                  <span 
                    className="text-sm text-blue-600 cursor-pointer hover:underline"
                    onClick={() => setShowAudioSettings(true)}
                  >
                    Audio Settings
                  </span>
                </div>

                {/* Contact Info */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-sm text-gray-500 mb-2">{contact.company || 'Company'}</p>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{contact.name || 'Loading...'}</h2>
                  <p className="text-sm text-gray-500 mb-8">{contact.position || 'Contact'}</p>

                  {/* Phone Number */}
                  <p className="text-lg font-semibold text-gray-900 mb-6">{contact.phone || 'No phone'}</p>

                  {/* Call Duration Display (when in call) */}
                  {callStarted && (
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.floor(callDuration / 60).toString().padStart(2, '0')}:{(callDuration % 60).toString().padStart(2, '0')}
                      </div>
                      <div className="text-sm text-gray-500">Call Duration</div>
                    </div>
                  )}

                  {/* Call Button */}
                  {!callStarted ? (
                    <Button 
                      className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-full flex items-center gap-2 mb-8"
                      disabled={isConnecting || !contact.phone || !sessionReady || !twilioReady}
                      onClick={handleStartCall}
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                    <Phone className="w-4 h-4" />
                    Call Now
                        </>
                      )}
                  </Button>
                  ) : (
                    <div className="flex gap-3 mb-8">
                      <Button
                        onClick={toggleMute}
                        variant="outline"
                        size="sm"
                        className={`px-4 py-2 rounded-full ${isMuted ? 'bg-yellow-100 border-yellow-300' : ''}`}
                      >
                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={handleEndCall}
                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full flex items-center gap-2"
                      >
                        <PhoneOff className="w-4 h-4" />
                        End Call
                      </Button>
                    </div>
                  )}

                  {/* Location and Time */}
                  {localTimeInfo && (
                    <div className="flex flex-col gap-3 mb-6">
                      {/* Location/Toll-Free Status */}
                      <div className={`px-3 py-1 rounded-full text-sm ${
                        isTollFreeNumber(contact.phone)
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-white text-gray-700 border border-[#f2f2f2]'
                      }`}>
                        {isTollFreeNumber(contact.phone) ? 'Toll-Free Number' : localTimeInfo.location}
                      </div>
                      
                      {/* Time Display */}
                      {!isTollFreeNumber(contact.phone) && (
                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm w-fit self-center">
                          {localTimeInfo.time}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contact Details */}
                  <div className="text-sm text-blue-600 space-y-1">
                    {contact.email && (
                      <p 
                        className="hover:underline cursor-pointer break-all"
                        onClick={() => {
                          navigator.clipboard.writeText(contact.email)
                          alert('Email copied to clipboard!')
                        }}
                        title="Click to copy email"
                      >
                        {contact.email}
                      </p>
                    )}
                    {contact.website && (
                      <p 
                        className="hover:underline cursor-pointer break-all flex items-center gap-1"
                        onClick={() => {
                          window.open(contact.website, '_blank')
                        }}
                        title="Click to open website"
                      >
                        {contact.website}
                        <img 
                          src="/linkto.png" 
                          alt="External link" 
                          className="w-[11px] h-[11px] flex-shrink-0"
                        />
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation buttons below right box */}
              <div className="flex flex-col items-center gap-3 mt-4">
                              {/* Previous Call and Next Call buttons */}
              <div className="flex gap-5 w-full" style={{ width: '354px' }}>
                <Button 
                  variant="outline" 
                  className="flex-1 py-2 border-gray-300 hover:border-[#1F2937] bg-[#F9FAFB] text-gray-700 hover:bg-gray-50 hover:text-[#1F2937] rounded-[5px]"
                    onClick={goToPreviousContact}
                    disabled={currentContactIndex <= 0 || callStarted}
                >
                    Previous Contact
                </Button>
                <Button 
                  className={`flex-1 py-2 rounded-[5px] transition-colors ${
                    (!callStarted && !callEnded) || (callEnded && !selectedOutcome)
                      ? 'bg-gray-400 hover:bg-gray-400 text-gray-200 cursor-not-allowed' 
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                    onClick={() => {
                      // Check if no call was made yet
                      if (!callStarted && !callEnded) {
                        alert('Please make a call to this contact first, or use Skip if you want to skip this contact.')
                        return
                      }
                      // Check if call was made and outcome is required
                      if (callEnded && !selectedOutcome) {
                        alert('Please select a call result before moving to the next contact.')
                        return
                      }
                      goToNextContact()
                    }}
                    disabled={currentContactIndex >= contacts.length - 1 || callStarted || (!callStarted && !callEnded) || (callEnded && !selectedOutcome)}
                >
                    Next Contact
                </Button>
              </div>
                
                {/* Skip contact link */}
                <button 
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                  onClick={handleSkipContact}
                  disabled={callStarted || currentContactIndex >= contacts.length - 1}
                >
                  Skip contact
                </button>
                
                {/* End Session button */}
                {currentContactIndex >= contacts.length - 1 && (
                  <Button 
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg mt-2"
                    onClick={handleSessionEnd}
                    disabled={callStarted}
                  >
                    End Session
                  </Button>
                )}
            </div>
          </div>
        </div>
        
        {/* Copyright footer */}
        <div className="mt-16 mb-10 text-center">
          <p 
            className="text-sm text-gray-500"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            Copyright © 2025 WeColdCall. All rights reserved Terms of Service  |  Privacy Policy  |  Acceptable Use Policy
          </p>
        </div>
      </div>
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
      {showAudioSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Audio Settings</h2>
              <button
                onClick={() => setShowAudioSettings(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Microphone Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Microphone
                </label>
                <Select
                  value={selectedInputDevice || ""}
                  onValueChange={(deviceId) => {
                    if (selectedOutputDevice) {
                      saveAudioPreferences(deviceId, selectedOutputDevice)
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select microphone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inputDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Speaker Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Speaker
                </label>
                <Select
                  value={selectedOutputDevice || ""}
                  onValueChange={(deviceId) => {
                    if (selectedInputDevice) {
                      saveAudioPreferences(selectedInputDevice, deviceId)
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select speaker..." />
                  </SelectTrigger>
                  <SelectContent>
                    {outputDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Speaker ${device.deviceId.slice(0, 5)}...`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Twilio Device Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${twilioReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    Twilio Status: {twilioReady ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
                {twilioError && (
                  <p className="text-xs text-red-600 mt-1">{twilioError}</p>
                )}
              </div>

              {/* Test Audio Button */}
              <Button
                onClick={async () => {
                  try {
                    // Test microphone access
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                    stream.getTracks().forEach(track => track.stop())
                    alert('Audio test successful! Your microphone is working.')
                  } catch (error) {
                    alert('Audio test failed. Please check your microphone permissions.')
                  }
                }}
                variant="outline"
                className="w-full"
              >
                Test Audio
              </Button>

              {/* Close Button */}
              <Button
                onClick={() => setShowAudioSettings(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save & Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
