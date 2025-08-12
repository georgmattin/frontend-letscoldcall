"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  SettingsIcon,
  User,
  Phone,
  Globe,
  Key,
  Shield,
  Bell,
  CreditCard,
  Eye,
  EyeOff,
  Check,
  Info,
  Zap,
} from "lucide-react"
import { useState } from "react"

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile")
  const [showApiKeys, setShowApiKeys] = useState({
    twilio: false,
    openai: false,
    webhook: false,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Profile settings state
  const [profileData, setProfileData] = useState({
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@company.com",
    phone: "+372 5123 4567",
    company: "Sales Pro OÜ",
    position: "Sales Manager",
    timezone: "Europe/Tallinn",
    language: "en",
    // Adding fields for script dynamic variables
    callerName: "John Smith",
    companyName: "Sales Pro OÜ",
  })

  // API settings state
  const [apiSettings, setApiSettings] = useState({
    twilioAccountSid: process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID || "",
    twilioAuthToken: process.env.NEXT_PUBLIC_TWILIO_AUTH_TOKEN || "",
    twilioPhoneNumber: process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || "",
    openaiApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || "",
    webhookUrl: process.env.NEXT_PUBLIC_WEBHOOK_URL || "",
    webhookSecret: process.env.NEXT_PUBLIC_WEBHOOK_SECRET || "",
  })

  // Call settings state
  const [callSettings, setCallSettings] = useState({
    autoRecord: true,
    recordingQuality: "high",
    callTimeout: 30,
    autoDialNext: false,
    pauseBetweenCalls: 5,
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  })

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    callReminders: true,
    dailyReports: true,
    weeklyReports: true,
    leadAlerts: true,
    systemUpdates: false,
    marketingEmails: false,
  })

  const handleSave = async (section) => {
    setIsSaving(true)
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 1000)
  }

  const toggleApiKeyVisibility = (key) => {
    setShowApiKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const maskApiKey = (key, show) => {
    if (show) return key
    return key.slice(0, 8) + "..." + key.slice(-4)
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "api", label: "API Keys", icon: Key },
    { id: "calls", label: "Call Settings", icon: Phone },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "security", label: "Security", icon: Shield },
  ]

  return (
    <div className="flex-1 p-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-3xl font-black mb-2">Settings</h1>
              <p className="text-gray-100">Manage your account and preferences</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl p-6 border-2 border-slate-50 shadow-lg sticky top-6">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left font-bold transition-all ${
                        activeTab === tab.id
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl p-6 border-2 border-slate-50 shadow-lg">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900">Profile Settings</h2>
                    <Button
                      onClick={() => handleSave("profile")}
                      disabled={isSaving}
                      className="h-10 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">First Name</label>
                      <Input
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        className="h-12 rounded-2xl border-2 border-slate-50 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Last Name</label>
                      <Input
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        className="h-12 rounded-2xl border-2 border-slate-50 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                      <Input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="h-12 rounded-2xl border-2 border-slate-50 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
                      <Input
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="h-12 rounded-2xl border-2 border-slate-50 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Company</label>
                      <Input
                        value={profileData.company}
                        onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                        className="h-12 rounded-2xl border-2 border-slate-50 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Position</label>
                      <Input
                        value={profileData.position}
                        onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
                        className="h-12 rounded-2xl border-2 border-slate-50 bg-white shadow-sm hover:shadow-md"
                      />
                    </div>
                    
                    {/* Script Dynamic Fields Section */}
                    <div className="col-span-2 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Script Variables</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        These values will be used to replace dynamic placeholders in your scripts (e.g., [my_name], [my_company_name])
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Your Name (for scripts)</label>
                          <Input
                            value={profileData.callerName}
                            onChange={(e) => setProfileData({ ...profileData, callerName: e.target.value })}
                            placeholder="Your full name as it appears in scripts"
                            className="h-12 rounded-2xl border-2 border-slate-50 bg-white shadow-sm hover:shadow-md"
                          />
                          <p className="text-xs text-gray-500 mt-1">Replaces [my_name] in scripts</p>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Company Name (for scripts)</label>
                          <Input
                            value={profileData.companyName}
                            onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
                            placeholder="Your company name as it appears in scripts"
                            className="h-12 rounded-2xl border-2 border-slate-50 bg-white shadow-sm hover:shadow-md"
                          />
                          <p className="text-xs text-gray-500 mt-1">Replaces [my_company_name] in scripts</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Timezone</label>
                      <Select
                        value={profileData.timezone}
                        onValueChange={(value) => setProfileData({ ...profileData, timezone: value })}
                      >
                        <SelectTrigger className="h-12 rounded-2xl border-2 border-slate-50 bg-white shadow-sm hover:shadow-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Europe/Tallinn">Europe/Tallinn (GMT+2)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                          <SelectItem value="America/New_York">America/New_York (GMT-5)</SelectItem>
                          <SelectItem value="America/Los_Angeles">America/Los_Angeles (GMT-8)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Language</label>
                      <Select
                        value={profileData.language}
                        onValueChange={(value) => setProfileData({ ...profileData, language: value })}
                      >
                        <SelectTrigger className="h-12 rounded-2xl border-2 border-slate-50 bg-white shadow-sm hover:shadow-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="et">Estonian</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* API Keys Tab */}
              {activeTab === "api" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900">API Integrations</h2>
                    <Button
                      onClick={() => handleSave("api")}
                      disabled={isSaving}
                      className="h-10 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>

                  {/* Twilio Settings */}
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-blue-900">Twilio Configuration</h3>
                        <p className="text-sm text-blue-700">Configure your Twilio account for making calls</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Account SID</label>
                        <div className="relative">
                          <Input
                            type={showApiKeys.twilio ? "text" : "password"}
                            value={apiSettings.twilioAccountSid}
                            onChange={(e) => setApiSettings({ ...apiSettings, twilioAccountSid: e.target.value })}
                            className="h-12 rounded-2xl border-2 border-blue-200 bg-white pr-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                            onClick={() => toggleApiKeyVisibility("twilio")}
                          >
                            {showApiKeys.twilio ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Auth Token</label>
                        <div className="relative">
                          <Input
                            type="password"
                            value={apiSettings.twilioAuthToken}
                            onChange={(e) => setApiSettings({ ...apiSettings, twilioAuthToken: e.target.value })}
                            className="h-12 rounded-2xl border-2 border-blue-200 bg-white"
                            placeholder="Enter your Twilio Auth Token"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                        <Input
                          value={apiSettings.twilioPhoneNumber}
                          onChange={(e) => setApiSettings({ ...apiSettings, twilioPhoneNumber: e.target.value })}
                          className="h-12 rounded-2xl border-2 border-blue-200 bg-white"
                          placeholder="+1234567890"
                        />
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-blue-100 rounded-xl">
                        <Info className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-800">
                          Get your Twilio credentials from your{" "}
                          <a href="https://console.twilio.com" className="underline font-bold">
                            Twilio Console
                          </a>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* OpenAI Settings */}
                  <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-green-900">OpenAI Configuration</h3>
                        <p className="text-sm text-green-700">
                          Configure AI features for call transcription and analysis
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">API Key</label>
                        <div className="relative">
                          <Input
                            type={showApiKeys.openai ? "text" : "password"}
                            value={apiSettings.openaiApiKey}
                            onChange={(e) => setApiSettings({ ...apiSettings, openaiApiKey: e.target.value })}
                            className="h-12 rounded-2xl border-2 border-green-200 bg-white pr-12"
                            placeholder="sk-..."
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                            onClick={() => toggleApiKeyVisibility("openai")}
                          >
                            {showApiKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-3 bg-green-100 rounded-xl">
                        <Info className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800">
                          Get your OpenAI API key from{" "}
                          <a href="https://platform.openai.com/api-keys" className="underline font-bold">
                            OpenAI Platform
                          </a>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Webhook Settings */}
                  <div className="bg-purple-50 rounded-2xl p-6 border border-purple-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-purple-900">Webhook Configuration</h3>
                        <p className="text-sm text-purple-700">Configure webhooks for external integrations</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Webhook URL</label>
                        <Input
                          value={apiSettings.webhookUrl}
                          onChange={(e) => setApiSettings({ ...apiSettings, webhookUrl: e.target.value })}
                          className="h-12 rounded-2xl border-2 border-purple-200 bg-white"
                          placeholder="https://your-app.com/webhook"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Webhook Secret</label>
                        <div className="relative">
                          <Input
                            type={showApiKeys.webhook ? "text" : "password"}
                            value={apiSettings.webhookSecret}
                            onChange={(e) => setApiSettings({ ...apiSettings, webhookSecret: e.target.value })}
                            className="h-12 rounded-2xl border-2 border-purple-200 bg-white pr-12"
                            placeholder="webhook_secret_123"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                            onClick={() => toggleApiKeyVisibility("webhook")}
                          >
                            {showApiKeys.webhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Call Settings Tab */}
              {activeTab === "calls" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900">Call Settings</h2>
                    <Button
                      onClick={() => handleSave("calls")}
                      disabled={isSaving}
                      className="h-10 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recording Settings */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Recording Settings</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-gray-700">Auto Record Calls</label>
                          <button
                            onClick={() => setCallSettings({ ...callSettings, autoRecord: !callSettings.autoRecord })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              callSettings.autoRecord ? "bg-blue-600" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                callSettings.autoRecord ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Recording Quality</label>
                          <Select
                            value={callSettings.recordingQuality}
                            onValueChange={(value) => setCallSettings({ ...callSettings, recordingQuality: value })}
                          >
                            <SelectTrigger className="h-10 rounded-xl border-2 border-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low Quality</SelectItem>
                              <SelectItem value="medium">Medium Quality</SelectItem>
                              <SelectItem value="high">High Quality</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Dialing Settings */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Dialing Settings</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Call Timeout (seconds)</label>
                          <Input
                            type="number"
                            value={callSettings.callTimeout}
                            onChange={(e) =>
                              setCallSettings({ ...callSettings, callTimeout: Number.parseInt(e.target.value) })
                            }
                            className="h-10 rounded-xl border-2 border-gray-200"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-gray-700">Auto Dial Next</label>
                          <button
                            onClick={() =>
                              setCallSettings({ ...callSettings, autoDialNext: !callSettings.autoDialNext })
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              callSettings.autoDialNext ? "bg-blue-600" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                callSettings.autoDialNext ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            Pause Between Calls (seconds)
                          </label>
                          <Input
                            type="number"
                            value={callSettings.pauseBetweenCalls}
                            onChange={(e) =>
                              setCallSettings({ ...callSettings, pauseBetweenCalls: Number.parseInt(e.target.value) })
                            }
                            className="h-10 rounded-xl border-2 border-gray-200"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Working Hours */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 md:col-span-2">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Working Hours</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Start Time</label>
                          <Input
                            type="time"
                            value={callSettings.workingHoursStart}
                            onChange={(e) => setCallSettings({ ...callSettings, workingHoursStart: e.target.value })}
                            className="h-10 rounded-xl border-2 border-gray-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">End Time</label>
                          <Input
                            type="time"
                            value={callSettings.workingHoursEnd}
                            onChange={(e) => setCallSettings({ ...callSettings, workingHoursEnd: e.target.value })}
                            className="h-10 rounded-xl border-2 border-gray-200"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Working Days</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: "monday", label: "Mon" },
                            { id: "tuesday", label: "Tue" },
                            { id: "wednesday", label: "Wed" },
                            { id: "thursday", label: "Thu" },
                            { id: "friday", label: "Fri" },
                            { id: "saturday", label: "Sat" },
                            { id: "sunday", label: "Sun" },
                          ].map((day) => (
                            <button
                              key={day.id}
                              onClick={() => {
                                const newDays = callSettings.workingDays.includes(day.id)
                                  ? callSettings.workingDays.filter((d) => d !== day.id)
                                  : [...callSettings.workingDays, day.id]
                                setCallSettings({ ...callSettings, workingDays: newDays })
                              }}
                              className={`px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                                callSettings.workingDays.includes(day.id)
                                  ? "bg-blue-600 text-white"
                                  : "bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900">Notification Settings</h2>
                    <Button
                      onClick={() => handleSave("notifications")}
                      disabled={isSaving}
                      className="h-10 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-2xl"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        key: "emailNotifications",
                        label: "Email Notifications",
                        desc: "Receive notifications via email",
                      },
                      { key: "callReminders", label: "Call Reminders", desc: "Reminders for scheduled callbacks" },
                      { key: "dailyReports", label: "Daily Reports", desc: "Daily summary of your calling activity" },
                      { key: "weeklyReports", label: "Weekly Reports", desc: "Weekly performance reports" },
                      { key: "leadAlerts", label: "Lead Alerts", desc: "Notifications when new leads are qualified" },
                      { key: "systemUpdates", label: "System Updates", desc: "Updates about new features and changes" },
                      {
                        key: "marketingEmails",
                        label: "Marketing Emails",
                        desc: "Tips, best practices, and promotions",
                      },
                    ].map((setting) => (
                      <div
                        key={setting.key}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200"
                      >
                        <div>
                          <div className="font-bold text-gray-900">{setting.label}</div>
                          <div className="text-sm text-gray-600">{setting.desc}</div>
                        </div>
                        <button
                          onClick={() =>
                            setNotificationSettings({
                              ...notificationSettings,
                              [setting.key]: !notificationSettings[setting.key],
                            })
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            notificationSettings[setting.key] ? "bg-blue-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              notificationSettings[setting.key] ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Billing Tab */}
              {activeTab === "billing" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-black text-gray-900">Billing & Subscription</h2>

                  {/* Current Plan */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Professional Plan</h3>
                        <p className="text-gray-600">Unlimited calls, AI features, and integrations</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-gray-900">€49/month</div>
                        <div className="text-sm text-gray-600">Billed monthly</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-white rounded-xl">
                        <div className="text-lg font-bold text-gray-900">Unlimited</div>
                        <div className="text-sm text-gray-600">Calls per month</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-xl">
                        <div className="text-lg font-bold text-gray-900">5</div>
                        <div className="text-sm text-gray-600">Team members</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-xl">
                        <div className="text-lg font-bold text-gray-900">Premium</div>
                        <div className="text-sm text-gray-600">AI features</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 h-10 border-2 border-blue-200 text-blue-700 hover:bg-blue-50 font-bold rounded-xl"
                      >
                        Change Plan
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 h-10 border-2 border-red-200 text-red-700 hover:bg-red-50 font-bold rounded-xl"
                      >
                        Cancel Subscription
                      </Button>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Method</h3>
                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-6 bg-blue-600 rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">VISA</span>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">•••• •••• •••• 4242</div>
                          <div className="text-sm text-gray-600">Expires 12/25</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 border-gray-300 text-gray-700 hover:bg-gray-50 font-bold rounded-lg"
                      >
                        Update
                      </Button>
                    </div>
                  </div>

                  {/* Usage This Month */}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Usage This Month</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-xl">
                        <div className="text-2xl font-bold text-gray-900">1,247</div>
                        <div className="text-sm text-gray-600">Calls made</div>
                        <div className="text-xs text-green-600 mt-1">Unlimited plan</div>
                      </div>
                      <div className="p-4 bg-white rounded-xl">
                        <div className="text-2xl font-bold text-gray-900">42.3 hrs</div>
                        <div className="text-sm text-gray-600">Call time</div>
                        <div className="text-xs text-green-600 mt-1">Unlimited plan</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900">Security Settings</h2>
                  </div>

                  {/* Change Password */}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Change Password</h3>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Current Password</label>
                        <Input
                          type="password"
                          className="h-10 rounded-xl border-2 border-gray-200"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
                        <Input
                          type="password"
                          className="h-10 rounded-xl border-2 border-gray-200"
                          placeholder="Enter new password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Confirm New Password</label>
                        <Input
                          type="password"
                          className="h-10 rounded-xl border-2 border-gray-200"
                          placeholder="Confirm new password"
                        />
                      </div>
                      <Button className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
                        Update Password
                      </Button>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                      </div>
                      <Button
                        variant="outline"
                        className="h-10 px-4 border-2 border-green-200 text-green-700 hover:bg-green-50 font-bold rounded-xl"
                      >
                        Enable 2FA
                      </Button>
                    </div>
                  </div>

                  {/* Active Sessions */}
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Active Sessions</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                        <div>
                          <div className="font-bold text-gray-900">Current Session</div>
                          <div className="text-sm text-gray-600">Chrome on Windows • Tallinn, Estonia</div>
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                          ACTIVE
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                        <div>
                          <div className="font-bold text-gray-900">Mobile App</div>
                          <div className="text-sm text-gray-600">iPhone • Last seen 2 hours ago</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 border-red-200 text-red-700 hover:bg-red-50 font-bold rounded-lg"
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Success Message */}
              {saveSuccess && (
                <div className="fixed bottom-6 right-6 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  <span className="font-bold">Settings saved successfully!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
