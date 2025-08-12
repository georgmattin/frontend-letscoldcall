import Link from 'next/link'
import StatisticsWidget from './statistics-widget'

export default function UniversalSidebar() {
  const navigationItems = [
    { name: 'Dashboard', href: '/dasher' },
    { name: 'Call History', href: '/calls' },
    { name: 'Contact lists', href: '/contact-lists' },
    { name: 'Call Scripts', href: '/scripts' },
    { name: 'Leads', href: '/liids' },
    { name: 'Analytics', href: '/analytics' },
    { name: 'Start calling', href: '#' }
  ];

  return (
    <div 
      className="fixed left-0 top-0 h-full bg-white border-r"
      style={{ width: '250px', borderRightWidth: '1px' }}
    >
      {/* Logo in top left */}
      <div className="absolute" style={{ top: '30px', left: '45px' }}>
        <img 
          src="/WeColdCall_logo_dark.png" 
          alt="WeColdCall" 
          style={{ width: '140px' }}
        />
      </div>
      
      {/* Border 40px below logo */}
      <div 
        className="absolute left-0 border-b"
        style={{ 
          top: '90px',
          width: '250px',
          borderBottomWidth: '1px'
        }}
      />
      
      {/* Navigation menu */}
      <nav className="absolute" style={{ top: '120px', left: '0', width: '250px' }}>
        {navigationItems.map((item, index) => (
          <Link 
            key={index}
            href={item.href}
            className="flex items-center py-3 cursor-pointer hover:text-[#0D8BFF] transition-colors duration-200 block"
            style={{ paddingLeft: '45px' }}
          >
            <svg 
              className="w-4 h-4 mr-3" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-medium" style={{ fontFamily: 'Source Sans Pro, sans-serif' }}>
              {item.name}
            </span>
          </Link>
        ))}
      </nav>
      
      {/* Statistics Widget */}
      <div className="absolute" style={{ top: '420px', left: '0', width: '250px' }}>
        <StatisticsWidget />
      </div>
      
      {/* Hamburger menu button - 50% over the right border */}
      <div 
        className="absolute bg-white border rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50"
        style={{ 
          top: '65px',
          right: '-25px',
          width: '50px',
          height: '50px',
          borderWidth: '1px'
        }}
      >
        <div className="flex flex-col space-y-1">
          <div className="w-4 h-0.5 bg-gray-600"></div>
          <div className="w-4 h-0.5 bg-gray-600"></div>
          <div className="w-4 h-0.5 bg-gray-600"></div>
        </div>
      </div>
    </div>
  )
} 