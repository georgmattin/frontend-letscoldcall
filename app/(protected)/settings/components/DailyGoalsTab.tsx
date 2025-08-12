"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Clock, PhoneCall, Users } from "lucide-react"

export interface DailyGoals {
  calls_goal: number
  contacts_goal: number
  meetings_goal: number
  callbacks_goal: number
}

interface DailyGoalsTabProps {
  dailyGoals: DailyGoals
  setDailyGoals: React.Dispatch<React.SetStateAction<DailyGoals>>
  dailyGoalsLoading: boolean
  dailyGoalsSaving: boolean
  onSave: () => void
}

export default function DailyGoalsTab({
  dailyGoals,
  setDailyGoals,
  dailyGoalsLoading,
  dailyGoalsSaving,
  onSave,
}: DailyGoalsTabProps) {
  return (
    <div className="bg-white rounded-[5px] border p-8" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#003333' }}>Daily Goals</h2>
          <p style={{ color: '#003333' }}>Set your daily targets to stay motivated and track your progress.</p>
        </div>
      </div>

      {dailyGoalsLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mr-4" style={{ borderColor: '#059669' }}></div>
          <p style={{ color: '#003333' }}>Loading daily goals...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Calls Goal */}
            <div>
              <Label htmlFor="callsGoal" className="text-[16px] font-semibold text-[#003333] flex items-center">
                <PhoneCall className="w-4 h-4 mr-2" style={{ color: '#059669' }} />
                Daily Calls Goal
              </Label>
              <Input
                id="callsGoal"
                type="number"
                min="0"
                value={dailyGoals.calls_goal}
                onChange={(e) =>
                  setDailyGoals((prev) => ({ ...prev, calls_goal: parseInt(e.target.value) || 0 }))
                }
                className="mt-1"
                placeholder="e.g., 50"
              />
              <p className="text-xs mt-1" style={{ color: '#003333' }}>Number of calls you want to make per day</p>
            </div>

            {/* Daily Contacts Goal */}
            <div>
              <Label htmlFor="contactsGoal" className="text-[16px] font-semibold text-[#003333] flex items-center">
                <Users className="w-4 h-4 mr-2" style={{ color: '#059669' }} />
                Daily Contacts Goal
              </Label>
              <Input
                id="contactsGoal"
                type="number"
                min="0"
                value={dailyGoals.contacts_goal}
                onChange={(e) =>
                  setDailyGoals((prev) => ({ ...prev, contacts_goal: parseInt(e.target.value) || 0 }))
                }
                className="mt-1"
                placeholder="e.g., 100"
              />
              <p className="text-xs mt-1" style={{ color: '#003333' }}>Number of contacts you want to reach per day</p>
            </div>

            {/* Daily Meetings Goal */}
            <div>
              <Label htmlFor="meetingsGoal" className="text-[16px] font-semibold text-[#003333] flex items-center">
                <Calendar className="w-4 h-4 mr-2" style={{ color: '#059669' }} />
                Daily Meetings Goal
              </Label>
              <Input
                id="meetingsGoal"
                type="number"
                min="0"
                value={dailyGoals.meetings_goal}
                onChange={(e) =>
                  setDailyGoals((prev) => ({ ...prev, meetings_goal: parseInt(e.target.value) || 0 }))
                }
                className="mt-1"
                placeholder="e.g., 5"
              />
              <p className="text-xs mt-1" style={{ color: '#003333' }}>Number of meetings you want to schedule per day</p>
            </div>

            {/* Daily Callbacks Goal */}
            <div>
              <Label htmlFor="callbacksGoal" className="text-[16px] font-semibold text-[#003333] flex items-center">
                <Clock className="w-4 h-4 mr-2" style={{ color: '#059669' }} />
                Daily Callbacks Goal
              </Label>
              <Input
                id="callbacksGoal"
                type="number"
                min="0"
                value={dailyGoals.callbacks_goal}
                onChange={(e) =>
                  setDailyGoals((prev) => ({ ...prev, callbacks_goal: parseInt(e.target.value) || 0 }))
                }
                className="mt-1"
                placeholder="e.g., 10"
              />
              <p className="text-xs mt-1" style={{ color: '#003333' }}>Number of callbacks you want to schedule per day</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="border-t pt-6" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
            <Button
              onClick={onSave}
              disabled={dailyGoalsSaving}
              className="text-white px-6 py-2 disabled:bg-gray-300 disabled:text-gray-500"
              style={{ backgroundColor: '#059669', borderRadius: '11px' }}
              onMouseEnter={(e) => { if (!dailyGoalsSaving) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#047857' } }}
              onMouseLeave={(e) => { if (!dailyGoalsSaving) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#059669' } }}
            >
              {dailyGoalsSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2" style={{ borderColor: '#059669', borderBottomColor: '#FFFFFF' }}></div>
                  Saving...
                </>
              ) : (
                'Save Daily Goals'
              )}
            </Button>
            <p className="text-xs mt-2" style={{ color: '#003333' }}>
              Your daily goals help you stay focused and motivated. You can track your progress in the analytics section.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
