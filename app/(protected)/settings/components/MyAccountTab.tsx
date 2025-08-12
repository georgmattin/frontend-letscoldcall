"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"

interface MyAccountTabProps {
  firstName: string
  lastName: string
  email: string
  newPassword: string
  newPasswordAgain: string
  setFirstName: (v: string) => void
  setLastName: (v: string) => void
  setNewPassword: (v: string) => void
  setNewPasswordAgain: (v: string) => void
  saving: boolean
  onSaveProfile: () => void
  onChangePassword: () => void
}

export default function MyAccountTab(props: MyAccountTabProps) {
  const {
    firstName,
    lastName,
    email,
    newPassword,
    newPasswordAgain,
    setFirstName,
    setLastName,
    setNewPassword,
    setNewPasswordAgain,
    saving,
    onSaveProfile,
    onChangePassword,
  } = props

  // Local-only: password visibility UI state
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordAgain, setShowPasswordAgain] = useState(false)

  return (
    <div className="bg-white rounded-[5px] border p-8" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#003333' }}>My Account</h2>
          <p style={{ color: '#003333' }}>Manage your profile and password</p>
        </div>
      </div>
      <div className="space-y-6">
        {/* First Name */}
        <div>
          <Label htmlFor="firstName" className="text-[16px] font-semibold text-[#003333]">
            First name
          </Label>
          <Input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1"
            placeholder="Enter your first name"
          />
        </div>

        {/* Last Name */}
        <div>
          <Label htmlFor="lastName" className="text-[16px] font-semibold text-[#003333]">
            Last name
          </Label>
          <Input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1"
            placeholder="Enter your last name"
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="text-[16px] font-semibold text-[#003333]">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="mt-1 bg-gray-50"
            placeholder="Your email address"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed. Contact support if needed.</p>
        </div>

        {/* Save Profile Button */}
        <div className="pt-4">
          <Button onClick={onSaveProfile} disabled={saving} className="bg-[#059669] hover:bg-[#059669]/80 text-white">
            {saving ? "Saving..." : "Save Profile"}
          </Button>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 pt-6 mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Change password</h3>

          <div className="space-y-4 max-w-md">
            {/* New Password */}
            <div>
              <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                New Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password Again */}
            <div>
              <Label htmlFor="newPasswordAgain" className="text-sm font-medium text-gray-700">
                New Password Again
              </Label>
              <div className="relative mt-1">
                <Input
                  id="newPasswordAgain"
                  type={showPasswordAgain ? "text" : "password"}
                  value={newPasswordAgain}
                  onChange={(e) => setNewPasswordAgain(e.target.value)}
                  className="pr-10"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordAgain(!showPasswordAgain)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPasswordAgain ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Change Password Button */}
            <div className="pt-2">
              <Button
                onClick={onChangePassword}
                disabled={saving || !newPassword || !newPasswordAgain}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
              >
                {saving ? "Changing..." : "Change Password"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
