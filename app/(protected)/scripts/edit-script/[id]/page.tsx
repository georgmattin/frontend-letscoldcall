"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Plus, Trash2, Wand2, X, Edit } from "lucide-react"
import { useRouter, useParams } from 'next/navigation'
import RichTextEditor from "@/components/ui/rich-text-editor"
import { createClient } from '@/utils/supabase/client'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import DeleteConfirmationPopup from '@/components/delete-confirmation-popup'
import { PackageLimitDialog } from "@/components/ui/package-limit-dialog"
import { canPerformAction, updateUsage, getPackageInfo } from '@/lib/package-limits'
import ScriptAIModal from '@/components/ai/ScriptAIModal'
import ObjectionsAIModal from '@/components/ai/ObjectionsAIModal'
import ObjectionCard from '@/components/scripts/ObjectionCard'

interface ContactList {
  id: number
  name: string
  description: string
}

interface Objection {
  id: string
  objection: string
  response: string
  category: string
  priority: string
}

export default function EditScriptPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const { toast } = useToast()
  const [isBackButtonHovered, setIsBackButtonHovered] = useState(false)
  
  // Script ID for editing
  const scriptId = params.id as string
  const isEditing = !!scriptId
  
  // Form state
  const [scriptName, setScriptName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [contactListId, setContactListId] = useState("")
  const [scriptContent, setScriptContent] = useState("")
  
  // Contact lists
  const [contactLists, setContactLists] = useState<ContactList[]>([])
  const [loadingLists, setLoadingLists] = useState(false)
  
  // Objections
  const [objections, setObjections] = useState<Objection[]>([])
  const [currentObjection, setCurrentObjection] = useState({
    objection: "",
    response: "",
    category: "",
    priority: ""
  })
  
  // Edit objection state
  const [editingObjectionId, setEditingObjectionId] = useState<string | null>(null)
  const [editObjection, setEditObjection] = useState({
    objection: "",
    response: "",
    category: "",
    priority: ""
  })
  
  // AI Generation
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiForm, setAiForm] = useState({
    productDescription: ""
  })
  
  // Objections AI Generation
  const [showObjectionsAI, setShowObjectionsAI] = useState(false)
  const [objectionsAiGenerating, setObjectionsAiGenerating] = useState(false)
  const [objectionsAiError, setObjectionsAiError] = useState("")
  
  // Loading and saving state
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  
  // Delete script state
  const [isDeleteButtonHovered, setIsDeleteButtonHovered] = useState(false)
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false)
  
  // Package limit dialogs
  const [showScriptGenerationDialog, setShowScriptGenerationDialog] = useState(false)
  const [showObjectionGenerationDialog, setShowObjectionGenerationDialog] = useState(false)
  const [packageLimitInfo, setPackageLimitInfo] = useState<{current?: number, limit?: number}>({})
  const [canGenerateScript, setCanGenerateScript] = useState(false)
  const [canGenerateObjections, setCanGenerateObjections] = useState(false)
  
  // Script count and usage tracking
  const [currentScriptCount, setCurrentScriptCount] = useState(0)
  const [maxScripts, setMaxScripts] = useState(0)
  const [scriptGenerationsUsed, setScriptGenerationsUsed] = useState(0)
  const [maxScriptGenerations, setMaxScriptGenerations] = useState(0)
  const [objectionGenerationsUsed, setObjectionGenerationsUsed] = useState(0)
  const [maxObjectionGenerations, setMaxObjectionGenerations] = useState(0)
  const [isCheckingLimits, setIsCheckingLimits] = useState(true)
  
  // Rich text editor insert function
  const [insertFunction, setInsertFunction] = useState<((text: string) => void) | null>(null)
  
  // Callback for handling insert variable function
  const handleInsertVariable = useCallback((fn: (text: string) => void) => {
    setInsertFunction(() => fn)
  }, [])

  // Load contact lists and script data on component mount
  useEffect(() => {
    loadContactLists()
    if (isEditing && scriptId) {
      loadScriptData(scriptId)
    }
    checkPackageLimits()
  }, [isEditing, scriptId])

  // Check package limits for button states (edit mode - no script creation limit check)
  const checkPackageLimits = async () => {
    try {
      setIsCheckingLimits(true)
      // Get full package information
      const packageInfo = await getPackageInfo()
      console.log('📊 Edit-Script Package Info received:', packageInfo)
      
      if (packageInfo.hasSubscription && packageInfo.package && packageInfo.currentUsage) {
        const { limits } = packageInfo.package
        const { currentUsage } = packageInfo
        
        console.log('📊 Edit-Script Limits:', limits)
        console.log('📊 Edit-Script Current Usage:', currentUsage)
        
        // Set script limits (for display only in edit mode)
        setCurrentScriptCount(currentUsage.active_call_scripts || 0)
        setMaxScripts(limits.max_call_scripts || 0)
        
        // Set AI generation usage
        setScriptGenerationsUsed(currentUsage.script_generations_used || 0)
        setMaxScriptGenerations(limits.max_script_generations || 0)
        setObjectionGenerationsUsed(currentUsage.objection_generations_used || 0)
        setMaxObjectionGenerations(limits.max_objection_generations || 0)
        
        console.log('📊 Edit-Script State updates:', {
          scriptGenerationsUsed: currentUsage.script_generations_used || 0,
          maxScriptGenerations: limits.max_script_generations || 0,
          objectionGenerationsUsed: currentUsage.objection_generations_used || 0,
          maxObjectionGenerations: limits.max_objection_generations || 0
        })
        
        // Check AI generation limits
        const scriptCheck = await canPerformAction('script_generation')
        const objectionCheck = await canPerformAction('objection_generation')
        
        setCanGenerateScript(scriptCheck.allowed)
        setCanGenerateObjections(objectionCheck.allowed)
      }
    } catch (error) {
      console.error('Error checking package limits:', error)
    } finally {
      setIsCheckingLimits(false)
    }
  }

  const loadContactLists = async () => {
    try {
      setLoadingLists(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('contact_lists')
        .select('id, name, description')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      setContactLists(data || [])
    } catch (err: any) {
      console.error('Error loading contact lists:', err)
      setError("Failed to load contact lists: " + err.message)
    } finally {
      setLoadingLists(false)
    }
  }

  const loadScriptData = async (id: string) => {
    try {
      setSaving(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setScriptName(data.name || "")
        setDescription(data.description || "")
        setCategory(data.category || "")
        setScriptContent(data.content || "")
        setObjections(data.objections || [])
        
        // Set contact list if linked_lists exists and has data
        if (data.linked_lists && data.linked_lists.length > 0) {
          setContactListId(data.linked_lists[0].toString())
        }
      }
    } catch (err: any) {
      console.error('Error loading script:', err)
      setError("Failed to load script: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Delete script
  const handleDeleteScriptClick = () => {
    setIsDeletePopupOpen(true)
  }

  const handleCloseDeletePopup = () => {
    setIsDeletePopupOpen(false)
  }

  const handleConfirmDeleteScript = async () => {
    if (!scriptId || !isEditing) return

    setSaving(true)
    setError("")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('scripts')
        .delete()
        .eq('id', scriptId)
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: "Script deleted!",
        description: "Your script has been deleted successfully.",
      })

      router.push('/scripts')

    } catch (err: any) {
      console.error('Error deleting script:', err)
      setError("Failed to delete script: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Function to insert dynamic variable into script content at cursor position
  const insertVariable = (variable: string) => {
    console.log('insertVariable called with:', variable)
    console.log('insertFunction available:', !!insertFunction)
    
    if (insertFunction) {
      // Insert at cursor position using rich text editor
      insertFunction(variable)
    } else {
      // Fallback: append to script content
      setScriptContent(prev => prev + ' ' + variable + ' ')
    }
  }

  // Handle objection submission
  const handleAddObjection = () => {
    if (!currentObjection.objection.trim() || !currentObjection.response.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in both objection and response.",
        variant: "destructive"
      })
      return
    }

    const newObjection: Objection = {
      id: Date.now().toString(),
      ...currentObjection
    }

    setObjections(prev => [...prev, newObjection])
    setCurrentObjection({
      objection: "",
      response: "",
      category: "",
      priority: ""
    })

    toast({
      title: "Objection added!",
      description: "The objection has been added to your script.",
    })
  }

  // Remove objection
  const removeObjection = (id: string) => {
    setObjections(prev => prev.filter(obj => obj.id !== id))
  }

  // Start editing objection
  const startEditObjection = (objection: Objection) => {
    setEditingObjectionId(objection.id)
    setEditObjection({
      objection: objection.objection,
      response: objection.response,
      category: objection.category,
      priority: objection.priority
    })
  }

  // Cancel editing objection
  const cancelEditObjection = () => {
    setEditingObjectionId(null)
    setEditObjection({
      objection: "",
      response: "",
      category: "",
      priority: ""
    })
  }

  // Save edited objection
  const saveEditedObjection = () => {
    if (!editObjection.objection.trim() || !editObjection.response.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in both objection and response.",
        variant: "destructive"
      })
      return
    }

    setObjections(prev => prev.map(obj => 
      obj.id === editingObjectionId 
        ? { ...obj, ...editObjection }
        : obj
    ))

    setEditingObjectionId(null)
    setEditObjection({
      objection: "",
      response: "",
      category: "",
      priority: ""
    })

    toast({
      title: "Objection updated!",
      description: "The objection has been successfully updated.",
    })
  }

  // AI Script Generation
  const handleGenerateWithAI = async () => {
    if (!aiForm.productDescription.trim()) {
      setAiError("Please describe your product or service")
      return
    }

    // Start loading immediately
    setAiGenerating(true)
    setAiError("")

    try {
      // Check package limits for AI script generation
      const scriptGenerationCheck = await canPerformAction('script_generation')
      if (!scriptGenerationCheck.allowed) {
        setPackageLimitInfo({
          current: scriptGenerationCheck.current,
          limit: scriptGenerationCheck.limit
        })
        setShowScriptGenerationDialog(true)
        setAiGenerating(false) // Stop loading if limit reached
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Get user profile for company name
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, caller_name')
        .eq('id', user.id)
        .single()

      const companyName = profile?.company_name || 'Your Company'
      const callerName = profile?.caller_name || 'Your Name'

      const response = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productDescription: aiForm.productDescription,
          category: category || 'cold_outreach',
          companyName: companyName,
          callerName: callerName
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate script')
      }

      const scriptData = await response.json()
      
      // Set the generated content
      const generatedContent = scriptData.script || scriptData.content || ''
      setScriptContent(generatedContent)
      
      // Close AI generator modal
      setShowAIGenerator(false)
      setAiForm({
        productDescription: ""
      })

      // Update usage tracking for script generation
      await updateUsage('script_generation', 1)
      
      // Refresh package limits after usage update
      checkPackageLimits()

      // Auto-save generated content immediately
      if (scriptId) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { error: saveErr } = await supabase
              .from('scripts')
              .update({
                content: generatedContent,
                updated_at: new Date().toISOString(),
              })
              .eq('id', scriptId)
              .eq('user_id', user.id)
            
            if (saveErr) {
              console.error('Auto-save (generated content) failed:', saveErr)
              toast({
                title: "Auto-save failed",
                description: "Generated content could not be saved automatically. Please save manually.",
                variant: "destructive"
              })
            } else {
              console.log('✅ Generated content auto-saved successfully')
            }
          }
        } catch (autoSaveErr) {
          console.error('Auto-save exception:', autoSaveErr)
        }
      }

      toast({
        title: "Script generated!",
        description: "AI has successfully generated your script content.",
      })

    } catch (err: any) {
      console.error('AI generation error:', err)
      setAiError("AI generation failed: " + err.message)
    } finally {
      setAiGenerating(false)
    }
  }

  // AI Objections Generation
  const handleGenerateObjectionsWithAI = async () => {
    if (!scriptContent.trim()) {
      setObjectionsAiError("Please write a script first before generating objections")
      return
    }

    // Start loading immediately
    setObjectionsAiGenerating(true)
    setObjectionsAiError("")

    try {
      // Check package limits for AI objection generation
      const objectionGenerationCheck = await canPerformAction('objection_generation')
      if (!objectionGenerationCheck.allowed) {
        setPackageLimitInfo({
          current: objectionGenerationCheck.current,
          limit: objectionGenerationCheck.limit
        })
        setShowObjectionGenerationDialog(true)
        setObjectionsAiGenerating(false) // Stop loading if limit reached
        return
      }

      const response = await fetch('/api/generate-objections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scriptContent: scriptContent,
          category: category || 'cold_outreach'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate objections')
      }

      const data = await response.json()
      
      // Add generated objections to existing ones
      const generatedObjections = data.objections.map((obj: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        objection: obj.objection,
        response: obj.response,
        category: obj.category || 'general',
        priority: obj.priority || 'medium'
      }))

      const newObjections = [...objections, ...generatedObjections]
      setObjections(newObjections)
      setShowObjectionsAI(false)

      // Auto-save script with new objections
      if (scriptId && scriptName.trim() && scriptContent.trim()) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const updatedObjections = newObjections
            
            const { error: saveError } = await supabase
              .from('scripts')
              .update({
                objections: updatedObjections
              })
              .eq('id', scriptId)
              .eq('user_id', user.id)

            if (saveError) {
              console.error('Auto-save error:', saveError)
              toast({
                title: "Auto-save failed",
                description: "Failed to automatically save objections. Please save manually.",
                variant: "destructive"
              })
            } else {
              console.log('✅ Objections auto-saved successfully')
              // Silent success - no toast needed as user already sees generation success
            }
          }
        } catch (autoSaveError) {
          console.error('Auto-save failed:', autoSaveError)
          toast({
            title: "Auto-save failed",
            description: "Failed to automatically save objections. Please save manually.",
            variant: "destructive"
          })
        }
      }

      // Update usage tracking for objection generation
      await updateUsage('objection_generation', 1)
      
      // Refresh package limits after usage update
      checkPackageLimits()

      toast({
        title: "Objections generated!",
        description: `AI has generated ${generatedObjections.length} objections for your script.`,
      })

    } catch (err: any) {
      console.error('AI objections generation error:', err)
      setObjectionsAiError("AI objections generation failed: " + err.message)
    } finally {
      setObjectionsAiGenerating(false)
    }
  }

  // Save script
  const handleSaveScript = async () => {
    if (!scriptName.trim()) {
      toast({
        title: "Missing script name",
        description: "Please enter a script name.",
        variant: "destructive"
      })
      return
    }

    if (!scriptContent.trim()) {
      toast({
        title: "Missing script content",
        description: "Please write script content.",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    setError("")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const scriptData = {
        name: scriptName,
        description: description || null,
        category: category || null,
        content: scriptContent,
        linked_lists: contactListId ? [contactListId] : null,
        objections: objections,
        status: 'active'
      }

      if (isEditing && scriptId) {
        // Update existing script
        const { data, error } = await supabase
          .from('scripts')
          .update(scriptData)
          .eq('id', scriptId)
          .eq('user_id', user.id)
          .select()
          .single()

        if (error) throw error
        toast({
          title: "Script updated!",
          description: "Your script has been updated successfully.",
        })
      } else {
        // Create new script
        const { data, error } = await supabase
          .from('scripts')
          .insert({
            user_id: user.id,
            ...scriptData
          })
          .select()
          .single()

        if (error) throw error
        toast({
          title: "Script saved!",
          description: "Your script has been saved successfully.",
        })
      }

    } catch (err: any) {
      console.error('Error saving script:', err)
      setError("Failed to save script: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen text-[#003333]" style={{ fontFamily: 'Open Sans, sans-serif' }}>
      {/* Main content area (centered) */}
      <div className="pt-[40px] px-[20px] pb-[40px] max-w-[1418px] mx-auto">
        <div
          className="bg-white"
          style={{
            width: '100%',
            maxWidth: 1418,
            margin: '0 auto 0',
            border: '0.5px solid rgba(0, 51, 51, 0.1)',
            borderRadius: '10px',
            padding: '50px',
            paddingTop: '40px'
          }}
        >
          {/* Header with back arrow, title, and inline delete (like contacts header) */}
          <div className="flex items-center gap-3 mb-6">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="p-0 m-0"
              style={{ lineHeight: 0 }}
            >
              <Image src="/back-arrow.svg" alt="Back" width={24} height={24} />
            </button>
            <h1 className="text-[39.81px] font-bold text-[#003333]">Edit Script</h1>
            {isEditing && (
              <button
                type="button"
                aria-label="Delete script"
                onClick={handleDeleteScriptClick}
                className="group inline-flex items-center justify-center w-[26px] h-[25px] rounded-[6px] border border-[#003333]/10 bg-[#F4F6F6] hover:border-[#059669]"
              >
                <img
                  src="/delete-icon.svg"
                  alt="Delete script"
                  className="h-[14px] w-[14px] transition-colors group-hover:[filter:invert(33%)_sepia(63%)_saturate(729%)_hue-rotate(127deg)_brightness(93%)_contrast(91%)]"
                />
              </button>
            )}
          </div>
          <div>

          

          {/* Error Alert */}
          {error && (
            <Alert className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Main Content - Two Columns */}
          <div className="flex gap-6 items-stretch">
            {/* Left Column - Form */}
            <div className="border border-gray-200 rounded-[5px] bg-white" style={{ width: '400px' }}>
              <div className=" border-b border-gray-200 p-6  pb-4 mb-4">
                <h2 className="text-[23.04px] font-bold text-[#003333]">Script Details</h2>
              </div>

              <div className="px-6 pt-2 pb-6">
              {/* Script Name */}
              <div className="mb-6">
                <label className="block text-[16px] font-normal text-[#003333] mb-2">
                  Script Name
                </label>
                <input
                  type="text"
                  placeholder="Give your script a friendly name"
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  className="w-full h-12 px-4 border-[0.5px] border-[#003333]/10 rounded-[11px] text-sm text-[#003333] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669]"
                />
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-[16px] font-normal text-[#003333] mb-2">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Add a brief one sentence description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-12 px-4 border-[0.5px] border-[#003333]/10 rounded-[11px] text-sm text-[#003333] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669]"
                />
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#003333] mb-2">
                  Category
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full h-12 border-[0.5px] border-[#003333]/10 rounded-[11px] text-sm">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                    <SelectItem value="warm_outreach">Warm Outreach</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Link To A Contact List */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-[#003333] mb-2">
                  Link To A Contact List
                </label>
                <Select value={contactListId} onValueChange={setContactListId}>
                      <SelectTrigger className="w-full h-12 border-[0.5px] border-[#003333]/10 rounded-[11px] text-sm">
                    <SelectValue placeholder={loadingLists ? "Loading..." : "Choose a list (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    {contactLists.map((list) => (
                      <SelectItem key={list.id} value={list.id.toString()}>
                        {list.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic Variables */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-[#003333] mb-2">Dynamic variables</h3>
                <p className="text-sm text-[#003333] mb-4">
                  Click any variable below to add it to your script.<br />
                  These will be replaced with real values during calls.
                </p>

                {/* Contact Information */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-[#003333] mb-3">Contact Information</h4>
                  <div className="flex flex-wrap gap-2">
                    <span 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        insertVariable('[name]')
                      }}
                      className="inline-block bg-green-100 text-[#003333] px-3 py-1 rounded-[11px] text-sm font-medium cursor-pointer hover:bg-green-200 transition-colors"
                      title="Click to insert into script"
                    >
                      [name]
                    </span>
                    <span 
                      onMouseDown={(e) => {
                        e.preventDefault()
                        insertVariable('[full_name]')
                      }}
                      className="inline-block bg-green-100 text-[#003333] px-3 py-1 rounded-[11px] text-sm font-medium cursor-pointer hover:bg-green-200 transition-colors"
                      title="Click to insert into script"
                    >
                      [full_name]
                    </span>
                    <span 
                      onMouseDown={(e) => {
                        e.preventDefault()
                        insertVariable('[company]')
                      }}
                      className="inline-block bg-green-100 text-[#003333] px-3 py-1 rounded-[11px] text-sm font-medium cursor-pointer hover:bg-green-200 transition-colors"
                      title="Click to insert into script"
                    >
                      [company]
                    </span>
                    <span 
                      onMouseDown={(e) => {
                        e.preventDefault()
                        insertVariable('[position]')
                      }}
                      className="inline-block bg-green-100 text-[#003333] px-3 py-1 rounded-[11px] text-sm font-medium cursor-pointer hover:bg-green-200 transition-colors"
                      title="Click to insert into script"
                    >
                      [position]
                    </span>
                  </div>
                </div>

                {/* Your Information */}
                <div>
                  <h4 className="text-sm font-medium text-[#003333] mb-3">Your Information</h4>
                  <div className="flex flex-wrap gap-2">
                    <span 
                      onMouseDown={(e) => {
                        e.preventDefault()
                        insertVariable('[my_name]')
                      }}
                      className="inline-block bg-[#ECFDF5] text-[#003333] px-3 py-1 rounded-[11px] text-sm font-medium cursor-pointer hover:bg-[#ECFDF5] transition-colors"
                      title="Click to insert into script"
                    >
                      [my_name]
                    </span>
                    <span 
                      onMouseDown={(e) => {
                        e.preventDefault()
                        insertVariable('[my_company_name]')
                      }}
                      className="inline-block bg-[#ECFDF5] text-[#003333] px-3 py-1 rounded-[11px] text-sm font-medium cursor-pointer hover:bg-[#ECFDF5] transition-colors"
                      title="Click to insert into script"
                    >
                      [my_company_name]
                    </span>
                  </div>
                </div>
              </div>

              {/* Save Script Button */}
              <Button 
                onClick={handleSaveScript}
                disabled={saving}
                className="bg-[#059669] hover:bg-[#059669]/90 text-white px-6 py-2 rounded-[11px] text-sm font-medium"
              >
                {saving ? 'Saving...' : (isEditing ? 'Update script' : 'Save script')}
              </Button>
            </div>
            </div>  

            {/* Right Column - Rich Text Editor */}
            <div 
              className="bg-white border rounded-[5px] flex flex-col flex-1"
              style={{ 
                borderWidth: '1px',
                borderColor: '#e5e7eb',
                maxHeight: '863px'
              }}
            >
              {/* Editor Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b-[0.5px] border-[#003333]/10">
                <h3 className="text-[23.04px] font-bold text-[#003333]">Script Content</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[#003333] font-bold text-sm px-4 py-2 border border-[#059669] rounded-[11px] bg-[#ECFDF5]">
                    {scriptGenerationsUsed}/{maxScriptGenerations}
                  </span>
                  <button
                    onClick={() => setShowAIGenerator(true)}
                    disabled={!canGenerateScript || isCheckingLimits}
                    className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                      canGenerateScript && !isCheckingLimits
                        ? 'bg-white hover:border-[#059669] hover:text-[#059669] border-[0.5px] border-[#003333]/10 text-[#003333]' 
                        : 'bg-gray-100 border-[0.5px] border-[#003333]/10 text-gray-400 cursor-not-allowed'
                    }`}
                    style={{ borderRadius: '11px' }}
                  >
                    {isCheckingLimits ? 'Checking...' : 'Generate With'}<span className={`px-1 py-0.5 rounded-[11px] text-xs font-bold ${
                      canGenerateScript && !isCheckingLimits ? 'bg-[#059669] text-white' : 'bg-gray-400 text-white'
                    }`}>AI</span>
                  </button>
                </div>
              </div>

              {/* Rich Text Editor */}
              <div className="flex-1 p-6 overflow-y-auto">
                <RichTextEditor
                  value={scriptContent}
                  onChange={setScriptContent}
                  placeholder="Start writing your cold calling script here..."
                  className="h-full"
                  onInsertVariable={handleInsertVariable}
                />
              </div>
            </div>
          </div>

          {/* Objections Section */}
          <div className="mt-12 border-[0.5px] border-[#003333]/10 rounded-[5px] p-6 bg-white">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-[#003333]">Handle Objections</h2>
                  <p className="text-[#003333]">Prepare responses for common objections you might encounter.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#003333] font-bold text-sm px-4 py-2 border border-[#059669] rounded-[11px] bg-[#ECFDF5]">
                    {objectionGenerationsUsed}/{maxObjectionGenerations}
                  </span>
                  <button
                    onClick={() => setShowObjectionsAI(true)}
                    disabled={!canGenerateObjections || isCheckingLimits}
                    className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-[10px] ${
                      canGenerateObjections && !isCheckingLimits
                        ? 'bg-white hover:border-[#059669] hover:text-[#059669] border-[0.5px] border-[#003333]/10 text-[#003333]' 
                        : 'bg-gray-100 border-[0.5px] border-[#003333]/10 text-gray-400 cursor-not-allowed'
                    }`}
                    style={{ borderRadius: '11px' }}
                  >
                    {isCheckingLimits ? 'Checking...' : 'Generate With'}<span className={`px-1 py-0.5 rounded-[11px] text-xs font-bold ${
                      canGenerateObjections && !isCheckingLimits ? 'bg-[#059669] text-white' : 'bg-gray-400 text-white'
                    }`}>AI</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-8">
              {/* Left Column - Add/Edit Objection Form */}
              <div className="flex-1 max-w-lg">
                {editingObjectionId && (
                  <div className="mb-4 p-3 bg-[#ECFDF5] border-[0.5px] border-[#003333]/10 rounded-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#003333] font-medium text-sm">Editing Objection</span>
                      <button
                        onClick={cancelEditObjection}
                        className="text-[#003333] hover:text-[#003333] text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Objection Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#003333] mb-2">
                    Objection
                  </label>
                  <input
                    type="text"
                    placeholder="Enter the objection"
                    value={editingObjectionId ? editObjection.objection : currentObjection.objection}
                    onChange={(e) => {
                      if (editingObjectionId) {
                        setEditObjection(prev => ({...prev, objection: e.target.value}))
                      } else {
                        setCurrentObjection(prev => ({...prev, objection: e.target.value}))
                      }
                    }}
                    className="w-full h-12 px-4 border-[0.5px] border-[#003333]/10 rounded-[11px] text-sm text-[#003333] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669]"
                  />
                </div>

                {/* Response Textarea */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[#003333] mb-2">
                    Response
                  </label>
                  <textarea
                    placeholder="Enter your response to handle this objection"
                    rows={4}
                    value={editingObjectionId ? editObjection.response : currentObjection.response}
                    onChange={(e) => {
                      if (editingObjectionId) {
                        setEditObjection(prev => ({...prev, response: e.target.value}))
                      } else {
                        setCurrentObjection(prev => ({...prev, response: e.target.value}))
                      }
                    }}
                    className="w-full px-4 py-3 border-[0.5px] border-[#003333]/10 rounded-[11px] text-sm text-[#003333] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-[#059669] resize-none"
                  />
                </div>

                {/* Category and Priority Row */}
                <div className="flex gap-4 mb-6">
                  {/* Category */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#003333] mb-2">
                      Category
                    </label>
                    <Select 
                      value={editingObjectionId ? editObjection.category : currentObjection.category} 
                      onValueChange={(value) => {
                        if (editingObjectionId) {
                          setEditObjection(prev => ({...prev, category: value}))
                        } else {
                          setCurrentObjection(prev => ({...prev, category: value}))
                        }
                      }}
                    >
                      <SelectTrigger className="w-full h-12 border-[0.5px] border-[#003333]/10 rounded-[11px] text-sm">
                        <SelectValue placeholder="Choose one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="need">Need</SelectItem>
                        <SelectItem value="timing">Timing</SelectItem>
                        <SelectItem value="authority">Authority</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-[#003333] mb-2">
                      Priority
                    </label>
                    <Select 
                      value={editingObjectionId ? editObjection.priority : currentObjection.priority}
                      onValueChange={(value) => {
                        if (editingObjectionId) {
                          setEditObjection(prev => ({...prev, priority: value}))
                        } else {
                          setCurrentObjection(prev => ({...prev, priority: value}))
                        }
                      }}
                    >
                        <SelectTrigger className="w-full h-12 border-[0.5px] border-[#003333]/10 rounded-[11px] text-sm">
                        <SelectValue placeholder="Choose one" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High priority</SelectItem>
                        <SelectItem value="medium">Medium priority</SelectItem>
                        <SelectItem value="low">Low priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Save Button */}
                <Button 
                  onClick={editingObjectionId ? saveEditedObjection : handleAddObjection}
                  className="bg-[#059669] hover:bg-[#059669]/90 text-white px-6 py-2 rounded-[11px] text-sm font-medium"
                >
                  {editingObjectionId ? 'Update objection' : 'Save objection'}
                </Button>
              </div>

              {/* Right Column - Objections List */}
              <div className="flex-1" style={{ maxWidth: '647px' }}>
                <div 
                  className="space-y-4 overflow-y-auto"
                  style={{ 
                    maxHeight: '400px',
                    paddingRight: '8px'
                  }}
                >
                  {objections.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No objections added yet. Add one or generate with AI.
                    </div>
                  ) : (
                    objections.map((objection, index) => (
                      <ObjectionCard
                        key={objection.id}
                        objection={objection}
                        index={index}
                        onEdit={startEditObjection}
                        onDelete={removeObjection}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* AI Script Generator Modal */}
      <ScriptAIModal
        open={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onGenerate={handleGenerateWithAI}
        generating={aiGenerating}
        error={aiError}
        productDescription={aiForm.productDescription}
        setProductDescription={(val) => setAiForm({ ...aiForm, productDescription: val })}
      />

      {/* AI Objections Generator Modal */}
      <ObjectionsAIModal
        open={showObjectionsAI}
        onClose={() => setShowObjectionsAI(false)}
        onGenerate={handleGenerateObjectionsWithAI}
        generating={objectionsAiGenerating}
        error={objectionsAiError}
        scriptContent={scriptContent}
      />

      {/* Delete Script Confirmation Popup */}
      <DeleteConfirmationPopup 
        isOpen={isDeletePopupOpen} 
        onClose={handleCloseDeletePopup} 
        onConfirm={handleConfirmDeleteScript}
        title="Delete Script"
        message={`Are you sure you want to delete "${scriptName || 'this script'}"? This action cannot be undone.`}
        confirmButtonText="Delete Script"
      />

      {/* Package Limit Dialogs */}
      <PackageLimitDialog
        open={showScriptGenerationDialog}
        onOpenChange={setShowScriptGenerationDialog}
        title="Script Generation Limit Reached"
        description="You have reached your monthly AI script generation limit. Upgrade your package to generate more scripts."
        currentUsage={packageLimitInfo.current}
        limit={packageLimitInfo.limit}
        featureName="AI Script Generation"
        onUpgrade={() => window.location.href = '/my-account'}
      />
      
      <PackageLimitDialog
        open={showObjectionGenerationDialog}
        onOpenChange={setShowObjectionGenerationDialog}
        title="Objection Generation Limit Reached"
        description="You have reached your monthly AI objection generation limit. Upgrade your package to generate more objections."
        currentUsage={packageLimitInfo.current}
        limit={packageLimitInfo.limit}
        featureName="AI Objection Generation"
        onUpgrade={() => window.location.href = '/my-account'}
      />

    
    </div>
  )
}
