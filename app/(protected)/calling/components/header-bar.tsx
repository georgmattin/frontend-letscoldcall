"use client"

import React from "react"
// Removed lucide chevron to use inline SVG matching navbar

export interface HeaderBarProps {
  title: string
  onEndClick: () => void
  onToggleAnalytics: () => void | Promise<void>
  isAnalyticsExpanded: boolean
  progressText?: string
}

export default function HeaderBar({
  title,
  onEndClick,
  onToggleAnalytics,
  isAnalyticsExpanded,
  progressText,
}: HeaderBarProps) {
  return (
    <div className="flex items-center justify-between" style={{ height: '80px' }}>
      {/* Left: Contact List Name */}
      <div className="flex items-center gap-2 text-xl font-bold">
        <span
          aria-hidden
          className="inline-block w-5 h-5"
          style={{
            backgroundColor: '#059669',
            WebkitMaskImage: 'url(/contacts-icon.svg)',
            WebkitMaskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            WebkitMaskPosition: 'center',
            maskImage: 'url(/contacts-icon.svg)',
            maskRepeat: 'no-repeat',
            maskSize: 'contain',
            maskPosition: 'center',
          }}
        />
        <span style={{ color: '#003333' }}>{title || 'Loading...'}</span>
      </div>

      {/* Right: End Calling, Progress, and Analytics */}
      <div className="flex items-center gap-4">
        {/* End Calling with border */}
        <div
          onClick={onEndClick}
          className="flex items-center gap-2 border border-[rgba(0,51,51,0.1)] rounded px-3 py-2 cursor-pointer hover:border-[#003333] transition-colors"
        >
          <img src="/arrow-left-black.svg" alt="Back" className="w-5 h-5" />
          <span className="font-medium" style={{ color: '#003333' }}>End Calling</span>
        </div>

        {/* Analytics with chevron */}
        <div
          onClick={onToggleAnalytics}
          className="flex items-center gap-2 cursor-pointer bg-white border rounded-[5px] px-3 py-2"
        >
          <img
            src="/analytics-icon.svg"
            alt="Analytics"
            className="w-5 h-5"
          />
          <span className="font-medium" style={{ color: '#003333' }}>Analytics</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 text-[#003333] transition-transform ${isAnalyticsExpanded ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Progress box (non-clickable), same style as Analytics, placed to the right */}
        {typeof progressText === 'string' && (
          <div
            className="flex items-center gap-2 bg-white border rounded-[5px] px-3 py-2"
            aria-label="Contact progress"
          >
            <span className="font-medium" style={{ color: '#003333' }}>{progressText}</span>
          </div>
        )}
      </div>
    </div>
  )
}
