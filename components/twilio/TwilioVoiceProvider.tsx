"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient as createSupabaseClient } from "@/utils/supabase/client"
import IncomingCall from "../../incoming-call"
import { setActiveConnection as setActiveTwilioConnection, clearActiveConnection as clearActiveTwilioConnection } from "./connectionStore"

// Minimal global typings
declare global {
  interface Window {
    Twilio?: any
    Device?: any
    __twilioDevice?: any
  }
}

export default function TwilioVoiceProvider() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [callerName, setCallerName] = useState<string>("Unknown caller")
  const [callerNumber, setCallerNumber] = useState<string>("")
  const [callerLabel, setCallerLabel] = useState<string>("")
  const [callerCompany, setCallerCompany] = useState<string>("")
  const [callerPosition, setCallerPosition] = useState<string>("")
  const [callerContactId, setCallerContactId] = useState<string>("")
  const [callerListId, setCallerListId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const incomingConnectionRef = useRef<any>(null)
  const currentCallHistoryIdRef = useRef<string | null>(null)
  const acceptedRef = useRef<boolean>(false)
  const [needsEnable, setNeedsEnable] = useState<boolean>(false)
  const [enabling, setEnabling] = useState<boolean>(false)
  const sdkReadyRef = useRef<boolean>(false)
  // Using NPM SDK, so no external script blocking

  // Mark this provider as the global owner of incoming-call UI to prevent
  // other pages from also rendering an incoming popup simultaneously.
  useEffect(() => {
    try { (window as any).__twilioIncomingUIOwner = 'provider' } catch {}
    return () => {
      try {
        if ((window as any).__twilioIncomingUIOwner === 'provider') {
          (window as any).__twilioIncomingUIOwner = undefined
        }
      } catch {}
    }
  }, [])

  const ensureDevice = useCallback(async () => {
    try {
      if (typeof window === "undefined") return null

      // Reuse an existing device if present
      if (window.__twilioDevice) {
        return window.__twilioDevice
      }

      // Dynamically import SDK from NPM rather than relying on window global
      const twilio = await import("@twilio/voice-sdk")
      const Device = (twilio as any).Device as any
      if (!Device) {
        throw new Error("@twilio/voice-sdk Device not available")
      }
      sdkReadyRef.current = true

      // Fetch access token from unified Next.js route (same-origin)
      const res = await fetch(`/api/twilio/access-token`, { cache: "no-store" })
      if (!res.ok) {
        throw new Error(`Failed to fetch Twilio token: ${res.status}`)
      }
      const data = await res.json()
      const token = data?.token
      if (!token) throw new Error("Missing Twilio access token from API response")

      const device = new Device(token, {
        codecPreferences: ["opus", "pcmu"],
        enableRingingState: true,
        closeProtection: true,
      })

      window.__twilioDevice = device
      // For compatibility with existing code that references window.Device
      window.Device = device

      // Some SDK versions require explicit registration
      try {
        if (typeof device.register === 'function') {
          await device.register()
        }
      } catch (e) {
        console.warn('Twilio Device register() failed or not required', e)
      }

      return device
    } catch (e: any) {
      console.error("TwilioVoiceProvider: ensureDevice error", e)
      setError(e?.message ?? "Failed to initialize Twilio Device")
      return null
    }
  }, [])

  // --- call_history helpers ---
  const insertIncomingCallRecord = useCallback(async (from: string, info: null | {
    id?: any,
    name?: string,
    number?: string,
    company?: string,
    position?: string,
    contact_list_id?: any,
  }) => {
    try {
      const supabase = createSupabaseClient()
      const { data: userRes } = await supabase.auth.getUser()
      const userId = userRes?.user?.id
      if (!userId) return null

      const payload: any = {
        user_id: userId,
        type: 'incoming_call',
        from_phone: from || null,
        contact_phone: info?.number || from || '',
        contact_name: info?.name || 'Unknown caller',
        contact_id: info?.id ?? null,
        contact_list_id: info?.contact_list_id ?? null,
        contact_company: info?.company ?? null,
        contact_position: info?.position ?? null,
        started_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('call_history')
        .insert(payload)
        .select('id')
        .single()

      if (error) {
        console.warn('Failed to insert incoming call record:', error)
        return null
      }
      currentCallHistoryIdRef.current = data?.id || null
      return data?.id || null
    } catch (e) {
      console.warn('Unexpected error inserting incoming call record:', e)
      return null
    }
  }, [])

  const markCurrentCallAsMissed = useCallback(async () => {
    const id = currentCallHistoryIdRef.current
    if (!id) return
    try {
      const supabase = createSupabaseClient()
      await supabase
        .from('call_history')
        .update({
          type: 'missed_call',
          call_outcome: 'missed_call',
          ended_at: new Date().toISOString(),
        })
        .eq('id', id)
    } catch (e) {
      console.warn('Failed to mark missed_call:', e)
    } finally {
      currentCallHistoryIdRef.current = null
    }
  }, [])

  // --- Helpers: phone normalization and contact lookup ---
  const normalizeDigits = (input?: string) => (input || "").replace(/\D/g, "")
  const normalizeFrom = (raw?: string) => {
    let s = (raw || '').trim()
    // Strip common URI prefixes
    s = s.replace(/^(tel:|sip:|client:)/i, '')
    // Remove spaces and dashes/parentheses
    s = s.replace(/[\s\-()]/g, '')
    // If starts with 00 and not +, convert to +
    if (s.startsWith('00') && !s.startsWith('+')) {
      s = '+' + s.slice(2)
    }
    return s
  }

  const lookupContactByPhone = useCallback(async (rawInput: string) => {
    try {
      const supabase = createSupabaseClient()
      // Ensure user (RLS)
      const { data: userRes } = await supabase.auth.getUser()
      const userId = userRes?.user?.id
      if (!userId) return null

      const rawFrom = normalizeFrom(rawInput)
      const digits = normalizeDigits(rawFrom)
      if (!digits) return null

      // Build candidates
      const e164 = rawFrom.startsWith('+') ? rawFrom : `+${digits}`
      const last7 = digits.slice(-7)
      const last10 = digits.slice(-10)

      // Search across phone, phone_e164, phone_digits with multiple strategies
      const orClauses = [
        `phone.eq.${rawFrom}`,
        `phone.eq.${e164}`,
        `phone.eq.${digits}`,
        `phone_e164.eq.${rawFrom}`,
        `phone_e164.eq.${e164}`,
        `phone_digits.eq.${digits}`,
        `phone.ilike.%${last7}%`,
        `phone.ilike.%${last10}%`,
        `phone_e164.ilike.%${last7}%`,
        `phone_digits.ilike.%${last7}%`,
      ].join(',')

      console.log('🔎 Contact lookup', { rawInput, rawFrom, digits, e164, orClauses })

      const { data: contact, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .or(orClauses)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.warn('Contact lookup error:', error)
        return null
      }
      if (!contact) {
        console.log('🔎 No contact match for', { rawFrom, digits })
        return null
      }

      // Optional: fetch list label
      let label = ''
      if (contact.contact_list_id) {
        const { data: list } = await supabase
          .from('contact_lists')
          .select('name')
          .eq('id', contact.contact_list_id)
          .maybeSingle()
        if (list?.name) label = list.name
      }

      return {
        id: String(contact.id),
        name: contact.name || contact.company || 'Unknown caller',
        number: contact.phone_e164 || contact.phone || e164 || rawFrom,
        company: contact.company || '',
        position: contact.position || contact.title || '',
        contact_list_id: contact.contact_list_id ? String(contact.contact_list_id) : '',
        label,
      }
    } catch (e) {
      console.warn('Contact lookup failed:', e)
      return null
    }
  }, [])

  useEffect(() => {
    // Determine if we need to prompt for enabling calling (runs once on mount)
    // Chrome autoplay/Web Audio policy: require a user gesture per tab session
    try {
      const sessionGesture = typeof window !== 'undefined' && window.sessionStorage.getItem('twilio_audio_gesture') === '1'
      setNeedsEnable(!sessionGesture)
    } catch {}

    // Debug helpers
    try {
      ;(window as any).__twilioShowEnable = () => setNeedsEnable(true)
      ;(window as any).__twilioState = () => ({
        needsEnable,
        ready: sdkReadyRef.current,
        device: (window as any).__twilioDevice || null,
        sdkOnWindow: !!(window as any).Twilio,
      })
    } catch {}

    // No external SDK script to check anymore
  }, [])

  useEffect(() => {
    // Do not initialize until the user has explicitly enabled calling or previously consented
    if (needsEnable) return

    let device: any
    let mounted = true

    const runSetup = async () => {
      device = await ensureDevice()
      if (!mounted) return
      if (!device) {
        // If SDK is present but device couldn't be created (or SDK still missing), re-show enable prompt
        try { window.localStorage.removeItem('twilio_calling_enabled') } catch {}
        setNeedsEnable(true)
        return
      }

      const onReady = () => {
        setReady(true)
        setError(null)
        console.log("🔉 Twilio Device ready (global provider)")
      }
      const onError = (e: any) => {
        console.error("Twilio Device error", e)
        setError(e?.message || "Twilio error")
        // Do not re-show the enable prompt on transient errors.
        // Keeping the user's enable state avoids the popup reappearing unnecessarily.
      }
      const onIncoming = (connection: any) => {
        try {
          console.log("📞 Incoming call (global)", connection)
          // reset accept flag for this new incoming call
          acceptedRef.current = false
          incomingConnectionRef.current = connection
          const fromRaw =
            connection?.parameters?.From ||
            connection?.customParameters?.get?.("From") ||
            "Unknown"
          const from = normalizeFrom(fromRaw)
          setCallerName("Unknown caller")
          setCallerNumber(from)
          setCallerLabel("")
          setVisible(true)

          // After contact lookup, insert call_history (only after determining contact presence)
          ;(async () => {
            console.log('📟 Incoming From values', { fromRaw, normalized: from, digits: normalizeDigits(from) })
            const info = await lookupContactByPhone(from)
            if (info) {
              setCallerName(info.name)
              setCallerNumber(info.number)
              setCallerLabel(info.label)
              setCallerCompany(info.company || "")
              setCallerPosition(info.position || "")
              setCallerContactId(info.id || "")
              setCallerListId(info.contact_list_id || "")
            }
            await insertIncomingCallRecord(from, info ? {
              id: info.id,
              name: info.name,
              number: info.number,
              company: info.company,
              position: info.position,
              contact_list_id: info.contact_list_id,
            } : null)
          })()

          // Also listen on the specific incoming connection, so if the caller
          // cancels/hangs up before we accept, the popup hides immediately.
          try {
            const handleCancel = () => {
              setVisible(false)
              incomingConnectionRef.current = null
              setCallerLabel("")
              setCallerCompany("")
              setCallerPosition("")
              // Only mark missed if this call was NOT accepted
              if (!acceptedRef.current) {
                void markCurrentCallAsMissed()
              }
              try { clearActiveTwilioConnection() } catch {}
            }
            connection.on?.("cancel", handleCancel)
            connection.on?.("disconnect", handleCancel)
            connection.on?.("reject", handleCancel)
            // When the remote party connects/we accept, store the active connection for hydration
            connection.on?.("accept", () => {
              try { setActiveTwilioConnection(connection) } catch {}
            })
          } catch {}
        } catch (err) {
          console.error("Error handling incoming call", err)
        }
      }
      const onCancel = () => {
        setVisible(false)
        incomingConnectionRef.current = null
        setCallerLabel("")
        setCallerCompany("")
        setCallerPosition("")
        setCallerContactId("")
        setCallerListId("")
      }
      const onDisconnect = onCancel
      const onReject = onCancel
      const onTokenWillExpire = async () => {
        try {
          const res = await fetch(`/api/twilio/access-token`, { cache: "no-store" })
          const data = await res.json()
          if (data?.token) {
            device.updateToken(data.token)
          }
        } catch (e) {
          console.warn("Failed to refresh Twilio token")
        }
      }

      device.on("ready", onReady)
      device.on("error", onError)
      device.on("incoming", onIncoming)
      device.on("cancel", onCancel)
      device.on("reject", onReject)
      device.on("disconnect", onDisconnect)
      device.on("tokenWillExpire", onTokenWillExpire)

      // In case the device was already ready
      try {
        // Some SDK versions expose state
        // Not all versions have device.state, so guard it
        if ((device as any)?.state === "ready") onReady()
      } catch {}

      // If not ready within a short timeout, re-show enable prompt to capture user gesture
      const readyTimeout = setTimeout(() => {
        if (!mounted) return
        if (!ready) {
          // Do not flip needsEnable back to true; some environments take longer to fire 'ready'.
          // We keep the enable state and simply log for diagnostics.
          console.warn('Twilio Device not ready within expected time; keeping calling enabled and waiting...')
        }
      }, 3000)

      return () => {
        try {
          device.off("ready", onReady)
          device.off("error", onError)
          device.off("incoming", onIncoming)
          device.off("cancel", onCancel)
          device.off("reject", onReject)
          device.off("disconnect", onDisconnect)
          device.off("tokenWillExpire", onTokenWillExpire)
        } catch {}
        try { clearTimeout(readyTimeout) } catch {}
      }
    }

    // With NPM SDK, we can set up immediately
    const cleanupPromise = runSetup()
    return () => {
      mounted = false
      void cleanupPromise
    }
  }, [ensureDevice, needsEnable])

  const handleAccept = useCallback(async () => {
    const conn = incomingConnectionRef.current
    try {
      if (conn) {
        console.log("✅ Accepting incoming call")
        // mark as accepted so disconnect handler won't mark missed
        acceptedRef.current = true
        conn.accept()
        try { setActiveTwilioConnection(conn) } catch {}

        // After accepting, attempt to capture CallSid and persist to call_history
        try {
          const sid = (conn as any)?.parameters?.CallSid
          if (sid) {
            const historyId = currentCallHistoryIdRef.current
            if (historyId) {
              const supabase = createSupabaseClient()
              await supabase
                .from('call_history')
                .update({
                  call_sid: sid,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', historyId)
              console.log('✅ Saved incoming CallSid to call_history:', sid)
            } else {
              console.warn('⚠️ No call_history id when trying to save incoming CallSid')
            }
          } else {
            console.warn('⚠️ CallSid not yet available on accepted incoming connection')
          }
        } catch (e) {
          console.error('❌ Failed to persist incoming CallSid to call_history', e)
        }
      } else {
        console.warn("Accept pressed but no incoming connection reference; hiding popup")
      }
    } catch (e) {
      console.error("Failed to accept incoming call", e)
    } finally {
      // If we accepted, keep the record as incoming (answered); don't mark missed here
      // Capture IDs before clearing state
      const contactId = callerContactId
      const listId = callerListId
      const callHistoryId = currentCallHistoryIdRef.current

      setVisible(false)
      incomingConnectionRef.current = null
      setCallerLabel("")
      setCallerCompany("")
      setCallerPosition("")
      // If we have a matched contact, navigate to one-one-call view
      try {
        if (contactId) {
          const params = new URLSearchParams()
          // If we have a contact match, route with IDs
          if (contactId) {
            params.set('contactId', contactId)
            if (listId) params.set('listId', listId)
          } else {
            // Fallback: still navigate to one-one-call with the phone number so user lands on calling page
            if (callerNumber) params.set('phoneNumber', callerNumber)
          }
          if (callHistoryId) params.set('callHistoryId', callHistoryId)
          console.log('➡️ Navigating to one-one-call with', Object.fromEntries(params.entries()))
          router.push(`/calling/one-one-call?${params.toString()}`)
        }
      } catch {}
      setCallerContactId("")
      setCallerListId("")
    }
  }, [callerContactId, callerListId, router])

  const handleReject = useCallback(() => {
    const conn = incomingConnectionRef.current
    try {
      if (conn) {
        console.log("⛔ Rejecting incoming call")
        conn.reject()
      } else {
        console.warn("Reject pressed but no incoming connection reference; hiding popup")
      }
    } catch (e) {
      console.error("Failed to reject incoming call", e)
    } finally {
      void markCurrentCallAsMissed()
      setVisible(false)
      incomingConnectionRef.current = null
      setCallerLabel("")
      setCallerCompany("")
      setCallerPosition("")
      setCallerContactId("")
      setCallerListId("")
    }
  }, [])

  // User-triggered enable flow to satisfy browser user-interaction policies
  const handleEnableCalling = useCallback(async () => {
    setEnabling(true)
    try {
      // Mark gesture immediately so dependent UIs can react early in this tick
      try { window.sessionStorage.setItem('twilio_audio_gesture', '1') } catch {}
      console.log('🖱️ First user gesture captured: enabling calling')

      // Best-effort: explicitly resume a Web Audio context to satisfy autoplay policy
      try {
        const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext
        if (AC) {
          const ac = new AC()
          await ac.resume()
          try { await ac.close() } catch {}
          console.log('🎛️ AudioContext resumed successfully')
        }
      } catch (acErr) {
        console.warn('AudioContext resume attempt failed or not needed', acErr)
      }

      // Request microphone permission to satisfy autoplay/user gesture requirements
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(t => t.stop())
        console.log('🎤 Microphone permission granted')
      } catch (permErr) {
        console.warn('Microphone permission request failed', permErr)
        // Continue; some browsers allow incoming without immediate mic capture
      }

      // Ensure device exists and is registered
      const device = await ensureDevice()
      if (!device) {
        console.warn('❌ Twilio Device not created after enable')
      } else {
        console.log('✅ Twilio Device created')
      }
      if (device && typeof device.register === 'function') {
        try { await device.register() } catch {}
      }

      // Optional: keep previous behavior to remember user's preference (not used for gating init)
      try { window.localStorage.setItem('twilio_calling_enabled', '1') } catch {}
      // Flip the gate so the initialization effect can run
      setNeedsEnable(false)
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Failed to enable calling')
    } finally {
      setEnabling(false)
    }
  }, [ensureDevice])

  // Auto-capture first user gesture (click/keydown/touch) to satisfy Web Audio policy
  useEffect(() => {
    if (!needsEnable) return
    let armed = true
    const onFirstGesture = async () => {
      if (!armed) return
      armed = false
      try { await handleEnableCalling() } finally {
        cleanup()
      }
    }
    const opts: AddEventListenerOptions = { once: false, capture: true }
    document.addEventListener('pointerdown', onFirstGesture, opts)
    document.addEventListener('keydown', onFirstGesture, opts)
    document.addEventListener('touchstart', onFirstGesture, opts)
    console.log('⏳ Waiting for first user gesture to enable calling')
    const cleanup = () => {
      document.removeEventListener('pointerdown', onFirstGesture, opts as any)
      document.removeEventListener('keydown', onFirstGesture, opts as any)
      document.removeEventListener('touchstart', onFirstGesture, opts as any)
      console.log('🧹 Gesture listeners removed')
    }
    return cleanup
  }, [needsEnable, handleEnableCalling])

  // No retry needed with NPM SDK

  return (
    <>
      {/* Keep the component mounted globally; popup appears as needed */}
      <IncomingCall
        visible={visible}
        callerName={callerName}
        callerNumber={callerNumber}
        callerLabel={callerLabel}
        callerCompany={callerCompany}
        callerPosition={callerPosition}
        onAccept={handleAccept}
        onReject={handleReject}
      />

      {/* No explicit popup; enable is triggered on first user interaction. */}
      {/* Optional: surface errors via a small toast if needed. */}
      {/* {error && (<div className="fixed bottom-3 right-3 text-sm bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded">{error}</div>)} */}

      {/* Optionally show a small status toast/indicator in future */}
      {/* {error && (<div className="fixed bottom-3 right-3 text-sm bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded">{error}</div>)} */}
      {/* {ready && (<div className="fixed bottom-3 right-3 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">Twilio ready</div>)} */}
    </>
  )
}
