"use client"

import React from "react"
import { Button } from "@/components/ui/button"

export type NotesTab = "notes" | "transcription" | "suggestions" | "summary"

interface NotesTabsHeaderProps {
  activeTab: NotesTab
  onChangeTab: (tab: NotesTab) => void
  className?: string
}

export default function NotesTabsHeader({ activeTab, onChangeTab, className }: NotesTabsHeaderProps) {
  return (
    <div className={`flex items-center gap-1 border border-[#f2f2f2] rounded-[5px] p-1 ${className ?? ''}`}>
      <Button
        onClick={() => onChangeTab("notes")}
        className={`h-[42px] px-4 text-[16px] font-medium rounded-lg ${
          activeTab === "notes" 
            ? "bg-[#253053] text-white" 
            : "bg-transparent text-gray-600 hover:bg-gray-100"
        }`}
      >
        Notes
      </Button>
      <Button
        onClick={() => onChangeTab("transcription")}
        className={`h-[42px] px-4 text-[16px] font-medium rounded-lg ${
          activeTab === "transcription" 
            ? "bg-[#253053] text-white" 
            : "bg-transparent text-gray-600 hover:bg-gray-100"
        }`}
      >
        AI Transcription
      </Button>
      <Button
        onClick={() => onChangeTab("suggestions")}
        className={`h-[42px] px-4 text-[16px] font-medium rounded-lg ${
          activeTab === "suggestions" 
            ? "bg-[#253053] text-white" 
            : "bg-transparent text-gray-600 hover:bg-gray-100"
        }`}
      >
        AI Suggestions
      </Button>
      <Button
        onClick={() => onChangeTab("summary")}
        className={`h-[42px] px-4 text-[16px] font-medium rounded-lg ${
          activeTab === "summary" 
            ? "bg-[#253053] text-white" 
            : "bg-transparent text-gray-600 hover:bg-gray-100"
        }`}
      >
        Call Summary
      </Button>
    </div>
  )
}
