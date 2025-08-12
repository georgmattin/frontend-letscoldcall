import React from 'react'

interface SuccessBadgeProps {
  message: string
}

const SuccessBadge: React.FC<SuccessBadgeProps> = ({ message }) => {
  return (
    <div
      className="w-full rounded-[10px] px-4 py-3"
      style={{ fontFamily: 'Open Sans, sans-serif', backgroundColor: '#ECF8EE' }}
    >
      <span className="text-[16px] font-semibold" style={{ color: '#056966' }}>
        {message}
      </span>
    </div>
  )
}

export default SuccessBadge
