"use client"

import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Check } from "lucide-react"
import { Open_Sans } from 'next/font/google'
import CallRecordingToggle from "@/app/testcomps/components/call-recording-toggle"

const openSans = Open_Sans({ subsets: ['latin'], weight: ['400','600'], display: 'swap' })

interface CallSummaryPanelProps {
  callEnded: boolean

  selectedOutcome: string | null
  setSelectedOutcome: (value: string) => void
  updateSessionStats: (value: string) => void
  saveCallOutcomeToDatabase: (value: string) => Promise<boolean>
  saveContactListProgress: () => Promise<void>

  // Callback states
  callbackDate: string
  setCallbackDate: (v: string) => void
  callbackTime: string
  setCallbackTime: (v: string) => void
  isSavingCallback: boolean
  setIsSavingCallback: (v: boolean) => void
  callbackSaved: boolean
  setCallbackSaved: (v: boolean) => void
  saveCallbackToDatabase: (date: string, time: string) => Promise<boolean>
  hasGoogleCalendarIntegration: boolean
  googleCalendarEmail?: string | null
  isAddingCallbackToCalendar: boolean
  setIsAddingCallbackToCalendar: (v: boolean) => void
  callbackAddedToCalendar: boolean
  setCallbackAddedToCalendar: (v: boolean) => void
  callbackAddedToGoogleCalendar: boolean

  // Meeting states
  meetingDate: string
  setMeetingDate: (v: string) => void
  meetingTime: string
  setMeetingTime: (v: string) => void
  isSavingMeeting: boolean
  setIsSavingMeeting: (v: boolean) => void
  meetingSaved: boolean
  setMeetingSaved: (v: boolean) => void
  saveMeetingToDatabase: (date: string, time: string) => Promise<boolean>
  isAddingMeetingToCalendar: boolean
  setIsAddingMeetingToCalendar: (v: boolean) => void
  meetingAddedToCalendar: boolean
  setMeetingAddedToCalendar: (v: boolean) => void
  meetingAddedToGoogleCalendar: boolean

  // Not interested reason
  notInterestedReason: string
  setNotInterestedReason: (v: string) => void
  currentCallHistoryId: string | null
  notes: string
  updateCallHistoryRecord: (id: string, payload: Record<string, any>) => Promise<boolean>

  // Optional recording info for audio player
  recordingUrl?: string | null
  recordingDurationSec?: number | null
}

