'use client'

import React from 'react'

export default function UniversalNavbar() {
  return (
    <nav className="w-full h-16 bg-white border-2 border-gray-300 flex items-center justify-between px-6">
      {/* Left section - can be used for logo or brand */}
      <div className="flex items-center">
        <div className="h-8 w-32 border border-gray-300 rounded flex items-center justify-center">
          <span className="text-sm text-gray-500">Logo</span>
        </div>
      </div>

      {/* Center section - can be used for navigation links */}
      <div className="flex items-center space-x-6">
        <div className="h-8 w-20 border border-gray-300 rounded flex items-center justify-center">
          <span className="text-sm text-gray-500">Nav 1</span>
        </div>
        <div className="h-8 w-20 border border-gray-300 rounded flex items-center justify-center">
          <span className="text-sm text-gray-500">Nav 2</span>
        </div>
        <div className="h-8 w-20 border border-gray-300 rounded flex items-center justify-center">
          <span className="text-sm text-gray-500">Nav 3</span>
        </div>
      </div>

      {/* Right section - can be used for user menu or actions */}
      <div className="flex items-center space-x-4">
        <div className="h-8 w-24 border border-gray-300 rounded flex items-center justify-center">
          <span className="text-sm text-gray-500">Action 1</span>
        </div>
        <div className="h-8 w-8 border border-gray-300 rounded-full flex items-center justify-center">
          <span className="text-xs text-gray-500">U</span>
        </div>
      </div>
    </nav>
  )
}
