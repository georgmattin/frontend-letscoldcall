import StartCallingSection from '../../testcomps/components/start-calling-section';
import ShowToastOnParam from '@/components/show-toast-on-param'
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="w-full bg-[#F4F6F6] flex flex-col">
      {/* Show toast if redirected with msg param */}
      <ShowToastOnParam />
      <div className="flex justify-center items-start mt-8">
        <StartCallingSection />
      </div>
    </div>
  );
}
