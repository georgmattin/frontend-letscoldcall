'use client'

import { Button } from "@/components/ui/button"
import { Volume2 } from "lucide-react"
import { Open_Sans } from 'next/font/google'

// Fonts must be initialized at module scope
const openSans = Open_Sans({ subsets: ['latin'] })

// Import sub-components
import CallRecordingToggle from '@/app/testcomps/components/call-recording-toggle'
import NotesTab from './components/notes-tab'
import TranscriptionTab from './components/transcription-tab'
import SuggestionsTab from './components/suggestions-tab'
import SummaryTab from './components/summary-tab'
import CallSummaryPanel from './components/call-summary-panel'

interface CallNotesSectionProps {
  // Collapse state
  isNotesCollapsed: boolean
  setIsNotesCollapsed: (collapsed: boolean) => void
  
  // Tab state
  notesTab: string
  setNotesTab: (tab: string) => void
  
  // Call state
  callEnded: boolean
  
  // Audio player state
  showAudioPlayer: boolean
  setShowAudioPlayer: (show: boolean) => void
  
  // Recording state
  isLoadingRecording: boolean
  recordingError: string | null
  recordingAvailable: boolean
  recordingUrl: string | null
  recordingCurrentTime: number
  setRecordingCurrentTime: (time: number) => void
  recordingDuration: number
  setRecordingDuration: (duration: number) => void
  recordingProgress: number
  setRecordingProgress: (progress: number) => void
  isPlayingRecording: boolean
  setIsPlayingRecording: (playing: boolean) => void
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void
  
  // Notes state
  notes: string
  setNotes: (notes: string) => void
  notesSaved: boolean
  setNotesSaved: (saved: boolean) => void
  autoSaveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
  
  // AI features state
  transcription: string | null
  isGeneratingTranscript: boolean
  autoLoadAI: boolean
  setAutoLoadAI: (auto: boolean) => void
  aiSuggestions: Array<{
    title: string
    description: string
    whatToSay: string
  }>
  isLoadingAISuggestions: boolean
  callSummary: string | null
  isGeneratingCallSummary: boolean
  // Usage/credits
  transcriptionUsage?: { current: number; limit: number }
  suggestionsUsage?: { current: number; limit: number }
  summaryUsage?: { current: number; limit: number }
  
  // Call outcome state
  selectedOutcome: string
  setSelectedOutcome: (outcome: string) => void
  
  // Callback state
  callbackDate: string
  setCallbackDate: (date: string) => void
  callbackTime: string
  setCallbackTime: (time: string) => void
  isSavingCallback: boolean
  setIsSavingCallback: (saving: boolean) => void
  callbackSaved: boolean
  setCallbackSaved: (saved: boolean) => void
  isAddingCallbackToCalendar: boolean
  setIsAddingCallbackToCalendar: (adding: boolean) => void
  callbackAddedToCalendar: boolean
  setCallbackAddedToCalendar: (added: boolean) => void
  hasGoogleCalendarIntegration: boolean
  googleCalendarEmail?: string | null
  callbackAddedToGoogleCalendar: boolean
  
  // Meeting state
  meetingDate: string
  setMeetingDate: (date: string) => void
  meetingTime: string
  setMeetingTime: (time: string) => void
  isSavingMeeting: boolean
  setIsSavingMeeting: (saving: boolean) => void
  meetingSaved: boolean
  setMeetingSaved: (saved: boolean) => void
  isAddingMeetingToCalendar: boolean
  setIsAddingMeetingToCalendar: (adding: boolean) => void
  meetingAddedToCalendar: boolean
  setMeetingAddedToCalendar: (added: boolean) => void
  meetingAddedToGoogleCalendar: boolean
  
  // Not interested reason state
  notInterestedReason: string
  setNotInterestedReason: (reason: string) => void
  currentCallHistoryId: string | null
  
  // Functions
  loadCallRecording: () => void
  handlePlayPauseRecording: () => void
  formatDuration: (seconds: number) => string
  saveNotesToDatabase: () => Promise<void>
  loadCallTranscription: () => void
  loadAISuggestions: (transcription: string) => void
  generateCallSummary: (transcription?: string) => void
  updateSessionStats: (outcome: string) => void
  saveCallOutcomeToDatabase: (outcome: string) => Promise<boolean>
  saveCallbackToDatabase: (date: string, time: string) => Promise<boolean>
  saveMeetingToDatabase: (date: string, time: string) => Promise<boolean>
  updateCallHistoryRecord: (id: string, updates: any) => Promise<boolean>
  saveContactListProgress: () => Promise<void>
  
