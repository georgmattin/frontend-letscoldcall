'use client'

interface DeleteConfirmationPopupProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  confirmButtonText?: string
}

export default function DeleteConfirmationPopup({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Delete Contact",
  message = "Are you sure you want to delete this contact? This action cannot be undone.",
  confirmButtonText = "Delete"
}: DeleteConfirmationPopupProps) {
  if (!isOpen) return null

  const handleDelete = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-lg shadow-lg"
        style={{ 
          width: '400px',
          fontFamily: 'Source Sans Pro, sans-serif'
        }}
      >
        {/* Content */}
        <div className="p-6">
          <h2 
            className="text-lg font-semibold text-gray-900 mb-3"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            {title}
          </h2>
          <p 
            className="text-sm text-gray-600 mb-6"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            {message}
          </p>
          
          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              style={{ 
                fontFamily: 'Source Sans Pro, sans-serif',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
              style={{ 
                fontFamily: 'Source Sans Pro, sans-serif',
                fontSize: '14px'
              }}
            >
              {confirmButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 