'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface CallHistoryRecord {
  id: string
  contact_name: string
  contact_company: string
  call_type: string
  duration: string
  phone_from: string
  phone_to: string
  call_date: string
  call_time: string
  outcome: string
  notes?: string
  created_at: string
}

interface CallHistoryTableProps {
  userId?: string
  searchTerm?: string
  contactFilter?: string
  outcomeFilter?: string
  timePeriodFilter?: string
}

export default function CallHistoryTable({ 
  userId, 
  searchTerm = '', 
  contactFilter = 'all', 
  outcomeFilter = 'all',
  timePeriodFilter = 'all'
}: CallHistoryTableProps) {
  const [callHistory, setCallHistory] = useState<CallHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isRowsDropdownOpen, setIsRowsDropdownOpen] = useState(false)
  const [sortField, setSortField] = useState<keyof CallHistoryRecord>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  const router = useRouter()
  const supabase = createClient()
  const rowsDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rowsDropdownRef.current && !rowsDropdownRef.current.contains(event.target as Node)) {
        setIsRowsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Fetch call history data
  useEffect(() => {
    fetchCallHistory()
  }, [userId, searchTerm, contactFilter, outcomeFilter, timePeriodFilter])

  const fetchCallHistory = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('call_history')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (searchTerm) {
        query = query.or(`contact_name.ilike.%${searchTerm}%,contact_company.ilike.%${searchTerm}%,phone_to.ilike.%${searchTerm}%`)
      }

      if (outcomeFilter !== 'all') {
        query = query.eq('outcome', outcomeFilter)
      }

      if (timePeriodFilter !== 'all') {
        const now = new Date()
        let startDate: Date
        
        switch (timePeriodFilter) {
          case 'last_7_days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case 'last_30_days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          default:
            startDate = new Date(0)
        }
        
        query = query.gte('created_at', startDate.toISOString())
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching call history:', error)
        return
      }

      setCallHistory(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Sort function
  const handleSort = (field: keyof CallHistoryRecord) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Apply sorting
  const sortedCallHistory = [...callHistory].sort((a, b) => {
    const aValue = a[sortField] ?? ''
    const bValue = b[sortField] ?? ''
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  // Pagination
  const totalPages = Math.ceil(sortedCallHistory.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const currentData = sortedCallHistory.slice(startIndex, endIndex)

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'meeting_booked':
        return 'bg-green-100 text-green-800'
      case 'no_answer':
        return 'bg-yellow-100 text-yellow-800'
      case 'not_interested':
        return 'bg-red-100 text-red-800'
      case 'callback_requested':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getOutcomeText = (outcome: string) => {
    switch (outcome) {
      case 'meeting_booked':
        return 'Meeting Booked'
      case 'no_answer':
        return 'No Answer'
      case 'not_interested':
        return 'Not Interested'
      case 'callback_requested':
        return 'Callback Requested'
      default:
        return outcome
    }
  }

  const formatDuration = (duration: string) => {
    if (!duration) return '0:00'
    const seconds = parseInt(duration)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ''
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Table Header with Pagination Controls */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span 
            className="text-sm text-gray-600"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            Showing {startIndex + 1}-{Math.min(endIndex, sortedCallHistory.length)} of {sortedCallHistory.length} calls
          </span>
          
          {/* Rows per page selector */}
          <div className="relative" ref={rowsDropdownRef}>
            <button
              onClick={() => setIsRowsDropdownOpen(!isRowsDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              <span>{rowsPerPage} rows</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isRowsDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                {[5, 10, 25, 50].map((rows) => (
                  <button
                    key={rows}
                    onClick={() => {
                      setRowsPerPage(rows)
                      setCurrentPage(1)
                      setIsRowsDropdownOpen(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    {rows} rows
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            Previous
          </button>
          
          <span 
            className="text-sm text-gray-600"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('contact_name')}
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                <div className="flex items-center space-x-1">
                  <span>Contact</span>
                  {sortField === 'contact_name' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('contact_company')}
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                <div className="flex items-center space-x-1">
                  <span>Company</span>
                  {sortField === 'contact_company' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                Phone
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('call_date')}
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                <div className="flex items-center space-x-1">
                  <span>Date & Time</span>
                  {sortField === 'call_date' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('duration')}
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                <div className="flex items-center space-x-1">
                  <span>Duration</span>
                  {sortField === 'duration' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('outcome')}
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                <div className="flex items-center space-x-1">
                  <span>Outcome</span>
                  {sortField === 'outcome' && (
                    <svg className={`w-4 h-4 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.map((call) => (
              <tr key={call.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div 
                    className="text-sm font-medium text-gray-900"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    {call.contact_name || 'Unknown'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div 
                    className="text-sm text-gray-600"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    {call.contact_company || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div 
                    className="text-sm text-gray-600"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    {call.phone_to}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div 
                    className="text-sm text-gray-900"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    {formatDate(call.call_date)}
                  </div>
                  <div 
                    className="text-sm text-gray-500"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    {formatTime(call.call_time)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div 
                    className="text-sm text-gray-900"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    {formatDuration(call.duration)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span 
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getOutcomeColor(call.outcome)}`}
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    {getOutcomeText(call.outcome)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div 
                    className="text-sm text-gray-600 max-w-xs truncate"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                    title={call.notes}
                  >
                    {call.notes || '-'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {currentData.length === 0 && (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <h3 
            className="mt-2 text-sm font-medium text-gray-900"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            No call history found
          </h3>
          <p 
            className="mt-1 text-sm text-gray-500"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            Try adjusting your filters or make some calls to see data here.
          </p>
        </div>
      )}
    </div>
  )
}
