"use client"

import type React from "react"
import { useRef, useState, useEffect, type MouseEvent } from "react"
import { cn } from "@/lib/utils"

interface ResizableColumnProps {
  children: React.ReactNode
  className?: string
  width?: number
  minWidth?: number
  maxWidth?: number
  onResize?: (width: number) => void
}

export function ResizableColumn({
  children,
  className,
  width = 200,
  minWidth = 100,
  maxWidth = 500,
  onResize,
}: ResizableColumnProps) {
  const [columnWidth, setColumnWidth] = useState(width)
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(width)
  const columnRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    startXRef.current = e.clientX
    startWidthRef.current = columnWidth
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isResizing) return

      const delta = e.clientX - startXRef.current
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + delta))

      setColumnWidth(newWidth)
      if (onResize) onResize(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing, minWidth, maxWidth, columnWidth, onResize])

  return (
    <div
      ref={columnRef}
      className={cn("relative flex items-center group", className)}
      style={{ width: columnWidth, minWidth, maxWidth }}
    >
      <div className="flex-1 truncate select-none">{children}</div>
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize group-hover:bg-gray-200 transition-colors"
        onMouseDown={handleMouseDown}
        style={{ zIndex: 2 }}
      />
    </div>
  )
}
