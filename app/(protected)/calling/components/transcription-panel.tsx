"use client"

import React from "react"
import { Loader2 } from "lucide-react"

export interface TranscriptionUsage {
  current: number
  limit: number
}

interface TranscriptionPanelProps {
  callEnded: boolean
  canGenerateTranscription: boolean
  isWaitingForTranscription: boolean
  isGeneratingTranscript: boolean
  isTranscriptionReadyInBackend: boolean
  transcription: string | null
  transcriptionUsage: TranscriptionUsage
  onGenerate: () => void
}

export default function TranscriptionPanel({
  callEnded,
  canGenerateTranscription,
  isWaitingForTranscription,
  isGeneratingTranscript,
  isTranscriptionReadyInBackend,
  transcription,
  transcriptionUsage,
  onGenerate,
}: TranscriptionPanelProps) {
  return (
    <div>
      <div className="w-full h-48 p-4 border border-gray-300 rounded-lg text-sm text-gray-600 overflow-y-auto mb-3">
        {isGeneratingTranscript ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Generating transcription...</span>
          </div>
        ) : transcription ? (
          <div className="whitespace-pre-wrap">{transcription}</div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-700 mb-2">AI Call Transcription</h3>
              <p className="text-gray-500 text-sm mb-4">Generate a transcript from call recording</p>

              {callEnded ? (
                <button
                  onClick={onGenerate}
                  disabled={
                    !canGenerateTranscription ||
                    (!isTranscriptionReadyInBackend && !isWaitingForTranscription) ||
                    isGeneratingTranscript
                  }
                  className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    !canGenerateTranscription
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isTranscriptionReadyInBackend && !isGeneratingTranscript
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {(isWaitingForTranscription || isGeneratingTranscript) && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {!canGenerateTranscription
                    ? 'No Credits'
                    : isWaitingForTranscription
                      ? 'Please Wait...'
                      : isGeneratingTranscript
                        ? 'Generating...'
                        : isTranscriptionReadyInBackend
                          ? 'Generate'
                          : 'Please Wait..'
                  }
                </button>
              ) : (
                <p className="text-gray-400 text-sm">Complete your call to generate transcription</p>
              )}

              {/* Credits display */}
              <div className="mt-4">
                <span className="font-bold text-blue-600">
                  {transcriptionUsage.current}/{transcriptionUsage.limit}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