export default function CallSummaryPanel(props: CallSummaryPanelProps) {
  const {
    callEnded,
    selectedOutcome,
    setSelectedOutcome,
    updateSessionStats,
    saveCallOutcomeToDatabase,
    saveContactListProgress,
    callbackDate,
    setCallbackDate,
    callbackTime,
    setCallbackTime,
    isSavingCallback,
    setIsSavingCallback,
    callbackSaved,
    setCallbackSaved,
    saveCallbackToDatabase,
    hasGoogleCalendarIntegration,
    googleCalendarEmail,
    isAddingCallbackToCalendar,
    setIsAddingCallbackToCalendar,
    callbackAddedToCalendar,
    setCallbackAddedToCalendar,
    callbackAddedToGoogleCalendar,
    meetingDate,
    setMeetingDate,
    meetingTime,
    setMeetingTime,
    isSavingMeeting,
    setIsSavingMeeting,
    meetingSaved,
    setMeetingSaved,
    saveMeetingToDatabase,
    isAddingMeetingToCalendar,
    setIsAddingMeetingToCalendar,
    meetingAddedToCalendar,
    setMeetingAddedToCalendar,
    meetingAddedToGoogleCalendar,
    notInterestedReason,
    setNotInterestedReason,
    currentCallHistoryId,
    notes,
    updateCallHistoryRecord,
  } = props

  const [showRecording, setShowRecording] = React.useState(false)

  return (
    <div className={openSans.className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="mt-2 text-[16px] font-semibold text-gray-800">Call result</span>
          {props.recordingUrl && (
            <button
              type="button"
              aria-label={showRecording ? 'Hide call recording' : 'Show call recording'}
              onClick={() => setShowRecording((s) => !s)}
              className="mt-1 h-8 w-8 rounded-[5px] border border-[#0033331a] bg-white flex items-center justify-center text-[#003333] hover:text-emerald-600 hover:border-emerald-600"
            >
              {/* Sound icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3 10v4h3l4 4V6L6 10H3z" />
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z" />
                <path d="M14 3.23v2.06c2.89 1.05 5 3.82 5 7.71s-2.11 6.66-5 7.71v2.06c4.01-1.14 7-4.93 7-9.77s-2.99-8.63-7-9.77z" />
              </svg>
            </button>
          )}
        </div>
        {selectedOutcome && (
          <div className="flex items-center justify-end gap-2 text-[#059669] text-sm">
            <Check className="w-4 h-4" />
            <span>Outcome saved</span>
          </div>
        )}
      </div>
      <div className="relative">
      <Select 
        value={selectedOutcome ?? undefined} 
        onValueChange={async (value) => {
          if (!callEnded) {
            alert('Please make a call first before selecting an outcome.')
            return
          }
          setSelectedOutcome(value)
          updateSessionStats(value)

          const success = await saveCallOutcomeToDatabase(value)
          if (success) {
            try {
              await saveContactListProgress()
            } catch (error) {
              console.error('Error auto-saving contact list progress after call outcome:', error)
            }
          }
        }}
        disabled={!callEnded}
      >
        <SelectTrigger className={`h-[50px] rounded-[5px] border text-sm pr-10 [&_svg]:hidden ${!callEnded ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-200 bg-white text-gray-900'}`}>
          <SelectValue placeholder={!callEnded ? "Make a call first" : "Select an outcome"} />
        </SelectTrigger>
        <SelectContent className={`${openSans.className} max-h-48 overflow-y-auto`}>
          {/* 1. Meeting Booked */}
          <SelectItem value="meeting-scheduled">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#ECFDF5', borderWidth: '0.5px', borderColor: '#10B981', color: '#047857' }}>Meeting Booked</div>
          </SelectItem>
          {/* 2. No Answer */}
          <SelectItem value="no-answer">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#FFF7ED', borderWidth: '0.5px', borderColor: '#FB923C', color: '#C2410C' }}>No Answer</div>
          </SelectItem>
          {/* 3. Not Interested */}
          <SelectItem value="not-interested">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#FEF2F2', borderWidth: '0.5px', borderColor: '#EF4444', color: '#B91C1C' }}>Not Interested</div>
          </SelectItem>
          {/* 4. Callback Later */}
          <SelectItem value="callback">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#EFF6FF', borderWidth: '0.5px', borderColor: '#3B82F6', color: '#1D4ED8' }}>Callback Later</div>
          </SelectItem>
          {/* 5. Gatekeeper */}
          <SelectItem value="gatekeeper">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#F5F3FF', borderWidth: '0.5px', borderColor: '#8B5CF6', color: '#6D28D9' }}>Gatekeeper</div>
          </SelectItem>
          {/* Remaining (previous relative order) */}
          <SelectItem value="interested">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#F0F9FF', borderWidth: '0.5px', borderColor: '#0EA5E9', color: '#0369A1' }}>Interested</div>
          </SelectItem>
          <SelectItem value="positive">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#F0FDF4', borderWidth: '0.5px', borderColor: '#22C55E', color: '#15803D' }}>Positive</div>
          </SelectItem>
          <SelectItem value="neutral">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#F8FAFC', borderWidth: '0.5px', borderColor: '#94A3B8', color: '#475569' }}>Neutral</div>
          </SelectItem>
          <SelectItem value="negative">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#FFF1F2', borderWidth: '0.5px', borderColor: '#F43F5E', color: '#E11D48' }}>Negative</div>
          </SelectItem>
          <SelectItem value="busy">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#FEFCE8', borderWidth: '0.5px', borderColor: '#EAB308', color: '#A16207' }}>Busy</div>
          </SelectItem>
          <SelectItem value="left-voicemail">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#FDF4FF', borderWidth: '0.5px', borderColor: '#D946EF', color: '#A21CAF' }}>Left Voicemail</div>
          </SelectItem>
          <SelectItem value="wrong-number">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#FFE4E6', borderWidth: '0.5px', borderColor: '#FB7185', color: '#BE123C' }}>Bad Number</div>
          </SelectItem>
          <SelectItem value="not-available">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#F1F5F9', borderWidth: '0.5px', borderColor: '#94A3B8', color: '#475569' }}>Not Available</div>
          </SelectItem>
          <SelectItem value="sold">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#EEF2FF', borderWidth: '0.5px', borderColor: '#6366F1', color: '#4338CA' }}>Sold</div>
          </SelectItem>
          <SelectItem value="do-not-call">
            <div className="border rounded-md px-2 py-1 text-sm" style={{ backgroundColor: '#FFF1F2', borderWidth: '0.5px', borderColor: '#F43F5E', color: '#E11D48' }}>Do Not Call</div>
          </SelectItem>
        </SelectContent>
      </Select>
      {/* Custom chevron to match navbar, overlayed over trigger */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-[#003333] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          clipRule="evenodd"
        />
      </svg>
      </div>

      {/* Call Recording */}
      {props.recordingUrl && showRecording && (
        <div className="mt-4">
          <CallRecordingToggle
            title="Call Recording"
            audioSrc={props.recordingUrl || undefined}
            durationSec={props.recordingDurationSec ?? undefined}
            defaultExpanded={false}
          />
        </div>
      )}

      {/* Callback */}
      {selectedOutcome === "callback" && (
        <div className="mt-4 p-4 rounded-lg border" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', borderWidth: '0.5px', borderColor: '#3B82F6' }}>
          <h3 className="font-semibold text-base mb-1">Schedule Callback</h3>
          <p className="text-sm mb-4">Set up a e-mail and in-app reminder to call back</p>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <input
                type="date"
                value={callbackDate}
                onChange={(e) => setCallbackDate(e.target.value)}
                className="w-full h-10 pl-10 pr-3 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ color: '#1D4ED8', colorScheme: 'light', borderWidth: '0.5px', borderColor: 'rgba(0, 51, 51, 0.1)', boxShadow: '0 0 0 0px transparent', outline: `2px solid transparent` }}
              />
              <Calendar className="absolute left-3 top-2.5 w-5 h-5 pointer-events-none" style={{ color: '#1D4ED8' }} />
            </div>
            <div className="flex-1 relative">
              <input
                type="time"
                value={callbackTime}
                onChange={(e) => setCallbackTime(e.target.value)}
                className="w-full h-10 pl-10 pr-3 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ color: '#1D4ED8', colorScheme: 'light', borderWidth: '0.5px', borderColor: 'rgba(0, 51, 51, 0.1)', boxShadow: '0 0 0 0px transparent', outline: `2px solid transparent` }}
              />
              <Clock className="absolute left-3 top-2.5 w-5 h-5 pointer-events-none" style={{ color: '#1D4ED8' }} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={async () => {
                if (!callbackDate || !callbackTime) {
                  alert('Please select both date and time for the callback')
                  return
                }
                props.setIsSavingCallback(true)
                const success = await saveCallbackToDatabase(callbackDate, callbackTime)
                props.setIsSavingCallback(false)
                if (success) {
                  setCallbackSaved(true)
                  setTimeout(() => setCallbackSaved(false), 3000)
                } else {
                  alert('Failed to schedule callback. Please try again.')
                }
              }}
              disabled={isSavingCallback || callbackSaved}
              className="w-full h-10 text-white font-medium rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#3B82F6' }}
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

            {hasGoogleCalendarIntegration ? (
              <div className="w-full flex flex-col items-center justify-center text-sm text-gray-600">
                <div>This will be automatically added to your Google Calendar</div>
                {googleCalendarEmail && <div className="text-xs text-gray-500 mt-1">({googleCalendarEmail})</div>}
              </div>
            ) : (
              <button
                onClick={async () => {
                  if (!callbackDate || !callbackTime) {
                    alert('Please select both date and time first')
                    return
                  }
                  setIsAddingCallbackToCalendar(true)
                  setTimeout(() => {
                    setIsAddingCallbackToCalendar(false)
                    setCallbackAddedToCalendar(true)
                    setTimeout(() => setCallbackAddedToCalendar(false), 3000)
                  }, 2000)
                }}
                disabled={isAddingCallbackToCalendar || callbackAddedToCalendar}
                className="w-full h-10 bg-transparent rounded-lg text-sm font-medium transition-colors hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ borderWidth: '1px', borderColor: '#003333', color: '#003333' }}
                onMouseEnter={(e) => {
                  if ((e.currentTarget as HTMLButtonElement).disabled) return
                  e.currentTarget.style.borderColor = '#3B82F6'
                  e.currentTarget.style.color = '#1D4ED8'
                }}
                onMouseLeave={(e) => {
                  if ((e.currentTarget as HTMLButtonElement).disabled) return
                  e.currentTarget.style.borderColor = '#003333'
                  e.currentTarget.style.color = '#003333'
                }}
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

      {/* Meeting */}
      {selectedOutcome === "meeting-scheduled" && (
        <div className="mt-4 p-4 rounded-lg border" style={{ backgroundColor: '#ECFDF5', color: '#047857', borderWidth: '0.5px', borderColor: '#10B981' }}>
          <h3 className="font-semibold text-base mb-1">Schedule A Meeting</h3>
          <p className="text-sm mb-4">Set up a follow-up meeting</p>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full h-10 pl-3 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ color: '#047857', colorScheme: 'light', borderWidth: '0.5px', borderColor: 'rgba(0, 51, 51, 0.1)', boxShadow: '0 0 0 0px transparent', outline: `2px solid transparent` }}
              />
              <Calendar className="absolute right-3 top-2.5 w-5 h-5 pointer-events-none" style={{ color: '#047857' }} />
            </div>
            <div className="flex-1 relative">
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full h-10 pl-3 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ color: '#047857', colorScheme: 'light', borderWidth: '0.5px', borderColor: 'rgba(0, 51, 51, 0.1)', boxShadow: '0 0 0 0px transparent', outline: `2px solid transparent` }}
              />
              <Clock className="absolute right-3 top-2.5 w-5 h-5 pointer-events-none" style={{ color: '#047857' }} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={async () => {
                if (!meetingDate || !meetingTime) {
                  alert('Please select both date and time for the meeting')
                  return
                }
                setIsSavingMeeting(true)
                const success = await saveMeetingToDatabase(meetingDate, meetingTime)
                setIsSavingMeeting(false)
                if (success) {
                  setMeetingSaved(true)
                  setTimeout(() => setMeetingSaved(false), 3000)
                } else {
                  alert('Failed to schedule meeting. Please try again.')
                }
              }}
              disabled={isSavingMeeting || meetingSaved}
              className="w-full h-10 text-white font-medium rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#10B981' }}
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

            {hasGoogleCalendarIntegration ? (
              <div className="w-full flex flex-col items-center justify-center text-sm text-gray-600">
                <div>This will be automatically added to your Google Calendar</div>
                {googleCalendarEmail && <div className="text-xs text-gray-500 mt-1">({googleCalendarEmail})</div>}
              </div>
            ) : (
              <button
                onClick={async () => {
                  if (!meetingDate || !meetingTime) {
                    alert('Please select both date and time first')
                    return
                  }
                  setIsAddingMeetingToCalendar(true)
                  setTimeout(() => {
                    setIsAddingMeetingToCalendar(false)
                    setMeetingAddedToCalendar(true)
                    setTimeout(() => setMeetingAddedToCalendar(false), 3000)
                  }, 2000)
                }}
                disabled={isAddingMeetingToCalendar || meetingAddedToCalendar}
                className="w-full h-10 bg-transparent font-medium rounded-lg text-sm transition-colors hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ borderWidth: '1px', borderColor: '#003333', color: '#003333' }}
                onMouseEnter={(e) => {
                  if ((e.currentTarget as HTMLButtonElement).disabled) return
                  e.currentTarget.style.borderColor = '#10B981'
                  e.currentTarget.style.color = '#047857'
                }}
                onMouseLeave={(e) => {
                  if ((e.currentTarget as HTMLButtonElement).disabled) return
                  e.currentTarget.style.borderColor = '#003333'
                  e.currentTarget.style.color = '#003333'
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

      {/* Not interested */}
      {selectedOutcome === "not-interested" && (
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}>
          <h3 className="font-semibold text-base mb-1">Add a reason <span className="font-normal">(optional)</span></h3>
          <p className="text-sm mb-4">Add reason for future reference</p>
          <div className="mb-4">
            <textarea
              placeholder='e.g "Already using competitor product"'
              value={notInterestedReason}
              onChange={(e) => setNotInterestedReason(e.target.value)}
              rows={4}
              className="w-full p-3 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              style={{ color: '#B91C1C', border: '1px solid #FF0000' }}
            />
          </div>
          <button
            onClick={async () => {
              if (!currentCallHistoryId) {
                alert('No call history to save reason to')
                return
              }
              const reasonNotes = notInterestedReason.trim() 
                ? `Not interested reason: ${notInterestedReason.trim()}`
                : 'Not interested (no reason provided)'
              const success = await updateCallHistoryRecord(currentCallHistoryId, {
                notes: notes.trim() ? `${notes.trim()}\n\n${reasonNotes}` : reasonNotes,
                updated_at: new Date().toISOString(),
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

      {/* Hide native date/time picker icons (black) and keep our custom icons */}
      <style jsx>{`
        /* WebKit browsers (Chrome, Edge, Safari) */
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          display: none;
          -webkit-appearance: none;
        }

        /* Remove inner spin buttons/time decorations where applicable */
        input[type="time"]::-webkit-clear-button,
        input[type="time"]::-webkit-inner-spin-button {
          display: none;
        }

        /* Firefox */
        input[type="date"],
        input[type="time"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  )
}
