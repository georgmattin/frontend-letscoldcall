"use client"

import React from "react"

interface CallRecordingToggleProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultExpanded?: boolean
  expanded?: boolean
  onToggle?: () => void
  title?: string
  audioSrc?: string
  durationSec?: number
  initialCurrentSec?: number
  speeds?: number[]
  defaultSpeed?: number
  // New: presentation controls
  variant?: "collapsible" | "plain"
  showTitle?: boolean
  wrapper?: "card" | "none"
}

export default function CallRecordingToggle({
  defaultExpanded = false,
  expanded: expandedProp,
  onToggle,
  title = "Call Recording",
  audioSrc,
  durationSec,
  initialCurrentSec = 0,
  speeds = [0.5, 1.0, 1.5],
  defaultSpeed = 1.0,
  variant = "collapsible",
  showTitle = true,
  wrapper = "card",
  className,
  ...rest
}: CallRecordingToggleProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const isExpanded = expandedProp ?? expanded
  const handleHeaderClick = onToggle ?? (() => setExpanded((e) => !e))
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const [currentSec, setCurrentSec] = React.useState(initialCurrentSec)
  const [playing, setPlaying] = React.useState(false)
  const [speed, setSpeed] = React.useState(defaultSpeed)
  const [speedOpen, setSpeedOpen] = React.useState(false)
  const [computedDuration, setComputedDuration] = React.useState<number | undefined>(durationSec)

  const effDuration = computedDuration ?? durationSec ?? 0
  const hasAudio = !!audioSrc
  const progressPct = effDuration > 0 ? Math.min(100, Math.max(0, (currentSec / effDuration) * 100)) : 0

  // Sync speed to audio element
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }, [speed])

  // Load new source
  React.useEffect(() => {
    setCurrentSec(0)
    setComputedDuration(durationSec)
    setPlaying(false)
    // Ensure the browser reloads metadata for new src
    if (audioRef.current) {
      try { audioRef.current.load() } catch {}
    }
  }, [audioSrc, durationSec])

  // Wire up audio events
  React.useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onTime = () => setCurrentSec(el.currentTime || 0)
    const onMeta = () => {
      // Prefer explicit duration, else read from metadata
      if (!durationSec && isFinite(el.duration)) setComputedDuration(el.duration)
    }
    const onDurationChange = () => {
      if ((!durationSec || durationSec <= 0) && isFinite(el.duration)) setComputedDuration(el.duration)
    }
    const onEnded = () => setPlaying(false)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('durationchange', onDurationChange)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('durationchange', onDurationChange)
      el.removeEventListener('ended', onEnded)
    }
  }, [audioRef, durationSec])

  // Control play/pause
  React.useEffect(() => {
    const el = audioRef.current
    if (!el) return
    if (!hasAudio) return
    if (playing) {
      el.play().catch(() => setPlaying(false))
      // Smooth UI updates while playing
      const tick = () => {
        if (!audioRef.current) return
        setCurrentSec(audioRef.current.currentTime || 0)
        rafRef.current = requestAnimationFrame(tick)
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(tick)
    } else {
      el.pause()
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [playing, hasAudio])

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const Inner = (
    <>
      {/* hidden audio element */}
      <audio ref={audioRef} src={audioSrc || undefined} preload="metadata" />
      {/* Time row */}
      <div className="flex items-center justify-between text-[14px] text-[#0f3b3b]">
        <span>{fmt(currentSec)}</span>
        <span>{fmt(effDuration)}</span>
      </div>
      {/* Progress (click to seek) */}
      <div className="mt-3">
        <div
          className="h-[10px] w-full rounded-full bg-emerald-100 overflow-hidden cursor-pointer"
          onClick={(e) => {
            if (!audioRef.current) return
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
            const d = effDuration || 0
            if (d > 0) {
              audioRef.current.currentTime = ratio * d
              setCurrentSec(audioRef.current.currentTime || 0)
            }
          }}
        >
          <div
            className="h-full bg-emerald-600 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Controls row: transport + speed dropdown */}
      <div className="mt-3 flex items-center justify-between gap-2 flex-nowrap whitespace-nowrap">
        {/* Left cluster: transport + speed */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!audioRef.current) return
              audioRef.current.currentTime = Math.max(0, (audioRef.current.currentTime || 0) - 5)
            }}
            className="h-8 px-2 rounded-[5px] border border-[#0033331a] flex items-center justify-center bg-white"
            aria-label="Rewind 5 seconds"
            disabled={!hasAudio}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 7l-6 5 6 5V7zM19 7l-6 5 6 5V7z" fill="#059669" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="h-8 px-3 rounded-[5px] bg-emerald-600 flex items-center justify-center shadow-sm"
            aria-label={playing ? "Pause" : "Play"}
            disabled={!hasAudio}
          >
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 6h3v12H8zM13 6h3v12h-3z" fill="white" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5v14l11-7-11-7z" fill="white" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!audioRef.current) return
              const d = effDuration || 0
              audioRef.current.currentTime = Math.min(d, (audioRef.current.currentTime || 0) + 5)
            }}
            className="h-8 px-2 rounded-[5px] border border-[#0033331a] flex items-center justify-center bg-white"
            aria-label="Forward 5 seconds"
            disabled={!hasAudio}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 7l6 5-6 5V7zM5 7l6 5-6 5V7z" fill="#059669" />
            </svg>
          </button>

          {/* Speed dropdown */}
          <div className="relative inline-block" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSpeedOpen(false) }}>
            <button
              type="button"
              className="h-8 px-2 rounded-[5px] border border-[#0033331a] bg-white inline-flex items-center gap-1 text-[12px] text-[#0f3b3b]"
              aria-haspopup="listbox"
              aria-expanded={speedOpen}
              onClick={() => setSpeedOpen((o) => !o)}
              disabled={!hasAudio}
            >
              {speed.toFixed(1)}x
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 9l6 6 6-6" stroke="#0f3b3b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {speedOpen && (
              <div className="absolute right-0 mt-1 z-10 min-w-[72px] rounded-[5px] border border-[#0033331a] bg-white shadow-sm">
                <ul role="listbox" tabIndex={-1} className="py-1">
                  {speeds.map((sp) => (
                    <li key={sp}>
                      <button
                        type="button"
                        className={
                          "w-full text-left px-3 py-1 text-[12px] " +
                          (sp === speed ? "bg-[#F4F6F6] text-emerald-700" : "text-[#0f3b3b] hover:bg-[#F4F6F6]")
                        }
                        onClick={() => {
                          setSpeed(sp)
                          setSpeedOpen(false)
                        }}
                        disabled={!hasAudio}
                      >
                        {sp.toFixed(1)}x
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right cluster: actions */}
        <div className="flex items-center gap-2">
          {hasAudio ? (
            <a
              href={audioSrc}
              download
              aria-label="Download recording"
              className="h-8 w-8 rounded-[5px] border border-[#0033331a] bg-white flex items-center justify-center text-[#003333] hover:text-emerald-600 hover:border-emerald-600 active:text-emerald-600 active:border-emerald-600"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4.007 4.007a1.25 1.25 0 01-1.414 0L7.28 11.707a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1z"/>
                <path d="M5 19a2 2 0 002 2h10a2 2 0 002-2v-1a1 1 0 10-2 0v1H7v-1a1 1 0 10-2 0v1z"/>
              </svg>
            </a>
          ) : (
            <button
              type="button"
              aria-label="No recording available"
              disabled
              className="h-8 w-8 rounded-[5px] border border-[#0033331a] bg-white flex items-center justify-center text-[#9CA3AF]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 3a1 1 0 011 1v8.586l2.293-2.293a1 1 0 111.414 1.414l-4.007 4.007a1.25 1.25 0 01-1.414 0L7.28 11.707a1 1 0 111.414-1.414L11 12.586V4a1 1 0 011-1z"/>
                <path d="M5 19a2 2 0 002 2h10a2 2 0 002-2v-1a1 1 0 10-2 0v1H7v-1a1 1 0 10-2 0v1z"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  )

  // Collapsible (default) vs Plain render
  if (variant === "plain") {
    if (wrapper === "none") {
      return (
        <div className={className} {...rest}>
          {Inner}
        </div>
      )
    }
    return (
      <div className={["w-full rounded-[5px] border border-[#0033331a] bg-white p-4", className].filter(Boolean).join(" ")} {...rest}>
        {Inner}
      </div>
    )
  }

  return (
    <div className={["w-full rounded-[5px] border border-[#0033331a] bg-white", className].filter(Boolean).join(" ")} {...rest}>
      {/* Header */}
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={handleHeaderClick}
        className="w-full h-[48px] px-4 flex items-center justify-between"
      >
        {showTitle ? <span className="text-[18px] font-semibold text-[#0f3b3b]">{title}</span> : <span />}
        <svg className={"transition-transform duration-200 " + (isExpanded ? "rotate-180" : "rotate-0")} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="#0f3b3b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="rounded-[5px] border border-[#0033331a] bg-white p-4">
            {/* hidden audio element */}
            {Inner}
          </div>
        </div>
      )}
    </div>
  )
}
