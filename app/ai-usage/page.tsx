'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Activity, Brain, FileText, MessageSquare, Mic, DollarSign, Clock, Calculator, Phone, PhoneCall, Signal, Users, CheckCircle, XCircle, PhoneOff, Package, AlertTriangle } from 'lucide-react'
import { getPackageInfo, assignDefaultPackage, PackageInfo, getUsagePercentage, getUsageColor, formatUsageDisplay } from '@/lib/package-limits'

interface AIUsageStats {
  script_generations: number
  objection_generations: number
  call_summary_generations: number
  ai_suggestions_generations: number
  transcription_access: number
  total_estimated_cost: number
  total_processing_time: number
  recent_activity: Array<{
    action_type: string
    created_at: string
    cost_estimate: number
    status: string
  }>
  summary: {
    total_actions: number
    successful_actions: number
    failed_actions: number
  }
}

interface TwilioUsageStats {
  hasConfig: boolean
  accountInfo?: {
    accountSid: string
    friendlyName: string
    phoneNumber: string
  }
  statistics?: {
    totalCalls: number
    outboundCalls: number
    inboundCalls: number
    totalCallTime: number
    outboundCallTime: number
    inboundCallTime: number
    totalCost: number
    successRate: number
    answeredCalls: number
    notAnsweredCalls: number
    failedCalls: number
    busyCalls: number
  }
  usage?: {
    voice: {
      outboundCalls: number
      inboundCalls: number
      outboundMinutes: number
      inboundMinutes: number
      outboundCost: number
      inboundCost: number
    }
    recording: {
      minutes: number
      cost: number
    }
    sms: {
      sent: number
      received: number
      outboundCost: number
      inboundCost: number
    }
    total: {
      cost: number
      activities: number
    }
  }
  recentCalls?: Array<{
    sid: string
    from: string
    to: string
    status: string
    duration: number
    startTime: string
    price: string
    direction?: string
    type?: string
  }>
}

