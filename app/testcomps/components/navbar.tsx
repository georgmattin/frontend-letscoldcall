'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import CallButton from './CallButton';
import PlanBadge from './PlanBadge';
import UserMenu from './UserMenu';
import { useState } from 'react';

const Navbar = () => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Disable Start Calling button when on calling page with active session or single-call mode
  const isCallingPath = pathname === '/calling' || pathname?.startsWith('/calling/');
  const hasSessionId = !!searchParams?.get('sessionId');
  const isSingleMode = searchParams?.get('mode') === 'single';
  const hasSingleContact = !!searchParams?.get('contactId');
  const shouldDisableStart = isCallingPath && (hasSessionId || (isSingleMode && hasSingleContact));
  const menuItems = [
    { name: 'Contacts', href: '/contacts', icon: '/contacts-icon.svg', customClass: '' },
    { name: 'Scripts', href: '/scripts', icon: '/scripts-icon.svg', customClass: '' },
    { name: 'Leads', href: '/leads', icon: '/leads-icon.svg', customClass: '' },
    { name: 'Analytics', href: '/analytics', icon: '/analytics-icon.svg', customClass: '' },
    { name: 'Call Logs', href: '/call-logs', icon: '/call-logs-icon.svg', customClass: 'h-[23px]' }
  ];

  return (
    <div className="w-full flex border-b border-[#0033331a] min-h-[100px] bg-white">
      <div className="w-[7.24%] min-h-[100px] border-r border-[#0033331a] flex items-center justify-center">
        <Link href="/dashboard" aria-label="Go to dashboard">
          <Image 
            src="/logo-icon.svg" 
            alt="Logo" 
            width={51} 
            height={51}
            className="w-[51px] h-[51px] cursor-pointer"
          />
        </Link>
      </div>
      <div className="w-[52.87%] min-h-[100px] border-r border-[#0033331a]">
        <nav className="min-h-[100px] w-full flex items-center">
          <ul className="flex w-full items-center justify-center">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
              <li key={item.name} className="h-full">
                <Link 
                  href={item.href}
                  className={`group h-full flex items-center px-[21px] font-open-sans text-[19.2px] transition-colors ${isActive ? 'text-[#059669]' : 'text-[#003333] hover:text-[#059669]'}`}
                  style={{ fontFamily: 'Open Sans, sans-serif' }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div className="flex items-center h-full">
                    <div className="w-[30px] h-[30px] mr-4 flex-shrink-0 relative flex items-center">
                      <div className={`absolute inset-0 items-center ${isActive ? 'hidden' : 'flex'} group-hover:hidden`}>
                        <Image 
                          src={item.icon} 
                          alt={item.name} 
                          width={30} 
                          height={30} 
                          className={`object-contain h-[30px] ${item.customClass}`}
                        />
                      </div>
                      <div className={`absolute inset-0 items-center ${isActive ? 'flex' : 'hidden'} group-hover:flex`}>
                        <Image 
                          src={item.icon} 
                          alt={item.name} 
                          width={30} 
                          height={30} 
                          className={`object-contain h-[30px] ${item.customClass}`}
                          style={{ filter: 'invert(30%) sepia(100%) saturate(500%) hue-rotate(120deg) brightness(90%) contrast(90%)' }}
                        />
                      </div>
                    </div>
                    {item.name}
                  </div>
                </Link>
              </li>
            );})}
          </ul>
        </nav>
      </div>
      <div className="w-[26.4%] min-h-[100px] border-r border-[#0033331a] flex items-center justify-end pr-[30px]">
        <CallButton href="/dashboard" disabled={shouldDisableStart} />
      </div>
      <div
        className="w-[13.49%] min-h-[100px] flex items-center pl-8 pr-[25px] relative"
        onMouseEnter={() => setUserMenuOpen(true)}
        onMouseLeave={() => setUserMenuOpen(false)}
      >
        <button
          type="button"
          className="flex flex-col text-left w-full"
          onClick={() => setUserMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={userMenuOpen}
        >
          <div className="flex items-center justify-between w-full">
            <span
              className="text-[#003333] text-[19.2px] font-bold font-open-sans"
              style={{ fontFamily: 'Open Sans, sans-serif' }}
            >
              My Account
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-2 text-[#003333]"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="mt-1">
            <PlanBadge />
          </div>
        </button>
        {userMenuOpen && (
          <div className="absolute top-full left-0 w-full mt-0 z-50">
            <UserMenu />
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
