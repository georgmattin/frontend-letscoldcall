import UniversalSidebar from '@/components/universal-sidebar'

export default function DasherPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Universal sidebar component */}
      <UniversalSidebar />

      {/* Main content area */}
      <div 
        className="pl-[340px] pt-[120px] pr-8 pb-[40px]"
      >
        <div>
          <h1 
            className="text-[39.81px] font-bold text-[#253053] mb-4"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            Welcome, Georg-Marttin
          </h1>
          <p 
            className="text-lg text-gray-600 mb-8"
            style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
          >
            Are you ready to start calling?
          </p>
          
          {/* First box container with badge */}
          <div className="mb-6">
            {/* First box */}
            <div 
              className="bg-white border rounded-lg shadow-sm flex items-center relative"
              style={{ 
                width: '530px',
                height: '250px',
                borderWidth: '1px'
              }}
            >
              {/* Number badge - inside the box, top left */}
              <div className="absolute top-3 left-3 bg-[#2D3748] text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm z-10">
                1
              </div>
              
              {/* Left side - Image */}
              <div className="flex-shrink-0 p-8 flex items-center justify-center">
                <div>
                  {/* Step 1 illustration */}
                  <img 
                    src="/step1.png" 
                    alt="Upload Contacts" 
                    className="w-32 h-32 object-contain"
                  />
                </div>
              </div>
              
              {/* Thin vertical separator - full height */}
              <div className="h-full border-l border-gray-200"></div>
              
              {/* Right side - Content */}
              <div className="flex-1 p-8">
                <h2 
                  className="text-[23.04px] font-semibold text-[#253053] mb-3"
                  style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                >
                  Upload Contacts
                </h2>
                <p 
                  className="text-gray-600 mb-6 leading-relaxed"
                  style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                >
                  Upload your contact list .CSV file to easily view, manage, and reach out to the right people.
                </p>
                <button 
                  className="bg-[#0D8BFF] hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                  style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
                >
                  Upload A List
                </button>
              </div>
            </div>
          </div>
          
          {/* Second box */}
          <div 
            className="bg-white border rounded-lg shadow-sm mb-[100px] flex items-center relative"
            style={{ 
              width: '530px',
              height: '250px',
              borderWidth: '1px'
            }}
          >
            {/* Number badge - inside the box, top left */}
            <div className="absolute top-3 left-3 bg-[#2D3748] text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm z-10">
              2
            </div>
            
            {/* Left side - Image */}
            <div className="flex-shrink-0 p-8 flex items-center justify-center">
              <div>
                {/* Step 2 illustration */}
                <img 
                  src="/Step2.png" 
                  alt="Create A Script" 
                  className="w-32 h-32 object-contain"
                />
              </div>
            </div>
            
            {/* Thin vertical separator - full height */}
            <div className="h-full border-l border-gray-200"></div>
            
            {/* Right side - Content */}
            <div className="flex-1 p-8">
              <h2 
                className="text-[23.04px] font-semibold text-[#253053] mb-3"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                Create A Script
              </h2>
              <p 
                className="text-gray-600 mb-6 text-[16px]"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                Use our AI to instantly generate effective call scripts and objections in less than a minute.
              </p>
              <button 
                className="bg-[#0D8BFF] hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
              >
                Create Now
              </button>
            </div>
          </div>
          
          {/* Copyright section */}
          <div className="text-center">
            <p 
              className="text-sm text-gray-500"
              style={{ fontFamily: 'Source Sans Pro, sans-serif' }}
            >
              Copyright © 2025 WeColdCall. All rights reserved Terms of Service  |  Privacy Policy  |  Acceptable Use Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 