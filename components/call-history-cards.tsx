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

interface CallHistoryCardsProps {
  userId?: string
  searchTerm?: string
  contactFilter?: string
  outcomeFilter?: string
  timePeriodFilter?: string
}

export default function CallHistoryCards({ 
  userId, 
  searchTerm = '', 
  contactFilter = 'all', 
  outcomeFilter = 'all',
  timePeriodFilter = 'all'
}: CallHistoryCardsProps) {
  const [callHistory, setCallHistory] = useState<CallHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isRowsDropdownOpen, setIsRowsDropdownOpen] = useState(false)
  const [isRowsDropdownHovered, setIsRowsDropdownHovered] = useState(false)
  
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

  useEffect(() => {
    fetchCallHistory()
  }, [userId])

  const fetchCallHistory = async () => {
    try {
      setLoading(true)
      
      // Get current user if userId not provided
      let currentUserId = userId
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.error('No user found')
          setLoading(false)
          return
        }
        currentUserId = user.id
      }

      // For now, using mock data since we don't have call_history table yet
      // TODO: Replace with actual database query when call_history table is created
      const mockData: CallHistoryRecord[] = [
        {
          id: '1',
          contact_name: 'Steven Stanley',
          contact_company: 'Protective Medical Products',
          call_type: 'Incoming Call',
          duration: '03:55',
          phone_from: '+1 813-944-3044',
          phone_to: '+1 805-498-6631',
          call_date: 'December 19th, 2025',
          call_time: '6:30 PM',
          outcome: 'Meeting Booked',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          contact_name: 'John Smith',
          contact_company: 'Tech Solutions Inc',
          call_type: 'Outgoing Call',
          duration: '02:15',
          phone_from: '+1 805-498-6631',
          phone_to: '+1 555-123-4567',
          call_date: 'December 18th, 2025',
          call_time: '2:15 PM',
          outcome: 'No Answer',
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          contact_name: 'Sarah Johnson',
          contact_company: 'Marketing Pro',
          call_type: 'Outgoing Call',
          duration: '05:42',
          phone_from: '+1 805-498-6631',
          phone_to: '+1 555-987-6543',
          call_date: 'December 17th, 2025',
          call_time: '11:30 AM',
          outcome: 'Not Interested',
          created_at: new Date().toISOString()
        }
      ]

      setCallHistory(mockData)
    } catch (err) {
      console.error('Error fetching call history:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter call history based on search term and filters
  const allFilteredCalls = callHistory.filter(call => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      call.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.contact_company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.phone_to.includes(searchTerm) ||
      call.phone_from.includes(searchTerm)
    
    // Contact filter
    const matchesContact = contactFilter === 'all' || 
      (contactFilter === 'recent' && new Date(call.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    
    // Outcome filter
    const matchesOutcome = outcomeFilter === 'all' || call.outcome.toLowerCase().replace(' ', '_') === outcomeFilter
    
    // Time period filter
    const matchesTimePeriod = timePeriodFilter === 'all' || 
      (timePeriodFilter === 'last_7_days' && new Date(call.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
      (timePeriodFilter === 'last_30_days' && new Date(call.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    
    return matchesSearch && matchesContact && matchesOutcome && matchesTimePeriod
  })

  // Calculate pagination values
  const totalPages = Math.ceil(allFilteredCalls.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedCalls = allFilteredCalls.slice(startIndex, endIndex)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, contactFilter, outcomeFilter, timePeriodFilter, rowsPerPage])

  const getOutcomeButtonStyle = (outcome: string) => {
    switch (outcome.toLowerCase()) {
      case 'meeting booked':
        return 'bg-green-500 hover:bg-green-600 text-white'
      case 'no answer':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white'
      case 'not interested':
        return 'bg-red-500 hover:bg-red-600 text-white'
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div 
            key={i}
            className="bg-white border border-gray-300 rounded-lg animate-pulse"
            style={{ 
              height: '100px',
              borderWidth: '1px'
            }}
          >
            <div className="p-4 space-y-4">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (callHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-4" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
          No call history found
        </div>
        <p className="text-gray-400" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
          Your call history will appear here once you make calls
        </p>
      </div>
    )
  }

  if (allFilteredCalls.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-4" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
          No calls match your filters
        </div>
        <p className="text-gray-400" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
          Try adjusting your search or filter criteria
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Call History Cards */}
      <div className="space-y-4">
        {paginatedCalls.map((call) => (
          <div 
            key={call.id}
            className="bg-white border rounded-lg transition-all duration-200 border-gray-300"
            style={{ 
              height: '100px',
              borderWidth: '1px',
              borderLeftColor: '#3B82F6',
              borderLeftWidth: '4px'
            }}
          >
            {/* Call info */}
            <div className="flex-1 flex items-center justify-between p-4 h-full">
              {/* Left section - Call details */}
              <div className="flex items-center h-full">
                {/* Name and company */}
                <div className="px-4">
                  <h3 
                    className="font-semibold text-[#253053] text-[16px]"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    {call.contact_name}
                  </h3>
                  <p 
                    className="text-[#99A2BB] text-[16px]"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    {call.contact_company}
                  </p>
                </div>
                
                {/* Vertical separator */}
                <div 
                  className="border-l border-gray-300 mx-2"
                  style={{ height: '68px' }}
                ></div>
                
                {/* Call type and duration */}
                <div className="px-4">
                  <div className="flex items-center mb-1">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span 
                      className="text-[#253053] text-[16px] font-semibold"
                      style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                    >
                      {call.call_type}
                    </span>
                  </div>
                  <p 
                    className="text-[#99A2BB] text-[16px]"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    Duration: {call.duration}
                  </p>
                </div>
                
                {/* Vertical separator */}
                <div 
                  className="border-l border-gray-300 mx-2"
                  style={{ height: '68px' }}
                ></div>
                
                {/* Phone numbers */}
                <div className="px-4">
                  <p 
                    className="text-[#0D8BFF] text-[16px] font-normal cursor-pointer hover:underline"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    {call.phone_to}
                  </p>
                  <p 
                    className="text-[#99A2BB] text-[16px]"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    From {call.phone_from}
                  </p>
                </div>
                
                {/* Vertical separator */}
                <div 
                  className="border-l border-gray-300 mx-2"
                  style={{ height: '68px' }}
                ></div>
                
                {/* Date and time */}
                <div className="px-4">
                  <p 
                    className="text-[#253053] text-[16px] font-semibold"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    {call.call_date}
                  </p>
                  <p 
                    className="text-[#99A2BB] text-[16px]"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    AT {call.call_time}
                  </p>
                </div>
              </div>
              
              {/* Right section - Actions */}
              <div className="flex items-center space-x-3">
                {/* Outcome button */}
                <button 
                  className={`px-4 py-2 rounded-lg text-[16px] font-medium transition-colors ${getOutcomeButtonStyle(call.outcome)}`}
                  style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                >
                  {call.outcome}
                </button>
                
                {/* Arrow button */}
                <button className="bg-white h-[52px] w-[52px] border border-gray-300 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {allFilteredCalls.length > 0 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          {/* Left side - Rows per page and call count */}
          <div className="flex items-center space-x-6">
            {/* Rows per page dropdown */}
            <div className="flex items-center space-x-3">
              <span 
                className="text-sm font-medium"
                style={{ 
                  fontFamily: 'Source Sans Pro, sans-serif',
                  color: '#253053'
                }}
              >
                Rows per page:
              </span>
              <div ref={rowsDropdownRef} className="relative">
                <div 
                  onClick={() => setIsRowsDropdownOpen(!isRowsDropdownOpen)}
                  onMouseEnter={() => setIsRowsDropdownHovered(true)}
                  onMouseLeave={() => setIsRowsDropdownHovered(false)}
                  className="rounded-lg flex items-center cursor-pointer transition-colors"
                  style={{ 
                    width: '80px',
                    height: '40px',
                    borderColor: isRowsDropdownHovered ? '#253053' : '#D1D5DB',
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                >
                  {/* Text section */}
                  <div className="flex-1 px-3">
                    <span 
                      style={{ 
                        fontSize: '14px',
                        fontFamily: 'Source Sans Pro, sans-serif',
                        color: '#253053'
                      }}
                    >
                      {rowsPerPage}
                    </span>
                  </div>
                  
                  {/* Vertical separator line */}
                  <div 
                    className="h-full border-l transition-colors"
                    style={{ borderColor: isRowsDropdownHovered ? '#253053' : '#D1D5DB' }}
                  ></div>
                  
                  {/* Icon section */}
                  <div className="flex items-center justify-center px-3">
                    <svg 
                      className={`w-4 h-4 transition-transform ${isRowsDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      style={{ color: '#253053' }}
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M19 9l-7 7-7-7" 
                      />
                    </svg>
                  </div>
                </div>
                
                {/* Dropdown menu */}
                {isRowsDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    {[5, 10, 25, 50, 100].map((value) => (
                      <div 
                        key={value}
                        onClick={() => {
                          setRowsPerPage(value)
                          setIsRowsDropdownOpen(false)
                        }}
                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-center"
                        style={{ 
                          fontFamily: 'Source Sans Pro, sans-serif',
                          color: '#253053',
                          fontSize: '14px',
                          borderBottom: value !== 100 ? '1px solid #F3F4F6' : 'none'
                        }}
                      >
                        {value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Call count info */}
            <span 
              className="text-sm"
              style={{ 
                fontFamily: 'Source Sans Pro, sans-serif',
                color: '#636B83'
              }}
            >
              Showing {startIndex + 1}-{Math.min(endIndex, allFilteredCalls.length)} of {allFilteredCalls.length} calls
            </span>
          </div>

          {/* Right side - Page navigation */}
          <div className="flex items-center space-x-4">
            {/* Page info */}
            <span 
              className="text-sm font-medium"
              style={{ 
                fontFamily: 'Source Sans Pro, sans-serif',
                color: '#253053'
              }}
            >
              Page {currentPage} of {totalPages}
            </span>

            {/* Navigation buttons */}
            <div className="flex items-center space-x-2">
              {/* Previous button */}
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="border rounded-lg p-2 transition-colors"
                style={{
                  borderColor: currentPage === 1 ? '#D1D5DB' : '#D1D5DB',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.currentTarget.style.borderColor = '#253053'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB'
                }}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: currentPage === 1 ? '#99A2BB' : '#253053' }}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 19l-7-7 7-7" 
                  />
                </svg>
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + Math.max(1, currentPage - 2)
                if (pageNum > totalPages) return null
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className="border rounded-lg px-3 py-2 transition-colors"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderColor: pageNum === currentPage ? '#253053' : '#D1D5DB',
                      backgroundColor: pageNum === currentPage ? '#F8F9FA' : 'transparent',
                      fontFamily: 'Source Sans Pro, sans-serif',
                      fontSize: '14px',
                      color: pageNum === currentPage ? '#253053' : '#636B83'
                    }}
                    onMouseEnter={(e) => {
                      if (pageNum !== currentPage) {
                        e.currentTarget.style.borderColor = '#253053'
                        e.currentTarget.style.color = '#253053'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (pageNum !== currentPage) {
                        e.currentTarget.style.borderColor = '#D1D5DB'
                        e.currentTarget.style.color = '#636B83'
                      }
                    }}
                  >
                    {pageNum}
                  </button>
                )
              })}

              {/* Next button */}
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="border rounded-lg p-2 transition-colors"
                style={{
                  borderColor: currentPage === totalPages ? '#D1D5DB' : '#D1D5DB',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages) {
                    e.currentTarget.style.borderColor = '#253053'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB'
                }}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  style={{ color: currentPage === totalPages ? '#99A2BB' : '#253053' }}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 