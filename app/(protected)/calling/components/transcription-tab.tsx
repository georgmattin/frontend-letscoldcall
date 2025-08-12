'use client'

// no external loader here; spinner is inside the button

interface TranscriptionTabProps {
  transcription: string | null
  isGeneratingTranscript: boolean
  callEnded: boolean
  autoLoadAI: boolean
  setAutoLoadAI: (auto: boolean) => void
  loadCallTranscription: () => void
  transcriptionUsage?: { current: number; limit: number }
}

export default function TranscriptionTab({
  transcription,
  isGeneratingTranscript,
  callEnded,
  autoLoadAI,
  setAutoLoadAI,
  loadCallTranscription,
  transcriptionUsage
}: TranscriptionTabProps) {
  const hasCredits = transcriptionUsage ? (transcriptionUsage.current < transcriptionUsage.limit) : true
  return (
    <div>
      <div
        className="w-full h-48 p-4 border rounded-lg text-sm text-gray-600 overflow-y-auto mb-3"
        style={{ borderWidth: '0.5px', borderColor: 'rgba(0, 51, 51, 0.1)' }}
      >
        {transcription ? (
          <div className="whitespace-pre-wrap">{transcription}</div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-2 text-lg font-semibold text-[#003333]">AI Call Transcription</div>
            <div className="mb-4 text-sm text-[#003333]">Generate a transcript from call recording</div>

            {callEnded ? (
              <>
                <button
                  onClick={loadCallTranscription}
                  disabled={!hasCredits || isGeneratingTranscript}
                  className={
                    "min-w-[110px] h-8 px-4 rounded-[11px] text-[14px] font-normal inline-flex items-center justify-center " +
                    (isGeneratingTranscript
                      ? "bg-emerald-600 text-white"
                      : hasCredits
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-[#E5ECEA] text-[#0f3b3b]/50 cursor-not-allowed")
                  }
                >
                  {isGeneratingTranscript ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="9" stroke="white" strokeOpacity="0.35" strokeWidth="3" />
                        <path d="M21 12a9 9 0 00-9-9" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Generating
                    </span>
                  ) : (
                    "Generate"
                  )}
                </button>
                {transcriptionUsage && (
                  <div className="mt-2 text-center text-[12px] text-[#003333]">
                    {hasCredits ? (
                      <span>{transcriptionUsage.current}/{transcriptionUsage.limit} Credits used</span>
                    ) : (
                      <span>{transcriptionUsage.limit}/{transcriptionUsage.limit} No credits left</span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-400 text-sm">Complete your call to generate transcription</p>
            )}
          </div>
        )}
      </div>
      
    </div>
  )
}
