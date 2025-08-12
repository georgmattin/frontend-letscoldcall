"use client"

import React from "react"
import { createClient } from "@/utils/supabase/client"
import { getOutcomeColors } from "./call-outcome-colors"

interface CallResultToggleProps {
  defaultExpanded?: boolean
  expanded?: boolean
  onToggle?: () => void
  statusLabel?: string
  heading?: string
  subheading?: string
  dateLabel?: string
  dateValue?: string
  timeLabel?: string
  timeValue?: string
  googleConnected?: boolean
  onConnect?: () => void
  // New props to drive conditional UI
  callOutcome?: string | null
  callHistoryId?: string | null
  className?: string
}

export default function CallResultToggle({
  defaultExpanded = true,
  expanded: expandedProp,
  onToggle,
  statusLabel: statusLabelProp = "Meeting Booked",
  heading: headingProp = "Meeting scheduled",
  subheading: subheadingProp = "This was automatically added to your Google Calendar",
  dateLabel: dateLabelProp = "Date",
  dateValue: dateValueProp = "07/09/2025",
  timeLabel: timeLabelProp = "Time",
  timeValue: timeValueProp = "05:45:59 AM",
  googleConnected = false,
  onConnect,
  className,
  callOutcome,
  callHistoryId,
}: CallResultToggleProps) {
  const normalizedOutcome = React.useMemo(() => String(callOutcome ?? "").toLowerCase(), [callOutcome])
  const badgeColors = React.useMemo(() => getOutcomeColors(callOutcome), [callOutcome])

  // Determine which outcomes should auto-expand and show content
  const shouldExpandByOutcome = React.useMemo(() => {
    const o = (callOutcome || "").toLowerCase()
    return o === "not-interested" || o === "callback" || o === "meeting-scheduled"
  }, [callOutcome])

  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const isExpanded = expandedProp ?? expanded
  const handleHeaderClick = onToggle ?? (() => setExpanded((e) => !e))

  // Data fetched based on outcome
  const [dateLabel, setDateLabel] = React.useState(dateLabelProp)
  const [dateValue, setDateValue] = React.useState(dateValueProp)
  const [timeLabel, setTimeLabel] = React.useState(timeLabelProp)
  const [timeValue, setTimeValue] = React.useState(timeValueProp)
  const [heading, setHeading] = React.useState(headingProp)
  const [subheading, setSubheading] = React.useState(subheadingProp)
  const [statusLabel, setStatusLabel] = React.useState(statusLabelProp)
  const [notesText, setNotesText] = React.useState<string>("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Map outcome to labels
  React.useEffect(() => {
    const o = (callOutcome || "").toLowerCase()
    if (!o) return
    if (o === "meeting-scheduled") {
      setStatusLabel("Meeting Scheduled")
      setHeading("Meeting scheduled")
    } else if (o === "callback") {
      setStatusLabel("Callback Scheduled")
      setHeading("Callback Scheduled")
    } else if (o === "not-interested") {
      setStatusLabel("Not Interested")
      setHeading("Reason")
      setSubheading("")
      setDateLabel("")
      setTimeLabel("")
    } else {
      // Other outcomes: keep default labels but we won't render expanded content by default
      setStatusLabel(statusLabelProp)
      setHeading(headingProp)
      setSubheading(subheadingProp)
      setDateLabel(dateLabelProp)
      setTimeLabel(timeLabelProp)
      setDateValue(dateValueProp)
      setTimeValue(timeValueProp)
    }
  }, [callOutcome, statusLabelProp, headingProp, subheadingProp, dateLabelProp, timeLabelProp, dateValueProp, timeValueProp])

  // Auto-set initial expanded if outcome dictates
  React.useEffect(() => {
    if (expandedProp === undefined) {
      setExpanded(shouldExpandByOutcome)
    }
  }, [shouldExpandByOutcome, defaultExpanded, expandedProp])

  // Fetch data for conditional outcomes
  React.useEffect(() => {
    const load = async () => {
      const o = (callOutcome || "").toLowerCase()
      if (!callHistoryId) return
      if (!(o === "callback" || o === "meeting-scheduled" || o === "not-interested")) return
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()
        if (o === "callback") {
          const { data, error } = await supabase
            .from("callbacks")
            .select("callback_date, callback_time, reason, notes")
            .eq("call_history_id", callHistoryId)
            .maybeSingle()
          if (error) throw error
          if (data) {
            setDateLabel("Date")
            setTimeLabel("Time")
            setDateValue(data.callback_date ?? "")
            setTimeValue(data.callback_time ?? "")
            setNotesText(data.reason || data.notes || "")
          }
        } else if (o === "meeting-scheduled") {
          const { data, error } = await supabase
            .from("meetings")
            .select("meeting_date, meeting_time, notes")
            .eq("call_history_id", callHistoryId)
            .maybeSingle()
          if (error) throw error
          if (data) {
            setDateLabel("Date")
            setTimeLabel("Time")
            setDateValue(data.meeting_date ?? "")
            setTimeValue(data.meeting_time ?? "")
            setNotesText(data.notes || "")
          }
        } else if (o === "not-interested") {
          const { data, error } = await supabase
            .from("call_history")
            .select("notes")
            .eq("id", callHistoryId)
            .maybeSingle()
          if (error) throw error
          setNotesText((data?.notes as string) || "")
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load details")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [callOutcome, callHistoryId])

  const showExpandedContent = shouldExpandByOutcome && isExpanded

  const containerClass = [
    "w-full rounded-[5px] border border-[#0033331a] bg-white",
    typeof className === "string" ? className : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={containerClass}>
      {/* Header row (no own border; outer container provides it) */}
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={handleHeaderClick}
        className="w-full h-[48px] px-4 flex items-center justify-between"
      >
        <span className="text-[18px] font-semibold text-[#0f3b3b]">Call Result</span>
        <span className="flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-[6px] px-3 py-[3px] text-[14px] font-semibold"
            style={{
              backgroundColor: badgeColors.bg,
              border: `0.5px solid ${badgeColors.border}`,
              color: badgeColors.text,
            }}
          >
            {statusLabel}
          </span>
          <svg
            className={"transition-transform duration-200 " + (isExpanded ? "rotate-180" : "rotate-0")}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" stroke="#0f3b3b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {/* Expanded content inside the same bordered container */}
      {showExpandedContent && (
        <div className="px-4 pb-4 pt-0">
          <div className="rounded-[5px] border border-[#0033331a] bg-white p-4">
            <div className="text-[18px] font-semibold text-[#0f3b3b]">{heading}</div>
            {/* Subtitle for scheduled items */}
            {(normalizedOutcome.includes("meeting") || normalizedOutcome.includes("callback")) && (
              googleConnected ? (
                <div className="text-[14px] text-[#0f3b3b]/80 mt-1">{subheading}</div>
              ) : (
                <div className="text-[14px] text-[#0f3b3b]/80 mt-1 flex items-center gap-2">
                  <span>Connect Google account to add it to calendar.</span>
                  <button
                    type="button"
                    onClick={onConnect}
                    className="font-semibold text-emerald-700 underline decoration-emerald-700 decoration-2 underline-offset-2 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 rounded"
                  >
                    Connect
                  </button>
                </div>
              )
            )}

            {/* Loading / Error */}
            {loading && (
              <div className="mt-2 text-[14px] text-[#0f3b3b]/80">Loading…</div>
            )}
            {error && (
              <div className="mt-2 text-[14px] text-red-600">{error}</div>
            )}

            {/* Date / Time pills for scheduled outcomes */}
            {(normalizedOutcome.includes("meeting") || normalizedOutcome.includes("callback")) && (
              <div className="mt-3 flex items-center gap-2">
                {!!dateLabel && (
                  <span className="inline-flex items-center rounded-[5px] border border-[#0033331a] bg-[#F4F6F6] px-3 py-1 text-[14px] text-[#253053]">
                    {dateLabel} {dateValue}
                  </span>
                )}
                {!!timeLabel && (
                  <span className="inline-flex items-center rounded-[5px] border border-[#0033331a] bg-[#F4F6F6] px-3 py-1 text-[14px] text-[#253053]">
                    {timeLabel} {timeValue}
                  </span>
                )}
              </div>
            )}

            {/* Not interested reason */}
            {normalizedOutcome === "not-interested" && (
              <div className="mt-3">
                <label className="block text-[14px] text-[#0f3b3b]/80 mb-1">Reason</label>
                <textarea
                  className="w-full min-h-[80px] rounded-[6px] border border-[#0033331a] bg-white p-2 text-[14px] text-[#253053]"
                  value={notesText}
                  placeholder="Reason provided"
                  readOnly
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
