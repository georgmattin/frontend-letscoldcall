'use client'

import { useEffect, useState } from 'react'
import { Phone, Users, CheckCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface ContactListData {
  id: number
  name: string
  description: string
  createdDate: string
  totalContacts: number
  calledContacts: number
  remainingContacts: number
  hasActiveSession: boolean
  activeSessionId?: string
  lastContactIndex: number
}

interface ContactListCardsProps {
  userId?: string
  statusFilter?: string
}

export function ContactListsCards({ userId, statusFilter = 'All' }: ContactListCardsProps) {
  const [data, setData] = useState<ContactListData[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Truncate text to maximum 23 characters
  const truncateText = (text: string, maxLength: number = 23): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  useEffect(() => {
    const fetchContactLists = async () => {
      try {
        if (!userId) {
          // Get current user if userId not provided
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            console.error('No user found')
            setLoading(false)
            return
          }
          userId = user.id
        }

        // Fetch contact lists
        const { data: contactListsData, error } = await supabase
          .from('contact_lists')
          .select(`
            id,
            name,
            description,
            status,
            created_at
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching contact lists:', error)
        } else {
          // Get contact counts and call history for each list
          const listsWithCounts = await Promise.all(
            (contactListsData || []).map(async (list) => {
              // Get total contacts count
              const { count: totalContacts } = await supabase
                .from('contacts')
                .select('*', { count: 'exact', head: true })
                .eq('contact_list_id', list.id)
              
              // Get called contacts count from call_history (remove 1000 row default limit)
              const { data: calledContactsData } = await supabase
                .from('call_history')
                .select('contact_id')
                .eq('user_id', userId)
                .not('contact_id', 'is', null)
                .range(0, 49999) // Use range to get up to 50,000 rows
              
              // Get unique contact IDs that were called from this list (remove 1000 row default limit)
              const { data: listContacts } = await supabase
                .from('contacts')
                .select('id')
                .eq('contact_list_id', list.id)
                .range(0, 49999) // Use range to get up to 50,000 rows
              
              const listContactIds = new Set(listContacts?.map(c => c.id) || [])
              const calledContactIds = new Set(calledContactsData?.map(c => c.contact_id) || [])
              const calledFromThisList = [...listContactIds].filter(id => calledContactIds.has(id))
              
              const calledContacts = calledFromThisList.length
              const total = totalContacts || 0
              const remaining = Math.max(0, total - calledContacts)
              
              // Check for active calling sessions
              const { data: activeSession } = await supabase
                .from('calling_sessions')
                .select('session_id')
                .eq('contact_list_id', list.id)
                .eq('user_id', userId)
                .eq('status', 'paused')
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle()
              
              const hasActiveSession = !!activeSession
              
              return {
                id: list.id,
                name: list.name,
                description: list.description || '',
                createdDate: new Date(list.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }),
                totalContacts: total,
                calledContacts: calledContacts,
                remainingContacts: remaining,
                hasActiveSession: hasActiveSession,
                activeSessionId: activeSession?.session_id,
                lastContactIndex: 0
              }
            })
          )
          
          setData(listsWithCounts)
        }
      } catch (err) {
        console.error('Error in fetchContactLists:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchContactLists()
  }, [userId])

  const handleViewContacts = (listId: number) => {
    router.push(`/contact-lists/list/${listId}`)
  }

  const handleStartCalling = async (listId: number) => {
    try {
      // Generate a unique session ID
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Navigate to calling page with session ID and list ID
      router.push(`/calling?sessionId=${sessionId}&listId=${listId}`)
    } catch (error) {
      console.error('Error starting calling session:', error)
      alert('Failed to start calling session. Please try again.')
    }
  }

  const handleContinueCalling = async (listId: number, activeSessionId?: string) => {
    try {
      // Use existing session ID or generate a new one
      const sessionId = activeSessionId || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Navigate to calling page with session ID and list ID
      router.push(`/calling?sessionId=${sessionId}&listId=${listId}`)
    } catch (error) {
      console.error('Error continuing calling session:', error)
      alert('Failed to continue calling session. Please try again.')
    }
  }

  const handleViewList = (listId: number) => {
    router.push(`/contact-lists/list/${listId}`)
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="grid gap-[15px] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden h-full flex flex-col animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-8 w-8 bg-gray-300 rounded"></div>
                    <div className="h-8 w-8 bg-gray-300 rounded"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="space-y-3 text-sm flex-1">
                  <div className="h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded"></div>
                </div>
                <div className="h-10 bg-gray-300 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
            No contact lists found
          </div>
          <p className="text-gray-400" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
            Create your first contact list to get started with cold calling
          </p>
        </div>
      </div>
    )
  }

  // Filter data based on status
  const filteredData = data.filter(list => {
    if (statusFilter === 'Completed') {
      return list.remainingContacts === 0
    } else if (statusFilter === 'Not Complete') {
      return list.remainingContacts > 0
    }
    return true // 'All' - show everything
  })

  // Show message if no results after filtering
  if (filteredData.length === 0) {
    return (
      <div className="w-full">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
            No {statusFilter.toLowerCase()} contact lists found
          </div>
          <p className="text-gray-400" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
            Try changing the filter or create a new contact list
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="grid gap-[15px] md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredData.map((list) => (
          <Card 
            key={list.id} 
            className="overflow-hidden h-full flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-200"
            onClick={() => handleViewList(list.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold" title={list.name}>
                    {truncateText(list.name)}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Created {list.createdDate}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">{list.description}</p>

              <div className="space-y-3 text-sm flex-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>{list.totalContacts} total contacts</span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-gray-500" />
                  <span>{list.calledContacts} contacts called</span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{list.remainingContacts} contacts remaining</span>
                </div>
              </div>

              <div className="pt-2 mt-auto">
                <Button
                  className="w-full bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90 hover:text-white"
                  variant="outline"
                  disabled={list.remainingContacts === 0}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (list.hasActiveSession) {
                      handleContinueCalling(list.id, list.activeSessionId)
                    } else {
                      handleStartCalling(list.id)
                    }
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {list.remainingContacts === 0 
                    ? "All Contacts Called" 
                    : list.hasActiveSession 
                      ? "Continue Calling" 
                      : "Start Calling"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}