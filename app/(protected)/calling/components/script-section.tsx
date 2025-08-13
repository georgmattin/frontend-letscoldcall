"use client"

import React, { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { replaceScriptVariables } from '@/lib/script-utils'
import { Open_Sans } from 'next/font/google'
import { useRouter } from 'next/navigation'
import SecondaryButtonWithPlus from '../../../testcomps/components/secondary-button-with-plus'
import CreateAScriptPopup from '../../../testcomps/components/create-a-script-popup'

const openSans = Open_Sans({ subsets: ['latin'] })

export type Objection = { objection: string; response: string; reason?: string }
export type ScriptItem = { id: number; name: string; content: string; objections?: Objection[] }

export interface ScriptSectionProps {
  loadingScripts: boolean
  scripts: ScriptItem[]
  selectedScript: ScriptItem | null
  selectedScriptId: number | null
  onChangeScript: (id: number) => void
  activeTab: 'script' | 'objections'
  setActiveTab: (tab: 'script' | 'objections') => void
  isScriptCollapsed: boolean
  onToggleCollapse: () => void
  onEditScript: () => void
  contact: { name?: string; company?: string; position?: string; email?: string; phone?: string } | null
  callerName: string
  companyName: string
  scriptObjections: Objection[]
}

export default function ScriptSection({
  loadingScripts,
  scripts,
  selectedScript,
  selectedScriptId,
  onChangeScript,
  activeTab,
  setActiveTab,
  isScriptCollapsed,
  onToggleCollapse,
  onEditScript,
  contact,
  callerName,
  companyName,
  scriptObjections,
}: ScriptSectionProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  return (
    <div 
      className={`bg-white border p-6 text-base flex flex-col overflow-hidden ${openSans.className}`}
      style={{ 
        width: '720px', 
        maxHeight: isScriptCollapsed ? 'auto' : '500px',
        borderWidth: '0.5px',
        borderColor: '#003333/10',
        borderRadius: '10px'
      }}
    >
      {/* Header with dropdown and tabs */}
      <div className={`flex items-center gap-2 flex-none ${!isScriptCollapsed ? 'mb-6' : ''}`}>
        {/* Left: Script Selection */}
        <Select
          value={selectedScriptId?.toString() || ""}
          onValueChange={(value) => {
            const scriptId = parseInt(value)
            if (!Number.isNaN(scriptId)) {
              onChangeScript(scriptId)
            }
          }}
          disabled={loadingScripts}
        >
          <SelectTrigger 
            className="rounded-[5px] flex items-center transition-colors"
            style={{ 
              width: '333px',
              height: '52px',
              borderColor: '#003333/10',
              borderWidth: '0.5px',
              fontSize: '14px',
              fontFamily: 'Open Sans, sans-serif',
              color: '#253053'
            }}
          >
            <SelectValue placeholder={loadingScripts ? "Loading scripts..." : (scripts.length === 0 ? "No Scripts" : "Select script...")}>
              {selectedScript && (
                <span className="truncate">{selectedScript.name}</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-[5px] border border-[#003333]/10">
            {loadingScripts ? (
              <div className="p-2 text-[14px] text-[#003333]">Loading...</div>
            ) : scripts.length > 0 ? (
              scripts.map((script) => (
                <SelectItem key={script.id} value={script.id.toString()}>
                  {script.name}
                </SelectItem>
              ))
            ) : (
              <div className="p-3 flex items-center justify-between gap-3">
                <span className="text-[14px] text-[#9AA6B2]">No Scripts</span>
                <SecondaryButtonWithPlus
                  label="Create A New Script"
                  className="h-8 rounded-[12px] px-3"
                  onClick={() => setCreateOpen(true)}
                />
              </div>
            )}
          </SelectContent>
        </Select>

        {/* Middle: Tabs */}
        <div className="flex items-center gap-1 border border-[#003333]/10 rounded-[5px] p-1 h-[52px]">
          <Button
            onClick={() => setActiveTab("script")}
            className={`h-[42px] px-4 text-[14px] font-medium rounded-[8px] ${
              activeTab === "script" 
                ? "bg-[#003333] text-white hover:bg-[#003333] cursor-default" 
                : "bg-transparent text-[#003333] hover:bg-[#F3F4F6]"
            }`}
          >
            Script
          </Button>
          <Button
            onClick={() => setActiveTab("objections")}
            className={`h-[42px] px-4 text-[14px] font-medium rounded-[8px] ${
              activeTab === "objections" 
                ? "bg-[#003333] text-white hover:bg-[#003333] cursor-default" 
                : "bg-transparent text-[#003333] hover:bg-[#F3F4F6]"
            }`}
          >
            Objections
          </Button>
        </div>

        {/* Right: Icons with borders */}
        <div className="flex items-center gap-2 ml-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-[52px] w-[52px] p-0 border-[#003333]/10"
            onClick={onEditScript}
            disabled={!selectedScript}
          >
            <Edit className="h-[52px] w-[52px] text-[#003333]" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-[52px] w-[52px] p-0 border-[#003333]/10"
            onClick={onToggleCollapse}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 text-[#003333] transition-transform ${!isScriptCollapsed ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Script Content */}
      {!isScriptCollapsed && (
        <div className="border border-[#003333]/10 rounded-[11px] p-4 flex-1 min-h-0 overflow-y-auto">
          {activeTab === "script" ? (
            <div className="text-base text-gray-800 leading-relaxed space-y-3">
              {selectedScript ? (
                <div 
                  className="prose max-w-none prose-headings:text-gray-800 prose-p:text-gray-800 prose-strong:text-gray-800 prose-ul:text-gray-800 prose-ol:text-gray-800"
                  dangerouslySetInnerHTML={{ 
                    __html: (() => {
                      const variables = {
                        name: contact?.name ? contact.name.split(' ')[0] : 'Contact',
                        full_name: contact?.name || 'Contact',
                        company: contact?.company || '',
                        position: contact?.position || '',
                        email: contact?.email || '',
                        phone: contact?.phone || '',
                        my_name: callerName,
                        my_company_name: companyName,
                      }
                      return replaceScriptVariables(selectedScript.content, variables)
                    })()
                  }}
                />
              ) : (
                <p className="text-gray-500 italic">Select a script from the dropdown above to view its content.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {scriptObjections.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {selectedScript ? "No objections defined for this script" : "Select a script to view objections"}
                </div>
              ) : (
                scriptObjections.map((objection, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="font-bold text-base text-gray-900 mb-2">
                      💬 "{objection.objection}"
                    </div>
                    <div className="text-base text-gray-700 mb-3 leading-relaxed">
                      <strong>Response:</strong> {objection.response}
                    </div>
                    {objection.reason && (
                      <div className="text-base text-gray-600 italic flex items-center gap-1">
                        <span className="text-gray-500">💡</span>
                        {objection.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
      {/* Create Script Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="relative z-10 mx-4">
            <CreateAScriptPopup
              onCreated={(s) => {
                setCreateOpen(false)
                if (s?.id) {
                  router.push(`/scripts/edit-script/${s.id}`)
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
