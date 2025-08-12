"use client"

import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface AudioSettingsModalProps {
  open: boolean
  onClose: () => void
  inputDevices: MediaDeviceInfo[]
  outputDevices: MediaDeviceInfo[]
  selectedInputDevice: string | null
  selectedOutputDevice: string | null
  saveAudioPreferences: (inputId: string, outputId: string) => void
  twilioReady: boolean
  twilioError: string | null
}

export default function AudioSettingsModal({
  open,
  onClose,
  inputDevices,
  outputDevices,
  selectedInputDevice,
  selectedOutputDevice,
  saveAudioPreferences,
  twilioReady,
  twilioError,
}: AudioSettingsModalProps) {
  if (!open) return null

  const fontStyle: React.CSSProperties = { fontFamily: "Open Sans, sans-serif" }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
      {/* Overlay matches Report A Problem */}
      <div
        className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 mx-4">
        <section
          className="border border-[#0033331a] bg-white rounded-[10px]"
          style={{ width: 561, minHeight: 260 }}
        >
        <div className="h-full w-full p-[30px] flex flex-col">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[23.04px] font-semibold text-[#003333]" style={fontStyle}>
                Audio Settings
              </h2>
              <p className="mt-2 text-[16px] text-[#003333]" style={fontStyle}>
                Configure your microphone and speaker for calling
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-[32px] h-[32px] rounded-[8px] border border-[#0033331a] text-[#003333] hover:bg-[#F4F6F6]"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4">
            {/* Microphone Selection */}
            <div>
              <label className="block mb-2 text-[14px] text-[#003333]" style={fontStyle}>
                Microphone
              </label>
              <Select
                value={selectedInputDevice || ""}
                onValueChange={(deviceId) => {
                  if (selectedOutputDevice) {
                    saveAudioPreferences(deviceId, selectedOutputDevice)
                  }
                }}
              >
                <SelectTrigger className="w-full h-[49px] px-4 rounded-[16px] border border-[#0033331a] text-[#003333]">
                  <SelectValue placeholder="Select microphone..." />
                </SelectTrigger>
                <SelectContent>
                  {inputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Speaker Selection */}
            <div>
              <label className="block mb-2 text-[14px] text-[#003333]" style={fontStyle}>
                Speaker
              </label>
              <Select
                value={selectedOutputDevice || ""}
                onValueChange={(deviceId) => {
                  if (selectedInputDevice) {
                    saveAudioPreferences(selectedInputDevice, deviceId)
                  }
                }}
              >
                <SelectTrigger className="w-full h-[49px] px-4 rounded-[16px] border border-[#0033331a] text-[#003333]">
                  <SelectValue placeholder="Select speaker..." />
                </SelectTrigger>
                <SelectContent>
                  {outputDevices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Speaker ${device.deviceId.slice(0, 5)}...`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Twilio Device Status */}
            <div className="rounded-[10px] border border-[#0033331a] p-4 bg-[#F4F6F6]">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${twilioReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-[14px] text-[#003333]" style={fontStyle}>
                  Twilio Status: {twilioReady ? 'Ready' : 'Not Ready'}
                </span>
              </div>
              {twilioError && (
                <p className="text-[12px] text-[#991B1B] mt-2" style={fontStyle}>{twilioError}</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={async () => {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                  stream.getTracks().forEach((track) => track.stop())
                  alert('Audio test successful! Your microphone is working.')
                } catch (error) {
                  alert('Audio test failed. Please check your microphone permissions.')
                }
              }}
              className="w-full h-[41px] rounded-[16px] border border-[#0033331a] text-[#003333] hover:bg-[#F4F6F6] text-[16px]"
              style={fontStyle}
            >
              Test Audio
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-[41px] rounded-[16px] bg-[#059669] hover:bg-[#047857] text-white text-[19.2px] font-semibold"
              style={fontStyle}
            >
              Save & Close
            </button>
          </div>
        </div>
        </section>
      </div>
    </div>
  )
}
