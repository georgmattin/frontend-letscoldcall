"use client"

import React from "react"
import Image from "next/image"
import CallResultToggle from "./call-result-toggle"
import CallNotesToggle from "./call-notes-toggle"
import CallRecordingToggle from "./call-recording-toggle"
import AITranscriptionToggle from "./ai-transcription-toggle"
// Using direct Supabase usage checks to mirror calling page implementation
import AISummaryToggle from "./ai-summary-toggle"
import AISuggestionsToggle from "./ai-suggestions-toggle"
import { createClient } from "@/utils/supabase/client"

interface CallLogsPopupProps {
  children?: React.ReactNode
  // Top section (call meta)
  title?: string
  titleIconSrc?: string
  fromLabel?: string
  fromNumber?: string
  toLabel?: string
  toNumber?: string
  dateTime?: string
  duration?: string
  // Middle section (contact details)
  contactName?: string
  contactRole?: string
  contactPhone?: string
  contactEmail?: string
  // Bottom section (company)
  companyLabel?: string
  companyName?: string
  websiteText?: string
  websiteUrl?: string
  websiteIconSrc?: string
  // Modal props
  modal?: boolean
  isOpen?: boolean
  onClose?: () => void
  // New: to drive the Call Result badge and conditional content
  callOutcome?: string | null
  callHistoryId?: string | null
  className?: string
}

/**
 * CallLogsPopup
 * - White rectangle 803x583px
 * - 1px border with #003333 at 10% opacity
 * - 10px border radius
 */
