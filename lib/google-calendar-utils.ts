// Google Calendar integration utilities

export interface CalendarEventData {
  title: string
  description?: string
  startDate: string
  startTime: string
  endDate?: string
  endTime?: string
  attendees?: string
  contactInfo?: {
    name: string
    phone: string
    company?: string
  }
}

export async function createGoogleCalendarEvent(eventData: CalendarEventData) {
  try {
    const response = await fetch('/api/google-calendar/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    })

    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        event: data.event
      }
    } else {
      const error = await response.json()
      return {
        success: false,
        error: error.error || 'Failed to create calendar event'
      }
    }
  } catch (error) {
    console.error('Error creating Google Calendar event:', error)
    return {
      success: false,
      error: 'Network error while creating calendar event'
    }
  }
}

export async function checkGoogleCalendarIntegration() {
  try {
    const response = await fetch('/api/google-calendar/events')
    return response.ok
  } catch (error) {
    return false
  }
}

export function formatCallbackEvent(contact: any, callbackDate: string, callbackTime: string, reason?: string): CalendarEventData {
  const contactName = contact?.first_name && contact?.last_name 
    ? `${contact.first_name} ${contact.last_name}`
    : contact?.name || 'Unknown Contact'
  
  return {
    title: `Callback: ${contactName}`,
    description: `Scheduled callback with ${contactName}\n\n` +
                `Phone: ${contact?.phone || 'Not provided'}\n` +
                `Company: ${contact?.company || 'Not provided'}\n` +
                `Reason: ${reason || 'Follow-up call'}\n\n` +
                `Original call outcome: Callback requested`,
    startDate: callbackDate,
    startTime: callbackTime,
    endDate: callbackDate,
    endTime: addMinutesToTime(callbackTime, 30), // Default 30 min duration
    contactInfo: {
      name: contactName,
      phone: contact?.phone || '',
      company: contact?.company || ''
    }
  }
}

export function formatMeetingEvent(contact: any, meetingDate: string, meetingTime: string, notes?: string): CalendarEventData {
  const contactName = contact?.first_name && contact?.last_name 
    ? `${contact.first_name} ${contact.last_name}`
    : contact?.name || 'Unknown Contact'
  
  return {
    title: `Meeting: ${contactName}`,
    description: `Scheduled meeting with ${contactName}\n\n` +
                `Phone: ${contact?.phone || 'Not provided'}\n` +
                `Company: ${contact?.company || 'Not provided'}\n` +
                `Meeting Notes: ${notes || 'No additional notes'}\n\n` +
                `Original call outcome: Meeting scheduled`,
    startDate: meetingDate,
    startTime: meetingTime,
    endDate: meetingDate,
    endTime: addMinutesToTime(meetingTime, 60), // Default 1 hour duration
    contactInfo: {
      name: contactName,
      phone: contact?.phone || '',
      company: contact?.company || ''
    }
  }
}

// Helper function to add minutes to time string
function addMinutesToTime(timeString: string, minutes: number): string {
  const [hours, mins] = timeString.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, mins + minutes, 0, 0)
  
  return date.toTimeString().slice(0, 5) // Return HH:MM format
} 