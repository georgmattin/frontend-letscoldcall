"use client"

import { useCallback, useState } from 'react'
import CallLogsSection from '../../testcomps/components/call-logs-section'
import CallLogsPopup from '../../testcomps/components/call-logs-popup'

type SelectedRow = {
  id: number
  name: string
  phone: string
  type: 'Incoming Call' | 'Outgoing Call' | 'Missed Call'
  durationSec: number
  dateTimeISO: string
  result: string
} | null

export default function LeadsPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<SelectedRow>(null)

  const handleRowClick = useCallback((row: NonNullable<SelectedRow>) => {
    setSelectedRow(row)
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const formatDateTime = (iso?: string) => {
    if (!iso) return undefined
    try {
      const d = new Date(iso)
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="flex justify-center items-start mt-8">
      <CallLogsSection
        title="Leads"
        titleIconSrc="/leads-icon.svg"
        onRowClick={handleRowClick}
        // Restrict to positive outcomes, but keep full filters UI identical to call-logs page
        restrictCallOutcomes={[
          'interested',
          'positive',
          'meeting-scheduled',
          'meeting-booked',
          'sold',
        ]}
        // Preselect same outcomes in the filter UI
        initialCallResults={[
          'interested',
          'positive',
          'meeting-scheduled',
          'meeting-booked',
          'sold',
        ]}
      />

      <CallLogsPopup
        modal
        isOpen={isOpen}
        onClose={handleClose}
        title={selectedRow?.type === 'Incoming Call' ? 'Inbound Call' : selectedRow?.type === 'Missed Call' ? 'Missed Call' : 'Outbound Call'}
        fromLabel={selectedRow?.type === 'Incoming Call' ? 'From' : 'From'}
        fromNumber={selectedRow?.phone ?? ''}
        toLabel={selectedRow?.type === 'Incoming Call' ? 'To' : 'To'}
        toNumber={selectedRow?.phone ?? ''}
        dateTime={selectedRow ? formatDateTime(selectedRow.dateTimeISO) : undefined}
        duration={selectedRow ? formatDuration(selectedRow.durationSec) : undefined}
        contactName={selectedRow?.name}
        contactPhone={selectedRow?.phone}
        callOutcome={selectedRow?.result ?? undefined}
        callHistoryId={selectedRow ? String(selectedRow.id) : undefined}
      />
    </div>
  )
}
