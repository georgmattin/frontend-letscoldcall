'use client'

import { Check } from "lucide-react"

interface NotesTabProps {
  notes: string
  setNotes: (notes: string) => void
  notesSaved: boolean
  setNotesSaved: (saved: boolean) => void
  autoSaveTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
  saveNotesToDatabase: () => Promise<void>
  readOnly?: boolean
}

export default function NotesTab({
  notes,
  setNotes,
  notesSaved,
  setNotesSaved,
  autoSaveTimeoutRef,
  saveNotesToDatabase,
  readOnly = false
}: NotesTabProps) {
  return (
    <div>
      <textarea
        value={notes || (readOnly ? '' : '')}
        onChange={readOnly ? undefined : (e) => {
          console.log('📝 Notes changed, length:', e.target.value.length)
          setNotes(e.target.value)
          // Reset saved state when user types
          setNotesSaved(false)
          // Auto-save notes after 2 seconds of inactivity
          if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current)
          }
          console.log('⏰ Setting auto-save timeout...')
          autoSaveTimeoutRef.current = setTimeout(() => {
            console.log('⏰ Auto-save timeout triggered')
            saveNotesToDatabase()
          }, 2000)
        }}
        readOnly={readOnly}
        className={`w-full h-48 p-4 mb-3 border rounded-lg resize-none text-sm text-gray-600 placeholder-gray-400 ${
          readOnly 
            ? 'bg-gray-50 cursor-default' 
            : 'focus:outline-none focus:ring-0'
        }`}
        style={{ borderWidth: '0.5px', borderColor: 'rgba(0, 51, 51, 0.1)' }}
        placeholder={readOnly 
          ? (notes ? '' : 'No notes have been added for this call') 
          : 'Notes you write here are automatically saved...'
        }
      />
      
      {/* Notes saved indicator */}
      {!readOnly && notesSaved && (
        <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
          <Check className="w-4 h-4" />
          <span>Notes saved</span>
        </div>
      )}
    </div>
  )
}