export default function AIUsagePage() {
  const [stats, setStats] = useState<AIUsageStats | null>(null)
  const [twilioStats, setTwilioStats] = useState<TwilioUsageStats | null>(null)
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [twilioLoading, setTwilioLoading] = useState(true)
  const [packageLoading, setPackageLoading] = useState(true)
  const [period, setPeriod] = useState('current_month')
  const [calculatingSummary, setCalculatingSummary] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [callDirection, setCallDirection] = useState('all')
  const [callStatus, setCallStatus] = useState('all')
  const [sortField, setSortField] = useState<'startTime' | 'status'>('startTime')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const CALLS_PER_PAGE = 25

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ai-usage/stats?period=${period}`)
      const data = await response.json()
      setStats(data.stats)
    } catch (err) {
      console.error('Error fetching AI usage stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTwilioStats = async () => {
    try {
      setTwilioLoading(true)
      
      // Calculate date range based on period
      let startDate: string
      let endDate: string
      const now = new Date()
      
      // Set end date to tomorrow to include all of today's calls
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (period === 'current_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        endDate = tomorrow.toISOString().split('T')[0]
      } else if (period === 'last_month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        startDate = lastMonth.toISOString().split('T')[0]
        endDate = lastMonthEnd.toISOString().split('T')[0]
      } else { // all_time
        startDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0]
        endDate = tomorrow.toISOString().split('T')[0]
      }
      
      const response = await fetch(`/api/twilio/usage?startDate=${startDate}&endDate=${endDate}`)
      const data = await response.json()
      setTwilioStats(data)
    } catch (err) {
      console.error('Error fetching Twilio usage stats:', err)
      setTwilioStats({ hasConfig: false })
    } finally {
      setTwilioLoading(false)
    }
  }

  const fetchPackageInfo = async () => {
    try {
      setPackageLoading(true)
      const data = await getPackageInfo()
      setPackageInfo(data)
      
      // If user doesn't have a subscription, try to assign default package
      if (!data.hasSubscription) {
        const assigned = await assignDefaultPackage()
        if (assigned) {
          // Refetch package info after assignment
          const updatedData = await getPackageInfo()
          setPackageInfo(updatedData)
        }
      }
    } catch (err) {
      console.error('Error fetching package info:', err)
      setPackageInfo({ hasSubscription: false })
    } finally {
      setPackageLoading(false)
    }
  }

  // Fetch initial data
  useEffect(() => {
    fetchStats()
    fetchTwilioStats()
    fetchPackageInfo()
  }, [period])

  const calculateSummary = async () => {
    try {
      setCalculatingSummary(true)
      
      const now = new Date()
      const month = period === 'last_month' ? now.getMonth() : now.getMonth() + 1
      const year = period === 'last_month' ? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()) : now.getFullYear()
      
      const response = await fetch('/api/ai-usage/calculate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: month,
          year: year
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Summary calculated:', data)
        // Refresh stats after calculation
        await fetchStats()
      } else {
        console.error('Failed to calculate summary')
      }
    } catch (error) {
      console.error('Error calculating summary:', error)
    } finally {
      setCalculatingSummary(false)
    }
  }

  if (loading || twilioLoading || packageLoading) {
    return <div className="p-6">Laadimine...</div>
  }

  if (!stats) return null

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">AI Usage Statistics</h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={calculateSummary}
            disabled={calculatingSummary}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Calculator className="h-4 w-4" />
            {calculatingSummary ? 'Calculating...' : 'Calculate Summary'}
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Package Limits Section */}
      {packageInfo?.hasSubscription && packageInfo.package && packageInfo.currentUsage && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <h2 className="text-2xl font-semibold">Your Package: {packageInfo.package.display_name}</h2>
            <Badge variant="outline">{packageInfo.package.name}</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Call Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Call Minutes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{formatUsageDisplay(packageInfo.currentUsage.call_minutes_used, packageInfo.package.limits.monthly_call_minutes, ' min')}</span>
                  <span className={getUsageColor(getUsagePercentage(packageInfo.currentUsage.call_minutes_used, packageInfo.package.limits.monthly_call_minutes))}>
                    {getUsagePercentage(packageInfo.currentUsage.call_minutes_used, packageInfo.package.limits.monthly_call_minutes).toFixed(1)}%
                  </span>
                </div>
                <Progress value={getUsagePercentage(packageInfo.currentUsage.call_minutes_used, packageInfo.package.limits.monthly_call_minutes)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Recording Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{formatUsageDisplay(packageInfo.currentUsage.recordings_accessed, packageInfo.package.limits.max_recordings_access)}</span>
                  <span className={getUsageColor(getUsagePercentage(packageInfo.currentUsage.recordings_accessed, packageInfo.package.limits.max_recordings_access))}>
                    {getUsagePercentage(packageInfo.currentUsage.recordings_accessed, packageInfo.package.limits.max_recordings_access).toFixed(1)}%
                  </span>
                </div>
                <Progress value={getUsagePercentage(packageInfo.currentUsage.recordings_accessed, packageInfo.package.limits.max_recordings_access)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Call Scripts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{formatUsageDisplay(packageInfo.currentUsage.active_call_scripts, packageInfo.package.limits.max_call_scripts)}</span>
                  <span className={getUsageColor(getUsagePercentage(packageInfo.currentUsage.active_call_scripts, packageInfo.package.limits.max_call_scripts))}>
                    {getUsagePercentage(packageInfo.currentUsage.active_call_scripts, packageInfo.package.limits.max_call_scripts).toFixed(1)}%
                  </span>
                </div>
                <Progress value={getUsagePercentage(packageInfo.currentUsage.active_call_scripts, packageInfo.package.limits.max_call_scripts)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Contact Lists
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{formatUsageDisplay(packageInfo.currentUsage.active_contact_lists, packageInfo.package.limits.max_contact_lists)}</span>
                  <span className={getUsageColor(getUsagePercentage(packageInfo.currentUsage.active_contact_lists, packageInfo.package.limits.max_contact_lists))}>
                    {getUsagePercentage(packageInfo.currentUsage.active_contact_lists, packageInfo.package.limits.max_contact_lists).toFixed(1)}%
                  </span>
                </div>
                <Progress value={getUsagePercentage(packageInfo.currentUsage.active_contact_lists, packageInfo.package.limits.max_contact_lists)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{formatUsageDisplay(packageInfo.currentUsage.total_contacts, packageInfo.package.limits.max_total_contacts)}</span>
                  <span className={getUsageColor(getUsagePercentage(packageInfo.currentUsage.total_contacts, packageInfo.package.limits.max_total_contacts))}>
                    {getUsagePercentage(packageInfo.currentUsage.total_contacts, packageInfo.package.limits.max_total_contacts).toFixed(1)}%
                  </span>
                </div>
                <Progress value={getUsagePercentage(packageInfo.currentUsage.total_contacts, packageInfo.package.limits.max_total_contacts)} />
              </CardContent>
            </Card>

            {/* AI Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Transcriptions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{formatUsageDisplay(packageInfo.currentUsage.transcription_access_used, packageInfo.package.limits.max_transcription_access)}</span>
                  <span className={getUsageColor(getUsagePercentage(packageInfo.currentUsage.transcription_access_used, packageInfo.package.limits.max_transcription_access))}>
                    {getUsagePercentage(packageInfo.currentUsage.transcription_access_used, packageInfo.package.limits.max_transcription_access).toFixed(1)}%
                  </span>
                </div>
                <Progress value={getUsagePercentage(packageInfo.currentUsage.transcription_access_used, packageInfo.package.limits.max_transcription_access)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Call Summaries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{formatUsageDisplay(packageInfo.currentUsage.call_summary_generations_used, packageInfo.package.limits.max_call_summary_generations)}</span>
                  <span className={getUsageColor(getUsagePercentage(packageInfo.currentUsage.call_summary_generations_used, packageInfo.package.limits.max_call_summary_generations))}>
                    {getUsagePercentage(packageInfo.currentUsage.call_summary_generations_used, packageInfo.package.limits.max_call_summary_generations).toFixed(1)}%
                  </span>
                </div>
                <Progress value={getUsagePercentage(packageInfo.currentUsage.call_summary_generations_used, packageInfo.package.limits.max_call_summary_generations)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{formatUsageDisplay(packageInfo.currentUsage.call_suggestions_generations_used, packageInfo.package.limits.max_call_suggestions_generations)}</span>
                  <span className={getUsageColor(getUsagePercentage(packageInfo.currentUsage.call_suggestions_generations_used, packageInfo.package.limits.max_call_suggestions_generations))}>
                    {getUsagePercentage(packageInfo.currentUsage.call_suggestions_generations_used, packageInfo.package.limits.max_call_suggestions_generations).toFixed(1)}%
                  </span>
                </div>
                <Progress value={getUsagePercentage(packageInfo.currentUsage.call_suggestions_generations_used, packageInfo.package.limits.max_call_suggestions_generations)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Script Generations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{formatUsageDisplay(packageInfo.currentUsage.script_generations_used, packageInfo.package.limits.max_script_generations)}</span>
                  <span className={getUsageColor(getUsagePercentage(packageInfo.currentUsage.script_generations_used, packageInfo.package.limits.max_script_generations))}>
                    {getUsagePercentage(packageInfo.currentUsage.script_generations_used, packageInfo.package.limits.max_script_generations).toFixed(1)}%
                  </span>
                </div>
                <Progress value={getUsagePercentage(packageInfo.currentUsage.script_generations_used, packageInfo.package.limits.max_script_generations)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Objection Generations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{formatUsageDisplay(packageInfo.currentUsage.objection_generations_used, packageInfo.package.limits.max_objection_generations)}</span>
                  <span className={getUsageColor(getUsagePercentage(packageInfo.currentUsage.objection_generations_used, packageInfo.package.limits.max_objection_generations))}>
                    {getUsagePercentage(packageInfo.currentUsage.objection_generations_used, packageInfo.package.limits.max_objection_generations).toFixed(1)}%
                  </span>
                </div>
                <Progress value={getUsagePercentage(packageInfo.currentUsage.objection_generations_used, packageInfo.package.limits.max_objection_generations)} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!packageInfo?.hasSubscription && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              No Active Package
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-700">You don't have an active package. Please contact support to get started.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.summary.total_actions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.summary.successful_actions} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.total_estimated_cost.toFixed(4)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scripts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.script_generations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transcriptions</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transcription_access}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Call Summaries</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.call_summary_generations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Suggestions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ai_suggestions_generations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Objections</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.objection_generations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Twilio Usage Section */}
      {twilioStats?.hasConfig && (
        <>
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Phone className="h-6 w-6" />
              Twilio Call Statistics
              <Badge variant="outline" className="ml-2">
                {twilioStats.accountInfo?.phoneNumber}
              </Badge>
            </h2>
          </div>

          {/* Main Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{twilioStats.statistics?.totalCalls || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total made calls
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outbound Calls</CardTitle>
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{twilioStats.statistics?.outboundCalls || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Cold calling calls
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inbound</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{twilioStats.statistics?.inboundCalls || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Callbacks
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(twilioStats.statistics?.totalCallTime || 0).toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  minutes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outbound Time</CardTitle>
                <PhoneCall className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(twilioStats.statistics?.outboundCallTime || 0).toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  minutes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inbound Time</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(twilioStats.statistics?.inboundCallTime || 0).toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  minutes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(twilioStats.statistics?.totalCost || 0).toFixed(4)}</div>
                <p className="text-xs text-muted-foreground">
                  Calls + recordings cost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(twilioStats.statistics?.successRate || 0).toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Answered calls %
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {twilioStats.statistics?.totalCalls && twilioStats.statistics.totalCalls > 0 
                    ? ((twilioStats.statistics.totalCallTime || 0) / twilioStats.statistics.totalCalls).toFixed(1)
                    : '0.0'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  minutes/call
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Answered Calls</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{twilioStats.statistics?.answeredCalls || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Successful calls
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Not Answered</CardTitle>
                <XCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{twilioStats.statistics?.notAnsweredCalls || 0}</div>
                <p className="text-xs text-muted-foreground">
                  No answer
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <PhoneOff className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{twilioStats.statistics?.failedCalls || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Connection errors
                </p>
              </CardContent>
            </Card>
          </div>

          {twilioStats.recentCalls && twilioStats.recentCalls.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Twilio Calls</CardTitle>
                  <Select value={callDirection} onValueChange={setCallDirection}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Calls</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={callStatus} onValueChange={setCallStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="no-answer">No Answer</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchTwilioStats}
                    className="flex items-center gap-2"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Total: {twilioStats.recentCalls.filter(call => 
                      !call.from.includes('client:') && 
                      call.from && 
                      call.to &&
                      (callDirection === 'all' || 
                       (callDirection === 'outbound' && call.direction?.includes('outbound')) ||
                       (callDirection === 'inbound' && !call.direction?.includes('outbound'))) &&
                      (callStatus === 'all' || call.status === callStatus)
                    ).length} calls
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="p-2">From</th>
                        <th className="p-2">To</th>
                        <th 
                          className="p-2 cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => {
                            if (sortField === 'startTime') {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                            } else {
                              setSortField('startTime')
                              setSortOrder('desc')
                            }
                          }}
                        >
                          Start Time {sortField === 'startTime' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="p-2">End Time</th>
                        <th className="p-2">Duration</th>
                        <th 
                          className="p-2 cursor-pointer hover:bg-muted/50 select-none"
                          onClick={() => {
                            if (sortField === 'status') {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                            } else {
                              setSortField('status')
                              setSortOrder('asc')
                            }
                          }}
                        >
                          Status {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {twilioStats.recentCalls
                        .filter(call => 
                          !call.from.includes('client:') &&
                          call.from && call.to &&
                          (callDirection === 'all' || 
                           (callDirection === 'outbound' && call.direction?.includes('outbound')) ||
                           (callDirection === 'inbound' && !call.direction?.includes('outbound') && !call.from.includes('client:'))) &&
                          (callStatus === 'all' || call.status === callStatus)
                        )
                        .sort((a, b) => {
                          if (sortField === 'startTime') {
                            const dateA = new Date(a.startTime).getTime()
                            const dateB = new Date(b.startTime).getTime()
                            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
                          } else if (sortField === 'status') {
                            return sortOrder === 'asc' 
                              ? a.status.localeCompare(b.status)
                              : b.status.localeCompare(a.status)
                          }
                          return 0
                        })
                        .slice((currentPage - 1) * CALLS_PER_PAGE, currentPage * CALLS_PER_PAGE)
                        .map((call, index) => {
                        // Calculate end time by adding duration to start time
                        const startTime = new Date(call.startTime);
                        const endTime = new Date(startTime.getTime() + (call.duration * 1000));
                        
                        // Format duration as MM:SS
                        const minutes = Math.floor(call.duration / 60);
                        const seconds = call.duration % 60;
                        const formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                        
                        // Format dates
                        const formatDate = (date: Date) => {
                          return date.toLocaleString('et-EE', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          });
                        };

                        // Get status badge variant
                        const getStatusVariant = (status: string) => {
                          switch(status) {
                            case 'completed': return 'default';
                                                         case 'no-answer': return 'secondary';
                             case 'busy': return 'outline';
                            default: return 'destructive';
                          }
                        };

                        return (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-2">{call.from}</td>
                            <td className="p-2">{call.to}</td>
                            <td className="p-2">{formatDate(startTime)}</td>
                            <td className="p-2">{call.duration > 0 ? formatDate(endTime) : '-'}</td>
                            <td className="p-2">{formattedDuration}</td>
                            <td className="p-2">
                              <Badge variant={getStatusVariant(call.status)}>
                                {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Pagination */}
                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} / {Math.ceil(twilioStats.recentCalls.filter(call => !call.from.includes('client:') && call.from && call.to).length / CALLS_PER_PAGE)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage >= Math.ceil(twilioStats.recentCalls.filter(call => !call.from.includes('client:') && call.from && call.to).length / CALLS_PER_PAGE)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!twilioStats?.hasConfig && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-6 w-6" />
              Twilio Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              To view Twilio usage statistics, you need to configure your Twilio settings first.
            </p>
            <Button className="mt-4" variant="outline">
              <Signal className="h-4 w-4 mr-2" />
              Configure Twilio
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.recent_activity.map((activity, index) => (
              <div key={index} className="flex justify-between items-center p-2 border rounded">
                <span>{activity.action_type}</span>
                <div className="flex items-center gap-2">
                  <span>${activity.cost_estimate.toFixed(4)}</span>
                  <Badge variant={activity.status === 'completed' ? 'default' : 'destructive'}>
                    {activity.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 