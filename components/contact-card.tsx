'use client'

import React, { useState } from 'react'

interface Contact {
  id: string
  name: string
  title: string
  phone: string
  email: string
  company: string
  website: string
}

interface ContactCardProps {
  contact: Contact
  isSelected?: boolean
  onSelect?: (contactId: string, isSelected: boolean) => void
  onEdit?: (contact: Contact) => void
  onDelete?: (contactId: string) => void
  onViewMore?: (contact: Contact) => void
  showCheckbox?: boolean
  columnWidths?: {
    nameColumn: number
    contactColumn: number
    companyColumn: number
  }
  onColumnResize?: (columnWidths: { nameColumn: number; contactColumn: number; companyColumn: number }) => void
}

export default function ContactCard({
  contact,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onViewMore,
  showCheckbox = true,
  columnWidths = {
    nameColumn: 235,
    contactColumn: 330,
    companyColumn: 200
  },
  onColumnResize
}: ContactCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeColumn, setResizeColumn] = useState<string | null>(null)
  const [startX, setStartX] = useState(0)
  const [startWidth, setStartWidth] = useState(0)

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelect) {
      onSelect(contact.id, e.target.checked)
    }
  }

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(contact)
    }
  }

  const handleDeleteClick = () => {
    if (onDelete) {
      onDelete(contact.id)
    }
  }

  const handleViewMoreClick = () => {
    if (onViewMore) {
      onViewMore(contact)
    }
  }

  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeColumn(column)
    setStartX(e.clientX)
    
    const currentWidth = column === 'nameColumn' ? columnWidths.nameColumn :
                        column === 'contactColumn' ? columnWidths.contactColumn :
                        columnWidths.companyColumn
    setStartWidth(currentWidth)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !resizeColumn || !onColumnResize) return
    
    const deltaX = e.clientX - startX
    const newWidth = Math.max(100, startWidth + deltaX) // Minimum width 100px
    
    const newColumnWidths = {
      ...columnWidths,
      [resizeColumn]: newWidth
    }
    
    onColumnResize(newColumnWidths)
  }

  const handleMouseUp = () => {
    setIsResizing(false)
    setResizeColumn(null)
  }

  // Add global mouse event listeners for resizing
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, startX, startWidth, resizeColumn, columnWidths, onColumnResize])

  return (
    <div 
      className={`bg-white border rounded-lg transition-all duration-200 cursor-pointer ${
        isHovered 
          ? 'border-blue-500 shadow-md' 
          : 'border-gray-300'
      }`}
      style={{ 
        height: '100px',
        borderWidth: '1px',
        borderLeftColor: isHovered ? '#3B82F6' : '#3B82F6',
        borderLeftWidth: '4px'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleViewMoreClick}
    >
      {/* Contact info */}
      <div className="flex-1 flex items-center justify-between h-full">
        {/* Left section - Contact details */}
        <div className="flex items-center h-full">
          
          {/* Name and title */}
          <div 
            className="flex items-center justify-between h-full relative"
            style={{ width: `${columnWidths.nameColumn}px` }}
          >
            <div className="px-4 flex-1">
              <h3 
                className="font-semibold text-[#253053] text-[16px] truncate"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                {contact.name}
              </h3>
              <p 
                className="text-[#99A2BB] text-[16px] truncate"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                {contact.title}
              </p>
            </div>
            {/* Resize handle */}
            <div 
              className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
              onMouseDown={(e) => handleMouseDown(e, 'nameColumn')}
              style={{ backgroundColor: isResizing && resizeColumn === 'nameColumn' ? '#3B82F6' : 'transparent' }}
            ></div>
          </div>
          
          {/* Vertical separator */}
          <div 
            className="border-l border-gray-300"
            style={{ height: '68px' }}
          ></div>
          
          {/* Contact methods */}
          <div 
            className="flex items-center justify-between h-full relative"
            style={{ width: `${columnWidths.contactColumn}px` }}
          >
            <div className="px-4 flex-1">
              <p 
                className="text-[#0D8BFF] text-[16px] font-normal cursor-pointer hover:underline truncate"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                {contact.phone}
              </p>
              <p 
                className="text-[#99A2BB] text-[16px] truncate"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                {contact.email}
              </p>
            </div>
            {/* Resize handle */}
            <div 
              className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
              onMouseDown={(e) => handleMouseDown(e, 'contactColumn')}
              style={{ backgroundColor: isResizing && resizeColumn === 'contactColumn' ? '#3B82F6' : 'transparent' }}
            ></div>
          </div>
          
          {/* Vertical separator */}
          <div 
            className="border-l border-gray-300"
            style={{ height: '68px' }}
          ></div>
          
          {/* Company info */}
          <div 
            className="flex items-center justify-between h-full relative"
            style={{ width: `${columnWidths.companyColumn}px` }}
          >
            <div className="px-4 flex-1">
              <p 
                className="text-[#253053] text-[16px] font-semibold truncate"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                {contact.company}
              </p>
              <p 
                className="text-[#99A2BB] text-[16px] font-normal cursor-pointer hover:underline truncate"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                {contact.website}
              </p>
            </div>
            {/* Resize handle */}
            <div 
              className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
              onMouseDown={(e) => handleMouseDown(e, 'companyColumn')}
              style={{ backgroundColor: isResizing && resizeColumn === 'companyColumn' ? '#3B82F6' : 'transparent' }}
            ></div>
          </div>
        </div>
        
        {/* Right section - Actions */}
        <div className="flex items-center space-x-3">
        
          
          {/* Delete button */}
          {onDelete && (
            <button 
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteClick()
              }}
              className="bg-white h-[52px] w-[52px] border border-gray-300 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          
          {/* Edit button */}
          {onEdit && (
            <button 
              onClick={(e) => {
                e.stopPropagation()
                handleEditClick()
              }}
              className="bg-white h-[52px] w-[52px] border border-gray-300 text-gray-400 hover:text-red-500 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 