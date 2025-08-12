'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface CreateListPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onListCreated?: (listId: number) => void;
}

export default function CreateListPopup({ isOpen, onClose, onListCreated }: CreateListPopupProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  if (!isOpen) return null;

  const handleInputChange = (field: 'name' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Please enter a name for the contact list')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Authentication error. Please log in again.')
        setIsLoading(false)
        return
      }

      // Create contact list
      const { data, error: createError } = await supabase
        .from('contact_lists')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          user_id: user.id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating contact list:', createError)
        setError('Failed to create contact list. Please try again.')
        setIsLoading(false)
        return
      }

      // Reset form
      setFormData({ name: '', description: '' })
      
      // Call callback with new list ID
      if (onListCreated && data.id) {
        onListCreated(data.id)
      }

      // Close popup
      onClose()

    } catch (err) {
      console.error('Create list error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ name: '', description: '' })
      setError(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-lg shadow-lg relative"
        style={{ 
          width: '450px',
          height: '430px'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 
            className="text-xl font-semibold text-gray-900"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            Create a contact list
          </h2>
          <button 
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
              {error}
            </p>
          </div>
        )}

        {/* Form */}
        <div className="px-6 space-y-6">
          {/* Name field */}
          <div>
            <label 
              className="block text-sm font-medium text-gray-700 mb-2"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              Give it a name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isLoading}
              placeholder="e.g., Tech Startups in California"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                fontFamily: 'Source Sans Pro, sans-serif',
                fontSize: '16px'
              }}
            />
          </div>

          {/* Description field */}
          <div>
            <label 
              className="block text-sm font-medium text-gray-700 mb-2"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              Give it a description
            </label>
            <textarea
              rows={6}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isLoading}
              placeholder="Describe your contact list..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                fontFamily: 'Source Sans Pro, sans-serif',
                fontSize: '16px'
              }}
            />
          </div>
        </div>

        {/* Footer - absolutely positioned at bottom right */}
        <div className="absolute bottom-6 right-6">
          <button 
            onClick={handleSubmit}
            disabled={isLoading || !formData.name.trim()}
            className="bg-[#0D8BFF] hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            style={{ 
              fontFamily: 'Source Sans Pro, sans-serif',
              fontSize: '16px'
            }}
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{isLoading ? 'Creating...' : 'Create list'}</span>
          </button>
        </div>
      </div>
    </div>
  )
} 