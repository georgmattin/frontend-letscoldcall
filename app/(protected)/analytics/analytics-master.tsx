"use client"

import React, { useEffect, useState } from 'react'
import AnalyticsItem from './analytics-item'
import { createClient } from '@/utils/supabase/client'
import CallDateDropdownFilter from '../../testcomps/components/call-date-dropdown-filter'
import ContactListDropdown from '../../testcomps/components/contact-list-dropdown'

export default function AnalyticsMaster() {
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({})
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [totalCalls, setTotalCalls] = useState<number>(0)
  const [comparisonBadge, setComparisonBadge] = useState<string | undefined>(undefined)
  const [inboundCalls, setInboundCalls] = useState<number>(0)
  const [inboundBadge, setInboundBadge] = useState<string | undefined>(undefined)
  const [outboundCalls, setOutboundCalls] = useState<number>(0)
  const [outboundBadge, setOutboundBadge] = useState<string | undefined>(undefined)

  // Twilio minutes (current period) and comparison badges
  const [totalMinutes, setTotalMinutes] = useState<number>(0)
  const [outboundMinutes, setOutboundMinutes] = useState<number>(0)
  const [inboundMinutes, setInboundMinutes] = useState<number>(0)
  const [totalMinutesBadge, setTotalMinutesBadge] = useState<string | undefined>(undefined)
  const [outboundMinutesBadge, setOutboundMinutesBadge] = useState<string | undefined>(undefined)
  const [inboundMinutesBadge, setInboundMinutesBadge] = useState<string | undefined>(undefined)

  // Twilio call counts and badges
  const [twTotalCalls, setTwTotalCalls] = useState<number>(0)
  const [twOutboundCalls, setTwOutboundCalls] = useState<number>(0)
  const [twInboundCalls, setTwInboundCalls] = useState<number>(0)
  const [twTotalBadge, setTwTotalBadge] = useState<string | undefined>(undefined)
  const [twOutboundBadge, setTwOutboundBadge] = useState<string | undefined>(undefined)
  const [twInboundBadge, setTwInboundBadge] = useState<string | undefined>(undefined)

  // Additional KPIs
  const [positiveResults, setPositiveResults] = useState<number>(0)
  const [positiveBadge, setPositiveBadge] = useState<string | undefined>(undefined)
  const [conversionRate, setConversionRate] = useState<number>(0) // percent
  const [conversionBadge, setConversionBadge] = useState<string | undefined>(undefined)
  const [callsToLead, setCallsToLead] = useState<number>(0) // calls per sale
  const [callsToLeadBadge, setCallsToLeadBadge] = useState<string | undefined>(undefined)

  useEffect(() => {
    const loadTotalCalls = async () => {
      try {
        const supabase = createClient()
        const { data: userRes } = await supabase.auth.getUser()
        const userId = userRes.user?.id
        if (!userId) return

        // Determine current and previous ranges from dateRange (defaults to last 30d)
        const now = new Date()
        let startCurrent: Date
        let endCurrent: Date
        if (dateRange.from && dateRange.to) {
          startCurrent = new Date(`${dateRange.from}T00:00:00`)
          const toD = new Date(`${dateRange.to}T00:00:00`)
          endCurrent = new Date(toD)
          endCurrent.setDate(endCurrent.getDate() + 1) // exclusive upper bound
        } else {
          startCurrent = new Date(now)
          startCurrent.setDate(startCurrent.getDate() - 30)
          endCurrent = new Date(now)
        }
        const durationMs = endCurrent.getTime() - startCurrent.getTime()
        const startPrev = new Date(startCurrent.getTime() - durationMs)
        const endPrev = new Date(startCurrent)

        const startCurrentISO = startCurrent.toISOString()
        const nowISO = endCurrent.toISOString()
        const startPrevISO = startPrev.toISOString()
        const endPrevISO = endPrev.toISOString()

        // Current period count (last 30 days)
        let qCurrent = supabase
          .from('call_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('started_at', startCurrentISO)
          .lt('started_at', nowISO)
        if (selectedListId) qCurrent = qCurrent.eq('contact_list_id', selectedListId)
        const { count: currentCount, error: currErr } = await qCurrent

        if (currErr) throw currErr
        setTotalCalls(currentCount || 0)

        // Previous period count (30 days before that)
        let qPrev = supabase
          .from('call_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('started_at', startPrevISO)
          .lt('started_at', endPrevISO)
        if (selectedListId) qPrev = qPrev.eq('contact_list_id', selectedListId)
        const { count: prevCount, error: prevErr } = await qPrev

        if (prevErr) throw prevErr

        // Compute percentage change vs previous period
        const prev = prevCount || 0
        const curr = currentCount || 0
        let badge: string | undefined
        if (prev === 0) {
          if (curr === 0) {
            badge = '0% vs last 30 days'
          } else {
            badge = '+100% vs last 30 days'
          }
        } else {
          const change = ((curr - prev) / prev) * 100
          const signed = (change >= 0 ? '+' : '') + change.toFixed(1) + '%'
          badge = `${signed} vs last 30 days`
        }
        setComparisonBadge(badge)

        // Outbound counts (type = 'outgoing_call')
        let qOutCurr = supabase
          .from('call_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('type', 'outgoing_call')
          .gte('started_at', startCurrentISO)
          .lt('started_at', nowISO)
        if (selectedListId) qOutCurr = qOutCurr.eq('contact_list_id', selectedListId)
        const { count: outboundCurr, error: outCurrErr } = await qOutCurr
        if (outCurrErr) throw outCurrErr
        setOutboundCalls(outboundCurr || 0)

        let qOutPrev = supabase
          .from('call_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('type', 'outgoing_call')
          .gte('started_at', startPrevISO)
          .lt('started_at', endPrevISO)
        if (selectedListId) qOutPrev = qOutPrev.eq('contact_list_id', selectedListId)
        const { count: outboundPrev, error: outPrevErr } = await qOutPrev
        if (outPrevErr) throw outPrevErr

        // Compute outbound badge
        const prevOut = outboundPrev || 0
        const currOut = outboundCurr || 0
        let outBadge: string | undefined
        if (prevOut === 0) {
          if (currOut === 0) {
            outBadge = '0% vs last 30 days'
          } else {
            outBadge = '+100% vs last 30 days'
          }
        } else {
          const changeOut = ((currOut - prevOut) / prevOut) * 100
          const signedOut = (changeOut >= 0 ? '+' : '') + changeOut.toFixed(1) + '%'
          outBadge = `${signedOut} vs last 30 days`
        }
        setOutboundBadge(outBadge)

        // Inbound counts (type = 'incoming_call')
        let qInCurr = supabase
          .from('call_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('type', 'incoming_call')
          .gte('started_at', startCurrentISO)
          .lt('started_at', nowISO)
        if (selectedListId) qInCurr = qInCurr.eq('contact_list_id', selectedListId)
        const { count: inboundCurr, error: inCurrErr } = await qInCurr
        if (inCurrErr) throw inCurrErr
        setInboundCalls(inboundCurr || 0)

        let qInPrev = supabase
          .from('call_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('type', 'incoming_call')
          .gte('started_at', startPrevISO)
          .lt('started_at', endPrevISO)
        if (selectedListId) qInPrev = qInPrev.eq('contact_list_id', selectedListId)
        const { count: inboundPrev, error: inPrevErr } = await qInPrev
        if (inPrevErr) throw inPrevErr

        // Compute inbound badge
        const prevIn = inboundPrev || 0
        const currIn = inboundCurr || 0
        let inBadge: string | undefined
        if (prevIn === 0) {
          if (currIn === 0) {
            inBadge = '0% vs last 30 days'
          } else {
            inBadge = '+100% vs last 30 days'
          }
        } else {
          const changeIn = ((currIn - prevIn) / prevIn) * 100
          const signedIn = (changeIn >= 0 ? '+' : '') + changeIn.toFixed(1) + '%'
          inBadge = `${signedIn} vs last 30 days`
        }
        setInboundBadge(inBadge)

        // Positive results (set of outcomes considered positive)
        const positiveSet = ['positive', 'interested', 'meeting-scheduled', 'sold']
        let qPosCurr = supabase
          .from('call_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('call_outcome', positiveSet)
          .gte('started_at', startCurrentISO)
          .lt('started_at', nowISO)
        if (selectedListId) qPosCurr = qPosCurr.eq('contact_list_id', selectedListId)
        const { count: posCurr, error: posCurrErr } = await qPosCurr
        if (posCurrErr) throw posCurrErr

        let qPosPrev = supabase
          .from('call_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('call_outcome', positiveSet)
          .gte('started_at', startPrevISO)
          .lt('started_at', endPrevISO)
        if (selectedListId) qPosPrev = qPosPrev.eq('contact_list_id', selectedListId)
        const { count: posPrev, error: posPrevErr } = await qPosPrev
        if (posPrevErr) throw posPrevErr

        setPositiveResults(posCurr || 0)
        setPositiveBadge((() => {
          const prev = posPrev || 0
          const curr = posCurr || 0
          if (!prev) return curr ? '+100% vs last 30 days' : '0% vs last 30 days'
          const diff = ((curr - prev) / prev) * 100
          return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% vs last 30 days`
        })())

        // Conversion Rate = sold / total calls * 100 (sales conversion)
        let qMeetCurr = supabase
          .from('call_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('call_outcome', 'sold')
          .gte('started_at', startCurrentISO)
          .lt('started_at', nowISO)
        if (selectedListId) qMeetCurr = qMeetCurr.eq('contact_list_id', selectedListId)
        const { count: meetCurr, error: meetCurrErr } = await qMeetCurr
        if (meetCurrErr) throw meetCurrErr

        let qMeetPrev = supabase
          .from('call_history')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('call_outcome', 'sold')
          .gte('started_at', startPrevISO)
          .lt('started_at', endPrevISO)
        if (selectedListId) qMeetPrev = qMeetPrev.eq('contact_list_id', selectedListId)
        const { count: meetPrev, error: meetPrevErr } = await qMeetPrev
        if (meetPrevErr) throw meetPrevErr

        const convCurr = (currentCount || 0) > 0 ? ((meetCurr || 0) / (currentCount || 0)) * 100 : 0
        const convPrev = (prevCount || 0) > 0 ? ((meetPrev || 0) / (prevCount || 0)) * 100 : 0
        setConversionRate(convCurr)
        setConversionBadge((() => {
          if (!convPrev) return convCurr ? '+100% vs last 30 days' : '0% vs last 30 days'
          const diff = convCurr - convPrev
          const sign = diff >= 0 ? '+' : ''
          return `${sign}${diff.toFixed(1)}pp vs last 30 days`
        })())

        // Calls To Lead = total calls / positive outcomes
        const ctlCurr = (posCurr || 0) > 0 ? (currentCount || 0) / (posCurr || 0) : 0
        const ctlPrev = (posPrev || 0) > 0 ? (prevCount || 0) / (posPrev || 0) : 0
        setCallsToLead(ctlCurr)
        setCallsToLeadBadge((() => {
          if (!ctlPrev) return ctlCurr ? '+100% vs last 30 days' : '0% vs last 30 days'
          const diff = ctlCurr - ctlPrev
          const sign = diff >= 0 ? '+' : ''
          return `${sign}${diff.toFixed(1)} vs last 30 days`
        })())
      } catch (err) {
        console.error('Failed to load total calls:', err)
      }
    }
    loadTotalCalls()
  }, [dateRange.from, dateRange.to, selectedListId])

  // Fetch usage (minutes and counts)
  useEffect(() => {
    const fetchTwilioMinutes = async () => {
      try {
        const now = new Date()
        let startCurrent: Date
        let endCurrent: Date
        if (dateRange.from && dateRange.to) {
          startCurrent = new Date(`${dateRange.from}T00:00:00`)
          const toD = new Date(`${dateRange.to}T00:00:00`)
          endCurrent = new Date(toD)
          endCurrent.setDate(endCurrent.getDate() + 1) // exclusive
        } else {
          startCurrent = new Date(now)
          startCurrent.setDate(startCurrent.getDate() - 30)
          endCurrent = new Date(now)
          endCurrent.setDate(endCurrent.getDate() + 1) // include today
        }
        const durationMs = endCurrent.getTime() - startCurrent.getTime()
        const startPrev = new Date(startCurrent.getTime() - durationMs)
        const endPrev = new Date(startCurrent)

        if (!selectedListId) {
          const fmt = (d: Date) => d.toISOString().split('T')[0]
          const startCurrentStr = fmt(startCurrent)
          const endCurrentStr = fmt(endCurrent)
          const startPrevStr = fmt(startPrev)
          const endPrevStr = fmt(endPrev)

          const resCurr = await fetch(`/api/twilio/usage?startDate=${startCurrentStr}&endDate=${endCurrentStr}`)
          const dataCurr = await resCurr.json()

          const resPrev = await fetch(`/api/twilio/usage?startDate=${startPrevStr}&endDate=${endPrevStr}`)
          const dataPrev = await resPrev.json()

          const currTotal = dataCurr?.statistics?.totalCallTime ?? 0
          const currOut = dataCurr?.statistics?.outboundCallTime ?? 0
          const currIn = dataCurr?.statistics?.inboundCallTime ?? 0

          const prevTotal = dataPrev?.statistics?.totalCallTime ?? 0
          const prevOut = dataPrev?.statistics?.outboundCallTime ?? 0
          const prevIn = dataPrev?.statistics?.inboundCallTime ?? 0

          // Twilio call counts
          const currTotalCalls = dataCurr?.statistics?.totalCalls ?? 0
          const currOutboundCalls = dataCurr?.statistics?.outboundCalls ?? 0
          const currInboundCalls = dataCurr?.statistics?.inboundCalls ?? 0

          const prevTotalCalls = dataPrev?.statistics?.totalCalls ?? 0
          const prevOutboundCalls = dataPrev?.statistics?.outboundCalls ?? 0
          const prevInboundCalls = dataPrev?.statistics?.inboundCalls ?? 0

          setTotalMinutes(currTotal)
          setOutboundMinutes(currOut)
          setInboundMinutes(currIn)

          const pct = (curr: number, prev: number) => {
            if (!prev) return curr ? '+100% vs last 30 days' : '0% vs last 30 days'
            const c = ((curr - prev) / prev) * 100
            return `${c >= 0 ? '+' : ''}${c.toFixed(1)}% vs last 30 days`
          }

          setTotalMinutesBadge(pct(currTotal, prevTotal))
          setOutboundMinutesBadge(pct(currOut, prevOut))
          setInboundMinutesBadge(pct(currIn, prevIn))

          // Set Twilio counts and badges
          setTwTotalCalls(currTotalCalls)
          setTwOutboundCalls(currOutboundCalls)
          setTwInboundCalls(currInboundCalls)
          setTwTotalBadge(pct(currTotalCalls, prevTotalCalls))
          setTwOutboundBadge(pct(currOutboundCalls, prevOutboundCalls))
          setTwInboundBadge(pct(currInboundCalls, prevInboundCalls))
        } else {
          // Supabase aggregation when list is selected
          const supabase = createClient()
          const { data: userRes } = await supabase.auth.getUser()
          const userId = userRes.user?.id
          if (!userId) return

          const startCurrentISO = startCurrent.toISOString()
          const endCurrentISO = endCurrent.toISOString()
          const startPrevISO = startPrev.toISOString()
          const endPrevISO = endPrev.toISOString()

          const aggregate = async (fromISO: string, toISO: string) => {
            const { data: rows, error } = await supabase
              .from('call_history')
              .select('duration, type')
              .eq('user_id', userId)
              .eq('contact_list_id', selectedListId)
              .gte('started_at', fromISO)
              .lt('started_at', toISO)
            if (error) throw error
            let totalSec = 0
            let outSec = 0
            let inSec = 0
            let total = 0
            let out = 0
            let inn = 0
            for (const r of rows || []) {
              const d = Number((r as any).duration) || 0
              totalSec += d
              total += 1
              const t = (r as any).type
              if (t === 'outgoing_call') { out += 1; outSec += d }
              else if (t === 'incoming_call') { inn += 1; inSec += d }
            }
            return { totalMin: totalSec / 60, outMin: outSec / 60, inMin: inSec / 60, total, out, inn }
          }

          const curr = await aggregate(startCurrentISO, endCurrentISO)
          const prev = await aggregate(startPrevISO, endPrevISO)

          const pct = (c: number, p: number) => {
            if (!p) return c ? '+100% vs last 30 days' : '0% vs last 30 days'
            const v = ((c - p) / p) * 100
            return `${v >= 0 ? '+' : ''}${v.toFixed(1)}% vs last 30 days`
          }

          setTotalMinutes(curr.totalMin)
          setOutboundMinutes(curr.outMin)
          setInboundMinutes(curr.inMin)
          setTotalMinutesBadge(pct(curr.totalMin, prev.totalMin))
          setOutboundMinutesBadge(pct(curr.outMin, prev.outMin))
          setInboundMinutesBadge(pct(curr.inMin, prev.inMin))

          setTwTotalCalls(curr.total)
          setTwOutboundCalls(curr.out)
          setTwInboundCalls(curr.inn)
          setTwTotalBadge(pct(curr.total, prev.total))
          setTwOutboundBadge(pct(curr.out, prev.out))
          setTwInboundBadge(pct(curr.inn, prev.inn))
        }
      } catch (e) {
        console.error('Failed to fetch Twilio minutes:', e)
      }
    }
    fetchTwilioMinutes()
  }, [dateRange.from, dateRange.to, selectedListId])

  return (
    <div
      className="bg-white"
      style={{
        width: '1418px',
        margin: '40px auto 0',
        border: '1px solid rgba(0, 51, 51, 0.1)',
        padding: '44px 72px 29px',
        borderRadius: '8px',
      }}
    >
      {/* Header with icon/title left and date filter right */}
      <div className="flex items-center justify-between">
        <img
          src="/analytics-icon.svg"
          alt="Analytics"
          width={33}
          height={33}
          className="mr-3"
          style={{
            // Apply green tint similar to navbar active state (~#059669)
            filter:
              'invert(41%) sepia(91%) saturate(555%) hue-rotate(122deg) brightness(92%) contrast(93%)',
          }}
        />
        <h1 className="font-open-sans font-bold text-[#003333]" style={{ fontSize: '33.81px' }}>Analytics</h1>
        <div className="ml-auto flex items-center gap-3">
          <ContactListDropdown
            value={selectedListId}
            onChange={(id) => setSelectedListId(id)}
          />
          <CallDateDropdownFilter
            value={dateRange}
            onChange={(v) => setDateRange(v)}
          />
        </div>
      </div>

      {/* Content below the header */}
      <div className="mt-6 flex gap-6 flex-wrap">
        <AnalyticsItem
          title={twTotalCalls.toLocaleString()}
          subheading="Total Calls"
          tooltip="Total number of calls made in the last 30 days. Compared to the previous 30 days."
          badgeText={twTotalBadge}
        />
        <AnalyticsItem
          title={twOutboundCalls.toLocaleString()}
          subheading="Outbound Calls"
          tooltip="Total outbound calls made in the last 30 days. Compared to the previous 30 days."
          badgeText={twOutboundBadge}
        />
        <AnalyticsItem
          title={twInboundCalls.toLocaleString()}
          subheading="Inbound Calls"
          tooltip="Total inbound calls received in the last 30 days. Compared to the previous 30 days."
          badgeText={twInboundBadge}
        />

        {/* Minutes row */}
        <AnalyticsItem
          title={totalMinutes.toFixed(1)}
          subheading="Total Call Minutes"
          tooltip="Total call minutes in the last 30 days. Compared to the previous 30 days."
          badgeText={totalMinutesBadge}
        />
        <AnalyticsItem
          title={outboundMinutes.toFixed(1)}
          subheading="Outbound Call Minutes"
          tooltip="Outbound call minutes in the last 30 days. Compared to the previous 30 days."
          badgeText={outboundMinutesBadge}
        />
        <AnalyticsItem
          title={inboundMinutes.toFixed(1)}
          subheading="Inbound Call Minutes"
          tooltip="Inbound call minutes in the last 30 days. Compared to the previous 30 days."
          badgeText={inboundMinutesBadge}
        />

        {/* Additional KPI cards */}
        <AnalyticsItem
          title={positiveResults.toLocaleString()}
          subheading="Positive Call Results"
          tooltip="Positive outcomes: interested, positive, meeting scheduled, or sold in the last 30 days. Compared to the previous 30 days."
          badgeText={positiveBadge}
        />
        <AnalyticsItem
          title={`${conversionRate.toFixed(1)}%`}
          subheading="Conversion Rate"
          tooltip="Sales conversion: sold divided by total calls for the last 30 days. Compared to the previous 30 days."
          badgeText={conversionBadge}
        />
        <AnalyticsItem
          title={callsToLead.toFixed(1)}
          subheading="Calls To Lead"
          tooltip="Average number of calls needed to get one positive result (positive/interested/meeting-scheduled/sold) in the last 30 days. Compared to the previous 30 days."
          badgeText={callsToLeadBadge}
        />
      </div>
    </div>
  )
}
