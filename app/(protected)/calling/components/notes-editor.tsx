"use client"

import React from "react"
import { Check } from "lucide-react"

interface NotesEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  saved?: boolean
}

export default function NotesEditor({ value, onChange, placeholder, saved }: NotesEditorProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-48 p-4 border border-[#f2f2f2] rounded-[5px] resize-none text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={placeholder ?? "Notes you write here are automatically saved..."}
      />

      {saved && (
        <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
          <Check className="w-4 h-4" />
          <span>Notes saved</span>
        </div>
      )}
    </div>
  )
}
