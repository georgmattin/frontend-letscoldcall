"use client"

import React from "react"

export interface AISuggestionItem {
  title: string
  description: string
  whatToSay: string
}

export interface SuggestionsUsage {
  current: number
  limit: number
}

interface AISuggestionsPanelProps {
  callEnded: boolean
  transcription: string | null
  isLoading: boolean
  canGenerate: boolean
  suggestions: AISuggestionItem[]
  usage: SuggestionsUsage
  onGenerate: () => void
}

export default function AISuggestionsPanel({
  callEnded,
  transcription,
  isLoading,
  canGenerate,
  suggestions,
  usage,
  onGenerate,
}: AISuggestionsPanelProps) {
  return (
    <div>
      <div className="w-full h-48 p-4 border border-gray-300 rounded-lg text-sm text-gray-600 overflow-y-auto mb-3">
        {suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
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
              <h3 className="text-lg font-semibold text-[#003333] mb-2">AI Suggestions</h3>
              <p className="text-sm text-[#003333] mb-4">Generate actionable follow-up suggestions</p>

              {callEnded ? (
                !transcription ? (
                  <p className="text-gray-400 text-sm">Generate a transcription first to get AI suggestions.</p>
                ) : (
                  (() => {
                    const hasCredits = usage ? (usage.current < usage.limit) : true
                    const disabled = !hasCredits || !canGenerate || isLoading
                    return (
                      <button
                        onClick={onGenerate}
                        disabled={disabled}
                        className={
                          "min-w-[110px] h-8 px-4 rounded-[999px] text-[14px] font-normal inline-flex items-center justify-center " +
                          (isLoading
                            ? "bg-emerald-600 text-white"
                            : !disabled
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-[#E5ECEA] text-[#0f3b3b]/50 cursor-not-allowed")
                        }
                      >
                        {isLoading ? (
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
                    )
                  })()
                )
              ) : (
                <p className="text-gray-400 text-sm">Complete your call to generate AI suggestions</p>
              )}

              {/* Credits display */}
              <div className="mt-2 text-center text-[12px] text-[#003333]">
                <span>{usage.current}/{usage.limit} Credits used</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
