'use client'

import { useState, useEffect } from 'react'

interface EditContactListPopupProps {
  isOpen: boolean
  onClose: () => void
  onSave: (listData: ContactListData) => void
  initialData?: ContactListData
}

interface ContactListData {
  name: string
  description: string
}

export default function EditContactListPopup({ isOpen, onClose, onSave, initialData }: EditContactListPopupProps) {
  const [formData, setFormData] = useState<ContactListData>({
    name: '',
    description: ''
  })

  // Update form data when initialData changes or popup opens
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(initialData)
    } else if (!isOpen) {
      // Reset form when popup closes
      setFormData({
        name: '',
        description: ''
      })
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleInputChange = (field: keyof ContactListData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-lg shadow-lg"
        style={{ 
          width: '500px',
          fontFamily: 'Source Sans Pro, sans-serif'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 
            className="text-xl font-semibold text-gray-900"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            Edit contact list
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Name */}
          <div className="mb-6">
            <label 
              className="block text-sm font-medium text-gray-700 mb-3"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              style={{ 
                fontFamily: 'Source Sans Pro, sans-serif',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Description */}
          <div className="mb-8">
            <label 
              className="block text-sm font-medium text-gray-700 mb-3"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              style={{ 
                fontFamily: 'Source Sans Pro, sans-serif',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            style={{ 
              fontFamily: 'Source Sans Pro, sans-serif',
              fontSize: '16px'
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
} 