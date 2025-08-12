"use client"

import React from "react"

interface CallNotesToggleProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultExpanded?: boolean
  expanded?: boolean
  onToggle?: () => void
  title?: string
  notesText?: string
  readOnly?: boolean
  rows?: number
}

export default function CallNotesToggle({
  defaultExpanded = true,
  expanded: expandedProp,
  onToggle,
  title = "Call Notes",
  notesText = "",
  readOnly = true,
  rows = 6,
  className,
  ...rest
}: CallNotesToggleProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const isExpanded = expandedProp ?? expanded
  const handleHeaderClick = onToggle ?? (() => setExpanded((e) => !e))
  const isEmpty = !String(notesText || "").trim()

  return (
    <div className={["w-full rounded-[5px] border border-[#0033331a] bg-white", className].filter(Boolean).join(" ")} {...rest}>
      {/* Header row */}
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={handleHeaderClick}
        className="w-full h-[48px] px-4 flex items-center justify-between"
      >
        <span className="text-[18px] font-semibold text-[#0f3b3b]">{title}</span>
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

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-2 pt-0">
          <div className="bg-white">
            {isEmpty ? (
              <div className="w-full h-[120px] rounded-[5px] border border-[#0033331a] bg-[#F9FAFB] p-3 text-[14px] text-[#6b7280] leading-6 flex items-center justify-center text-center">
                No notes for this call.
              </div>
            ) : (
              <textarea
                className="w-full h-[120px] rounded-[5px] border border-[#0033331a] bg-white p-3 text-[14px] text-[#0f3b3b] leading-6 resize-none"
                readOnly={readOnly}
                value={notesText}
                onChange={() => { /* read-only */ }}
                rows={rows}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
