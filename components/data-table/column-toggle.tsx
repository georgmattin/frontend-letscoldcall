"use client"

import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/data-table-ui/button"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/data-table-ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/data-table-ui/popover"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface ColumnToggleProps {
  columns: {
    id: string
    title: string
    isVisible: boolean
  }[]
  onToggle: (columnId: string) => void
}

export function ColumnToggle({ columns, onToggle }: ColumnToggleProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto border-gray-200 h-8 flex items-center bg-transparent">
          Columns
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="end">
        <Command>
          <CommandList>
            <CommandGroup>
              {columns.map((column) => (
                <div
                  key={column.id}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onToggle(column.id)
                  }}
                  className="flex items-center space-x-2 cursor-pointer px-2 py-1.5 text-sm hover:bg-gray-100 rounded-sm"
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-gray-200",
                      column.isVisible ? "bg-gray-900 text-white" : "opacity-50",
                    )}
                  >
                    {column.isVisible && <Check className="h-3 w-3" />}
                  </div>
                  <span>{column.title}</span>
                </div>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
