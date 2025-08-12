'use client'

interface NotInterestedSectionProps {
  notInterestedReason: string
  setNotInterestedReason: (reason: string) => void
  currentCallHistoryId: string | null
  notes: string
  updateCallHistoryRecord: (id: string, updates: any) => Promise<boolean>
}

export default function NotInterestedSection({
  notInterestedReason,
  setNotInterestedReason,
  currentCallHistoryId,
  notes,
  updateCallHistoryRecord
}: NotInterestedSectionProps) {
  return (
    <div 
      className="mt-4 p-4 rounded-lg"
      style={{ 
        backgroundColor: '#FEF2F2',
        color: '#B91C1C'
      }}
    >
      <h3 className="font-semibold text-base mb-1">
        Add a reason <span className="font-normal">(optional)</span>
      </h3>
      <p className="text-sm mb-4">Add reason for future reference</p>
      
      <div className="mb-4">
        <textarea
          placeholder='e.g "Already using competitor product"'
          value={notInterestedReason}
          onChange={(e) => setNotInterestedReason(e.target.value)}
          rows={4}
          className="w-full p-3 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
          style={{ 
            color: '#B91C1C',
            border: '1px solid #FF0000'
          }}
        />
      </div>
      
      <button 
        onClick={async () => {
          if (!currentCallHistoryId) {
            alert('No call history to save reason to')
            return
          }
          
          // Save the not interested reason as additional notes
          const reasonNotes = notInterestedReason.trim() 
            ? `Not interested reason: ${notInterestedReason.trim()}`
            : 'Not interested (no reason provided)'
          
          const success = await updateCallHistoryRecord(currentCallHistoryId, {
            notes: notes.trim() ? `${notes.trim()}\n\n${reasonNotes}` : reasonNotes,
            updated_at: new Date().toISOString()
          })
          
          if (success) {
            alert('Reason saved successfully!')
          } else {
            alert('Failed to save reason. Please try again.')
          }
        }}
        className="w-full h-10 text-white font-medium rounded-lg transition-colors hover:opacity-90"
        style={{ backgroundColor: '#FF0000' }}
      >
        Save
      </button>
    </div>
  )
}
