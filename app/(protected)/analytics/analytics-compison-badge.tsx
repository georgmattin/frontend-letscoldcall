'use client'

import React from 'react'

interface AnalyticsCompisonBadgeProps {
  text: string
}

export default function AnalyticsCompisonBadge({ text }: AnalyticsCompisonBadgeProps) {
  return (
    <span
      className="inline-flex items-center justify-center rounded"
      style={{
        backgroundColor: '#ECFDF5',
        border: '0.2px solid #059669',
        color: '#059669',
        height: '27px',
        padding: '0 10px',
        fontSize: '15px',
        fontWeight: 400,
        width: 'fit-content',
        lineHeight: 1,
      }}
    >
      {text}
    </span>
  )
}
