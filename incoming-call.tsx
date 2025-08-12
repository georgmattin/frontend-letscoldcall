"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Phone, PhoneOff, Users } from "lucide-react"

type IncomingCallProps = {
  visible?: boolean
  callerName?: string
  callerNumber?: string
  callerLabel?: string
  callerCompany?: string
  callerPosition?: string
  onAccept: () => void
  onReject: () => void
}

export default function IncomingCall({
  visible = true,
  callerName = "Unknown Caller",
  callerNumber = "",
  callerLabel = "",
  callerCompany = "",
  callerPosition = "",
  onAccept,
  onReject,
}: IncomingCallProps) {
  // Minimal UI: no internal secondary controls

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop to match other popups */}
      <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" />
      <div className="relative">
        {/* Pulsing border overlay to suggest ringing */}
        <div className="pulse-border absolute inset-0" aria-hidden="true" />
        <Card className="relative z-10 w-full max-w-sm bg-white border border-[#0033331a] text-[#003333] shadow-2xl rounded-[16px]">
          <CardContent className="p-8 text-center select-none">
          {/* Incoming call indicator */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#059669]/30">
              <div className="w-2 h-2 bg-[#059669] rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-[#003333]">Incoming call</span>
            </div>
          </div>

          {/* No profile image/avatar per requirements */}

          {/* Caller information */}
          <div className="mb-8 space-y-1 text-center">
            {callerCompany ? (
              <div className="text-[14px] font-normal text-[#003333]">{callerCompany}</div>
            ) : null}
            <div className="text-[24px] font-bold text-[#003333] truncate max-w-[18rem] mx-auto">{callerName || "Unknown Caller"}</div>
            {callerPosition ? (
              <div className="text-[14px] font-normal text-[#003333] opacity-90">{callerPosition}</div>
            ) : null}
            {callerNumber ? (
              <div className="text-[19.2px] font-semibold text-[#003333]">{callerNumber}</div>
            ) : null}
            {callerLabel ? (
              <div className="text-[12px] text-[#003333] opacity-60 flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>{callerLabel}</span>
              </div>
            ) : null}
          </div>

          {/* No secondary action buttons per requirements */}

          {/* Main action buttons */}
          <div className="flex justify-center gap-4">
            {/* Decline button */}
            <Button
              size="icon"
              className="w-16 h-16 rounded-[16px] bg-[#ff0000] hover:bg-[#ff0000]/90 border-2 border-[#ff0000] shadow-lg"
              onClick={onReject}
            >
              <PhoneOff className="w-7 h-7 text-white" />
              <span className="sr-only">Lõpeta kõne</span>
            </Button>

            {/* Accept button */}
            <Button
              size="icon"
              className="w-16 h-16 rounded-[16px] bg-[#059669] hover:bg-[#059669]/90 border-2 border-[#059669] shadow-lg"
              onClick={onAccept}
            >
              <Phone className="w-7 h-7 text-white" />
              <span className="sr-only">Vasta kõnele</span>
            </Button>
          </div>

          {/* Swipe hint removed for minimal UI */}
        </CardContent>
        </Card>
        <style jsx>{`
          .pulse-border {
            pointer-events: none;
          }
          /* Two-layer green pulse: soft fill + sharp ring lines */
          .pulse-border::before,
          .pulse-border::after {
            content: "";
            position: absolute;
            inset: -12px; /* wider glow around the card */
            border-radius: 16px;
            animation: ringPulseGreen 1.8s ease-out infinite;
          }
          /* Base soft green halo */
          .pulse-border::before {
            background: rgba(236, 253, 245, 0.95); /* #ECFDF5 slightly stronger */
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.35); /* #10B981 brighter */
          }
          /* Delayed sharper ring line */
          .pulse-border::after {
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.6); /* #10B981 brighter */
            animation-delay: 0.9s;
          }
          @keyframes ringPulseGreen {
            0% {
              box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.6);
              opacity: 1;
            }
            60% {
              box-shadow: 0 0 0 28px rgba(16, 185, 129, 0.30);
              opacity: 0.75;
            }
            100% {
              box-shadow: 0 0 0 56px rgba(16, 185, 129, 0);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
