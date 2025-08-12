"use client"

import React from 'react'

interface SettingsTabsNavProps {
  activeTab: string
  onTabClick: (tab: string) => void
}

const tabs = [
  { key: 'my-account', label: 'My Account' },
  { key: 'billing', label: 'Billing and Invoices' },
  { key: 'usage', label: 'Usage & Limits' },
  { key: 'twilio', label: 'Twilio Settings' },
  { key: 'scripts', label: 'Script settings' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'daily-goals', label: 'Daily Goals' },
] as const

export default function SettingsTabsNav({ activeTab, onTabClick }: SettingsTabsNavProps) {
  return (
    <nav className="flex space-x-8" aria-label="Tabs">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onTabClick(t.key)}
          className={`whitespace-nowrap py-2 px-1 border-b-[4px] font-semibold text-[19.2px] ${
            activeTab === t.key
              ? 'border-[#059669] text-[#059669]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
