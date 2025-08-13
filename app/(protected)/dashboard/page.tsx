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

  // Ensure onboarding status is marked as 'yes' once user reaches dashboard
  try {
    const userId = session.user.id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_status')
      .eq('id', userId)
      .maybeSingle()

    if (!profileError) {
      const needsUpdate = !profile || profile.onboarding_status !== 'yes'
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ onboarding_status: 'yes', updated_at: new Date().toISOString() })
          .eq('id', userId)

        if (updateError) {
          console.error('Failed to update onboarding_status:', updateError.message)
        }
      }
    } else {
      console.error('Failed to load profile for onboarding_status check:', profileError.message)
    }
  } catch (e) {
    console.error('Unexpected error ensuring onboarding_status yes:', e)
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
