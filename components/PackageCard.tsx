"use client"

import React from 'react'
import { Button } from '@/components/ui/button'

export interface PackageCardProps {
  id: string
  name: string
  price: number
  features: string[]
  highlighted?: boolean
  loading?: boolean
  onSelect: (id: string) => void
}

export default function PackageCard({
  id,
  name,
  price,
  features,
  highlighted,
  loading,
  onSelect
}: PackageCardProps) {
  const textColor = highlighted ? '#FFFFFF' : '#003333'
  const checkColor = highlighted ? '#D1FAE5' : '#059669'
  const cardBaseClasses = highlighted
    ? 'rounded-lg p-8 shadow-lg border-2 border-[#059669]'
    : 'bg-white rounded-lg p-8 shadow-sm border border-gray-200'
  const cardStyle = highlighted
    ? { background: 'linear-gradient(135deg, #047857 30%, #059669 70%)' }
    : undefined

  return (
    <div className={`${cardBaseClasses} w-full lg:w-[270px]`} style={cardStyle}>
      <div className="text-left mb-4">
        <h3 className="font-bold mb-1" style={{ fontSize: '24px', color: textColor }}>
          {name}
        </h3>
        <p className="italic mb-2" style={{ fontSize: '16px', color: textColor }}>
          All features included
        </p>
        <div className="mb-1">
          <span className="font-bold" style={{ fontSize: '36px', color: textColor }}>
            {price}
          </span>
          <span style={{ fontSize: '16px', color: textColor }}> $ / mo.</span>
        </div>
        <p style={{ fontSize: '14px', color: textColor }}>Can buy additional credits</p>
      </div>

      <div className="space-y-2 mb-6">
        {features.map((f, idx) => (
          <div className="flex items-center" key={`${id}-feature-${idx}`}>
            <div className="w-5 h-5 mr-3" style={{ color: checkColor }}>✓</div>
            <span style={{ fontSize: '16px', color: textColor }}>{f}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={() => onSelect(id)}
        disabled={!!loading}
        className="w-full text-white rounded-md font-semibold transition-colors"
        style={{ height: '50px', fontSize: '16px', backgroundColor: '#059669', borderRadius: '11px' }}
        onMouseEnter={(e) => {
          if (!loading) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#047857' }
        }}
        onMouseLeave={(e) => {
          if (!loading) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#059669' }
        }}
      >
        Select And Continue
      </Button>
    </div>
  )
}
