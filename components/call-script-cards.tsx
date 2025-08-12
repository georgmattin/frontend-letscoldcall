'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface CallScriptCard {
  id: number
  name: string
  description: string
  category: string
  status: string
  created_at: string
}

interface CallScriptCardsProps {
  userId?: string
  searchTerm?: string
  usageFilter?: string
  categoryFilter?: string
}

export default function CallScriptCards({ 
  userId, 
  searchTerm = '', 
  usageFilter = 'all', 
  categoryFilter = 'all' 
}: CallScriptCardsProps) {
  const [callScripts, setCallScripts] = useState<CallScriptCard[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchCallScripts = async () => {
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

        // Fetch call scripts
        const { data, error } = await supabase
          .from('scripts')
          .select(`
            id,
            name,
            description,
            category,
            status,
            created_at
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching call scripts:', error)
        } else {
          setCallScripts(data || [])
        }
      } catch (err) {
        console.error('Error in fetchCallScripts:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCallScripts()
  }, [userId])

  const handleViewScript = (scriptId: number) => {
    router.push(`/scripts/edit-script/${scriptId}`)
  }

  const handleEditScript = (scriptId: number) => {
    router.push(`/scripts/edit-script/${scriptId}`)
  }

  if (loading) {
    return (
      <div className="flex flex-wrap" style={{ gap: '25px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i}
            className="bg-white border border-gray-300 rounded-[5px] animate-pulse"
            style={{ 
              width: '224px',
              minHeight: '200px',
              borderWidth: '1px'
            }}
          >
            <div className="h-2 bg-gray-300 rounded-t-[5px]"></div>
            <div className="p-[20px] space-y-4">
              <div className="h-6 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="space-y-2 pt-4">
                <div className="h-8 bg-gray-300 rounded"></div>
                <div className="h-8 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Filter scripts based on search term, usage, and category
  const filteredScripts = callScripts.filter(script => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (script.description && script.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // Category filter  
    const matchesCategory = categoryFilter === 'all' || script.category === categoryFilter
    
    // Usage filter (for now, treating all scripts as "not_used" since we don't have usage tracking yet)
    // TODO: Add actual usage tracking logic when it's implemented
    const matchesUsage = usageFilter === 'all' || usageFilter === 'not_used'
    
    return matchesSearch && matchesCategory && matchesUsage
  })

  if (callScripts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-4" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
          No call scripts found
        </div>
        <p className="text-gray-400" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
          Create your first call script to get started with cold calling
        </p>
      </div>
    )
  }

  if (filteredScripts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-4" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
          No scripts match your filters
        </div>
        <p className="text-gray-400" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
          Try adjusting your search or filter criteria
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap" style={{ gap: '25px' }}>
      {filteredScripts.map((card) => (
        <div 
          key={card.id}
          onClick={() => handleViewScript(card.id)}
          className="bg-white border border-gray-300 rounded-[5px] hover:border-blue-500 transition-colors duration-200 cursor-pointer"
          style={{ 
            width: '224px',
            minHeight: '20px',
            borderWidth: '1px'
          }}
        >
          {/* Blue top bar */}
          <div className="h-2 bg-blue-500 rounded-t-[5px]"></div>
          
          {/* Card content */}
          <div className="p-[20px] pb-[25px] h-full flex flex-col">
            {/* Category */}
            {card.category && (
              <div className="text-right mb-3">
                <span 
                  className="text-sm text-gray-600 capitalize"
                  style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                >
                  {card.category}
                </span>
              </div>
            )}
            
            {/* Title */}
            <h3 
              className="text-[20.2px] font-medium text-[#253053] mb-3 leading-tight line-clamp-2"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              {card.name}
            </h3>
            
            {/* Description */}
            <p 
              className="text-[#253053] text-[16px] mb-4 flex-grow line-clamp-3"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              {card.description}
            </p>
            
            {/* Buttons */}
            <div className="space-y-3">
             
              
              {/* Edit Script button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditScript(card.id)
                }}
                className="w-full bg-[#0D8BFF] hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-[5px] transition-colors duration-200"
                style={{ 
                  fontFamily: 'Source Sans Pro, sans-serif',
                  fontSize: '16px'
                }}
              >
                Edit Script
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 