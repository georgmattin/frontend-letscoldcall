"use client"

import React from "react"
import CallNotesSection from "../../(protected)/calling/call-notes-section"

export default function CallNotesDemo() {
  // Collapse and tabs
  const [isNotesCollapsed, setIsNotesCollapsed] = React.useState(false)
  const [notesTab, setNotesTab] = React.useState<"notes" | "transcription" | "suggestions" | "summary">("notes")

  // Call state
  const [callEnded, setCallEnded] = React.useState(true)

  // Audio player state
  const [showAudioPlayer, setShowAudioPlayer] = React.useState(false)
  const [isLoadingRecording, setIsLoadingRecording] = React.useState(false)
  const [recordingError, setRecordingError] = React.useState<string | null>(null)
  const [recordingAvailable, setRecordingAvailable] = React.useState(true)
  const [recordingUrl, setRecordingUrl] = React.useState<string | null>(null)
  const [recordingCurrentTime, setRecordingCurrentTime] = React.useState(0)
  const [recordingDuration, setRecordingDuration] = React.useState(0)
  const [recordingProgress, setRecordingProgress] = React.useState(0)
  const [isPlayingRecording, setIsPlayingRecording] = React.useState(false)
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1)

  // Notes state
  const [notes, setNotes] = React.useState("")
  const [notesSaved, setNotesSaved] = React.useState(false)
  const autoSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // AI features state
  const [transcription, setTranscription] = React.useState<string | null>(null)
  const [isGeneratingTranscript, setIsGeneratingTranscript] = React.useState(false)
  const [autoLoadAI, setAutoLoadAI] = React.useState(true)
  const [aiSuggestions, setAISuggestions] = React.useState<Array<{ title: string; description: string; whatToSay: string }>>([])
  const [isLoadingAISuggestions, setIsLoadingAISuggestions] = React.useState(false)
  const [callSummary, setCallSummary] = React.useState<string | null>(null)
  const [isGeneratingCallSummary, setIsGeneratingCallSummary] = React.useState(false)
  const [transcriptionUsage] = React.useState<{ current: number; limit: number }>({ current: 0, limit: 5 })
  const [suggestionsUsage] = React.useState<{ current: number; limit: number }>({ current: 0, limit: 5 })
  const [summaryUsage] = React.useState<{ current: number; limit: number }>({ current: 0, limit: 5 })

  // Outcomes
  const [selectedOutcome, setSelectedOutcome] = React.useState<string>("")

  // Callback
  const [callbackDate, setCallbackDate] = React.useState("")
  const [callbackTime, setCallbackTime] = React.useState("")
  const [isSavingCallback, setIsSavingCallback] = React.useState(false)
  const [callbackSaved, setCallbackSaved] = React.useState(false)
  const [isAddingCallbackToCalendar, setIsAddingCallbackToCalendar] = React.useState(false)
  const [callbackAddedToCalendar, setCallbackAddedToCalendar] = React.useState(false)
  const [hasGoogleCalendarIntegration] = React.useState(false)
  const [googleCalendarEmail] = React.useState<string | null>(null)
  const [callbackAddedToGoogleCalendar] = React.useState(false)

  // Meeting
  const [meetingDate, setMeetingDate] = React.useState("")
  const [meetingTime, setMeetingTime] = React.useState("")
  const [isSavingMeeting, setIsSavingMeeting] = React.useState(false)
  const [meetingSaved, setMeetingSaved] = React.useState(false)
  const [isAddingMeetingToCalendar, setIsAddingMeetingToCalendar] = React.useState(false)
  const [meetingAddedToCalendar, setMeetingAddedToCalendar] = React.useState(false)
  const [meetingAddedToGoogleCalendar] = React.useState(false)

  // Not interested
  const [notInterestedReason, setNotInterestedReason] = React.useState("")
  const [currentCallHistoryId] = React.useState<string | null>(null)

  // Handlers (mocked)
  const loadCallRecording = () => {
    setIsLoadingRecording(true)
    setTimeout(() => {
      setIsLoadingRecording(false)
      setRecordingUrl(null)
      setRecordingAvailable(false)
    }, 700)
  }

  const handlePlayPauseRecording = () => {
    setIsPlayingRecording((p) => !p)
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const saveNotesToDatabase = async () => {
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 1200)
  }

  const loadCallTranscription = () => {
    setIsGeneratingTranscript(true)
    setTimeout(() => {
      setIsGeneratingTranscript(false)
      setTranscription("Sample transcription text for demo purposes.")
    }, 800)
  }

  const loadAISuggestions = (txt: string) => {
    setIsLoadingAISuggestions(true)
    setTimeout(() => {
      setIsLoadingAISuggestions(false)
      setAISuggestions([
        { title: "Next Steps", description: "Propose a brief follow-up.", whatToSay: "I’ll send over details and check back next week." },
      ])
    }, 800)
  }

  const generateCallSummary = () => {
    setIsGeneratingCallSummary(true)
    setTimeout(() => {
      setIsGeneratingCallSummary(false)
      setCallSummary("Short call summary goes here for demo.")
    }, 800)
  }

  const updateSessionStats = (_outcome: string) => {}

  const saveCallOutcomeToDatabase = async (_outcome: string) => true

  const saveCallbackToDatabase = async (_date: string, _time: string) => true

  const saveMeetingToDatabase = async (_date: string, _time: string) => true

  const updateCallHistoryRecord = async (_id: string, _payload: Record<string, any>) => true

  const saveContactListProgress = async () => {}

  return (
    <div className="w-full flex items-start justify-center">
      <CallNotesSection
        isNotesCollapsed={isNotesCollapsed}
        setIsNotesCollapsed={setIsNotesCollapsed}
        notesTab={notesTab}
        setNotesTab={(tab: string) => setNotesTab(tab as any)}
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
        loadCallTranscription={loadCallTranscription}
        loadAISuggestions={loadAISuggestions}
        generateCallSummary={generateCallSummary}
        updateSessionStats={updateSessionStats}
        saveCallOutcomeToDatabase={saveCallOutcomeToDatabase}
        saveCallbackToDatabase={saveCallbackToDatabase}
        saveMeetingToDatabase={saveMeetingToDatabase}
        updateCallHistoryRecord={updateCallHistoryRecord}
        saveContactListProgress={saveContactListProgress}
      />
    </div>
  )
}
