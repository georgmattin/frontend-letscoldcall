"use client";
import React from 'react';
import { createClient } from '@/utils/supabase/client';

const PlanBadge = () => {
  const supabase = createClient();
  const [planName, setPlanName] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    let mounted = true;
    const loadPlan = async () => {
      try {
        setLoading(true);
        const { data: userRes, error: userErr } = await supabase.auth.getUser();
        if (userErr) {
          console.error('PlanBadge: getUser failed', userErr);
          return;
        }
        const user = userRes?.user;
        if (!user) return;

        const { data: sub, error: subErr } = await supabase
          .from('user_subscriptions')
          .select('package_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (subErr) {
          console.error('PlanBadge: fetch subscription failed', subErr);
          return;
        }
        if (!sub?.package_id) {
          if (mounted) setPlanName(null);
          return;
        }

        const { data: pkg, error: pkgErr } = await supabase
          .from('package_types')
          .select('package_display_name')
          .eq('id', sub.package_id)
          .maybeSingle();
        if (pkgErr) {
          console.error('PlanBadge: fetch package failed', pkgErr);
          return;
        }
        if (mounted) setPlanName(pkg?.package_display_name ?? null);
      } catch (e) {
        console.error('PlanBadge: loadPlan error', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadPlan();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <div
      className="inline-flex items-center justify-center px-2 py-1 rounded-md font-semibold"
      style={{
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        color: '#059669',
        fontFamily: 'Open Sans, sans-serif',
        fontSize: '15px',
        lineHeight: '1.2',
      }}
    >
      {loading ? 'Loading…' : (planName ?? 'Free')}
    </div>
  );
};

export default PlanBadge;
