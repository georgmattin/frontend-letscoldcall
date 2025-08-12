import React from 'react'

interface OnboardingSidebarProps {
  currentStep: 1 | 2 | 3
  forceAllCompleted?: boolean
  labelColor?: string
  // Optional: when provided and currentStep === 2, allow clicking step 1 to go back
  onStep1Click?: () => void
}

const circleStyles = {
  completed: {
    borderColor: 'rgba(0,51,51,0.35)',
    color: 'rgba(0,51,51,0.35)',
    backgroundColor: '#FFFFFF'
  },
  active: {
    borderColor: '#003333',
    color: '#003333',
    backgroundColor: '#FFFFFF'
  },
  upcoming: {
    borderColor: 'rgba(0,51,51,0.2)',
    color: 'rgba(0,51,51,0.2)',
    backgroundColor: '#FFFFFF'
  },
  connector: 'rgba(0,51,51,0.2)'
} as const

export default function OnboardingSidebar({ currentStep, forceAllCompleted, labelColor, onStep1Click }: OnboardingSidebarProps) {
  const getState = (index: number): 'completed' | 'active' | 'upcoming' => {
    if (forceAllCompleted) return 'completed'
    if (index < currentStep) return 'completed'
    if (index === currentStep) return 'active'
    return 'upcoming'
  }

  return (
    <div className="hidden lg:flex w-64 h-screen fixed left-0 top-0" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Left side with ONBOARDING PROGRESS text */}
      <div className="w-12 pl-10 h-full flex items-center justify-center">
        <div className="transform -rotate-90">
          <div className="font-bold whitespace-nowrap" style={{ fontSize: '16px', color: '#003333' }}>
            ONBOARDING PROGRESS
          </div>
        </div>
      </div>

      {/* Right side with centered steps */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center" style={{ width: '192px' }}>
          {/* Step 1 */}
          <div
            className="w-[52px] h-[52px] rounded-full border flex items-center justify-center text-[27.65px] font-bold"
            style={{
              ...circleStyles[getState(1)],
              cursor: currentStep === 2 && onStep1Click ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (currentStep === 2 && onStep1Click) onStep1Click()
            }}
            role={currentStep === 2 && onStep1Click ? 'button' : undefined}
            aria-label={currentStep === 2 && onStep1Click ? 'Go back to step 1' : undefined}
            tabIndex={currentStep === 2 && onStep1Click ? 0 : -1}
            onKeyDown={(e) => {
              if (currentStep === 2 && onStep1Click && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onStep1Click()
              }
            }}
          >
            {getState(1) === 'completed' ? '✓' : 1}
          </div>
          <div className="w-0.5" style={{ height: '15px', backgroundColor: circleStyles.connector }} />

          {/* Step 2 */}
          <div
            className="w-[52px] h-[52px] rounded-full border flex items-center justify-center text-[27.65px] font-bold"
            style={circleStyles[getState(2)]}
          >
            {getState(2) === 'completed' ? '✓' : 2}
          </div>
          <div className="w-0.5" style={{ height: '15px', backgroundColor: circleStyles.connector }} />

          {/* Step 3 */}
          <div
            className="w-[52px] h-[52px] rounded-full border flex items-center justify-center text-[27.65px] font-bold"
            style={circleStyles[getState(3)]}
          >
            {getState(3) === 'completed' ? '✓' : 3}
          </div>

          <div className="text-center mt-4" style={{ fontWeight: 'bold', fontSize: '16px', color: labelColor || '#003333' }}>
            <div>START</div>
            <div>CALLING</div>
          </div>
        </div>
      </div>

      {/* Separator line on the right */}
      <div
        className="absolute right-0 top-1/2 transform -translate-y-1/2 w-px"
        style={{ height: '300px', backgroundColor: circleStyles.connector }}
      />
    </div>
  )
}
