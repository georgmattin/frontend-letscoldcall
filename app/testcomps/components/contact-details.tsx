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

interface ContactDetailsProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  // Identifiers to load data
  contactId?: string | number
  listId?: string | number
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
  // Call history row (right panel, logs view)
  historyIconSrc?: string
  historyLabel?: string
  historyDateTime?: string
  historyDuration?: string
  // Modal props
  modal?: boolean
  isOpen?: boolean
  onClose?: () => void
}

/**
 * ContactDetails
 * Duplicated from CallLogsPopup but exported under a new name.
 * - White rectangle 803x583px
 * - 1px border with #003333 at 10% opacity
 * - 10px border radius
 */
export default function ContactDetails({
  children,
  contactId,
  listId,
  // call meta defaults
  title = "Outbound call",
  titleIconSrc = "/phone-solid.svg",
  fromLabel = "From",
  fromNumber = "+372 5810 0343",
  toLabel = "To",
  toNumber = "+1 813-944-3044",
  dateTime = "07/09/2025, 05:45:59 AM",
  duration = "00:34",
  // middle defaults (empty so we don't show placeholders)
  contactName = "",
  contactRole = "",
  contactPhone = "",
  contactEmail = "",
  // bottom defaults
  companyLabel = "COMPANY",
  companyName = "",
  websiteText = "",
  websiteUrl = "",
  websiteIconSrc = "/website-link-icon.svg",
  // history row defaults
  historyIconSrc = "/outgoing-call-arrow.svg",
  historyLabel = "Outgoing",
  historyDateTime = "07/09/2025, 05:45:59 AM",
  historyDuration = "00:34",
  modal = false,
  isOpen = true,
  onClose,
  className,
  ...rest
}: ContactDetailsProps) {
  const base = "bg-white rounded-[10px] border w-[803px] border-[#0033331a]"
  // Single-expanded accordion state. Default to Call Result open.
  const [activePanel, setActivePanel] = React.useState<string>("result")
  const [showCallDetails, setShowCallDetails] = React.useState(false)
  const [logs, setLogs] = React.useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = React.useState(false)
  const [logsError, setLogsError] = React.useState<string | null>(null)
  const [selectedLog, setSelectedLog] = React.useState<any | null>(null)
  const [recordingSignedUrl, setRecordingSignedUrl] = React.useState<string | null>(null)
  // Transcription state
  const [transcriptionText, setTranscriptionText] = React.useState<string>("")
  const [transcriptionUsed, setTranscriptionUsed] = React.useState<number>(0)
  const [transcriptionLimit, setTranscriptionLimit] = React.useState<number>(0)
  const [isGeneratingTranscription, setIsGeneratingTranscription] = React.useState<boolean>(false)
  // Local state for left sidebar contact info (initialized from props)
  const [lsName, setLsName] = React.useState(contactName)
  const [lsRole, setLsRole] = React.useState(contactRole)
  const [lsPhone, setLsPhone] = React.useState(contactPhone)
  const [lsEmail, setLsEmail] = React.useState(contactEmail)
  const [lsCompany, setLsCompany] = React.useState(companyName)
  const [lsWebsite, setLsWebsite] = React.useState(websiteUrl)
  // AI Summary state
  const [callSummaryText, setCallSummaryText] = React.useState<string>("")
  const [isGeneratingCallSummary, setIsGeneratingCallSummary] = React.useState<boolean>(false)
  // AI Suggestions state
  const [aiSuggestionsText, setAiSuggestionsText] = React.useState<string>("")
  const [isGeneratingAISuggestions, setIsGeneratingAISuggestions] = React.useState<boolean>(false)
  const [suggestionsUsed, setSuggestionsUsed] = React.useState<number>(0)
  const [suggestionsLimit, setSuggestionsLimit] = React.useState<number>(0)

  // When a log is selected, attempt to generate a signed URL from storage
  React.useEffect(() => {
    const run = async () => {
      setRecordingSignedUrl(null)
      const id = selectedLog?.id ? String(selectedLog.id) : ""
      if (!id) return
      try {
        const supabase = createClient()
        // Load transcription from call_history row
        try {
          const { data: ch, error: chErr } = await supabase
            .from('call_history')
            .select('transcription, ai_summary, ai_suggestions')
            .eq('id', id)
            .maybeSingle()
          if (!chErr) {
            setTranscriptionText((ch?.transcription as string) || "")
            setCallSummaryText((ch?.ai_summary as string) || "")
            // format existing suggestions array if present
            try {
              const raw = (ch as any)?.ai_suggestions as Array<{ title?: string; description?: string; category?: string }> | null
              if (Array.isArray(raw) && raw.length > 0) {
                const formatted = raw
                  .map((s) => {
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
          }
        } catch {}
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
          }
        }
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
              const suggMax = packageType?.max_call_suggestions_generations || 0
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
              // suggestions usage
              const { data: suggUsage } = await supabase
                .from('user_ai_usage_tracking')
                .select('id')
                .eq('user_id', user.id)
                .eq('action_type', 'call_suggestions_generation')
                .gte('created_at', startOfMonth.toISOString())
              setSuggestionsUsed(suggUsage?.length || 0)
              setSuggestionsLimit(suggMax)
            }
          }
        } catch {}
      } catch (e) {
        setRecordingSignedUrl(null)
      }
    }
    run()
  }, [selectedLog?.id])

  const handleGenerateTranscription = React.useCallback(async () => {
    const id = selectedLog?.id ? String(selectedLog.id) : ""
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
      const supabase2 = createClient()
      const { data: rec, error: recErr } = await supabase2
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
      const { error: upErr } = await supabase
        .from('call_history')
        .update({ transcription: t })
        .eq('id', id)
      if (upErr) throw upErr
      setTranscriptionText(t)
    } catch (e) {
      // noop
    } finally {
      setIsGeneratingTranscription(false)
    }
  }, [selectedLog?.id, transcriptionText])

  // Handler to generate AI Call Summary for selected log
  const handleGenerateCallSummary = React.useCallback(async () => {
    const id = selectedLog?.id ? String(selectedLog.id) : ""
    if (!id) return
    if (!transcriptionText || transcriptionText.trim().length === 0) return
    setIsGeneratingCallSummary(true)
    try {
      const payload = {
        transcription: transcriptionText,
        contactName: lsName || contactName,
        contactCompany: lsCompany || companyName,
        contactPosition: lsRole || contactRole,
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
        const summaryText = `CALL SUMMARY:\n• ${result.summary || `Spoke with ${lsName || contactName} from ${lsCompany || companyName}`}
\n${result.pain_points && result.pain_points.length > 0 ? `PAIN POINTS IDENTIFIED:\n${result.pain_points.map((p: any) => `• ${p}`).join('\n')}\n\n` : ''}${result.solutions && result.solutions.length > 0 ? `SOLUTION PRESENTED:\n${result.solutions.map((s: any) => `• ${s}`).join('\n')}\n\n` : ''}${result.next_steps && result.next_steps.length > 0 ? `AGREEMENTS & NEXT STEPS:\n${result.next_steps.map((s: any) => `• ${s}`).join('\n')}\n\n` : ''}CUSTOMER SENTIMENT:\n• ${result.sentiment || 'Engagement level noted'}\n• Decision maker: ${(lsRole || contactRole) || 'Role to be confirmed'}\n${result.timeline ? `• ${result.timeline}` : ''}
\n${result.follow_up_actions && result.follow_up_actions.length > 0 ? `FOLLOW-UP ACTIONS:\n${result.follow_up_actions.map((a: any) => `• ${a}`).join('\n')}\n\n` : ''}CALL OUTCOME: ${result.outcome || 'Call completed successfully'}`

        await supabase
          .from('call_history')
          .update({ ai_summary: summaryText, ai_analysis_generated_at: new Date().toISOString() })
          .eq('id', id)
        setCallSummaryText(summaryText)
      } else {
        const basicSummary = `CALL SUMMARY:\n• Spoke with ${lsName || contactName} from ${lsCompany || companyName}\n\nCONTACT INFORMATION:\n• Name: ${lsName || contactName}\n• Company: ${lsCompany || companyName}\n• Position: ${(lsRole || contactRole) || 'Not specified'}\n\nCALL OUTCOME: Call completed - transcription available for detailed review`
        await supabase
          .from('call_history')
          .update({ ai_summary: basicSummary, ai_analysis_generated_at: new Date().toISOString() })
          .eq('id', id)
        setCallSummaryText(basicSummary)
      }
    } catch (e) {
      try {
        const supabase = createClient()
        const errorSummary = `CALL SUMMARY:\n• Spoke with ${lsName || contactName} from ${lsCompany || companyName}\n\nCONTACT INFORMATION:\n• Name: ${lsName || contactName}\n• Company: ${lsCompany || companyName}\n• Position: ${(lsRole || contactRole) || 'Not specified'}\n\nERROR: Could not generate AI summary - manual review of transcription recommended.`
        await supabase
          .from('call_history')
          .update({ ai_summary: errorSummary, ai_analysis_generated_at: new Date().toISOString() })
          .eq('id', id)
        setCallSummaryText(errorSummary)
      } catch {}
    } finally {
      setIsGeneratingCallSummary(false)
    }
  }, [selectedLog?.id, transcriptionText, lsName, lsCompany, lsRole, contactName, companyName, contactRole])

  // Handler to generate AI Suggestions for selected log
  const handleGenerateAISuggestions = React.useCallback(async () => {
    const id = selectedLog?.id ? String(selectedLog.id) : ""
    if (!id) return
    if (!transcriptionText || transcriptionText.trim().length === 0) return
    setIsGeneratingAISuggestions(true)
    try {
      const payload = {
        transcription: transcriptionText,
        contactName: lsName || contactName,
        contactCompany: lsCompany || companyName,
        contactPosition: lsRole || contactRole,
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
        await supabase
          .from('call_history')
          .update({ ai_suggestions: suggestionsArray, ai_suggestions_generated_at: new Date().toISOString() })
          .eq('id', id)
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
        // Register usage
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase
              .from('user_ai_usage_tracking')
              .insert({ user_id: user.id, action_type: 'call_suggestions_generation', metadata: { call_history_id: id } })
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
        setAiSuggestionsText('Suggestions:\n• Review the transcription and propose tailored next steps based on key pain points.')
      }
    } catch (e) {
      setAiSuggestionsText('')
    } finally {
      setIsGeneratingAISuggestions(false)
    }
  }, [selectedLog?.id, transcriptionText, lsName, lsCompany, lsRole, contactName, companyName, contactRole])

  // Determine if Call Result should auto-expand based on the selected log's outcome
  const shouldResultExpand = React.useMemo(() => {
    const o = String(selectedLog?.call_outcome || '').toLowerCase()
    return o === 'not-interested' || o === 'callback' || o === 'meeting-scheduled'
  }, [selectedLog?.call_outcome])


  // Sync local sidebar state when incoming props change
  React.useEffect(() => {
    setLsName(contactName || "")
    setLsRole(contactRole || "")
    setLsPhone(contactPhone || "")
    setLsEmail(contactEmail || "")
    setLsCompany(companyName || "")
    setLsWebsite((websiteUrl || "").trim())
  }, [contactName, contactRole, contactPhone, contactEmail, companyName, websiteUrl])

  // Normalize website URL and display (based on local lsWebsite so updates after fetch)
  const normalizedLsWebsiteUrl = React.useMemo(() => {
    const raw = (lsWebsite || "").trim()
    if (!raw) return ""
    const hasScheme = /^(https?:)?\/\//i.test(raw)
    return hasScheme ? raw : `https://${raw}`
  }, [lsWebsite])
  const websiteDisplay = React.useMemo(() => {
    const raw = (lsWebsite || "").trim()
    if (!raw) return ""
    try {
      const host = new URL(normalizedLsWebsiteUrl).hostname || ""
      return host.replace(/^www\./i, "")
    } catch {
      // Fallback: strip scheme and leading www from raw value
      return raw
        .replace(/^(https?:)?\/\//i, "")
        .replace(/^www\./i, "")
    }
  }, [normalizedLsWebsiteUrl, lsWebsite])

  // If some fields are missing, fetch full contact by ID to populate sidebar
  React.useEffect(() => {
    const loadContact = async () => {
      if (!contactId) return
      // If we already have all fields, skip fetch
      const missing = !(lsEmail && lsCompany && lsRole && lsWebsite)
      if (!missing) return
      try {
        const supabase = createClient()
        let qb = supabase
          .from('contacts')
          .select('id, name, phone, email, company, position, website')
          .eq('id', contactId)
        if (listId) {
          qb = qb.eq('contact_list_id', listId)
        }
        const { data, error } = await qb.maybeSingle()
        if (error) throw error
        if (data) {
          setLsName((prev) => prev || data.name || "")
          setLsPhone((prev) => prev || data.phone || "")
          setLsEmail((prev) => prev || data.email || "")
          setLsCompany((prev) => prev || data.company || "")
          setLsRole((prev) => prev || data.position || "")
          setLsWebsite((prev) => prev || (data.website ? String(data.website).trim() : ""))
        }
      } catch (e) {
        console.warn('Failed to load contact for sidebar', e)
      }
    }
    loadContact()
  }, [contactId, listId, lsEmail, lsCompany, lsRole, lsWebsite])

  // Debug: verify left sidebar props
  React.useEffect(() => {
    // Only log on mount or when these change
    console.log("ContactDetails props (sidebar)", {
      contactName: lsName,
      contactRole: lsRole,
      contactPhone: lsPhone,
      contactEmail: lsEmail,
      companyName: lsCompany,
      websiteUrl: lsWebsite,
      websiteDisplay,
    })
  }, [lsName, lsRole, lsPhone, lsEmail, lsCompany, lsWebsite, websiteDisplay])

  React.useEffect(() => {
    const fetchLogs = async () => {
      if (!contactId) return
      try {
        setLoadingLogs(true)
        setLogsError(null)
        const supabase = createClient()
        let query = supabase
          .from("call_history")
          .select("id, contact_id, contact_list_id, started_at, ended_at, duration, call_outcome, type, from_phone, contact_name, contact_phone, contact_company, contact_email, contact_position, recording_available, recording_url, notes, ai_summary, ai_suggestions, transcription")
          .eq("contact_id", contactId)
          .order("started_at", { ascending: false })

        if (listId) {
          query = query.eq("contact_list_id", listId)
        }

        const { data, error } = await query
        if (error) throw error
        setLogs(data || [])
      } catch (e: any) {
        console.error("Failed to load call history:", e)
        setLogsError(e?.message || "Failed to load call history")
      } finally {
        setLoadingLogs(false)
      }
    }
    fetchLogs()
  }, [contactId, listId])

  const fmtDateTime = (iso?: string) => {
    if (!iso) return "—"
    try {
      const d = new Date(iso)
      return new Intl.DateTimeFormat(undefined, {
        year: "2-digit", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      }).format(d)
    } catch {
      return iso
    }
  }

  const fmtDuration = (seconds?: number | null) => {
    if (!seconds || seconds < 0) return "00:00"
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  // Close on ESC when used as a modal
  React.useEffect(() => {
    if (!(modal && isOpen)) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [modal, isOpen, onClose])
  // If used as modal and closed, render nothing
  if (modal && !isOpen) return null

  // When entering details view or when selected log outcome changes,
  // reset the default expanded panel accordingly
  React.useEffect(() => {
    if (showCallDetails) {
      setActivePanel(shouldResultExpand ? 'result' : 'notes')
    }
  }, [showCallDetails, shouldResultExpand])

  // Determine Call Details header icon/label/color to match logs mapping
  const detailType = String(selectedLog?.type || '').toLowerCase()
  let detailIconSrc = titleIconSrc
  let detailLabel = title
  let detailTextColor = "text-emerald-700"
  if (selectedLog) {
    if (detailType === "missed_call") {
      detailIconSrc = "/missed-call-icon.svg"
      detailLabel = "Missed Call"
      detailTextColor = "text-[#FF0000]"
    } else if (detailType === "incoming_call") {
      detailIconSrc = "/incoming-call-arrow.svg"
      detailLabel = "Incoming Call"
      detailTextColor = "text-[#2563EB]"
    } else if (detailType === "outgoing_call") {
      detailIconSrc = "/outgoing-call-arrow.svg"
      detailLabel = "Outgoing Call"
      detailTextColor = "text-emerald-700"
    }
  }

  const content = (
    <div className={[base, "p-[30px]", className].filter(Boolean).join(" ")} {...rest}>
      <div className="flex">
        {/* Left sidebar container */}
        <div className="w-[280px] border border-[#0033331a] rounded-[5px] flex flex-col overflow-hidden">
          {/* When in details view, show call meta on top */}
          {showCallDetails && (
            <div className="py-[20px] px-[30px]">
              <div>
                {/* Title with up-right arrow */}
                <div className="flex items-center gap-2 mb-[5px]">
                  <Image src={detailIconSrc} alt={detailLabel} width={15} height={15} />
                  <span className={["text-[20px] font-semibold", detailTextColor].join(" ")}>{detailLabel}</span>
                </div>
                {/* From / To rows */}
                <div className="space-y-1 mb-[10px]">
                  <div className="text-[16px] font-normal text-[#253053]">
                    {fromLabel} <span className="text-emerald-700 font-semibold">{String(selectedLog?.from_phone || fromNumber)}</span>
                  </div>
                  <div className="text-[16px] font-normal text-[#253053]">
                    {toLabel} <span className="text-emerald-700 font-semibold">{String(selectedLog?.contact_phone || toNumber)}</span>
                  </div>
                </div>
                {/* DateTime and Duration pills */}
                <div className="space-y-2">
                  <div className="inline-flex items-center rounded-[5px] border border-[#0033331a] bg-[#F4F6F6] px-3 py-1 text-[16px] text-[#253053]">
                    {fmtDateTime(String(selectedLog?.started_at || ""))}
                  </div>
                  <div className="inline-flex items-center rounded-[5px] border border-[#0033331a] bg-[#F4F6F6] px-3 py-1 text-[16px] text-[#253053]">
                    Duration: {fmtDuration(typeof selectedLog?.duration === 'number' ? selectedLog?.duration : undefined)}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Contact info always visible */}
          <div className="border-y border-[#0033331a] py-[20px] px-[30px]">
            <div className="w-full bg-white/0 px-0 pr-3">
              <div className="">
                <div className="text-[19.2px] font-semibold text-[#0f3b3b] break-words whitespace-normal">{lsName}</div>
                {lsRole && (
                  <div className="text-[16px] text-[#0f3b3b]/80 break-words whitespace-normal">{lsRole}</div>
                )}
                {lsPhone && (
                  <div className="text-[16px] font-semibold text-emerald-700 break-words whitespace-normal">{lsPhone}</div>
                )}
                {lsEmail && (
                  <a
                    href={`mailto:${lsEmail}`}
                    className="block w-full pr-6 text-[14px] text-[#c1c1c1] underline hover:text-[#059669]"
                    title={lsEmail}
                  >
                    <span className="break-words break-all whitespace-normal font-normal">{lsEmail}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="py-[20px] px-[30px]">
            <div className="">
              <div className="text-[12px] font-semibold tracking-[0.08em] text-[#0f3b3b] opacity-80">{companyLabel}</div>
              {lsCompany && (
                <div className="text-[16px] font-semibold text-[#0f3b3b] break-words whitespace-normal">{lsCompany}</div>
              )}
              {lsWebsite && (
                <a
                  href={normalizedLsWebsiteUrl || `https://${(lsWebsite || '').trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full pr-6 text-[14px] text-[#c1c1c1] underline hover:text-[#059669]"
                  title={websiteDisplay || (lsWebsite || '').trim()}
                >
                  <span className="break-words break-all whitespace-normal font-normal">{websiteDisplay || (lsWebsite || '').trim()}</span>
                </a>
              )}
            </div>
          </div>
        </div>
        {/* Right content area */}
        <div className="flex-1 ml-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[23.04px] font-bold text-[#003333]">
              {showCallDetails ? "Call Details" : "Call Logs"}
            </div>
            {showCallDetails && (
              <button
                type="button"
                onClick={() => setShowCallDetails(false)}
                className="inline-flex items-center gap-2 text-[#056966] hover:underline text-[14px]"
              >
                <Image src="/back-arrow.svg" alt="Back" width={14} height={14} />
                <span>Back to logs</span>
              </button>
            )}
          </div>

          {!showCallDetails ? (
            <div className="space-y-2">
              {loadingLogs && (
                <div className="text-sm text-gray-500">Loading call history…</div>
              )}
              {logsError && (
                <div className="text-sm text-red-600">{logsError}</div>
              )}
              {!loadingLogs && !logsError && logs.length === 0 && (
                <div className="w-full flex justify-center items-start pt-4 pb-8">
                  <div className="flex flex-col items-center" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                    <Image src="/placeholder-empty.svg" alt="Empty" width={93} height={84} />
                    <h3 className="mt-2 text-[#003333] font-semibold" style={{ fontSize: '19.2px' }}>No Calls Yet</h3>
                    <p className="mt-1 text-[#003333]" style={{ fontSize: '16px' }}>Start by making some calls</p>
                  </div>
                </div>
              )}
              {!loadingLogs && !logsError && logs.map((log) => {
                const t = String(log.type || '').toLowerCase()
                let iconSrc = "/outgoing-call-arrow.svg"
                let label = "Outgoing Call"
                let textColor = "text-emerald-700"
                if (t === "missed_call") {
                  iconSrc = "/missed-call-icon.svg"
                  label = "Missed Call"
                  textColor = "text-[#FF0000]"
                } else if (t === "incoming_call") {
                  iconSrc = "/incoming-call-arrow.svg"
                  label = "Incoming Call"
                  textColor = "text-[#2563EB]"
                } else if (t === "outgoing_call") {
                  iconSrc = "/outgoing-call-arrow.svg"
                  label = "Outgoing Call"
                  textColor = "text-emerald-700"
                }
                return (
                  <div
                    key={log.id}
                    className={[
                      "w-full h-[53px]",
                      "rounded-[5px] border border-[#0033331a] hover:border-[#003333] transition-colors",
                      "bg-white",
                      "flex items-center gap-3",
                      "px-3",
                      "cursor-pointer",
                    ].join(" ")}
                    onClick={() => { setSelectedLog(log); setShowCallDetails(true); }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Image src={iconSrc} alt={label} width={15} height={15} />
                      <span className={["text-[16px] font-semibold truncate", textColor].join(" ")}>{label}</span>
                    </div>
                    <div className="inline-flex items-center rounded-[5px] border border-[#0033331a] bg-[#F4F6F6] px-3 py-1 text-[14px] text-[#253053] ml-auto">
                      {fmtDateTime(log.started_at)}
                    </div>
                    <div className="inline-flex items-center rounded-[5px] border border-[#0033331a] bg-[#F4F6F6] px-3 py-1 text-[14px] text-[#253053]">
                      {fmtDuration(log.duration)}
                    </div>
                  </div>
                )
              })}
          </div>
        ) : (
          detailType === "missed_call" ? (
            <div className="w-full flex justify-center items-start pt-4 pb-8">
              <div className="flex flex-col items-center" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                <Image src="/placeholder-empty.svg" alt="Empty" width={93} height={84} />
                <h3 className="mt-2 text-[#003333] font-semibold" style={{ fontSize: '19.2px' }}>No Details Available</h3>
                <p className="mt-1 text-[#003333]" style={{ fontSize: '16px' }}>Missed calls don't have additional details</p>
              </div>
            </div>
          ) : (
            <div className="pl-[0px] space-y-2">
              <CallResultToggle
                expanded={shouldResultExpand && activePanel === "result"}
                onToggle={() => {
                  if (shouldResultExpand) setActivePanel('result')
                }}
                callOutcome={selectedLog?.call_outcome ?? null}
                callHistoryId={selectedLog?.id ?? null}
                statusLabel={((): string => {
                  const o = String(selectedLog?.call_outcome || '').toLowerCase()
                  if (o === 'meeting-scheduled' || o === 'meeting_booked' || o === 'meeting-booked') return 'Meeting Booked'
                  if (o === 'callback' || o === 'callback_scheduled') return 'Callback Scheduled'
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
                  if (o === 'skipped') return 'Skipped'
                  return '—'
                })()}
              />
              <CallNotesToggle
                expanded={activePanel === "notes"}
                onToggle={() => setActivePanel("notes")}
                notesText={selectedLog?.notes ?? ""}
              />
              <CallRecordingToggle
                expanded={activePanel === "recording"}
                onToggle={() => setActivePanel("recording")}
                audioSrc={selectedLog?.recording_available ? (recordingSignedUrl ?? selectedLog?.recording_url ?? undefined) : undefined}
                durationSec={typeof selectedLog?.duration === 'number' ? selectedLog?.duration : undefined}
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
          )
        )}
      </div>
    </div>
  </div>
);

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
      <div className="relative z-10">{content}</div>
    </div>
  )
}
