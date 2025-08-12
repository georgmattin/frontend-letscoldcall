"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Mic, MicOff, Phone, PhoneOff } from "lucide-react"

export type ContactInfo = {
  company?: string | null
  name?: string | null
  position?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
}

export type LocalTimeInfo = {
  location: string
  time: string
  timezone: string
} | null

export interface ContactCardProps {
  contact: ContactInfo
  callStarted: boolean
  isConnecting: boolean
  isMuted: boolean
  callDuration: number
  sessionReady: boolean
  twilioReady: boolean
  localTimeInfo: LocalTimeInfo
  onStartCall: () => void
  onToggleMute: () => void
  onEndCall: () => void
  onOpenAudioSettings: () => void
  // Navigation controls (optional)
  showNav?: boolean
  onPrev?: () => void
  onNext?: () => void
  onSkip?: () => void
  onEndSession?: () => void
  disablePrev?: boolean
  disableNext?: boolean
  disableSkip?: boolean
  showEndSession?: boolean
  disableEndSession?: boolean
}

function isTollFreeNumber(phone?: string | null): boolean {
  if (!phone) return false
  // Basic US/CA toll-free detection for 800/888/877/866/855/844/833 prefixes
  const digits = phone.replace(/\D/g, "")
  return /^(1800|1888|1877|1866|1855|1844|1833)/.test(digits)
}

export default function ContactCard({
  contact,
  callStarted,
  isConnecting,
  isMuted,
  callDuration,
  sessionReady,
  twilioReady,
  localTimeInfo,
  onStartCall,
  onToggleMute,
  onEndCall,
  onOpenAudioSettings,
  showNav = false,
  onPrev,
  onNext,
  onSkip,
  onEndSession,
  disablePrev,
  disableNext,
  disableSkip,
  showEndSession,
  disableEndSession,
}: ContactCardProps) {
  return (
    <div className="flex flex-col sticky top-4 self-start">
      {/* Contact card - 354px wide */}
      <div
        className="bg-white border flex flex-col"
        style={{
          width: "354px",
          minHeight: "500px",
          borderWidth: "0.5px",
          borderColor: "rgba(0, 51, 51, 0.1)",
          borderRadius: "10px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#003333]/10">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                callStarted ? "bg-red-500" : isConnecting ? "bg-yellow-500" : "bg-[#059669]"
              }`}
            ></div>
            <span className="text-sm font-medium text-gray-700">
              {callStarted ? "In Call" : isConnecting ? "Connecting..." : "Ready To Call"}
            </span>
          </div>
          <span
            className="text-sm text-[#059669] cursor-pointer hover:underline"
            onClick={onOpenAudioSettings}
          >
            Audio Settings
          </span>
        </div>

        {/* Contact Info */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">{contact.company || "Company"}</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{contact.name || "Loading..."}</h2>
          <p className="text-sm text-gray-500 mb-8">{contact.position || "Contact"}</p>

          {/* Phone Number */}
          <p className="text-lg font-semibold text-gray-900 mb-6">{contact.phone || "No phone"}</p>

          {/* Call Duration Display (when in call) */}
          {callStarted && (
            <div className="mb-4">
              <div className="text-2xl font-bold text-[#059669]">
                {Math.floor(callDuration / 60).toString().padStart(2, "0")}:
                {(callDuration % 60).toString().padStart(2, "0")}
              </div>
              <div className="text-sm text-gray-500">Call Duration</div>
            </div>
          )}

          {/* Call Button / In-Call Controls */}
          {!callStarted ? (
            <Button
              className="bg-[#059669] hover:bg-[#047857] text-white px-8 py-3 rounded-[11px] flex items-center gap-2 mb-8"
              disabled={isConnecting || !contact.phone || !sessionReady || !twilioReady}
              onClick={onStartCall}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  Call Now
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-3 mb-8">
              <Button
                onClick={onToggleMute}
                variant="outline"
                size="sm"
                className={`px-4 py-2 rounded-full ${
                  isMuted ? "bg-yellow-100 border-yellow-300" : "border-[#003333]/10"
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                onClick={onEndCall}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full flex items-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                End Call
              </Button>
            </div>
          )}

          {/* Location and Time */}
          {localTimeInfo && (
            <div className="flex flex-col gap-3 mb-6">
              {/* Location/Toll-Free Status */}
              <div
                className={`px-3 py-1 rounded-full text-sm ${
                  isTollFreeNumber(contact.phone)
                    ? "bg-orange-100 text-orange-700"
                    : "bg-white text-gray-700 border border-[#003333]/10"
                }`}
              >
                {isTollFreeNumber(contact.phone) ? "Toll-Free Number" : localTimeInfo.location}
              </div>

              {/* Time Display */}
              {!isTollFreeNumber(contact.phone) && (
                <div className="bg-[#ECFDF5] text-[#059669] px-3 py-1 rounded-full text-sm w-fit self-center">
                  {localTimeInfo.time}
                </div>
              )}
            </div>
          )}

          {/* Contact Details */}
          <div className="text-sm text-[#059669] space-y-1">
            {contact.email && (
              <p
                className="hover:underline cursor-pointer break-all"
                onClick={() => {
                  if (contact.email) {
                    navigator.clipboard.writeText(contact.email)
                    alert("Email copied to clipboard!")
                  }
                }}
                title="Click to copy email"
              >
                {contact.email}
              </p>
            )}
            {contact.website && (
              <p
                className="hover:underline cursor-pointer break-all flex items-center gap-1"
                onClick={() => {
                  if (contact.website) {
                    window.open(contact.website, "_blank")
                  }
                }}
                title="Click to open website"
              >
                {contact.website}
                <img
                  src="/website-link-icon.svg"
                  alt="External link"
                  className="w-[11px] h-[11px] flex-shrink-0"
                />
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Nav under the contact card */}
      {showNav && (
        <div className="flex flex-col items-center gap-3 mt-4" style={{ width: '354px' }}>
          {/* Prev / Next */}
          <div className="flex gap-5 w-full">
            <Button 
              variant="outline" 
              className="flex-1 py-2 border-[#003333]/10 hover:border-[#1F2937] bg-[#F9FAFB] text-gray-700 hover:bg-gray-50 hover:text-[#1F2937] rounded-[11px]"
              onClick={onPrev}
              disabled={!!disablePrev}
            >
              Previous Contact
            </Button>
            <Button 
              className={`flex-1 py-2 rounded-[11px] transition-colors ${
                disableNext
                  ? 'bg-gray-400 hover:bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-[#059669] hover:bg-[#047857] text-white'
              }`}
              onClick={onNext}
              disabled={!!disableNext}
            >
              Next Contact
            </Button>
          </div>

          {/* Skip */}
          <button 
            className="text-sm text-[#059669] hover:text-[#047857] underline"
            onClick={onSkip}
            disabled={!!disableSkip}
          >
            Skip contact
          </button>

          {/* End Session */}
          {showEndSession && (
            <Button 
              className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg mt-2"
              onClick={onEndSession}
              disabled={!!disableEndSession}
            >
              End Session
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