  // UI state
  readOnlyNotes?: boolean
}

export default function CallNotesSection(props: CallNotesSectionProps) {
  const {
    isNotesCollapsed,
    setIsNotesCollapsed,
    notesTab,
    setNotesTab,
    callEnded,
    showAudioPlayer,
    setShowAudioPlayer,
    selectedOutcome,
    setSelectedOutcome,
    updateSessionStats,
    saveCallOutcomeToDatabase
  } = props

  return (
    <div 
      className={`${openSans.className} bg-white border p-6`}
      style={{ 
        width: '720px', 
        minHeight: isNotesCollapsed ? 'auto' : '409px',
        borderWidth: '0.5px',
        borderColor: 'rgba(0, 51, 51, 0.1)',
        borderRadius: '10px'
      }}
    >
      {/* Notes/AI Tabs Header */}
      <div className={`flex items-center justify-between ${!isNotesCollapsed ? 'mb-6' : ''}`}>
        {/* Left: Tabs with border */}
        <div
          className="flex items-center gap-1 border rounded-[5px] p-1"
          style={{ borderWidth: '0.5px', borderColor: 'rgba(0, 51, 51, 0.1)' }}
        >
          {/* Notes Tab */}
          <Button
            onClick={() => setNotesTab("notes")}
            className={`h-[42px] px-4 text-[14px] font-medium rounded-lg ${
              notesTab === "notes" 
                ? "bg-[#003333] text-white hover:bg-[#003333] hover:text-white transition-none" 
                : "bg-transparent text-[#003333] hover:bg-gray-100"
            }`}
          >
            Notes
          </Button>
          
          {/* AI Transcription */}
          <Button
            onClick={() => setNotesTab("transcription")}
            className={`h-[42px] px-4 text-sm font-medium rounded-lg flex items-center gap-1 ${
              notesTab === "transcription" 
                ? "bg-[#003333] text-white hover:bg-[#003333] hover:text-white transition-none" 
                : "bg-transparent text-[#003333] hover:bg-gray-100"
            }`}
            disabled={!callEnded}
          >
            <div className="w-4 h-4 bg-[#059669] text-white text-xs rounded flex items-center justify-center font-bold">
              AI
            </div>
            Transcription
          </Button>
          
          {/* AI Suggestions */}
          <Button
            onClick={() => setNotesTab("suggestions")}
            className={`h-[42px] px-4 text-sm font-medium rounded-lg flex items-center gap-1 ${
              notesTab === "suggestions" 
                ? "bg-[#003333] text-white hover:bg-[#003333] hover:text-white transition-none" 
                : "bg-transparent text-[#003333] hover:bg-gray-100"
            }`}
            disabled={!callEnded}
          >
            <div className="w-4 h-4 bg-[#059669] text-white text-xs rounded flex items-center justify-center font-bold">
              AI
            </div>
            Suggestions
          </Button>
          
          {/* AI Call Summary */}
          <Button
            onClick={() => setNotesTab("summary")}
            className={`h-[42px] px-4 text-sm font-medium rounded-lg flex items-center gap-1 ${
              notesTab === "summary" 
                ? "bg-[#003333] text-white hover:bg-[#003333] hover:text-white transition-none" 
                : "bg-transparent text-[#003333] hover:bg-gray-100"
            }`}
            disabled={!callEnded}
          >
            <div className="w-4 h-4 bg-[#059669] text-white text-xs rounded flex items-center justify-center font-bold">
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
            className={`h-[52px] w-[52px] p-0 border-[#003333]/10 ${
              showAudioPlayer 
                ? 'bg-[#003333] hover:bg-[#003333] hover:text-white hover:border-[#003333]/10 transition-none'
                : 'bg-white'
            }`}
            onClick={() => setShowAudioPlayer(!showAudioPlayer)}
          >
            <Volume2 className={`h-[52px] w-[52px] ${showAudioPlayer ? 'text-white' : 'text-[#003333]'}`} />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-[52px] w-[52px] p-0 border-[#003333]/10 hover:border-[#003333]/10 hover:bg-[#F3F4F6]"
            onClick={() => {
              const next = !isNotesCollapsed
              setIsNotesCollapsed(next)
              // If collapsing, also close audio player and deactivate button
              if (next && showAudioPlayer) {
                setShowAudioPlayer(false)
              }
            }}
          >
            {isNotesCollapsed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-[#003333]"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-[#003333] transform rotate-180"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </Button>
        </div>
      </div>

      {/* Audio Player Component (CallRecordingToggle) */}
      {!isNotesCollapsed && showAudioPlayer && (
        <div
          className="mt-4"
          style={{
            borderWidth: '1px',
            borderColor: 'rgba(0, 51, 51, 0.1)',
            borderRadius: '0.5rem',
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <CallRecordingToggle
            variant="plain"
            wrapper="none"
            showTitle={false}
            audioSrc={props.recordingUrl ?? undefined}
            durationSec={props.recordingDuration ?? undefined}
          />
        </div>
      )}

      {/* Notes Content Area */}
      {!isNotesCollapsed && (
        <>
          <div>
            {notesTab === "notes" && <NotesTab {...props} readOnly={props.readOnlyNotes} />}
            {notesTab === "transcription" && <TranscriptionTab {...props} />}
            {notesTab === "suggestions" && <SuggestionsTab {...props} usage={props.suggestionsUsage} />}
            {notesTab === "summary" && <SummaryTab {...props} usage={props.summaryUsage} />}
          </div>

        

          {/* Call Result */}
       
          <CallSummaryPanel
            callEnded={props.callEnded}
            selectedOutcome={props.selectedOutcome}
            setSelectedOutcome={props.setSelectedOutcome}
            updateSessionStats={props.updateSessionStats}
            saveCallOutcomeToDatabase={props.saveCallOutcomeToDatabase}
            saveContactListProgress={props.saveContactListProgress}
            callbackDate={props.callbackDate}
            setCallbackDate={props.setCallbackDate}
            callbackTime={props.callbackTime}
            setCallbackTime={props.setCallbackTime}
            isSavingCallback={props.isSavingCallback}
            setIsSavingCallback={props.setIsSavingCallback}
            callbackSaved={props.callbackSaved}
            setCallbackSaved={props.setCallbackSaved}
            saveCallbackToDatabase={props.saveCallbackToDatabase}
            hasGoogleCalendarIntegration={props.hasGoogleCalendarIntegration}
            googleCalendarEmail={props.googleCalendarEmail}
            isAddingCallbackToCalendar={props.isAddingCallbackToCalendar}
            setIsAddingCallbackToCalendar={props.setIsAddingCallbackToCalendar}
            callbackAddedToCalendar={props.callbackAddedToCalendar}
            setCallbackAddedToCalendar={props.setCallbackAddedToCalendar}
            callbackAddedToGoogleCalendar={props.callbackAddedToGoogleCalendar}
            meetingDate={props.meetingDate}
            setMeetingDate={props.setMeetingDate}
            meetingTime={props.meetingTime}
            setMeetingTime={props.setMeetingTime}
            isSavingMeeting={props.isSavingMeeting}
            setIsSavingMeeting={props.setIsSavingMeeting}
            meetingSaved={props.meetingSaved}
            setMeetingSaved={props.setMeetingSaved}
            saveMeetingToDatabase={props.saveMeetingToDatabase}
            isAddingMeetingToCalendar={props.isAddingMeetingToCalendar}
            setIsAddingMeetingToCalendar={props.setIsAddingMeetingToCalendar}
            meetingAddedToCalendar={props.meetingAddedToCalendar}
            setMeetingAddedToCalendar={props.setMeetingAddedToCalendar}
            meetingAddedToGoogleCalendar={props.meetingAddedToGoogleCalendar}
            notInterestedReason={props.notInterestedReason}
            setNotInterestedReason={props.setNotInterestedReason}
            currentCallHistoryId={props.currentCallHistoryId}
            notes={props.notes}
            updateCallHistoryRecord={props.updateCallHistoryRecord}
          />
        </>
      )}
    </div>
  )
}
