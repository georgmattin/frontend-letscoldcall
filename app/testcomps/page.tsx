"use client"
import React, { useState, Suspense } from 'react'
import Navbar from './components/navbar'
import MainFooter from './components/MainFooter'
import CallAnalyticsToggle from '../(protected)/calling/components/call-analytics-toggle'

export default function TestCompsPage() {
  const [expanded, setExpanded] = useState<boolean>(true)

  const mockStats = {
    totalContacts: 20,
    contactsCompleted: 8,
    contactsSkipped: 2,
    contactsInterested: 3,
    contactsNotInterested: 4,
    callbacks: 1,
    meetingsScheduled: 1,
    noAnswers: 2,
    wrongNumbers: 0,
    totalCallTime: 1250,
  }

  const mockContacts = Array.from({ length: 20 }, (_, i) => ({
    status: i < 8 ? 'called' : 'not_called',
  }))

  const formatCallDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }

  const handleExpand = async () => {
    // demo no-op; place to call refresh if needed
    return
  }

  return (
    <div className="w-full min-h-screen bg-[#F4F6F6] flex flex-col">
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>

      <div className="w-full flex justify-center mt-8">
        <CallAnalyticsToggle
          title="Demo Contact List"
          onEndClick={() => alert('End Calling clicked')}
          isExpanded={expanded}
          onChangeExpanded={setExpanded}
          onExpand={handleExpand}
          sessionStats={mockStats as any}
          contacts={mockContacts as any}
          isMounted={true}
          formatCallDuration={formatCallDuration}
        />
      </div>

      <div className="mt-auto">
        <MainFooter />
      </div>
    </div>
  );
}
