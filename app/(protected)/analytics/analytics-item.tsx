'use client'

import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import AnalyticsCompisonBadge from './analytics-compison-badge'

interface AnalyticsItemProps {
  title: string
  subheading?: string
  tooltip?: string
  badgeText?: string
}

export default function AnalyticsItem({ title, subheading, tooltip, badgeText }: AnalyticsItemProps) {
  return (
    <div
      className="bg-white"
      style={{
        border: '1px solid rgba(0, 51, 51, 0.1)',
        borderRadius: '6px',
        padding: '30px 30px 20px',
        width: 'calc((100% - 48px) / 3)',
        boxSizing: 'border-box',
      }}
    >
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-col items-center">
          {/* Title */}
          <h3
            className="font-open-sans font-bold text-[#003333] text-center"
            style={{ fontSize: '36px' }}
          >
            {title}
          </h3>

          {/* Subheading with inline tooltip to its right */}
          {subheading && (
            <div className="flex items-center justify-center gap-2 mt-1">
              <p
                className="text-[#003333] text-center"
                style={{ fontSize: '19.2px' }}
              >
                {subheading}
              </p>
              {tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-[#003333] text-[#003333] text-[12px] leading-none cursor-help bg-transparent hover:text-[#059669] hover:border-[#059669] transition-colors"
                      aria-label={tooltip}
                      title={tooltip}
                    >
                      ?
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px] text-sm bg-[#003333] text-white border border-[#003333]">
                    <p>{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Badge below */}
          {badgeText && (
            <div className="mt-3">
              <AnalyticsCompisonBadge text={badgeText} />
            </div>
          )}
        </div>
      </TooltipProvider>
    </div>
  )
}
