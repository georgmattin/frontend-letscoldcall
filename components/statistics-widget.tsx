'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { Phone, Users, Calendar, Clock, Target } from 'lucide-react'

interface DailyStats {
  callsMade: number
  meetings: number
  interested: number
  callTimeMinutes: number
}

interface DailyGoals {
  calls_goal: number
  contacts_goal: number
  meetings_goal: number
  callbacks_goal: number
}

interface GoalsProgress {
  calls: { current: number; target: number }
  contacts: { current: number; target: number }
  meetings: { current: number; target: number }
  callbacks: { current: number; target: number }
}

export default function StatisticsWidget() {
  const [loading, setLoading] = useState(true)
  const [hasGoals, setHasGoals] = useState(false)
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    callsMade: 0,
    meetings: 0,
    interested: 0,
    callTimeMinutes: 0
  })
  const [goalsProgress, setGoalsProgress] = useState<GoalsProgress>({
    calls: { current: 0, target: 0 },
    contacts: { current: 0, target: 0 },
    meetings: { current: 0, target: 0 },
    callbacks: { current: 0, target: 0 }
  })

  const supabase = createClient()

  useEffect(() => {
    loadStatistics()
  }, [])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if user has daily goals
      const { data: goals } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (goals) {
        setHasGoals(true)
        await loadGoalsProgress(user.id, goals)
      } else {
        setHasGoals(false)
        await loadDailyStats(user.id)
      }
    } catch (error) {
      console.error('Error loading statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDailyStats = async (userId: string) => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Get today's call history
    const { data: callHistory } = await supabase
      .from('call_history')
      .select('duration, call_outcome')
      .eq('user_id', userId)
      .gte('started_at', startOfDay.toISOString())
      .lt('started_at', endOfDay.toISOString())

    if (callHistory) {
      const callsMade = callHistory.length
      const meetings = callHistory.filter(call => call.call_outcome === 'meeting-scheduled').length
      const interested = callHistory.filter(call => call.call_outcome === 'interested').length
      const callTimeMinutes = Math.round(callHistory.reduce((total, call) => total + (call.duration || 0), 0) / 60)

      setDailyStats({
        callsMade,
        meetings,
        interested,
        callTimeMinutes
      })
    }
  }

  const loadGoalsProgress = async (userId: string, goals: DailyGoals) => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Get today's call history for progress
    const { data: callHistory } = await supabase
      .from('call_history')
      .select('call_outcome, contact_id')
      .eq('user_id', userId)
      .gte('started_at', startOfDay.toISOString())
      .lt('started_at', endOfDay.toISOString())

    if (callHistory) {
      const calls = callHistory.length
      const meetings = callHistory.filter(call => call.call_outcome === 'meeting-scheduled').length
      const callbacks = callHistory.filter(call => call.call_outcome === 'callback').length
      
      // Count unique contacts contacted today
      const uniqueContacts = new Set(callHistory.map(call => call.contact_id)).size

      setGoalsProgress({
        calls: { current: calls, target: goals.calls_goal },
        contacts: { current: uniqueContacts, target: goals.contacts_goal },
        meetings: { current: meetings, target: goals.meetings_goal },
        callbacks: { current: callbacks, target: goals.callbacks_goal }
      })
    }
  }

  const formatCallTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getProgressPercentage = (current: number, target: number) => {
    if (target === 0) return 0
    return Math.min((current / target) * 100, 100)
  }

  const ProgressBar = ({ current, target, color }: { current: number; target: number; color: string }) => {
    const percentage = getProgressPercentage(current, target)
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="h-2 rounded-full transition-all duration-300"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-4 border-t border-gray-200">
      {!hasGoals ? (
        // Show daily statistics when no goals are set
        <div>
          <div className="flex items-center mb-3">
            <Target className="w-4 h-4 mr-2 text-[#0D8BFF]" />
            <h3 className="text-sm font-semibold text-[#253053]" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
              Today's Stats
            </h3>
          </div>
          
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <Phone className="w-3 h-3 mr-2 text-[#0D8BFF]" />
                <span className="text-gray-600">Calls Made</span>
              </div>
              <span className="font-medium text-[#253053]">{dailyStats.callsMade}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <Calendar className="w-3 h-3 mr-2 text-[#10B981]" />
                <span className="text-gray-600">Meetings</span>
              </div>
              <span className="font-medium text-[#253053]">{dailyStats.meetings}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <Users className="w-3 h-3 mr-2 text-[#8B5CF6]" />
                <span className="text-gray-600">Interested</span>
              </div>
              <span className="font-medium text-[#253053]">{dailyStats.interested}</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-2 text-[#F59E0B]" />
                <span className="text-gray-600">Call Time</span>
              </div>
              <span className="font-medium text-[#253053]">{formatCallTime(dailyStats.callTimeMinutes)}</span>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
              Set your daily goals to track progress
            </p>
            <Link 
              href="/my-account?tab=daily-goals"
              className="text-xs text-[#0D8BFF] underline hover:text-blue-600 transition-colors"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              Set goals
            </Link>
          </div>
        </div>
      ) : (
        // Show goals progress when goals are set
        <div>
          <div className="flex items-center mb-3">
            <Target className="w-4 h-4 mr-2 text-[#0D8BFF]" />
            <h3 className="text-sm font-semibold text-[#253053]" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
              Daily Goals
            </h3>
          </div>
          
          <div className="space-y-3">
            {/* Calls Progress */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <Phone className="w-3 h-3 mr-2 text-[#0D8BFF]" />
                  <span className="text-xs text-gray-600">Calls</span>
                </div>
                <span className="text-xs font-medium text-[#253053]">
                  {goalsProgress.calls.current}/{goalsProgress.calls.target}
                </span>
              </div>
              <ProgressBar 
                current={goalsProgress.calls.current} 
                target={goalsProgress.calls.target} 
                color="#0D8BFF" 
              />
              <div className="text-right mt-1">
                <span className="text-xs text-gray-500">
                  {Math.round(getProgressPercentage(goalsProgress.calls.current, goalsProgress.calls.target))}%
                </span>
              </div>
            </div>
            
            {/* Contacts Progress */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <Users className="w-3 h-3 mr-2 text-[#10B981]" />
                  <span className="text-xs text-gray-600">Contacts</span>
                </div>
                <span className="text-xs font-medium text-[#253053]">
                  {goalsProgress.contacts.current}/{goalsProgress.contacts.target}
                </span>
              </div>
              <ProgressBar 
                current={goalsProgress.contacts.current} 
                target={goalsProgress.contacts.target} 
                color="#10B981" 
              />
              <div className="text-right mt-1">
                <span className="text-xs text-gray-500">
                  {Math.round(getProgressPercentage(goalsProgress.contacts.current, goalsProgress.contacts.target))}%
                </span>
              </div>
            </div>
            
            {/* Meetings Progress */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-2 text-[#8B5CF6]" />
                  <span className="text-xs text-gray-600">Meetings</span>
                </div>
                <span className="text-xs font-medium text-[#253053]">
                  {goalsProgress.meetings.current}/{goalsProgress.meetings.target}
                </span>
              </div>
              <ProgressBar 
                current={goalsProgress.meetings.current} 
                target={goalsProgress.meetings.target} 
                color="#8B5CF6" 
              />
              <div className="text-right mt-1">
                <span className="text-xs text-gray-500">
                  {Math.round(getProgressPercentage(goalsProgress.meetings.current, goalsProgress.meetings.target))}%
                </span>
              </div>
            </div>
            
            {/* Callbacks Progress */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-2 text-[#F59E0B]" />
                  <span className="text-xs text-gray-600">Callbacks</span>
                </div>
                <span className="text-xs font-medium text-[#253053]">
                  {goalsProgress.callbacks.current}/{goalsProgress.callbacks.target}
                </span>
              </div>
              <ProgressBar 
                current={goalsProgress.callbacks.current} 
                target={goalsProgress.callbacks.target} 
                color="#F59E0B" 
              />
              <div className="text-right mt-1">
                <span className="text-xs text-gray-500">
                  {Math.round(getProgressPercentage(goalsProgress.callbacks.current, goalsProgress.callbacks.target))}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
