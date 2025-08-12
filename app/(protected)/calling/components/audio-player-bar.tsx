"use client"

import React from "react"
import { Loader2, SkipBack, SkipForward, Play, Pause } from "lucide-react"

interface AudioPlayerBarProps {
  // Loading and error states
  isLoading: boolean
  error: string | null

  // Availability
  recordingAvailable: boolean
  recordingUrl: string | null

  // Playback state
  isPlaying: boolean
  playbackSpeed: number
  recordingCurrentTime: number
  recordingDuration: number
  recordingProgress: number

  // Context
  callEnded: boolean

  // Handlers
  onPlayPause: () => void
  onRetryLoad: () => void
  onChangeSpeed: (speed: number) => void
  formatDuration: (seconds: number) => string
}

export default function AudioPlayerBar({
  isLoading,
  error,
  recordingAvailable,
  recordingUrl,
  isPlaying,
  playbackSpeed,
  recordingCurrentTime,
  recordingDuration,
  recordingProgress,
  callEnded,
  onPlayPause,
  onRetryLoad,
  onChangeSpeed,
  formatDuration,
}: AudioPlayerBarProps) {
  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading recording...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-red-600 mb-2">⚠️ {error}</div>
          <button onClick={onRetryLoad} className="text-blue-600 hover:underline text-sm">
            Try again
          </button>
        </div>
      ) : recordingAvailable && recordingUrl ? (
        <>
          {/* Progress Bar with Time */}
          <div className="w-full max-w-md mb-6">
            <div className="flex items-center justify-between text-blue-500 text-sm font-medium mb-2">
              <span>{formatDuration(recordingCurrentTime)}</span>
              <span>{formatDuration(recordingDuration)}</span>
            </div>
            <div className="relative">
              <div className="w-full h-1 bg-gray-200 rounded-full"></div>
              <div
                className="absolute top-0 left-0 h-1 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${recordingProgress}%` }}
              ></div>
              <div
                className="absolute top-0 w-4 h-4 bg-blue-500 rounded-full transform -translate-y-1.5 -translate-x-2 cursor-pointer"
                style={{ left: `${recordingProgress}%` }}
                onClick={(e) => {
                  const audio = document.getElementById('recording-audio') as HTMLAudioElement
                  if (audio && audio.duration) {
                    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect()
                    const clickX = e.clientX - rect.left
                    const newTime = (clickX / rect.width) * audio.duration
                    audio.currentTime = newTime
                  }
                }}
              ></div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center space-x-6 mb-6">
            {/* Previous Button */}
            <button
              onClick={() => {
                const audio = document.getElementById('recording-audio') as HTMLAudioElement
                if (audio) {
                  audio.currentTime = Math.max(0, audio.currentTime - 10)
                }
              }}
              className="text-gray-600 hover:text-gray-800 transition-colors"
              title="Skip back 10 seconds"
            >
              <SkipBack className="w-6 h-6" />
            </button>

            {/* Play Button */}
            <button
              onClick={onPlayPause}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 transition-colors"
              disabled={!recordingUrl}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            {/* Next Button */}
            <button
              onClick={() => {
                const audio = document.getElementById('recording-audio') as HTMLAudioElement
                if (audio) {
                  audio.currentTime = Math.min(audio.duration, audio.currentTime + 10)
                }
              }}
              className="text-gray-600 hover:text-gray-800 transition-colors"
              title="Skip forward 10 seconds"
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center space-x-4">
            {[0.5, 1.0, 1.5, 2.0].map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  onChangeSpeed(speed)
                  const audio = document.getElementById('recording-audio') as HTMLAudioElement
                  if (audio) {
                    audio.playbackRate = speed
                  }
                }}
                className={`px-2 py-1 text-xs font-bold rounded-lg border border-blue-200 ${
                  playbackSpeed === speed
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/70 hover:bg-white text-blue-700'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center text-gray-400 py-8">
          <div>
            No recording available
            {callEnded && (
              <>
                <br />
                <button
                  onClick={onRetryLoad}
                  className="mt-2 text-blue-500 hover:text-blue-700 underline"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load Recording'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
