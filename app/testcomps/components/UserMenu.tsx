"use client";
import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const UserMenu = () => {
  const router = useRouter();
  const supabase = createClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Determine active tab from query params on settings pages
  const activeTab = React.useMemo(() => {
    if (!pathname?.startsWith('/settings')) return null;
    return searchParams.get('tab');
  }, [pathname, searchParams]);

  const linkBase = 'hover:text-[#059669] cursor-pointer';
  const getLinkClass = (tab: string) =>
    `${activeTab === tab ? 'text-[#059669]' : 'text-[#003333]'} ${linkBase}`;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      // Fallback redirect even if signOut throws (rare)
      router.push('/login');
    }
  };

  return (
    <div className="w-full bg-white border border-[#0033331a] shadow-md rounded-none rounded-bl-[5px] pt-[30px] pr-[30px] pb-[15px] pl-[30px]">
      {/* Placeholder menu items; adjust as needed */}
      <ul className="space-y-3">
        <li>
          <Link href="/settings?tab=my-account" className={getLinkClass('my-account')}>
            My Account
          </Link>
        </li>
        <li>
          <Link href="/settings?tab=billing" className={getLinkClass('billing')}>
            Billing & Invoices
          </Link>
        </li>
        <li>
          <Link href="/settings?tab=usage" className={getLinkClass('usage')}>
            Usage & Limits
          </Link>
        </li>
        <li>
          <Link href="/settings?tab=twilio" className={getLinkClass('twilio')}>
            Twilio Settings
          </Link>
        </li>
        <li>
          <Link href="/settings?tab=scripts" className={getLinkClass('scripts')}>
            Script settings
          </Link>
        </li>
        <li>
          <Link href="/settings?tab=integrations" className={getLinkClass('integrations')}>
            Integrations
          </Link>
        </li>
        <li>
          <Link href="/settings?tab=daily-goals" className={getLinkClass('daily-goals')}>
            Daily Goals
          </Link>
        </li>
      

      </ul>

      <div className="w-full h-px bg-[#0033331a] my-4" />

      <button onClick={handleLogout} className="group flex items-center gap-3 text-[#003333] font-bold hover:text-[#FF0000] cursor-pointer">
        <span
          aria-hidden
          className="inline-block w-4 h-4 bg-current"
          style={{
            WebkitMaskImage: 'url(/log-out-icon.svg)',
            maskImage: 'url(/log-out-icon.svg)',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        />
        <span>Log Out</span>
      </button>
    </div>
  );
};

export default UserMenu;
