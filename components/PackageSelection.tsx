"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import PackageCard from '@/components/PackageCard'

export interface PackageItem {
  id: string
  name: string
  price: number
  features: string[]
  highlighted?: boolean
}

interface PackageSelectionProps {
  title: string
  subtitle: string
  packages: PackageItem[]
  onSelect: (id: string) => void
  loading?: boolean
  message?: { type: 'success' | 'error'; text: string } | null
}

export default function PackageSelection({
  title,
  subtitle,
  packages,
  onSelect,
  loading,
  message
}: PackageSelectionProps) {
  return (
    <div className="w-full max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="font-bold text-[#003333]" style={{ fontSize: '39.81px' }}>
          {title}
        </h1>
        <p className="font-medium text-[#003333]" style={{ fontSize: '19.2px' }}>
          {subtitle}
        </p>
      </div>

      {/* Package Cards */}
      <div className="flex flex-col lg:flex-row justify-center gap-6 max-w-5xl mx-auto">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            id={pkg.id}
            name={pkg.name}
            price={pkg.price}
            features={pkg.features}
            highlighted={pkg.highlighted}
            loading={loading}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Message */}
      {message && (
        <div className="mt-8 flex justify-center">
          <Alert className={`max-w-md`}> 
            <AlertDescription>
              {message.text}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
