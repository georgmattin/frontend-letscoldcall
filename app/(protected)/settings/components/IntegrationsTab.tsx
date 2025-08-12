"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Calendar, CheckCircle, ExternalLink, Settings, XCircle } from "lucide-react"

export interface CalendarItem {
  id: string
  name: string
  primary?: boolean
}

export interface CalendarEventItem {
  id: string
  title: string
  start: string | number | Date
  description?: string | null
}

interface IntegrationsTabProps {
  googleCalendarConnected: boolean
  googleCalendarInfo?: { email: string } | null
  loadingGoogleCalendar: boolean
  connectGoogleCalendar: () => void
  disconnectGoogleCalendar: () => void
}

export default function IntegrationsTab({
  googleCalendarConnected,
  googleCalendarInfo,
  loadingGoogleCalendar,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
}: IntegrationsTabProps) {
  return (
    <div className="bg-white rounded-[5px] border p-8" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#003333' }}>Integrations</h2>
          <p style={{ color: '#003333' }}>Connect with your favorite tools</p>
        </div>
      </div>

      {/* Google Calendar Integration */}
      <div className="border rounded-lg p-6 mb-6" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#ECFDF5' }}>
              <Calendar className="w-6 h-6" style={{ color: '#059669' }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: '#003333' }}>Google Calendar</h3>
              <p style={{ color: '#003333' }}>Sync your calls and meetings with Google Calendar</p>
              {googleCalendarConnected && googleCalendarInfo && (
                <div className="mt-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" style={{ color: '#059669' }} />
                  <span className="text-sm" style={{ color: '#003333' }}>Connected as {googleCalendarInfo.email}</span>
                </div>
              )}
              {googleCalendarConnected && (
                <div className="mt-1">
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#ECFDF5', color: '#003333' }}>
                    🎉 Callbacks and meetings from calls will be automatically added to your calendar!
                  </span>
                </div>
              )}
            </div>
          </div>

          {googleCalendarConnected ? (
            <Button onClick={disconnectGoogleCalendar} variant="outline" className="text-red-600 border-red-600 hover:bg-red-50">
              <XCircle className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <Button
              onClick={connectGoogleCalendar}
              disabled={loadingGoogleCalendar}
              className="border disabled:bg-gray-200 disabled:text-gray-400"
              style={{ backgroundColor: '#FFFFFF', color: '#059669', borderColor: '#059669', borderRadius: '11px' }}
              onMouseEnter={(e) => {
                if (!loadingGoogleCalendar) {
                  (e.currentTarget as HTMLButtonElement).style.color = '#003333'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#003333'
                  ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF'
                }
              }}
              onMouseLeave={(e) => {
                if (!loadingGoogleCalendar) {
                  (e.currentTarget as HTMLButtonElement).style.color = '#059669'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#059669'
                  ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF'
                }
              }}
            >
              {loadingGoogleCalendar ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2" style={{ borderColor: '#059669', borderBottomColor: '#FFFFFF' }} />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>
          )}
        </div>

        {/* Calendar Management removed by request */}
      </div>

      {/* Future integrations placeholder */}
      <div className="border rounded-lg p-6 bg-gray-50" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
        <div className="text-center">
          <Settings className="w-8 h-8 mx-auto mb-3" style={{ color: '#059669' }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: '#003333' }}>More Integrations Coming Soon</h3>
          <p style={{ color: '#003333' }}>We're working on integrations with Slack, HubSpot, Salesforce, and more.</p>
        </div>
      </div>
    </div>
  )
}
