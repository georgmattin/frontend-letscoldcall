'use client'

import { Calendar, Clock } from "lucide-react"

interface CallbackSectionProps {
  callbackDate: string
  setCallbackDate: (date: string) => void
  callbackTime: string
  setCallbackTime: (time: string) => void
  isSavingCallback: boolean
  setIsSavingCallback: (saving: boolean) => void
  callbackSaved: boolean
  setCallbackSaved: (saved: boolean) => void
  isAddingCallbackToCalendar: boolean
  setIsAddingCallbackToCalendar: (adding: boolean) => void
  callbackAddedToCalendar: boolean
  setCallbackAddedToCalendar: (added: boolean) => void
  hasGoogleCalendarIntegration: boolean
  googleCalendarEmail?: string
  saveCallbackToDatabase: (date: string, time: string) => Promise<boolean>
}

export default function CallbackSection({
  callbackDate,
  setCallbackDate,
  callbackTime,
  setCallbackTime,
  isSavingCallback,
  setIsSavingCallback,
  callbackSaved,
  setCallbackSaved,
  isAddingCallbackToCalendar,
  setIsAddingCallbackToCalendar,
  callbackAddedToCalendar,
  setCallbackAddedToCalendar,
  hasGoogleCalendarIntegration,
  googleCalendarEmail,
  saveCallbackToDatabase
}: CallbackSectionProps) {
  return (
    <div 
      className="mt-4 p-4 rounded-lg"
      style={{ 
        backgroundColor: '#FFF8EE',
        color: '#7C2D12'
      }}
    >
      <h3 className="font-semibold text-base mb-1">Schedule Callback</h3>
      <p className="text-sm mb-4">Set up a e-mail and in-app reminder to call back</p>
      
      <div className="flex gap-3 mb-4">
        {/* Date Input */}
        <div className="flex-1 relative">
          <input
            type="date"
            value={callbackDate}
            onChange={(e) => setCallbackDate(e.target.value)}
            className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            style={{ 
              color: '#7C2D12',
              colorScheme: 'light'
            }}
          />
          <Calendar className="absolute left-3 top-2.5 w-5 h-5 pointer-events-none" style={{ color: '#7C2D12' }} />
        </div>
        
        {/* Time Input */}
        <div className="flex-1 relative">
          <input
            type="time"
            value={callbackTime}
            onChange={(e) => setCallbackTime(e.target.value)}
            className="w-full h-10 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            style={{ 
              color: '#7C2D12',
              colorScheme: 'light'
            }}
          />
          <Clock className="absolute left-3 top-2.5 w-5 h-5 pointer-events-none" style={{ color: '#7C2D12' }} />
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        {/* Save Button */}
        <button 
          onClick={async () => {
            if (!callbackDate || !callbackTime) {
              alert('Please select both date and time for the callback')
              return
            }
            
            console.log('💾 Starting callback save...')
            setIsSavingCallback(true)
            
            const success = await saveCallbackToDatabase(callbackDate, callbackTime)
            setIsSavingCallback(false)
            
            if (success) {
              console.log('✅ Callback saved successfully')
              setCallbackSaved(true)
              
              // Reset success state after 3 seconds
              setTimeout(() => {
                setCallbackSaved(false)
              }, 3000)
            } else {
              alert('Failed to schedule callback. Please try again.')
            }
          }}
          disabled={isSavingCallback || callbackSaved}
          className="w-full h-10 text-white font-medium rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#FF4100' }}
        >
          {isSavingCallback ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : callbackSaved ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </>
          ) : (
            'Save'
          )}
        </button>
        
        {/* Google Calendar Integration */}
        {hasGoogleCalendarIntegration ? (
          <div className="w-full flex flex-col items-center justify-center text-sm text-gray-600">
            <div>This will be automatically added to your Google Calendar</div>
            {googleCalendarEmail && (
              <div className="text-xs text-gray-500 mt-1">({googleCalendarEmail})</div>
            )}
          </div>
        ) : (
          <button 
            onClick={async () => {
              if (!callbackDate || !callbackTime) {
                alert('Please select both date and time first')
                return
              }
              
              console.log('🗓️ Starting callback calendar add...')
              setIsAddingCallbackToCalendar(true)
              
              // Simulate adding to calendar (replace with actual Google Calendar API call)
              setTimeout(() => {
                console.log('🗓️ Callback calendar add completed')
                setIsAddingCallbackToCalendar(false)
                setCallbackAddedToCalendar(true)
                
                // Reset after 3 seconds
                setTimeout(() => {
                  setCallbackAddedToCalendar(false)
                }, 3000)
              }, 2000)
            }}
            disabled={isAddingCallbackToCalendar || callbackAddedToCalendar}
            className="w-full h-10 bg-transparent border border-gray-300 rounded-lg text-sm font-medium transition-colors hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAddingCallbackToCalendar ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding to Calendar...
              </>
            ) : callbackAddedToCalendar ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Added To Calendar
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Add To Google Calendar
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
