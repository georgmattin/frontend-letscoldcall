'use client'

import { useState, useEffect } from 'react'

interface EditContactPopupProps {
  isOpen: boolean
  onClose: () => void
  onSave: (contactData: ContactData) => void
  initialData?: ContactData
}

interface ContactData {
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  company: string
  position: string
  website: string
}

export default function EditContactPopup({ isOpen, onClose, onSave, initialData }: EditContactPopupProps) {
  const [formData, setFormData] = useState<ContactData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    email: '',
    company: '',
    position: '',
    website: ''
  })

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    } else {
      // Reset to empty form if no initial data
      setFormData({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        company: '',
        position: '',
        website: ''
      })
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleInputChange = (field: keyof ContactData, value: string) => {
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
            Edit Contact
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
          {/* First Name and Last Name Row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label 
                className="block text-sm font-medium text-gray-700 mb-2"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                style={{ 
                  fontFamily: 'Source Sans Pro, sans-serif',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label 
                className="block text-sm font-medium text-gray-700 mb-2"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                style={{ 
                  fontFamily: 'Source Sans Pro, sans-serif',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="mb-4">
            <label 
              className="block text-sm font-medium text-gray-700 mb-2"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              Phone Number
            </label>
            <input
              type="text"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              style={{ 
                fontFamily: 'Source Sans Pro, sans-serif',
                fontSize: '14px'
              }}
            />
          </div>

          {/* E-Mail Address */}
          <div className="mb-4">
            <label 
              className="block text-sm font-medium text-gray-700 mb-2"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              E-Mail Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              style={{ 
                fontFamily: 'Source Sans Pro, sans-serif',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Company and Position Row */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label 
                className="block text-sm font-medium text-gray-700 mb-2"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                style={{ 
                  fontFamily: 'Source Sans Pro, sans-serif',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label 
                className="block text-sm font-medium text-gray-700 mb-2"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                Position
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                style={{ 
                  fontFamily: 'Source Sans Pro, sans-serif',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Website */}
          <div className="mb-6">
            <label 
              className="block text-sm font-medium text-gray-700 mb-2"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              Website
            </label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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