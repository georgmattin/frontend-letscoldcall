'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { X, Phone, CheckCircle, XCircle, Calendar, Clock } from "lucide-react"

interface SessionStats {
  totalContacts: number
  contactsCompleted: number
  contactsInterested: number
  contactsNotInterested: number
  callbacksScheduled: number
  meetingsScheduled: number
  noAnswers: number
  wrongNumbers: number
  contactsSkipped: number
  totalCallTime: number
}

interface SessionSummaryPopupProps {
  isOpen: boolean
  onClose: () => void
  onContinueCalling: () => void
  onEndSession: () => void
  sessionStats: SessionStats
  contactListName: string
  processedContacts: number
  totalContacts: number
}

export default function SessionSummaryPopup({
  isOpen,
  onClose,
  onContinueCalling,
  onEndSession,
  sessionStats,
  contactListName,
  processedContacts,
  totalContacts
}: SessionSummaryPopupProps) {
  const [isEndingSession, setIsEndingSession] = useState(false)

  if (!isOpen) return null

  // Format duration helper function (renamed to avoid duplication)
  const formatSessionDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${remainingSeconds}s`
    }
  }

  const successRate = sessionStats.contactsCompleted > 0 
    ? ((sessionStats.contactsInterested / sessionStats.contactsCompleted) * 100).toFixed(1)
    : 0

  const handleEndSession = async () => {
    setIsEndingSession(true)
    await onEndSession()
    setIsEndingSession(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
            Session Summary
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contact List Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
            {contactListName}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Processed: {processedContacts} of {totalContacts} contacts</span>
            <span>•</span>
            <span>Progress: {totalContacts > 0 ? Math.round((processedContacts / totalContacts) * 100) : 0}%</span>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {sessionStats.contactsCompleted}
            </div>
            <div className="text-sm text-blue-700">Calls Made</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {sessionStats.contactsInterested}
            </div>
            <div className="text-sm text-green-700">Interested</div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {sessionStats.callbacksScheduled}
            </div>
            <div className="text-sm text-orange-700">Callbacks</div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {sessionStats.meetingsScheduled}
            </div>
            <div className="text-sm text-purple-700">Meetings</div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Call Outcomes */}
          <div className="border rounded-lg p-4">
            <h4 className="text-lg font-semibold mb-4 text-gray-800" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
              Call Outcomes
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Interested</span>
                </div>
                <span className="text-sm font-medium">{sessionStats.contactsInterested}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-700">Not Interested</span>
                </div>
                <span className="text-sm font-medium">{sessionStats.contactsNotInterested}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-700">Callbacks Scheduled</span>
                </div>
                <span className="text-sm font-medium">{sessionStats.callbacksScheduled}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-gray-700">Meetings Scheduled</span>
                </div>
                <span className="text-sm font-medium">{sessionStats.meetingsScheduled}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-500 rounded-sm"></div>
                  <span className="text-sm text-gray-700">No Answer</span>
                </div>
                <span className="text-sm font-medium">{sessionStats.noAnswers || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-sm"></div>
                  <span className="text-sm text-gray-700">Wrong Numbers</span>
                </div>
                <span className="text-sm font-medium">{sessionStats.wrongNumbers || 0}</span>
              </div>
            </div>
          </div>

          {/* Session Performance */}
          <div className="border rounded-lg p-4">
            <h4 className="text-lg font-semibold mb-4 text-gray-800" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
              Performance
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Success Rate</span>
                <span className="text-sm font-medium text-green-600">{successRate}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Total Call Time</span>
                <span className="text-sm font-medium">{formatSessionDuration(sessionStats.totalCallTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Contacts Remaining</span>
                <span className="text-sm font-medium">{totalContacts - processedContacts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Contacts Skipped</span>
                <span className="text-sm font-medium">{sessionStats.contactsSkipped || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Completion</span>
                <span className="text-sm font-medium">
                  {totalContacts > 0 ? Math.round((processedContacts / totalContacts) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onContinueCalling}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3"
          >
            <Phone className="w-4 h-4 mr-2" />
            Continue Calling
          </Button>
          
          <Button
            onClick={handleEndSession}
            disabled={isEndingSession}
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 py-3"
          >
            {isEndingSession ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Ending Session...
              </>
            ) : (
              'End Session'
            )}
          </Button>
        </div>

        {/* Note */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Your progress has been automatically saved. You can continue this session later.
        </p>
      </div>
    </div>
  )
}
