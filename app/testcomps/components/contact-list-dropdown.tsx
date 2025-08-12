"use client"
import React from "react"
import { createClient } from "@/utils/supabase/client"

interface ContactList {
  id: number
  name: string
}

interface ContactListDropdownProps {
  value?: number | null
  onChange?: (id: number | null, label?: string) => void
}

export default function ContactListDropdown({ value, onChange }: ContactListDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const [lists, setLists] = React.useState<ContactList[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<number | null>(value ?? null)
  const [selectedLabel, setSelectedLabel] = React.useState<string>("")
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    setSelectedId(value ?? null)
    if (value && lists.length) {
      const found = lists.find(l => l.id === value)
      setSelectedLabel(found?.name || "")
    } else if (!value) {
      setSelectedLabel("")
    }
  }, [value, lists])

  React.useEffect(() => {
    const loadLists = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        const { data: userRes } = await supabase.auth.getUser()
        const userId = userRes.user?.id
        if (!userId) return
        const { data, error } = await supabase
          .from("contact_lists")
          .select("id, name")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
        if (error) throw error
        setLists((data || []).map(d => ({ id: Number(d.id), name: d.name as string })))
      } catch (e) {
        console.error("Failed to load contact lists", e)
      } finally {
        setLoading(false)
      }
    }
    loadLists()
  }, [])

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  const label = selectedId ? (selectedLabel || lists.find(l => l.id === selectedId)?.name || "") : "All contact lists"

  function clearSelection() {
    setSelectedId(null)
    setSelectedLabel("")
    onChange?.(null, undefined)
    setOpen(false)
  }

  function choose(l: ContactList) {
    setSelectedId(l.id)
    setSelectedLabel(l.name)
    onChange?.(l.id, l.name)
    setOpen(false)
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50 text-sm"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v1H3V5z" />
          <path d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
        </svg>
        <span className="text-[#253053] truncate max-w-[200px]">{loading ? "Loading…" : label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-[280px] rounded-md border border-gray-200 bg-white p-2 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-500">Contact Lists</div>
            {selectedId !== null && (
              <button onClick={clearSelection} className="text-xs text-gray-600 underline">Clear</button>
            )}
          </div>
          <div className="max-h-64 overflow-auto">
            {lists.length === 0 && (
              <div className="text-xs text-gray-500 p-2">No lists</div>
            )}
            {lists.map((l) => (
              <button
                key={l.id}
                onClick={() => choose(l)}
                className={`w-full text-left px-2 py-1 rounded hover:bg-gray-50 text-sm ${selectedId === l.id ? "bg-blue-50" : ""}`}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
