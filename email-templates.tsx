"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Edit, X, Mail, Copy, MoreHorizontal, Bold, Italic, Underline, Type, Palette, Link, List, AlignLeft, AlignCenter, AlignRight, ChevronDown } from "lucide-react"
import { useState, useRef, useEffect } from "react"

export default function EmailTemplates() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateTemplate, setShowCreateTemplate] = useState(false)
  const [showEditTemplate, setShowEditTemplate] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showFieldsDropdown, setShowFieldsDropdown] = useState(false)
  const [showSubjectFieldsDropdown, setShowSubjectFieldsDropdown] = useState(false)
  const editorRef = useRef(null)
  const subjectRef = useRef(null)
  const savedSelectionRef = useRef(null)
  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    content: "",
  })

  // Dynamic fields that can be inserted
  const dynamicFields = [
    { label: "Contact First Name", value: "[contact_first_name]" },
    { label: "Contact Last Name", value: "[contact_last_name]" },
    { label: "Contact Full Name", value: "[contact_full_name]" },
    { label: "Contact Email", value: "[contact_email]" },
    { label: "Contact Phone", value: "[contact_phone]" },
    { label: "Company Name", value: "[company_name]" },
    { label: "Contact Position", value: "[contact_position]" },
    { label: "Contact Location", value: "[contact_location]" },
    { label: "Your Name", value: "[your_name]" },
    { label: "Your Company", value: "[your_company]" },
    { label: "Your Position", value: "[your_position]" },
    { label: "Your Email", value: "[your_email]" },
    { label: "Your Phone", value: "[your_phone]" },
    { label: "Current Date", value: "[current_date]" },
    { label: "Current Time", value: "[current_time]" },
    { label: "Meeting Date", value: "[meeting_date]" },
    { label: "Meeting Time", value: "[meeting_time]" },
    { label: "Custom Field 1", value: "[custom_1]" },
    { label: "Custom Field 2", value: "[custom_2]" },
    { label: "Custom Field 3", value: "[custom_3]" },
  ]

  // Mock templates data
  const templates = [
    {
      id: 1,
      name: "Cold Outreach",
      subject: "Quick question about [Company]",
      content: `Hi [Name],

I hope this email finds you well. I'm reaching out because I noticed [specific observation about their company].

I work with companies like [Company] to help them [specific value proposition]. We recently helped [Similar Company] achieve [specific result].

Would you be open to a brief 10-minute conversation this week?

Best regards,
[Your Name]`,
      category: "cold_outreach",
      createdDate: "10.01.2024",
      lastUpdated: "15.01.2024",
      usageCount: 23,
      status: "active",
    },
    {
      id: 2,
      name: "Follow-up",
      subject: "Following up on our conversation",
      content: `Hi [Name],

Thank you for taking the time to speak with me about [Company].

As promised, I'm attaching some additional information that I think you'll find valuable.

Would you be available for a brief demo next week?

Best regards,
[Your Name]`,
      category: "follow_up",
      createdDate: "08.01.2024",
      lastUpdated: "12.01.2024",
      usageCount: 18,
      status: "active",
    },
    {
      id: 3,
      name: "Meeting Confirmation",
      subject: "Confirming our meeting tomorrow",
      content: `Hi [Name],

I wanted to confirm our meeting scheduled for tomorrow, [Date] at [Time].

Meeting details:
📅 Date: [Date]
🕐 Time: [Time]
📍 Location: [Meeting Link]

Looking forward to our conversation!

Best regards,
[Your Name]`,
      category: "meeting",
      createdDate: "05.01.2024",
      lastUpdated: "10.01.2024",
      usageCount: 15,
      status: "active",
    },
    {
      id: 4,
      name: "Thank You",
      subject: "Thank you for your time - Next steps",
      content: `Hi [Name],

Thank you for taking the time to meet with me today.

Next steps:
• I'll send you the materials we discussed by [Date]
• Technical demo scheduled for [Date]
• Follow-up call on [Date]

Please don't hesitate to reach out if you have any questions.

Best regards,
[Your Name]`,
      category: "follow_up",
      createdDate: "03.01.2024",
      lastUpdated: "08.01.2024",
      usageCount: 12,
      status: "active",
    },
  ]

  const getCategoryColor = (category) => {
    switch (category) {
      case "cold_outreach":
        return "bg-blue-100 text-blue-700"
      case "follow_up":
        return "bg-green-100 text-green-700"
      case "meeting":
        return "bg-purple-100 text-purple-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  const handleCreateTemplate = () => {
    if (templateForm.name.trim() && templateForm.subject.trim() && templateForm.content.trim()) {
      alert(`Created: ${templateForm.name}`)
      setTemplateForm({ name: "", subject: "", content: "" })
      setShowCreateTemplate(false)
    }
  }

  const handleEditTemplate = (template) => {
    setSelectedTemplate(template)
  }

  const handleEditInModal = (template) => {
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      content: template.content,
    })
    setEditingTemplate(template)
    setShowEditTemplate(true)
  }

  const handleSaveTemplate = () => {
    if (templateForm.name.trim() && templateForm.subject.trim() && templateForm.content.trim()) {
      alert(`Updated: ${templateForm.name}`)
      setTemplateForm({ name: "", subject: "", content: "" })
      setEditingTemplate(null)
      setShowEditTemplate(false)
    }
  }

  const handleDuplicateTemplate = (template) => {
    setTemplateForm({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      content: template.content,
    })
    setShowCreateTemplate(true)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFieldsDropdown && !event.target.closest('.fields-dropdown-container')) {
        setShowFieldsDropdown(false)
      }
      if (showSubjectFieldsDropdown && !event.target.closest('.subject-fields-dropdown-container')) {
        setShowSubjectFieldsDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFieldsDropdown, showSubjectFieldsDropdown])

  // Rich text editor functions
  const formatText = (command, value = null) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
  }

  const saveSelection = () => {
    if (editorRef.current && editorRef.current.contains(document.activeElement)) {
      const selection = window.getSelection()
      if (selection.rangeCount > 0) {
        savedSelectionRef.current = selection.getRangeAt(0).cloneRange()
      }
    }
  }

  const restoreSelection = () => {
    if (savedSelectionRef.current && editorRef.current) {
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(savedSelectionRef.current)
      editorRef.current.focus()
    }
  }

  const insertDynamicField = (field) => {
    if (!editorRef.current) return

    // Focus the editor first
    editorRef.current.focus()
    
    // Get saved selection or current selection or create one at the end
    const selection = window.getSelection()
    let range
    
    if (savedSelectionRef.current) {
      range = savedSelectionRef.current
      selection.removeAllRanges()
      selection.addRange(range)
    } else if (selection.rangeCount > 0 && editorRef.current.contains(selection.anchorNode)) {
      range = selection.getRangeAt(0)
    } else {
      // Create range at the end of the editor
      range = document.createRange()
      range.selectNodeContents(editorRef.current)
      range.collapse(false)
      selection.removeAllRanges()
      selection.addRange(range)
    }

    // Create the field element
    const fieldNode = document.createElement('span')
    fieldNode.style.backgroundColor = '#dbeafe'
    fieldNode.style.color = '#1e40af'
    fieldNode.style.padding = '2px 6px'
    fieldNode.style.borderRadius = '4px'
    fieldNode.style.fontWeight = 'bold'
    fieldNode.style.marginLeft = '2px'
    fieldNode.style.marginRight = '2px'
    fieldNode.textContent = field.value
    
    // Insert the field
    range.deleteContents()
    range.insertNode(fieldNode)
    
    // Position cursor after the inserted field
    range.setStartAfter(fieldNode)
    range.setEndAfter(fieldNode)
    selection.removeAllRanges()
    selection.addRange(range)
    
    // Clear saved selection
    savedSelectionRef.current = null
    setShowFieldsDropdown(false)
    editorRef.current.focus()
  }

  const insertSubjectField = (field) => {
    const input = subjectRef.current
    if (input) {
      const start = input.selectionStart
      const end = input.selectionEnd
      const currentValue = input.value
      const newValue = currentValue.substring(0, start) + field.value + currentValue.substring(end)
      input.value = newValue
      input.setSelectionRange(start + field.value.length, start + field.value.length)
      input.focus()
    }
    setShowSubjectFieldsDropdown(false)
  }

  const filteredTemplates = templates.filter(
    (template) =>
      searchQuery === "" ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (selectedTemplate) {
    // Template editor view
    return (
      <div className="flex-1 p-6 bg-white">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 bg-gradient-to-r from-blue-600 from-0% via-blue-600 via-70% to-purple-600 to-100% text-white rounded-3xl shadow-xl p-6 pl-8 pr-11">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-8 h-8 text-white" />
                <div className="pl-[15px]">
                  <h1 className="text-3xl font-black mb-2">{selectedTemplate.name}</h1>
                  <p className="text-gray-100">Edit email template with rich text editor</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setSelectedTemplate(null)}
                  className="h-12 px-6 backdrop-blur-sm hover:bg-white/30 text-white font-bold rounded-2xl border-2 border-white/30 bg-transparent shadow-sm hover:shadow-md transition-all"
                >
                  ← Back
                </Button>
                <Button
                  onClick={() => alert("Template saved!")}
                  className="h-12 px-6 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-2xl border-2 border-white/20 shadow-lg hover:shadow-xl transition-all"
                >
                  Save Template
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Editor */}
            <div className="lg:col-span-2 space-y-6">
                             {/* Subject Line */}
               <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl border-2 border-slate-50 shadow-xl p-6">
                 <div className="flex items-center justify-between mb-4">
                   <label className="text-lg font-black text-gray-900">Subject Line</label>
                   <div className="relative subject-fields-dropdown-container">
                     <Button
                       onClick={() => setShowSubjectFieldsDropdown(!showSubjectFieldsDropdown)}
                       variant="outline"
                       size="sm"
                       className="h-10 px-4 rounded-xl border-2 border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
                     >
                       Insert Field <ChevronDown className="w-4 h-4 ml-2" />
                     </Button>
                     {showSubjectFieldsDropdown && (
                       <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl border-2 border-slate-50 shadow-xl z-50 max-h-64 overflow-y-auto">
                         <div className="p-2">
                           {dynamicFields.map((field, index) => (
                             <button
                               key={index}
                               onClick={() => insertSubjectField(field)}
                               className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors"
                             >
                               {field.label}
                               <span className="text-xs text-gray-500 block">{field.value}</span>
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
                 <Input
                   ref={subjectRef}
                   defaultValue={selectedTemplate.subject}
                   placeholder="Enter email subject..."
                   className="h-14 rounded-2xl border-2 border-slate-50 bg-white shadow-lg text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                 />
               </div>

              {/* Rich Text Editor */}
              <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl border-2 border-slate-50 shadow-xl p-6">
                                 <div className="flex items-center justify-between mb-4">
                   <label className="text-lg font-black text-gray-900">Email Content</label>
                   <div className="relative fields-dropdown-container">
                     <Button
                       onClick={() => {
                         saveSelection()
                         setShowFieldsDropdown(!showFieldsDropdown)
                       }}
                       variant="outline"
                       size="sm"
                       className="h-10 px-4 rounded-xl border-2 border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
                     >
                       Insert Field <ChevronDown className="w-4 h-4 ml-2" />
                     </Button>
                     {showFieldsDropdown && (
                       <div className="absolute right-0 top-12 w-64 bg-white rounded-2xl border-2 border-slate-50 shadow-xl z-50 max-h-64 overflow-y-auto">
                         <div className="p-2">
                           {dynamicFields.map((field, index) => (
                             <button
                               key={index}
                               onClick={() => insertDynamicField(field)}
                               className="w-full text-left px-3 py-2 rounded-xl hover:bg-blue-50 text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors"
                             >
                               {field.label}
                               <span className="text-xs text-gray-500 block">{field.value}</span>
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 </div>

                {/* Toolbar */}
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border-2 border-slate-50 mb-4 flex-wrap">
                  <Button
                    onClick={() => formatText('bold')}
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-xl border-slate-300 hover:bg-white"
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => formatText('italic')}
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-xl border-slate-300 hover:bg-white"
                  >
                    <Italic className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => formatText('underline')}
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-xl border-slate-300 hover:bg-white"
                  >
                    <Underline className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-8 bg-gray-300 mx-2"></div>
                  <Button
                    onClick={() => formatText('justifyLeft')}
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-xl border-slate-300 hover:bg-white"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => formatText('justifyCenter')}
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-xl border-slate-300 hover:bg-white"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => formatText('justifyRight')}
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-xl border-slate-300 hover:bg-white"
                  >
                    <AlignRight className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-8 bg-gray-300 mx-2"></div>
                  <Button
                    onClick={() => formatText('insertUnorderedList')}
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 rounded-xl border-slate-300 hover:bg-white"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <select
                    onChange={(e) => formatText('fontSize', e.target.value)}
                    className="h-10 px-3 rounded-xl border-2 border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="3">Small</option>
                    <option value="4" selected>Normal</option>
                    <option value="5">Large</option>
                    <option value="6">Extra Large</option>
                  </select>
                  <input
                    type="color"
                    onChange={(e) => formatText('foreColor', e.target.value)}
                    className="h-10 w-16 rounded-xl border-2 border-slate-300 bg-white cursor-pointer"
                    title="Text Color"
                  />
                </div>

                {/* Editor */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning={true}
                  className="w-full min-h-96 p-6 bg-white border-2 border-slate-50 rounded-2xl text-base leading-relaxed focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  style={{ whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.content.replace(/\n/g, '<br>') }}
                  onMouseUp={saveSelection}
                  onKeyUp={saveSelection}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Template Info */}
              <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl border-2 border-slate-50 shadow-xl p-6">
                <h3 className="text-lg font-black text-gray-900 mb-4">Template Info</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Template Name</label>
                    <Input
                      defaultValue={selectedTemplate.name}
                      className="h-12 rounded-xl border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                    <select className="w-full h-12 px-3 rounded-xl border-2 border-slate-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="cold_outreach" selected={selectedTemplate.category === 'cold_outreach'}>Cold Outreach</option>
                      <option value="follow_up" selected={selectedTemplate.category === 'follow_up'}>Follow-up</option>
                      <option value="meeting" selected={selectedTemplate.category === 'meeting'}>Meeting</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl border-2 border-slate-50 shadow-xl p-6">
                <h3 className="text-lg font-black text-gray-900 mb-4">Usage Statistics</h3>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-2xl font-black text-blue-900 mb-1">{selectedTemplate.usageCount}</div>
                    <div className="text-sm font-bold text-blue-700">Times Used</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Created:</span>
                      <span className="font-bold text-gray-900">{selectedTemplate.createdDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Updated:</span>
                      <span className="font-bold text-gray-900">{selectedTemplate.lastUpdated}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl border-2 border-slate-50 shadow-xl p-6">
                <h3 className="text-lg font-black text-gray-900 mb-4">Preview</h3>
                <Button
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl"
                  onClick={() => alert("Preview functionality would show the email with sample data")}
                >
                  Preview with Sample Data
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main templates view - simple table like scripts
  return (
    <div className="flex-1 p-6 bg-white">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 bg-gradient-to-r from-blue-600 from-0% via-blue-600 via-70% to-purple-600 to-100% text-white rounded-3xl shadow-xl p-6 pl-8 pr-11">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-8 h-8 text-white" />
              <div className="pl-[15px]">
                <h1 className="text-3xl font-black mb-2">Email Templates</h1>
                <p className="text-gray-100">Manage your email templates and follow-ups</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowCreateTemplate(true)}
                className="h-12 px-6 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-2xl border-2 border-white/20 shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-4 h-4 mr-2 text-gray-900" />
                New Template
              </Button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center justify-between mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 rounded-2xl border-2 border-slate-50 bg-white shadow-lg hover:shadow-xl text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <div className="text-sm font-semibold text-gray-600 bg-gray-50 px-4 py-2 rounded-xl">
            {filteredTemplates.length} of {templates.length} templates
          </div>
        </div>

        {/* Templates List */}
        <div className="space-y-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleEditTemplate(template)}
              className="bg-gradient-to-br from-white to-gray-50/50 rounded-3xl p-8 border-2 border-slate-50 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-6 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center shadow-lg">
                      <Mail className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 mb-1">{template.name}</h3>
                      <p className="text-gray-600 font-semibold text-lg">{template.subject}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
                    <span
                      className={`px-3 py-1 rounded-lg font-semibold ${getCategoryColor(template.category)}`}
                    >
                      {template.category.replace("_", " ").toUpperCase()}
                    </span>
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-semibold">
                      {template.usageCount} uses
                    </span>
                    <span className="bg-gray-50 px-3 py-1 rounded-lg">
                      Updated {template.lastUpdated}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditTemplate(template)
                    }}
                    variant="outline"
                    size="sm"
                    className="h-12 px-6 rounded-2xl border-2 border-gray-200 font-bold hover:bg-gray-50 shadow-sm hover:shadow-md transition-all group-hover:border-blue-300 group-hover:text-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDuplicateTemplate(template)
                    }}
                    variant="outline"
                    size="sm"
                    className="h-12 w-12 p-0 rounded-2xl border-2 border-gray-200 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all"
                  >
                    <Copy className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle more actions
                    }}
                    variant="outline"
                    size="sm"
                    className="h-12 w-12 p-0 rounded-2xl border-2 border-gray-200 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600">Try adjusting your search or create a new template</p>
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {showCreateTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">New Template</h2>
              <Button
                onClick={() => setShowCreateTemplate(false)}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 rounded-xl border-slate-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Template Name</label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g. Cold Outreach"
                  className="h-12 rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Subject Line</label>
                <Input
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="e.g. Quick question about [Company]"
                  className="h-12 rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Content</label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  placeholder="Write your email template here..."
                  className="w-full h-48 p-4 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowCreateTemplate(false)}
                  variant="outline"
                  className="flex-1 h-12 border-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTemplate}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                  disabled={!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.content.trim()}
                >
                  Create
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Edit Template</h2>
              <Button
                onClick={() => {
                  setShowEditTemplate(false)
                  setEditingTemplate(null)
                  setTemplateForm({ name: "", subject: "", content: "" })
                }}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 rounded-xl border-slate-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Template Name</label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g. Cold Outreach"
                  className="h-12 rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Subject Line</label>
                <Input
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="e.g. Quick question about [Company]"
                  className="h-12 rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Content</label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  placeholder="Write your email template here..."
                  className="w-full h-48 p-4 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowEditTemplate(false)
                    setEditingTemplate(null)
                    setTemplateForm({ name: "", subject: "", content: "" })
                  }}
                  variant="outline"
                  className="flex-1 h-12 border-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                  disabled={!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.content.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
