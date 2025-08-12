"use client"

import React, { useState } from "react"
import HeaderBar from "./header-bar"
import AnalyticsPanel from "./analytics-panel"

interface CallAnalyticsToggleProps {
  title: string
  onEndClick: () => void
  onExpand?: () => Promise<void> | void
  isExpanded?: boolean
  onChangeExpanded?: (next: boolean) => void
  sessionStats: Parameters<typeof AnalyticsPanel>[0]["sessionStats"]
  contacts: Parameters<typeof AnalyticsPanel>[0]["contacts"]
  isMounted: Parameters<typeof AnalyticsPanel>[0]["isMounted"]
  initialExpanded?: boolean
}

export default function CallAnalyticsToggle({
  title,
  onEndClick,
  onExpand,
  isExpanded,
  onChangeExpanded,
  sessionStats,
  contacts,
  isMounted,
  initialExpanded = false,
}: CallAnalyticsToggleProps) {
  const [internalExpanded, setInternalExpanded] = useState<boolean>(initialExpanded)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)

  const handleToggle = async () => {
    const current = isExpanded ?? internalExpanded
    const next = !current
    if (onChangeExpanded) {
      onChangeExpanded(next)
    } else {
      setInternalExpanded(next)
    }
    if (next && onExpand) {
      try {
        setIsRefreshing(true)
        await onExpand()
      } finally {
        setIsRefreshing(false)
      }
    }
  }

  return (
    <div 
      className="bg-white border flex flex-col px-6"
      style={{
        width: '1082px',
        height: (isExpanded ?? internalExpanded) ? 'auto' : '80px',
        borderWidth: '0.5px',
        borderColor: 'rgba(0, 51, 51, 0.1)',
        borderRadius: '10px',
        fontFamily: 'Open Sans, sans-serif',
        color: '#003333'
      }}
    >
      <HeaderBar
        title={title}
        onEndClick={onEndClick}
        isAnalyticsExpanded={isExpanded ?? internalExpanded}
        onToggleAnalytics={handleToggle}
        progressText={`#${(sessionStats.contactsCompleted || 0) + (sessionStats.contactsSkipped || 0)}/${sessionStats.totalContacts || 0}`}
      />

      {(isExpanded ?? internalExpanded) && (
        <div className="mt-6 pt-6 pb-6 border-t border-[#003333]/10">
          {/* Optional lightweight refresh indicator */}
          {isRefreshing && (
            <div className="text-sm mb-3">Refreshing analytics…</div>
          )}
          <AnalyticsPanel
            sessionStats={sessionStats}
            contacts={contacts}
            isMounted={isMounted}
          />
        </div>
      )}
    </div>
  )
}
