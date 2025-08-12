"use client"

import React from "react"

interface AISuggestionsToggleProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultExpanded?: boolean
  expanded?: boolean
  onToggle?: () => void
  title?: string
  creditsUsed?: number
  creditsTotal?: number
  generating?: boolean
  suggestions?: string | null
  onGenerate?: () => void
}

export default function AISuggestionsToggle({
  defaultExpanded = true,
  expanded: expandedProp,
  onToggle,
  title = "AI Suggestions",
  creditsUsed = 0,
  creditsTotal = 0,
  generating = false,
  suggestions = null,
  onGenerate,
  className,
  ...rest
}: AISuggestionsToggleProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const isExpanded = expandedProp ?? expanded
  const handleHeaderClick = onToggle ?? (() => setExpanded((e) => !e))
  const used = creditsUsed
  const isGenerating = generating
  const text = suggestions

  const hasCredits = (creditsUsed ?? 0) < (creditsTotal ?? 0)

  const handleGenerate = () => {
    if (!hasCredits || isGenerating) return
    onGenerate?.()
  }

  const headerBadge = (
    <span className="inline-flex items-center justify-center h-[22px] px-2 rounded-[6px] bg-emerald-600 text-white text-[12px] font-semibold mr-2">
      AI
    </span>
  )

  return (
    <div className={["w-full rounded-[5px] border border-[#0033331a] bg-white", className].filter(Boolean).join(" ")} {...rest}>
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={handleHeaderClick}
        className="w-full h-[48px] px-4 flex items-center justify-between"
      >
        <span className="flex items-center text-[18px] font-semibold text-[#0f3b3b]">
          {headerBadge}
          {title}
        </span>
        <svg
          className={"transition-transform duration-200 " + (isExpanded ? "rotate-180" : "rotate-0")}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" stroke="#0f3b3b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          {text ? (
            <div className="mt-2 rounded-[5px] border border-[#0033331a] bg-white p-4 min-h-[155px] max-h-[155px] overflow-auto">
              <div className="text-[14px] whitespace-pre-wrap text-[#0f3b3b]">{text}</div>
            </div>
          ) : (
            <div className="mt-2 rounded-[5px] border border-[#0033331a] bg-white p-4 min-h-[155px] max-h-[155px] overflow-auto">
              <div className="text-center">
                <div className="text-[16px] font-semibold text-[#0f3b3b]">AI Suggestions</div>
                <div className="text-[14px] text-[#0f3b3b]/80 mt-1">Generate actionable follow-up suggestions</div>

                <div className="mt-3 flex items-center justify-center">
                  <button
                    type="button"
                    disabled={!hasCredits || isGenerating}
                    onClick={handleGenerate}
                    className={
                      "min-w-[110px] h-8 px-4 rounded-[999px] text-[14px] font-normal inline-flex items-center justify-center " +
                      (isGenerating
                        ? "bg-emerald-600 text-white"
                        : hasCredits
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-[#E5ECEA] text-[#0f3b3b]/50 cursor-not-allowed")
                    }
                  >
                    {isGenerating ? (
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
                </div>
                <div className="mt-2 text-center text-[12px] text-[#0f3b3b]/70">
                  {hasCredits ? (
                    <span>{used}/{creditsTotal} Credits used</span>
                  ) : (
                    <span>{creditsTotal}/{creditsTotal} No credits left</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
