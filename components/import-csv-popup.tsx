'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

interface ImportCsvPopupProps {
  isOpen: boolean
  onClose: () => void
  contactListId?: string | number
  onImportComplete?: () => void
}

export default function ImportCsvPopup({ isOpen, onClose, contactListId, onImportComplete }: ImportCsvPopupProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const supabase = createClient()

  if (!isOpen) return null

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportStatus(null)
    }
  }

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
    const rows = lines.slice(1)

    return rows.map(row => {
      const values = []
      let current = ''
      let insideQuotes = false
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i]
        if (char === '"') {
          insideQuotes = !insideQuotes
        } else if (char === ',' && !insideQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())

      const contact: any = {}
      
      // Map different possible column names to our fields
      headers.forEach((header, index) => {
        const value = values[index]?.replace(/"/g, '').trim()
        if (!value) return

        // Name mapping
        if (header.includes('name') || header.includes('nimi')) {
          contact.name = value
        } else if (header.includes('first') || header.includes('eesnimi')) {
          contact.firstName = value
        } else if (header.includes('last') || header.includes('perenimi')) {
          contact.lastName = value
        }
        
        // Phone mapping
        else if (header.includes('phone') || header.includes('telefon') || header.includes('telephone')) {
          contact.phone = value
        }
        
        // Email mapping
        else if (header.includes('email') || header.includes('e-mail') || header.includes('e-post')) {
          contact.email = value
        }
        
        // Company mapping
        else if (header.includes('company') || header.includes('ettevõte')) {
          contact.company = value
        }
        
        // Position mapping
        else if (header.includes('position') || header.includes('ametikoht')) {
          contact.position = value
        }
        
        // Website mapping
        else if (header.includes('website') || header.includes('veebileht')) {
          contact.website = value
        }
        
        // Notes mapping
        else if (header.includes('notes') || header.includes('märkused')) {
          contact.notes = value
        }
      })

      // Combine first and last name if needed
      if (!contact.name && (contact.firstName || contact.lastName)) {
        contact.name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
      }

      return contact
    }).filter(contact => contact.name && contact.phone) // Only include contacts with name and phone
  }

  const handleImport = async () => {
    if (!selectedFile || !contactListId) {
      setImportStatus('Please select a file and ensure you have a contact list selected.')
      return
    }

    setIsImporting(true)
    setImportStatus('Parsing CSV file...')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setImportStatus('Authentication error. Please log in again.')
        setIsImporting(false)
        return
      }

      const text = await selectedFile.text()
      const contacts = parseCSV(text)

      if (contacts.length === 0) {
        setImportStatus('No valid contacts found in the CSV file. Please check the format.')
        setIsImporting(false)
        return
      }

      setImportStatus(`Found ${contacts.length} contacts. Importing...`)

      // Prepare contacts for database insertion
      const contactsToInsert = contacts.map(contact => ({
        name: contact.name,
        phone: contact.phone,
        email: contact.email || null,
        company: contact.company || null,
        position: contact.position || null,
        website: contact.website || null,
        notes: contact.notes || null,
        contact_list_id: contactListId,
        user_id: user.id,
        status: 'not_called',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      // Insert contacts into database
      const { data, error } = await supabase
        .from('contacts')
        .insert(contactsToInsert)
        .select()

      if (error) {
        console.error('Error importing contacts:', error)
        setImportStatus('Error importing contacts. Please try again.')
        setIsImporting(false)
        return
      }

      setImportStatus(`Successfully imported ${contactsToInsert.length} contacts!`)
      
      // Refresh the contacts data immediately
      if (onImportComplete) {
        onImportComplete()
      }
      
      // Close popup after 2 seconds
      setTimeout(() => {
        onClose()
        setSelectedFile(null)
        setImportStatus(null)
        setIsImporting(false)
      }, 2000)

    } catch (error) {
      console.error('Import error:', error)
      setImportStatus('Error reading the CSV file. Please try again.')
      setIsImporting(false)
    }
  }

  const handleDownloadSample = () => {
    // Create sample CSV content with both English and Estonian examples
    const sampleContent = `Name,Phone,Email,Company,Position,Website,Notes
"John Smith","+372 56272798","john.smith@techstart.com","TechStart Solutions","CEO","https://techstart.com","Interested in SaaS solutions"
"Sarah Johnson","+372 56272799","sarah.johnson@dataflow.com","DataFlow Analytics","CTO","https://dataflow.com","Looking for data analytics tools"
"Michael Brown","+372 56272800","michael.brown@cloudvision.com","CloudVision Inc","VP Sales","https://cloudvision.com","Expanding team"
"Mart Luik","+372 56272801","mart.luik@cleveron.com","Cleveron AS","Tegevjuht","https://cleveron.com","Pakiautomaatide tehnoloogia juht"
"Kristi Oja","+372 56272802","kristi.oja@transferwise.com","Wise","Müügijuht","https://wise.com","Fintech ja rahvusvahelised ülekanded"`

    // Create and download the file
    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'sample-contacts.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleClose = () => {
    if (!isImporting) {
      setSelectedFile(null)
      setImportStatus(null)
      onClose()
    }
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
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 
            className="text-lg font-semibold text-gray-900"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            Import CSV file
          </h2>
          <button 
            onClick={handleClose}
            disabled={isImporting}
            className="text-gray-400 hover:text-gray-600 text-xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Choose file section */}
          <div className="mb-4">
            <h3 
              className="text-sm font-medium text-gray-700 mb-2"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              Choose the file
            </h3>
            
            {/* File upload area */}
            <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isImporting}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className={`cursor-pointer ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex flex-col items-center">
                  <svg 
                    className="w-6 h-6 text-blue-500 mb-2" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" 
                    />
                  </svg>
                  <p 
                    className="text-blue-600 font-medium text-sm"
                    style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                  >
                    Click to choose a file<br />from your computer
                  </p>
                  {selectedFile && (
                    <p 
                      className="text-sm text-gray-600 mt-2"
                      style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                    >
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Import status */}
          {importStatus && (
            <div className={`mb-4 p-3 rounded-lg ${
              importStatus.includes('Error') || importStatus.includes('Please') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : importStatus.includes('Successfully') 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <p className="text-sm" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
                {importStatus}
              </p>
            </div>
          )}

          {/* CSV format section */}
          <div className="mb-4">
            <h3 
              className="text-sm font-semibold text-blue-600 mb-1"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              CSV file format:
            </h3>
            <p 
              className="text-xs text-gray-700 mb-1"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              The CSV file must contain the following columns:
            </p>
            <ul 
              className="text-xs text-gray-700 space-y-0.5 ml-4"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              <li>• Name (required) or First name + Last name</li>
              <li>• Phone/Telephone (required)</li>
              <li>• Company (optional)</li>
              <li>• Position (optional)</li>
              <li>• E-mail/Email (optional)</li>
              <li>• Website (optional)</li>
              <li>• Notes (optional)</li>
            </ul>
            
            {/* Download sample file link */}
            <button
              onClick={handleDownloadSample}
              disabled={isImporting}
              className="text-blue-600 text-xs font-medium hover:underline mt-2 disabled:opacity-50"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              Download sample file
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleImport}
            disabled={!selectedFile || isImporting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            style={{ 
              fontFamily: 'Source Sans Pro, sans-serif',
              fontSize: '14px'
            }}
          >
            {isImporting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{isImporting ? 'Importing...' : 'Import'}</span>
          </button>
        </div>
      </div>
    </div>
  )
} 