"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ScriptSettingsTabProps {
  callerName: string
  companyName: string
  setCallerName: (v: string) => void
  setCompanyName: (v: string) => void
  scriptsLoading: boolean
  onSave: () => void
}

export default function ScriptSettingsTab({
  callerName,
  companyName,
  setCallerName,
  setCompanyName,
  scriptsLoading,
  onSave,
}: ScriptSettingsTabProps) {
  return (
    <div className="bg-white rounded-[5px] border p-8" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#003333' }}>Script Settings</h2>
          <p style={{ color: '#003333' }}>
            Configure your personal information that will be used in script dynamic variables.<br /> These values will replace
            placeholders like <span className="font-mono px-2 py-1 rounded text-sm" style={{ backgroundColor: '#ECFDF5', color: '#003333' }}>[my_name]</span> and{' '}
            <span className="font-mono px-2 py-1 rounded text-sm" style={{ backgroundColor: '#ECFDF5', color: '#003333' }}>[my_company_name]</span> in your scripts.
          </p>
        </div>
      </div>


      {scriptsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#059669' }}></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Caller Name - Required */}
            <div>
              <Label htmlFor="callerName" className="text-[16px] font-semibold text-[#003333] flex items-center gap-2">
                Your Name
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="callerName"
                type="text"
                value={callerName}
                onChange={(e) => setCallerName(e.target.value)}
                className="mt-1"
                placeholder="e.g., John Smith"
              />
              <p className="text-xs mt-1" style={{ color: '#003333' }}>
                This replaces <span className="font-mono">[my_name]</span> in scripts
              </p>
            </div>

            {/* Company Name - Required */}
            <div>
              <Label htmlFor="companyName" className="text-[16px] font-semibold text-[#003333] flex items-center gap-2">
                Company Name
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1"
                placeholder="e.g., ABC Solutions"
              />
              <p className="text-xs mt-1" style={{ color: '#003333' }}>
                This replaces <span className="font-mono">[my_company_name]</span> in scripts
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="border-t pt-6" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
            <Button
              onClick={onSave}
              disabled={scriptsLoading || !callerName.trim() || !companyName.trim()}
              className="text-white px-6 py-2"
              style={{ backgroundColor: '#059669', borderRadius: '11px' }}
              onMouseEnter={(e) => { if (!scriptsLoading) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#047857' } }}
              onMouseLeave={(e) => { if (!scriptsLoading) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#059669' } }}
            >
              {scriptsLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2" style={{ borderColor: '#059669', borderBottomColor: '#FFFFFF' }}></div>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
            <p className="text-xs mt-2" style={{ color: '#003333' }}>
              * Required fields must be filled to use dynamic variables in scripts
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