export default function CallLogsPopup({
  className,
  children,
  // top defaults
  title = "Outbound Call",
  titleIconSrc = "/outgoing-call-arrow.svg",
  fromLabel = "From",
  fromNumber = "+1 856-677-5996",
  toLabel = "To",
  toNumber = "+1 813-944-3044",
  dateTime = "07/09/2025, 05:45:59 AM",
  duration = "00:34",
  // middle defaults
  contactName = "Royce Bowman",
  contactRole = "Business Owner",
  contactPhone = "+1 813-944-3044",
  contactEmail = "royce@bowman.com",
  // bottom defaults
  companyLabel = "COMPANY",
  companyName = "Bowman Threapy LLC",
  websiteText = "bowman.com",
  websiteUrl = "https://bowman.com",
  websiteIconSrc = "/website-link-icon.svg",
  modal = false,
  isOpen = true,
  onClose,
  callOutcome = null,
  callHistoryId = null,
}: CallLogsPopupProps) {
  const base = "bg-white rounded-[10px] border w-[803px] h-[583px] border-[#0033331a]"
  const containerClass = [base, "p-[30px]", typeof className === "string" ? className : ""].filter(Boolean).join(" ")
  // Determine if Call Result should auto-expand based on outcome
  const shouldResultExpand = React.useMemo(() => {
    const o = String(callOutcome || '').toLowerCase()
    return o === 'not-interested' || o === 'callback' || o === 'meeting-scheduled'
  }, [callOutcome])

  // Single-expanded accordion state. Default depends on callOutcome.
  const initialPanel: "result" | "notes" | "recording" | "transcription" | "summary" | "suggestions" =
    shouldResultExpand ? "result" : "notes"
  const [activePanel, setActivePanel] = React.useState<
    "result" | "notes" | "recording" | "transcription" | "summary" | "suggestions"
  >(initialPanel)
  // Close on ESC when used as a modal
  React.useEffect(() => {
    if (!(modal && isOpen)) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [modal, isOpen, onClose])
  // When opening as a modal or when outcome changes, reset default expanded panel
  React.useEffect(() => {
    if (modal && isOpen) {
      setActivePanel(shouldResultExpand ? 'result' : 'notes')
    }
  }, [modal, isOpen, shouldResultExpand])

  // Load notes and recording fields for this call history row (if id provided)
  const [notesText, setNotesText] = React.useState<string>("")
  const [recordingUrl, setRecordingUrl] = React.useState<string | null>(null)
  const [recordingAvailable, setRecordingAvailable] = React.useState<boolean>(false)
  const [recordingDuration, setRecordingDuration] = React.useState<number | undefined>(undefined)
  const [recordingSignedUrl, setRecordingSignedUrl] = React.useState<string | null>(null)
  // Transcription state
  const [transcriptionText, setTranscriptionText] = React.useState<string>("")
  const [transcriptionUsed, setTranscriptionUsed] = React.useState<number>(0)
  const [transcriptionLimit, setTranscriptionLimit] = React.useState<number>(0)
  const [isGeneratingTranscription, setIsGeneratingTranscription] = React.useState<boolean>(false)
  // AI Summary state
  const [callSummaryText, setCallSummaryText] = React.useState<string>("")
  const [isGeneratingCallSummary, setIsGeneratingCallSummary] = React.useState<boolean>(false)
  // AI Suggestions state
  const [aiSuggestionsText, setAiSuggestionsText] = React.useState<string>("")
  const [isGeneratingAISuggestions, setIsGeneratingAISuggestions] = React.useState<boolean>(false)
  const [suggestionsUsed, setSuggestionsUsed] = React.useState<number>(0)
  const [suggestionsLimit, setSuggestionsLimit] = React.useState<number>(0)
  // Call type for header (outgoing/incoming/missed)
  const [callType, setCallType] = React.useState<string>("")
  // Left panel state (defaults to props, then hydrated from DB)
  const [hdrFromNumber, setHdrFromNumber] = React.useState<string>(fromNumber)
  const [hdrToNumber, setHdrToNumber] = React.useState<string>(toNumber)
  const [hdrDateTime, setHdrDateTime] = React.useState<string>(dateTime)
  const [hdrDurationText, setHdrDurationText] = React.useState<string>(duration)
  const [ctName, setCtName] = React.useState<string>(contactName)
  const [ctRole, setCtRole] = React.useState<string>(contactRole)
  const [ctPhone, setCtPhone] = React.useState<string>(contactPhone)
  const [ctEmail, setCtEmail] = React.useState<string>(contactEmail)
  const [coName, setCoName] = React.useState<string>(companyName)
  const [siteText, setSiteText] = React.useState<string>(websiteText)
  const [siteUrl, setSiteUrl] = React.useState<string>(websiteUrl)

  const formatDateTime = (iso?: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d)
    } catch {
      return iso ?? ''
    }
  }
  const formatDuration = (secs?: number | null) => {
    const s = Math.max(0, Math.floor(secs || 0))
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${m}:${r.toString().padStart(2, '0')}`
  }
  React.useEffect(() => {
    const loadNotes = async () => {
      setNotesText("")
      setRecordingUrl(null)
      setRecordingAvailable(false)
      setRecordingDuration(undefined)
      setRecordingSignedUrl(null)
      setTranscriptionText("")
      const id = callHistoryId ? String(callHistoryId) : ""
      if (!id) return
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('call_history')
          .select('notes, recording_url, recording_available, duration, transcription, ai_summary, ai_suggestions, type, contact_id, contact_name, contact_phone, contact_email, contact_position, contact_company, contact_website, started_at, ended_at, from_phone')
          .eq('id', id)
          .maybeSingle()
        if (error) throw error
        setNotesText((data?.notes as string) || "")
        setRecordingUrl((data?.recording_url as string) || null)
        setRecordingAvailable(Boolean(data?.recording_available))
        setRecordingDuration(typeof data?.duration === 'number' ? (data?.duration as number) : undefined)
        setTranscriptionText((data?.transcription as string) || "")
        setCallSummaryText((data?.ai_summary as string) || "")
        setCallType(String((data as any)?.type || ""))
        // Header values
        const started = (data as any)?.started_at as string | null
        const ended = (data as any)?.ended_at as string | null
        const durNum = typeof data?.duration === 'number' ? (data?.duration as number) : (started && ended ? Math.max(0, Math.floor((new Date(ended).getTime() - new Date(started).getTime()) / 1000)) : 0)
        if (started) setHdrDateTime(formatDateTime(started))
        setHdrDurationText(formatDuration(durNum))
        setHdrFromNumber(((data as any)?.from_phone as string) || hdrFromNumber)
        setHdrToNumber(((data as any)?.contact_phone as string) || hdrToNumber)
        // Contact values from call_history
        const chName = ((data as any)?.contact_name as string) || ''
        const chRole = ((data as any)?.contact_position as string) || ''
        const chPhone = ((data as any)?.contact_phone as string) || ''
        const chEmail = ((data as any)?.contact_email as string) || ''
        const chCompany = ((data as any)?.contact_company as string) || ''
        const chWebsite = ((data as any)?.contact_website as string) || ''
        if (chName) setCtName(chName)
        if (chRole) setCtRole(chRole)
        if (chPhone) setCtPhone(chPhone)
        if (chEmail) setCtEmail(chEmail)
        if (chCompany) setCoName(chCompany)
        if (chWebsite) {
          setSiteText(chWebsite.replace(/^https?:\/\//, ''))
          setSiteUrl(/^https?:\/\//.test(chWebsite) ? chWebsite : `https://${chWebsite}`)
        }
        // Format existing AI suggestions array into bullet list text
        try {
          const rawSuggestions = (data as any)?.ai_suggestions as Array<{ title?: string; description?: string; category?: string }> | null
          if (Array.isArray(rawSuggestions) && rawSuggestions.length > 0) {
            const formatted = rawSuggestions
              .map((s, idx) => {
                const title = s?.title ? `• ${s.title}` : null
                const desc = s?.description ? `  - ${s.description}` : null
                const cat = s?.category ? `  (${s.category})` : null
                return [title, [desc, cat].filter(Boolean).join(' ')].filter(Boolean).join('\n')
              })
              .join('\n')
            setAiSuggestionsText(`Suggestions:\n${formatted}`)
          } else {
            setAiSuggestionsText("")
          }
        } catch {
          setAiSuggestionsText("")
        }

        // Attempt to resolve storage location from public.recordings table
        const { data: rec, error: recErr } = await supabase
          .from('recordings')
          .select('storage_bucket, storage_path, duration')
          .eq('call_history_id', id)
          .maybeSingle()
        if (!recErr && rec && rec.storage_bucket && rec.storage_path) {
          const { data: signed, error: signErr } = await supabase
            .storage
            .from(rec.storage_bucket as string)
            .createSignedUrl(rec.storage_path as string, 60 * 10) // 10 minutes
          if (!signErr && signed?.signedUrl) {
            setRecordingSignedUrl(signed.signedUrl)
            if (!recordingDuration && typeof rec.duration === 'number') setRecordingDuration(rec.duration as number)
            setRecordingAvailable(true)
          }
        }
        // If some contact fields are still missing, try to hydrate from contacts table (prefer contact_id; fallback to phone)
        try {
          const contactId = (data as any)?.contact_id as number | null
          if (contactId) {
            const { data: c } = await supabase
              .from('contacts')
              .select('id, name, position, phone, email, company, website')
              .eq('id', contactId)
              .single()
            if (c) {
              if (!chName && c.name) setCtName(c.name as string)
              if (!chRole && c.position) setCtRole(c.position as string)
              if (!chPhone && c.phone) setCtPhone(c.phone as string)
              if (!chEmail && c.email) setCtEmail(c.email as string)
              if (!chCompany && c.company) setCoName(c.company as string)
              if (!chWebsite && c.website) {
                const wt = (c.website as string)
                setSiteText(wt.replace(/^https?:\/\//, ''))
                setSiteUrl(/^https?:\/\//.test(wt) ? wt : `https://${wt}`)
              }
            }
          } else {
            const phone = chPhone || ((data as any)?.contact_phone as string) || ''
            if (phone && (!chRole || !chEmail || !chCompany || !chWebsite)) {
              const { data: c } = await supabase
                .from('contacts')
                .select('name, position, phone, email, company, website')
                .eq('phone', phone)
                .limit(1)
                .maybeSingle()
              if (c) {
                if (!chName && c.name) setCtName(c.name as string)
                if (!chRole && c.position) setCtRole(c.position as string)
                if (!chPhone && c.phone) setCtPhone(c.phone as string)
                if (!chEmail && c.email) setCtEmail(c.email as string)
                if (!chCompany && c.company) setCoName(c.company as string)
                if (!chWebsite && c.website) {
                  const wt = (c.website as string)
                  setSiteText(wt.replace(/^https?:\/\//, ''))
                  setSiteUrl(/^https?:\/\//.test(wt) ? wt : `https://${wt}`)
                }
              }
            }
          }
        } catch {}

        // Load transcription usage and limits (mirror calling page)
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: subscription } = await supabase
              .from('user_subscriptions')
              .select('package_id')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .single()
            if (subscription?.package_id) {
              const { data: packageType } = await supabase
                .from('package_types')
                .select('max_transcription_access, max_call_suggestions_generations')
                .eq('id', subscription.package_id)
                .single()
              const limit = packageType?.max_transcription_access || 0
              const suggestionsMax = packageType?.max_call_suggestions_generations || 0
              const currentDate = new Date()
              const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
              const { data: usageData } = await supabase
                .from('user_ai_usage_tracking')
                .select('id')
                .eq('user_id', user.id)
                .eq('action_type', 'transcription_processing')
                .gte('created_at', startOfMonth.toISOString())
              const used = usageData?.length || 0
              setTranscriptionUsed(used)
              setTranscriptionLimit(limit)
              // Load suggestions usage
              const { data: suggUsage } = await supabase
                .from('user_ai_usage_tracking')
                .select('id')
                .eq('user_id', user.id)
                .eq('action_type', 'call_suggestions_generation')
                .gte('created_at', startOfMonth.toISOString())
              setSuggestionsUsed(suggUsage?.length || 0)
              setSuggestionsLimit(suggestionsMax)
            }
          }
        } catch {}
      } catch (e) {
        // Silent fail; keep empty
        setNotesText("")
        setRecordingUrl(null)
        setRecordingAvailable(false)
        setRecordingDuration(undefined)
        setRecordingSignedUrl(null)
        setTranscriptionText("")
      }
    }
    loadNotes()
  }, [callHistoryId])

  // Handler to generate/copy transcription using usage limits
  const handleGenerateTranscription = React.useCallback(async () => {
    const id = callHistoryId ? String(callHistoryId) : ""
    if (!id) return
    if (transcriptionText && transcriptionText.trim().length > 0) return
    setIsGeneratingTranscription(true)
    try {
      const supabase = createClient()
      // Check subscription & limits
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setIsGeneratingTranscription(false); return }
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('package_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      if (!subscription?.package_id) { setIsGeneratingTranscription(false); return }
      const { data: packageType } = await supabase
        .from('package_types')
        .select('max_transcription_access')
        .eq('id', subscription.package_id)
        .single()
      const limit = packageType?.max_transcription_access || 0
      const currentDate = new Date()
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const { data: usageData } = await supabase
        .from('user_ai_usage_tracking')
        .select('id')
        .eq('user_id', user.id)
        .eq('action_type', 'transcription_processing')
        .gte('created_at', startOfMonth.toISOString())
      const used = usageData?.length || 0
      if (used >= limit) { setIsGeneratingTranscription(false); return }
      // Register usage row
      await supabase
        .from('user_ai_usage_tracking')
        .insert({ user_id: user.id, action_type: 'transcription_processing', metadata: { call_history_id: id } })
      setTranscriptionUsed(used + 1)
      setTranscriptionLimit(limit)

      // Get transcription text from recordings
      const { data: rec, error: recErr } = await supabase
        .from('recordings')
        .select('transcription_text')
        .eq('call_history_id', id)
        .maybeSingle()
      if (recErr) throw recErr
      const t = (rec?.transcription_text as string) || ""
      if (!t) {
        setIsGeneratingTranscription(false)
        return
      }
      // Copy into call_history.transcription
      const { error: upErr } = await supabase
        .from('call_history')
        .update({ transcription: t })
        .eq('id', id)
      if (upErr) throw upErr
      setTranscriptionText(t)
    } catch (e) {
      // noop for now
    } finally {
      setIsGeneratingTranscription(false)
    }
  }, [callHistoryId, transcriptionText])

  // Handler to generate AI Call Summary
  const handleGenerateCallSummary = React.useCallback(async () => {
    const id = callHistoryId ? String(callHistoryId) : ""
    if (!id) return
    if (!transcriptionText || transcriptionText.trim().length === 0) return
    setIsGeneratingCallSummary(true)
    try {
      // Compose payload similar to protected calling page
      const payload = {
        transcription: transcriptionText,
        contactName: contactName,
        contactCompany: companyName,
        contactPosition: contactRole,
        requestType: 'call_summary',
      }
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const supabase = createClient()
      if (response.ok) {
        const result = await response.json()
        const summaryText = `CALL SUMMARY:\n• ${result.summary || `Spoke with ${contactName} from ${companyName}`}
\n${result.pain_points && result.pain_points.length > 0 ? `PAIN POINTS IDENTIFIED:\n${result.pain_points.map((p: any) => `• ${p}`).join('\n')}\n\n` : ''}${result.solutions && result.solutions.length > 0 ? `SOLUTION PRESENTED:\n${result.solutions.map((s: any) => `• ${s}`).join('\n')}\n\n` : ''}${result.next_steps && result.next_steps.length > 0 ? `AGREEMENTS & NEXT STEPS:\n${result.next_steps.map((s: any) => `• ${s}`).join('\n')}\n\n` : ''}CUSTOMER SENTIMENT:\n• ${result.sentiment || 'Engagement level noted'}\n• Decision maker: ${contactRole || 'Role to be confirmed'}\n${result.timeline ? `• ${result.timeline}` : ''}
\n${result.follow_up_actions && result.follow_up_actions.length > 0 ? `FOLLOW-UP ACTIONS:\n${result.follow_up_actions.map((a: any) => `• ${a}`).join('\n')}\n\n` : ''}CALL OUTCOME: ${result.outcome || 'Call completed successfully'}`

        // Save to DB
        await supabase
          .from('call_history')
          .update({ ai_summary: summaryText, ai_analysis_generated_at: new Date().toISOString() })
          .eq('id', id)
        setCallSummaryText(summaryText)
      } else {
        // Fallback basic summary
        const basicSummary = `CALL SUMMARY:\n• Spoke with ${contactName} from ${companyName}\n\nCONTACT INFORMATION:\n• Name: ${contactName}\n• Company: ${companyName}\n• Position: ${contactRole || 'Not specified'}\n\nCALL OUTCOME: Call completed - transcription available for detailed review`
        await supabase
          .from('call_history')
          .update({ ai_summary: basicSummary, ai_analysis_generated_at: new Date().toISOString() })
          .eq('id', id)
        setCallSummaryText(basicSummary)
      }
    } catch (e) {
      try {
        const supabase = createClient()
        const errorSummary = `CALL SUMMARY:\n• Spoke with ${contactName} from ${companyName}\n\nCONTACT INFORMATION:\n• Name: ${contactName}\n• Company: ${companyName}\n• Position: ${contactRole || 'Not specified'}\n\nERROR: Could not generate AI summary - manual review of transcription recommended.`
        await supabase
          .from('call_history')
          .update({ ai_summary: errorSummary, ai_analysis_generated_at: new Date().toISOString() })
          .eq('id', id)
        setCallSummaryText(errorSummary)
      } catch {}
    } finally {
      setIsGeneratingCallSummary(false)
    }
  }, [callHistoryId, transcriptionText, contactName, companyName, contactRole])

  // Handler to generate AI Suggestions
  const handleGenerateAISuggestions = React.useCallback(async () => {
    const id = callHistoryId ? String(callHistoryId) : ""
    if (!id) return
    if (!transcriptionText || transcriptionText.trim().length === 0) return
    setIsGeneratingAISuggestions(true)
    try {
      const payload = {
        transcription: transcriptionText,
        contactName,
        contactCompany: companyName,
        contactPosition: contactRole,
        requestType: 'call_suggestions',
      }
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const supabase = createClient()
      if (response.ok) {
        const result = await response.json()
        const suggestionsArray = Array.isArray(result.suggestions) ? result.suggestions : []
        // Save array to DB and timestamp
        await supabase
          .from('call_history')
          .update({
            ai_suggestions: suggestionsArray,
            ai_suggestions_generated_at: new Date().toISOString(),
          })
          .eq('id', id)
        // Format to text for UI
        if (suggestionsArray.length > 0) {
          const formatted = suggestionsArray
            .map((s: any) => {
              const title = s?.title ? `• ${s.title}` : null
              const desc = s?.description ? `  - ${s.description}` : null
              const cat = s?.category ? `  (${s.category})` : null
              return [title, [desc, cat].filter(Boolean).join(' ')].filter(Boolean).join('\n')
            })
            .join('\n')
          setAiSuggestionsText(`Suggestions:\n${formatted}`)
        } else {
          setAiSuggestionsText('')
        }
        // Register usage after success
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase
              .from('user_ai_usage_tracking')
              .insert({ user_id: user.id, action_type: 'call_suggestions_generation', metadata: { call_history_id: id } })
            // Refresh monthly usage numbers
            const currentDate = new Date()
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
            const { data: suggUsage } = await supabase
              .from('user_ai_usage_tracking')
              .select('id')
              .eq('user_id', user.id)
              .eq('action_type', 'call_suggestions_generation')
              .gte('created_at', startOfMonth.toISOString())
            setSuggestionsUsed(suggUsage?.length || 0)
          }
        } catch {}
      } else {
        // On failure, set a minimal helpful default text but do not record usage
        setAiSuggestionsText('Suggestions:\n• Review the transcription and send a tailored follow-up email.\n• Propose next steps aligned with discussed pain points.')
      }
    } catch (e) {
      setAiSuggestionsText('')
    } finally {
      setIsGeneratingAISuggestions(false)
    }
  }, [callHistoryId, transcriptionText, contactName, companyName, contactRole])

  // If used as modal and closed, render nothing
  if (modal && !isOpen) return null

  const content = (
    <div className={containerClass}>
      <div className="h-full flex">
        {/* Left sidebar container */}
        <div className="h-full w-[280px] border border-[#0033331a] rounded-[5px] flex flex-col overflow-hidden">
          <div className="flex-1 py-[20px] px-[30px]">
            <div>
              {/* Title with up-right arrow */}
              <div className="flex items-center gap-2 mb-[5px]">
                {(() => {
                  const t = String(callType || '').toLowerCase()
                  let icon = titleIconSrc
                  let label = title
                  let color = "text-emerald-700"
                  if (t === "missed_call") {
                    icon = "/missed-call-icon.svg"
                    label = "Missed Call"
                    color = "text-[#FF0000]"
                  } else if (t === "incoming_call") {
                    icon = "/incoming-call-arrow.svg"
                    label = "Incoming Call"
                    color = "text-[#2563EB]"
                  } else if (t === "outgoing_call") {
                    icon = "/outgoing-call-arrow.svg"
                    label = "Outgoing Call"
                    color = "text-emerald-700"
                  }
                  return (
                    <>
                      <Image src={icon} alt={label} width={15} height={15} />
                      <span className={["text-[20px] font-semibold", color].join(" ")}>{label}</span>
                    </>
                  )
                })()}
              </div>

              {/* From / To rows */}
              <div className="space-y-1 mb-[10px]">
                <div className="text-[16px] font-normal text-[#253053]">
                  {fromLabel} <span className="text-emerald-700 font-semibold">{hdrFromNumber}</span>
                </div>
                <div className="text-[16px] font-normal text-[#253053]">
                  {toLabel} <span className="text-emerald-700 font-semibold">{hdrToNumber}</span>
                </div>
              </div>

              {/* DateTime and Duration pills */}
              <div className="space-y-2">
                <div className="inline-flex items-center rounded-[5px] border border-[#0033331a] bg-[#F4F6F6] px-3 py-1 text-[16px] text-[#253053]">
                  {hdrDateTime}
                </div>
                <div className="inline-flex items-center rounded-[5px] border border-[#0033331a] bg-[#F4F6F6] px-3 py-1 text-[16px] text-[#253053]">
                  Duration: {hdrDurationText}
                </div>
              </div>
            </div>
          </div>
          <div className="border-y border-[#0033331a] flex-1 py-[20px] px-[10px]">
            <div className="h-full w-full bg-white/0 px-5">
              <div className="">
                <div className="text-[19.2px] font-semibold text-[#0f3b3b]">{ctName}</div>
                <div className="text-[16px] text-[#0f3b3b]/80">{ctRole}</div>
                <div className="text-[16px] font-semibold text-emerald-700">{ctPhone}</div>
                <a
                  href={`mailto:${ctEmail}`}
                  className="inline-flex items-center gap-2 text-[16px] text-[#003333] underline hover:text-[#056966] focus:text-[#056966] active:text-[#056966]"
                  title="Send email"
                >
                  <span>{ctEmail}</span>
                  <Image src="/email-icon.svg" alt="Email" width={18} height={18} />
                </a>
              </div>
            </div>
          </div>
          <div className="flex-1 py-[20px] px-[30px]">
            <div className="">
              <div className="text-[12px] font-semibold tracking-[0.08em] text-[#0f3b3b] opacity-80">{companyLabel}</div>
              <div className="text-[16px] font-semibold text-[#0f3b3b]">{coName}</div>
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[16px] text-[#0f3b3b] underline hover:text-[#056966] focus:text-[#056966] active:text-[#056966]"
                title="Open website"
              >
                <span>{siteText}</span>
                <Image src={websiteIconSrc} alt="Open website" width={16} height={16} />
              </a>
            </div>
          </div>
        </div>
        {/* Right content area */}
        <div className="flex-1 ml-4">
          <div className="pl-[0px] space-y-2">
            <CallResultToggle
              expanded={shouldResultExpand && activePanel === "result"}
              onToggle={() => {
                if (shouldResultExpand) setActivePanel('result')
              }}
              callOutcome={callOutcome ?? undefined}
              callHistoryId={callHistoryId ?? undefined}
              statusLabel={((): string => {
                const o = String(callOutcome || '').toLowerCase()
                if (!o) return '—'
                if (o === 'meeting-scheduled') return 'Meeting Scheduled'
                if (o === 'callback') return 'Callback Scheduled'
                if (o === 'not-interested') return 'Not Interested'
                if (o === 'interested') return 'Interested'
                if (o === 'positive') return 'Positive'
                if (o === 'neutral') return 'Neutral'
                if (o === 'negative') return 'Negative'
                if (o === 'no-answer') return 'No Answer'
                if (o === 'busy') return 'Busy'
                if (o === 'gatekeeper') return 'Gatekeeper'
                if (o === 'left-voicemail') return 'Left Voicemail'
                if (o === 'wrong-number') return 'Wrong Number'
                if (o === 'not-available') return 'Not Available'
                if (o === 'sold') return 'Sold'
                if (o === 'do-not-call') return 'Do Not Call'
                return '—'
              })()}
            />
            <CallNotesToggle
              expanded={activePanel === "notes"}
              onToggle={() => setActivePanel("notes")}
              notesText={notesText}
            />
            <CallRecordingToggle
              expanded={activePanel === "recording"}
              onToggle={() => setActivePanel("recording")}
              audioSrc={recordingAvailable ? (recordingSignedUrl ?? recordingUrl ?? undefined) : undefined}
              durationSec={recordingDuration}
            />
            <AITranscriptionToggle
              creditsUsed={transcriptionUsed}
              creditsTotal={transcriptionLimit}
              generating={isGeneratingTranscription}
              transcription={transcriptionText || null}
              onGenerate={handleGenerateTranscription}
              expanded={activePanel === "transcription"}
              onToggle={() => setActivePanel("transcription")}
            />
            <AISummaryToggle
              creditsUsed={transcriptionUsed}
              creditsTotal={transcriptionLimit}
              generating={isGeneratingCallSummary}
              summary={callSummaryText || null}
              onGenerate={handleGenerateCallSummary}
              expanded={activePanel === "summary"}
              onToggle={() => setActivePanel("summary")}
            />
            <AISuggestionsToggle
              creditsUsed={suggestionsUsed}
              creditsTotal={suggestionsLimit}
              generating={isGeneratingAISuggestions}
              suggestions={aiSuggestionsText || null}
              onGenerate={handleGenerateAISuggestions}
              expanded={activePanel === "suggestions"}
              onToggle={() => setActivePanel("suggestions")}
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  )

  if (!modal) return content

  // Modal overlay wrapper (match ReportAProblem overlay)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm"
        onClick={() => onClose && onClose()}
      />
      <div className="relative z-10">
        {content}
      </div>
    </div>
  )
}
