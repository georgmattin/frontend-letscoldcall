"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Edit, X, Eye, ChevronUp, ChevronDown, PlusIcon,FileText, Users, Copy } from "lucide-react"
import { useState } from "react"

export default function Scripts() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedScript, setSelectedScript] = useState(null)
  const [showCreateScript, setShowCreateScript] = useState(false)
  const [showEditScript, setShowEditScript] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showStats, setShowStats] = useState(true)
  const [editingScript, setEditingScript] = useState(null)
  const [scriptForm, setScriptForm] = useState({
    name: "",
    description: "",
    category: "",
    content: "",
    linkedLists: [],
  })

  // Mock scripts data
  const scripts = [
    {
      id: 1,
      name: "Default Cold Outreach",
      description: "Standard cold calling script for new prospects",
      category: "cold_outreach",
      content: `Hi [Name], this is [Your Name] from [Company].

I hope I'm not catching you at a bad time. We specialize in helping companies like [Company] [specific value proposition].

I noticed that [specific observation about their company/industry], and I believe we might be able to help you [specific benefit].

Do you have 30 seconds for me to explain why I'm calling?

[Wait for response]

Perfect! We've recently helped [similar company] achieve [specific result]. For example:
- [Specific metric/improvement]
- [Another concrete benefit]
- [Third tangible outcome]

I'd love to show you exactly how we did this. Would you be open to a 15-minute conversation this week to explore if this could work for [Company]?`,
      linkedLists: ["Q1 2024 Tech Startup", "Estonian SaaS Companies"],
      createdDate: "05.01.2024",
      lastUpdated: "12.01.2024",
      usageCount: 45,
      successRate: 32,
      avgCallDuration: "4:23",
      status: "active",
    },
    {
      id: 2,
      name: "Follow-up Script",
      description: "For following up with previous contacts",
      category: "follow_up",
      content: `Hi [Name], this is [Your Name] from [Company].

We spoke [time period] ago about [previous conversation topic], and you mentioned [specific point they raised].

I wanted to follow up because [relevant development/new information].

Since our last conversation, we've [recent achievement/update], and I thought this might be particularly relevant for [Company] given [specific reason].

Do you have a few minutes to discuss how this might impact your [relevant area]?

[Wait for response]

Great! Let me share what's new and how it specifically addresses [their challenge/need]...`,
      linkedLists: ["Warm Leads - December"],
      createdDate: "20.12.2023",
      lastUpdated: "08.01.2024",
      usageCount: 23,
      successRate: 58,
      avgCallDuration: "3:45",
      status: "active",
    },
    {
      id: 3,
      name: "Referral Introduction",
      description: "When calling through referrals",
      category: "referral",
      content: `Hi [Name], this is [Your Name] from [Company].

[Referrer name] from [Referrer company] suggested I reach out to you. They mentioned that you might be interested in [specific area/challenge].

[Referrer name] told me that [specific context about referral], and they thought our solution might be a good fit for [Company].

We've been working with [Referrer company] to [specific results/benefits], and [Referrer name] felt you might face similar challenges.

Would you have a few minutes to discuss [specific topic]?

[Wait for response]

Excellent! Let me tell you about what we've accomplished with [Referrer company] and how it might apply to your situation...`,
      linkedLists: ["Fintech Leads"],
      createdDate: "15.12.2023",
      lastUpdated: "05.01.2024",
      usageCount: 12,
      successRate: 67,
      avgCallDuration: "5:12",
      status: "active",
    },
    {
      id: 4,
      name: "Product Demo Script",
      description: "For scheduled demo calls",
      category: "demo",
      content: `Hi [Name], thank you for taking the time for this demo today.

As we discussed, I'll be showing you how [Company] can help [specific benefit discussed in previous call].

Before we start, I'd like to understand a bit more about your current process. Can you walk me through how you currently handle [specific area]?

[Listen and take notes]

Perfect, that gives me a great foundation. Let me show you exactly how we can address those challenges...

[Begin demo focusing on their specific needs]`,
      linkedLists: [],
      createdDate: "10.01.2024",
      lastUpdated: "10.01.2024",
      usageCount: 8,
      successRate: 75,
      avgCallDuration: "12:30",
      status: "active",
    },
  ]

  // Mock contact lists for linking
  const contactLists = [
    { id: 1, name: "Q1 2024 Tech Startup" },
    { id: 2, name: "Estonian SaaS Companies" },
    { id: 3, name: "Fintech Leads" },
    { id: 4, name: "Warm Leads - December" },
  ]

  const categories = [
    { id: "cold_outreach", name: "Cold Outreach" },
    { id: "follow_up", name: "Follow-up" },
    { id: "referral", name: "Referral" },
    { id: "demo", name: "Demo" },
    { id: "objection_handling", name: "Objection Handling" },
    { id: "closing", name: "Closing" },
  ]

  const getCategoryColor = (category) => {
    switch (category) {
      case "cold_outreach":
        return "bg-blue-100 text-blue-700"
      case "follow_up":
        return "bg-green-100 text-green-700"
      case "referral":
        return "bg-purple-100 text-purple-700"
      case "demo":
        return "bg-orange-100 text-orange-700"
      case "objection_handling":
        return "bg-red-100 text-red-700"
      case "closing":
        return "bg-yellow-100 text-yellow-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const handleCreateScript = () => {
    if (scriptForm.name.trim() && scriptForm.content.trim()) {
      alert(`Created new script: ${scriptForm.name}`)
      setScriptForm({
        name: "",
        description: "",
        category: "",
        content: "",
        linkedLists: [],
      })
      setShowCreateScript(false)
    }
  }

  const handleEditScript = (script) => {
    setScriptForm({
      name: script.name,
      description: script.description,
      category: script.category,
      content: script.content,
      linkedLists: script.linkedLists,
    })
    setEditingScript(script)
    setShowEditScript(true)
  }

  const handleSaveScript = () => {
    if (scriptForm.name.trim() && scriptForm.content.trim()) {
      alert(`Updated script: ${scriptForm.name}`)
      setScriptForm({
        name: "",
        description: "",
        category: "",
        content: "",
        linkedLists: [],
      })
      setEditingScript(null)
      setShowEditScript(false)
    }
  }

  const handleDeleteScript = (scriptId) => {
    if (confirm("Are you sure you want to delete this script?")) {
      alert(`Deleted script with ID: ${scriptId}`)
    }
  }

  const handleDuplicateScript = (script) => {
    setScriptForm({
      name: `${script.name} (Copy)`,
      description: script.description,
      category: script.category,
      content: script.content,
      linkedLists: [],
    })
    setShowCreateScript(true)
  }

  const filteredScripts = scripts.filter(
    (script) =>
      searchQuery === "" ||
      script.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      script.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      script.category.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (selectedScript) {
    // Script detail view
    return (
      <div className="flex-1 p-6 bg-white">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8 bg-gradient-to-r from-blue-600 from-0% via-blue-600 via-70% to-purple-600 to-100% text-white rounded-3xl shadow-xl p-6 pl-8 pr-11">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-white" />
                <div className="pl-[15px]">
                  <h1 className="text-3xl font-black mb-2">{selectedScript.name}</h1>
                  <p className="text-gray-100">{selectedScript.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setSelectedScript(null)}
                  className="h-12 px-6 backdrop-blur-sm hover:bg-white/30 text-white font-bold rounded-2xl border-2 border-white/30 bg-transparent shadow-sm hover:shadow-md transition-all"
                >
                  ← Back
                </Button>
                <Button
                  onClick={() => handleEditScript(selectedScript)}
                  className="h-12 px-6 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-2xl border-2 border-white/20 shadow-lg hover:shadow-xl transition-all"
                >
                  <Edit className="w-4 h-4 mr-2 text-gray-900" />
                  Edit Script
                </Button>
                <Button
                  onClick={() => handleDuplicateScript(selectedScript)}
                  className="h-12 px-6 backdrop-blur-sm hover:bg-white/30 text-white font-bold rounded-2xl border-2 border-white/30 bg-transparent shadow-sm hover:shadow-md transition-all"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </Button>
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl border-2 border-slate-50 shadow-lg mb-6">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Script Performance</h2>
              <Button
                onClick={() => setShowStats(!showStats)}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 rounded-xl border-slate-300"
              >
                {showStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {showStats && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-2xl font-black text-blue-900 mb-1">{selectedScript.usageCount}</div>
                    <div className="text-sm font-bold text-blue-700">Times Used</div>
                  </div>

                  <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="text-2xl font-black text-green-900 mb-1">{selectedScript.successRate}%</div>
                    <div className="text-sm font-bold text-green-700">Success Rate</div>
                  </div>

                  <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <div className="text-2xl font-black text-purple-900 mb-1">{selectedScript.avgCallDuration}</div>
                    <div className="text-sm font-bold text-purple-700">Avg Duration</div>
                  </div>

                  <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="text-2xl font-black text-orange-900 mb-1">{selectedScript.linkedLists.length}</div>
                    <div className="text-sm font-bold text-orange-700">Linked Lists</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Recent Usage</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">This Week</span>
                        <span className="text-sm font-bold text-gray-900">12 calls</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Last Week</span>
                        <span className="text-sm font-bold text-gray-900">18 calls</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">This Month</span>
                        <span className="text-sm font-bold text-gray-900">{selectedScript.usageCount} calls</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Linked Contact Lists</h3>
                    <div className="space-y-2">
                      {selectedScript.linkedLists.map((listName, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-white rounded-lg border">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{listName}</span>
                        </div>
                      ))}
                      {selectedScript.linkedLists.length === 0 && (
                        <div className="text-sm text-gray-500 italic">No linked contact lists</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Script Content */}
          <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-2xl border-2 border-slate-50 shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Script Content</h2>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold ${getCategoryColor(selectedScript.category)}`}
                  >
                    {categories.find((c) => c.id === selectedScript.category)?.name || selectedScript.category}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <pre className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedScript.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main scripts view
  return (
    <div className="flex-1 p-6 bg-white">
      <div className="max-w-5xl mx-auto">
        {/* Header with gradient background and icon */}
        <div className="mb-8 bg-gradient-to-r from-blue-600 from-0% via-blue-600 via-70% to-purple-600 to-100% text-white rounded-3xl shadow-xl p-6 pl-8 pr-11">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-white" />
              <div className="pl-[15px]">
                <h1 className="text-3xl font-black my-[-2px]">Call Scripts</h1>
                <p className="text-gray-100">Manage your call scripts and templates</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowCreateScript(true)}
                className="h-12 px-6 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-2xl border-2 border-white/20 shadow-lg hover:shadow-xl transition-all"
              >
                <PlusIcon className="mr-2 text-gray-900 size-5" />
                Create Script
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center justify-between mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search scripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 rounded-2xl border-2 border-slate-50 bg-white shadow-lg hover:shadow-xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <div className="text-sm font-semibold text-gray-600 bg-gray-50 px-4 py-2 rounded-xl">
            {filteredScripts.length} of {scripts.length} scripts
          </div>
        </div>

        {/* Scripts List */}
        <div className="space-y-6">
          {filteredScripts.map((script) => (
            <div
              key={script.id}
              onClick={() => setSelectedScript(script)}
              className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl p-8 border-2 border-slate-50 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                {/* Script Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-6 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center shadow-lg">
                      <FileText className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-1">{script.name}</h3>
                      <p className="text-gray-600 font-semibold text-lg">{script.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
                    <span
                      className={`px-3 py-1 rounded-lg font-semibold ${getCategoryColor(script.category)}`}
                    >
                      {categories.find((c) => c.id === script.category)?.name || script.category}
                    </span>
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-semibold">
                      {script.usageCount} uses
                    </span>
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg font-semibold">
                      {script.successRate}% success
                    </span>
                    <span className="bg-gray-50 px-3 py-1 rounded-lg">
                      Avg: {script.avgCallDuration}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedScript(script)
                    }}
                    variant="outline"
                    size="sm"
                    className="h-12 px-6 rounded-2xl border-2 border-gray-200 font-bold hover:bg-gray-50 shadow-sm hover:shadow-md transition-all group-hover:border-blue-300 group-hover:text-blue-700"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditScript(script)
                    }}
                    variant="outline"
                    size="sm"
                    className="h-12 w-12 p-0 rounded-2xl border-2 border-gray-200 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all"
                  >
                    <Edit className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDuplicateScript(script)
                    }}
                    variant="outline"
                    size="sm"
                    className="h-12 w-12 p-0 rounded-2xl border-2 border-gray-200 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all"
                  >
                    <Copy className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredScripts.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No scripts found</h3>
            <p className="text-gray-600">Try adjusting your search or create a new script</p>
          </div>
        )}
      </div>

      {/* Create Script Modal */}
      {showCreateScript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create New Script</h2>
              <Button
                onClick={() => setShowCreateScript(false)}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 rounded-xl border-slate-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Script Name *</label>
                  <Input
                    value={scriptForm.name}
                    onChange={(e) => setScriptForm({ ...scriptForm, name: e.target.value })}
                    placeholder="Enter script name..."
                    className="h-12 rounded-xl border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                  <Select
                    value={scriptForm.category}
                    onValueChange={(value) => setScriptForm({ ...scriptForm, category: value })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-300">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="font-semibold">
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <Input
                  value={scriptForm.description}
                  onChange={(e) => setScriptForm({ ...scriptForm, description: e.target.value })}
                  placeholder="Brief description of when to use this script..."
                  className="h-12 rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Script Content *</label>
                <textarea
                  value={scriptForm.content}
                  onChange={(e) => setScriptForm({ ...scriptForm, content: e.target.value })}
                  placeholder="Enter your script content here..."
                  className="w-full h-64 p-4 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowCreateScript(false)}
                  variant="outline"
                  className="flex-1 h-12 border-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateScript}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                  disabled={!scriptForm.name.trim() || !scriptForm.content.trim()}
                >
                  Create Script
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Script Modal */}
      {showEditScript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Script</h2>
              <Button
                onClick={() => {
                  setShowEditScript(false)
                  setEditingScript(null)
                  setScriptForm({
                    name: "",
                    description: "",
                    category: "",
                    content: "",
                    linkedLists: [],
                  })
                }}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 rounded-xl border-slate-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Script Name *</label>
                  <Input
                    value={scriptForm.name}
                    onChange={(e) => setScriptForm({ ...scriptForm, name: e.target.value })}
                    placeholder="Enter script name..."
                    className="h-12 rounded-xl border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                  <Select
                    value={scriptForm.category}
                    onValueChange={(value) => setScriptForm({ ...scriptForm, category: value })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-300">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="font-semibold">
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <Input
                  value={scriptForm.description}
                  onChange={(e) => setScriptForm({ ...scriptForm, description: e.target.value })}
                  placeholder="Brief description of when to use this script..."
                  className="h-12 rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Script Content *</label>
                <textarea
                  value={scriptForm.content}
                  onChange={(e) => setScriptForm({ ...scriptForm, content: e.target.value })}
                  placeholder="Enter your script content here..."
                  className="w-full h-64 p-4 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowEditScript(false)
                    setEditingScript(null)
                    setScriptForm({
                      name: "",
                      description: "",
                      category: "",
                      content: "",
                      linkedLists: [],
                    })
                  }}
                  variant="outline"
                  className="flex-1 h-12 border-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveScript}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                  disabled={!scriptForm.name.trim() || !scriptForm.content.trim()}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
