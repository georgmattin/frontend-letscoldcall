"use client"

import React, { useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type Contact = { status?: string }

export interface SessionStats {
  totalContacts: number
  contactsCompleted: number
  contactsSkipped?: number
  contactsInterested?: number
  contactsNotInterested?: number
  callbacks?: number
  meetingsScheduled?: number
  noAnswers?: number
  wrongNumbers?: number
  // Additional outcomes
  gatekeepers?: number
  positives?: number
  neutrals?: number
  negatives?: number
  busy?: number
  leftVoicemails?: number
  notAvailable?: number
  sold?: number
  doNotCall?: number
  totalCallTime: number
}

interface AnalyticsPanelProps {
  sessionStats: SessionStats
  contacts: Contact[]
  isMounted: boolean
}

export default function AnalyticsPanel({ sessionStats, contacts, isMounted }: AnalyticsPanelProps) {
  const [outcomesExpanded, setOutcomesExpanded] = useState<boolean>(true)
  const skipped = sessionStats.contactsSkipped || 0
  const completedPlusSkipped = sessionStats.contactsCompleted + skipped
  const progressPct = sessionStats.totalContacts > 0
    ? Math.min(100, (completedPlusSkipped / sessionStats.totalContacts) * 100)
    : 0

  // Conversion rate: Meetings scheduled divided by calls made
  const conversionRate = (() => {
    const calledCount = sessionStats.contactsCompleted || 0
    const meetings = sessionStats.meetingsScheduled || 0
    return calledCount > 0 ? ((meetings / calledCount) * 100).toFixed(1) : '0'
  })()

  // Positive calls: sum of key positive outcomes
  const positiveCalls = (sessionStats.contactsInterested || 0)
    + (sessionStats.positives || 0)
    + (sessionStats.meetingsScheduled || 0)

  const formatMinutesDecimal = (totalSeconds: number) => {
    const minutes = Math.max(0, (totalSeconds || 0) / 60)
    return minutes.toFixed(1)
  }

  return (
    <div style={{ color: '#003333' }}>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium" style={{ fontSize: '16px', color: '#003333' }}>
            Progress: {completedPlusSkipped} of {sessionStats.totalContacts} contacts
          </span>
          <span style={{ fontSize: '16px', color: '#003333' }}>
            {`${Math.round(progressPct)}% Complete`}
          </span>
        </div>
        <div
          className="w-full rounded-full"
          style={{ backgroundColor: '#ECFDF5', height: '10px' }}
        >
          <div
            className="rounded-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              backgroundColor: '#059669',
              height: '10px',
            }}
          />
        </div>
      </div>

      {/* Statistics Cards (designed similar to analytics-item.tsx) */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        {/* Total Calls */}
        <div className="bg-white" style={{ border: '1px solid rgba(0, 51, 51, 0.1)', borderRadius: '6px', padding: '30px 30px 20px' }}>
          <div className="font-bold text-center" style={{ color: '#003333', fontSize: '36px' }}>
            {sessionStats.contactsCompleted || 0}
          </div>
          <div className="text-sm text-center" style={{ color: '#003333' }}>Total Calls</div>
        </div>

        {/* Total Call Time */}
        <div className="bg-white" style={{ border: '1px solid rgba(0, 51, 51, 0.1)', borderRadius: '6px', padding: '30px 30px 20px' }}>
          <div className="font-bold text-center" style={{ color: '#003333', fontSize: '36px' }}>
            {formatMinutesDecimal(sessionStats.totalCallTime || 0)}
          </div>
          <div className="text-sm text-center flex items-center justify-center gap-1" style={{ color: '#003333' }}>
            <span>Total Call Time</span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[#003333] text-[#003333] text-[12px] leading-none cursor-help bg-transparent hover:text-[#059669] hover:border-[#059669] transition-colors"
                    aria-label="Total duration in minutes for this contact list (sum of call durations)."
                    title="Total duration in minutes for this contact list (sum of call durations)."
                  >
                    ?
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-sm bg-[#003333] text-white border border-[#003333]">
                  <p>Total duration in minutes for this contact list (sum of call durations).</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Positive Calls */}
        <div className="bg-white" style={{ border: '1px solid rgba(0, 51, 51, 0.1)', borderRadius: '6px', padding: '30px 30px 20px' }}>
          <div className="font-bold text-center" style={{ color: '#003333', fontSize: '36px' }}>
            {positiveCalls}
          </div>
          <div className="text-sm text-center flex items-center justify-center gap-1" style={{ color: '#003333' }}>
            <span>Positive Calls</span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[#003333] text-[#003333] text-[12px] leading-none cursor-help bg-transparent hover:text-[#059669] hover:border-[#059669] transition-colors"
                    aria-label="Sum of positive outcomes (Interested, Positive, and Meetings Scheduled)."
                    title="Sum of positive outcomes (Interested, Positive, and Meetings Scheduled)."
                  >
                    ?
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-sm bg-[#003333] text-white border border-[#003333]">
                  <p>Sum of positive outcomes (Interested, Positive, and Meetings Scheduled).</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Skipped Calls */}
        <div className="bg-white" style={{ border: '1px solid rgba(0, 51, 51, 0.1)', borderRadius: '6px', padding: '30px 30px 20px' }}>
          <div className="font-bold text-center" style={{ color: '#003333', fontSize: '36px' }}>
            {skipped}
          </div>
          <div className="text-sm text-center" style={{ color: '#003333' }}>Skipped Calls</div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white" style={{ border: '1px solid rgba(0, 51, 51, 0.1)', borderRadius: '6px', padding: '30px 30px 20px' }}>
          <div className="font-bold text-center" style={{ color: '#003333', fontSize: '36px' }}>
            {conversionRate}%
          </div>
          <div className="text-sm text-center flex items-center justify-center gap-1" style={{ color: '#003333' }}>
            <span>Conversion Rate</span>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[#003333] text-[#003333] text-[12px] leading-none cursor-help bg-transparent hover:text-[#059669] hover:border-[#059669] transition-colors"
                    aria-label="Meetings Scheduled divided by Calls Made, as a percentage."
                    title="Meetings Scheduled divided by Calls Made, as a percentage."
                  >
                    ?
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px] text-sm bg-[#003333] text-white border border-[#003333]">
                  <p>Meetings Scheduled divided by Calls Made, as a percentage.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      {isMounted && (
        <div className="w-full">
          <div className="border rounded-lg px-4 py-2 w-full" style={{ borderColor: '#E5E7EB', borderWidth: '1px' }}>
            <div className="flex items-center justify-between py-2">
              <h4 className="text-lg font-semibold" style={{ color: '#003333' }}>Call Outcomes</h4>
              <button
                type="button"
                onClick={() => setOutcomesExpanded(v => !v)}
                className="flex items-center justify-center cursor-pointer p-1 hover:opacity-80 transition"
                aria-expanded={outcomesExpanded}
                aria-controls="call-outcomes-panel"
                aria-label={outcomesExpanded ? 'Collapse call outcomes' : 'Expand call outcomes'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 text-[#003333] transition-transform ${outcomesExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            {outcomesExpanded && (
              <div id="call-outcomes-panel" className="divide-y" style={{ borderColor: 'rgba(0, 51, 51, 0.1)' }}>
              {/* Positive-focused at top */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Meeting Scheduled</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.meetingsScheduled || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Interested</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.contactsInterested || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Positive</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.positives || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Sold</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.sold || 0}</span>
              </div>

              {/* Remaining outcomes */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Call Back Later</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.callbacks || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>No Answer</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.noAnswers || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Wrong Number</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.wrongNumbers || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Gatekeeper</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.gatekeepers || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Neutral</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.neutrals || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Negative</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.negatives || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Busy</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.busy || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Left Voicemail</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.leftVoicemails || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Not Available</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.notAvailable || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Not Interested</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.contactsNotInterested || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Do Not Call</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{sessionStats.doNotCall || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm" style={{ color: '#003333' }}>Skipped</span>
                <span className="text-sm font-semibold" style={{ color: '#003333' }}>{skipped}</span>
              </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
