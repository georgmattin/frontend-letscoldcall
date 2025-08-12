"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import SecondaryButtonWithPlus from './secondary-button-with-plus';
import CreateAContactListPopup from './create-a-contact-list-popup';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ContactListTable: React.FC = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{ id: number; name: string; created_at: string; total: number; called: number; convRate: number; avgDurationSec: number; convAvailable: boolean; timeAvailable: boolean }>>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10); // user selectable: 5, 10, 15
  const [totalCount, setTotalCount] = useState(0);
  const [sortKey, setSortKey] = useState<'created_at' | 'name' | 'total' | 'called' | 'convRate' | 'avgDurationSec'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  // Track if we have completed the first load to control skeleton visibility
  const [hasLoaded, setHasLoaded] = useState(false);
  const router = useRouter();

  const goToList = (id: number) => {
    if (!id) return;
    router.push(`/contacts/list/${id}`);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const skeletonRowCount = useMemo(() => {
    const start = (page - 1) * pageSize;
    const remaining = totalCount - start;
    return remaining > 0 ? Math.min(pageSize, remaining) : 0;
  }, [page, pageSize, totalCount]);

  const allSelectedOnPage = useMemo(() => {
    if (!rows.length) return false;
    return rows.every((r) => selected[r.id]);
  }, [rows, selected]);

  const someSelectedOnPage = useMemo(() => {
    if (!rows.length) return false;
    const sel = rows.filter((r) => selected[r.id]).length;
    return sel > 0 && sel < rows.length;
  }, [rows, selected]);

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }).format(d);
    } catch {
      return iso ?? '';
    }
  };
  const formatDuration = (secs?: number) => {
    const s = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) {
        setError('You must be signed in to view contact lists.');
        setRows([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Base order by created_at or name; counts/time-based sorting will be applied client-side within page
      let query = supabase
        .from('contact_lists')
        .select('id, name, created_at', { count: 'exact' })
        .eq('user_id', userId);

      if (sortKey === 'name') {
        query = query.order('name', { ascending: sortDir === 'asc' });
      } else {
        // default created_at
        query = query.order('created_at', { ascending: sortDir === 'asc' });
      }

      const { data: lists, error: listErr, count } = await query.range(from, to);
      if (listErr) throw listErr;

      setTotalCount(count || 0);

      const ids = (lists || []).map((l) => l.id as number);
      if (!ids.length) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: contacts, error: contactsErr } = await supabase
        .from('contacts')
        .select('contact_list_id, status')
        .in('contact_list_id', ids)
        .limit(50000);
      if (contactsErr) throw contactsErr;

      const totalsMap: Record<number, { total: number; called: number }> = {};
      for (const id of ids) totalsMap[id] = { total: 0, called: 0 };
      for (const c of contacts || []) {
        const lid = (c as any).contact_list_id as number;
        if (!totalsMap[lid]) totalsMap[lid] = { total: 0, called: 0 };
        totalsMap[lid].total += 1;
        const st = (c as any).status as string | null;
        if (st && st !== 'not_called') totalsMap[lid].called += 1;
      }

      // Fetch call history for conversion rate and avg call time
      const { data: history, error: histErr } = await supabase
        .from('call_history')
        .select('contact_list_id, duration, call_outcome')
        .in('contact_list_id', ids)
        .limit(50000);
      if (histErr) throw histErr;

      const histAgg: Record<number, { totalCalls: number; meetings: number; sumDur: number; durCount: number }> = {};
      for (const id of ids) histAgg[id] = { totalCalls: 0, meetings: 0, sumDur: 0, durCount: 0 };
      for (const h of history || []) {
        const lid = (h as any).contact_list_id as number;
        if (!histAgg[lid]) histAgg[lid] = { totalCalls: 0, meetings: 0, sumDur: 0, durCount: 0 };
        histAgg[lid].totalCalls += 1;
        const outcome = (h as any).call_outcome as string | null;
        // Treat 'meeting_scheduled' as a conversion. Adjust if needed.
        if (outcome === 'meeting_scheduled') histAgg[lid].meetings += 1;
        const d = (h as any).duration as number | null;
        if (typeof d === 'number' && d > 0) {
          histAgg[lid].sumDur += d;
          histAgg[lid].durCount += 1;
        }
      }

      let pageRows = (lists || []).map((l) => {
        const lid = l.id as number;
        const totals = totalsMap[lid] ?? { total: 0, called: 0 };
        const ha = histAgg[lid] ?? { totalCalls: 0, meetings: 0, sumDur: 0, durCount: 0 };
        const convAvailable = ha.totalCalls > 0;
        const timeAvailable = ha.durCount > 0;
        const convRate = convAvailable ? (ha.meetings / ha.totalCalls) * 100 : 0;
        const avgDurationSec = timeAvailable ? Math.round(ha.sumDur / ha.durCount) : 0;
        return {
          id: lid,
          name: (l as any).name as string,
          created_at: (l as any).created_at as string,
          total: totals.total,
          called: totals.called,
          convRate,
          avgDurationSec,
          convAvailable,
          timeAvailable,
        };
      });

      // If sorting by totals, called, conversion rate, or avg call time: sort client-side within page
      if (sortKey === 'total' || sortKey === 'called' || sortKey === 'convRate' || sortKey === 'avgDurationSec') {
        pageRows.sort((a, b) => {
          const vA = a[sortKey];
          const vB = b[sortKey];
          if (vA === vB) return 0;
          return sortDir === 'asc' ? vA - vB : vB - vA;
        });
      }

      setRows(pageRows);
    } catch (e: any) {
      console.error('Failed to load contact lists:', e);
      setError(e?.message || 'Failed to load contact lists');
      setRows([]);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, [page, pageSize, sortKey, sortDir]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSelectAll = () => {
    if (!rows.length) return;
    setSelected((prev) => {
      const next = { ...prev };
      const shouldSelectAll = !allSelectedOnPage;
      for (const r of rows) next[r.id] = shouldSelectAll;
      return next;
    });
  };

  const toggleSelectRow = (id: number) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSort = (key: 'created_at' | 'name' | 'total' | 'called' | 'convRate' | 'avgDurationSec') => {
    if (key === sortKey) {
      // Cycle: asc -> desc -> reset to default (created_at desc)
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        // Currently desc: deactivate this column's sorting and reset to default
        setSortKey('created_at');
        setSortDir('desc');
      }
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc'); // defaults for newly selected column
    }
  };

  const handleCreated = () => {
    // After creation, show newest first
    setCreateOpen(false);
    setPage(1);
    setSortKey('created_at');
    setSortDir('desc');
    // Reload
    setTimeout(() => {
      loadData();
    }, 50);
  };

  const Arrow = ({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) => (
    <span
      aria-hidden
      className={
        `ml-1 inline-block h-[12px] w-[12px] align-middle transition-colors ` +
        (active ? 'bg-[#059669]' : 'bg-[#D2D9DA]') +
        ' group-hover:bg-[#059669]'
      }
      style={{
        WebkitMaskImage: 'url(/sort-icon.svg)',
        maskImage: 'url(/sort-icon.svg)',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        transform: dir === 'desc' ? 'rotate(180deg)' : undefined
      }}
    />
  );
  return (
    // Full-component loading state
    (loading && !hasLoaded) ? (
      <section
        className="relative bg-white border border-[#003333]/10 rounded-[10px]"
        style={{ width: '100%', maxWidth: 1418, minHeight: 489, margin: '40px auto 0' }}
      >
        <div
          className="w-full flex items-end justify-between"
          style={{ padding: '44px 72px 29px' }}
        >
          <div className="h-8 w-56 bg-[#E9ECED] rounded animate-pulse" />
          <div className="h-8 w-40 bg-[#E9ECED] rounded animate-pulse" />
        </div>

        {/* Table header placeholder */}
        <div className="w-full" style={{ backgroundColor: '#E9ECED', height: 52 }} />

        {/* Skeleton rows (match in-table skeleton layout exactly) */}
        <div className="relative w-full" style={{ paddingBottom: 96 }}>
          {Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className="flex h-[48px] items-center border-b border-[#003333]/10">
              {/* Col 1: left spacer (no checkbox in UI) */}
              <div className="flex items-center" style={{ width: '5.085%' }}>
                <div className="ml-[24px]" style={{ width: 23, height: 23 }} />
              </div>
              {/* Col 2: name */}
              <div className="flex items-center" style={{ width: '25.529%' }}>
                <div className="h-4 w-56 bg-[#E9ECED] rounded animate-pulse" />
              </div>
              {/* Col 3: contacts total */}
              <div className="flex items-center" style={{ width: '10.516%' }}>
                <div className="h-5 w-12 bg-[#E9ECED] rounded animate-pulse" />
              </div>
              {/* Col 4: called/total */}
              <div className="flex items-center" style={{ width: '12%' }}>
                <div className="h-5 w-16 bg-[#E9ECED] rounded animate-pulse" />
              </div>
              {/* Col 5: Conv. Rate */}
              <div className="flex items-center" style={{ width: '13%' }}>
                <div className="h-5 w-20 bg-[#E9ECED] rounded animate-pulse" />
              </div>
              {/* Col 6: Avg. Call Time */}
              <div className="flex items-center" style={{ width: '16%' }}>
                <div className="h-5 w-24 bg-[#E9ECED] rounded animate-pulse" />
              </div>
              {/* Col 7: date created */}
              <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 25.529% + 10.516% + 12% + 13% + 16%))' }}>
                <div className="h-4 w-32 bg-[#E9ECED] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton pagination (mirrors real markup) */}
        <div
          className="flex items-center justify-between py-3 pointer-events-none"
          style={{ position: 'absolute', bottom: 32, marginLeft: '5.085%', width: 'calc(100% - 5.085%)', paddingRight: 40 }}
        >
          {/* Left: Rows Per Page */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center h-8 px-2 text-sm text-transparent select-none bg-[#E9ECED] rounded animate-pulse">Rows Per Page</span>
            <div className="relative">
              <select
                aria-label="Rows per page"
                disabled
                value={pageSize}
                onChange={() => {}}
                className="border border-[#E5E7EB] rounded appearance-none pl-2 pr-8 py-1 bg-[#E9ECED] text-transparent animate-pulse"
                style={{ fontSize: '14px' }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 8l4 4 4-4" stroke="transparent" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
          {/* Right: Page x of y + controls */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center h-8 px-2 text-sm text-transparent mr-2 select-none bg-[#E9ECED] rounded animate-pulse">Page {page} of {totalPages}</div>
            <button
              type="button"
              disabled
              className="inline-flex items-center h-8 px-3 rounded border border-[#E5E7EB] text-transparent bg-[#E9ECED] animate-pulse"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                disabled
                className="inline-flex items-center h-8 px-2 rounded border border-[#E5E7EB] text-transparent bg-[#E9ECED] animate-pulse"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled
              className="inline-flex items-center h-8 px-3 rounded border border-[#E5E7EB] text-transparent bg-[#E9ECED] animate-pulse"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    ) : (
    <TooltipProvider delayDuration={150}>
    <section
      className="bg-white border border-[#003333]/10 rounded-[10px]"
      style={{ width: '100%', maxWidth: 1418, minHeight: 489, margin: '40px auto 0' }}
    >
      <div
        className="w-full flex items-end justify-between"
        style={{ padding: '44px 72px 29px' }}
      >
        <h2
          className="text-[#003333] font-bold flex items-center"
          style={{ fontFamily: 'Open Sans, sans-serif', fontSize: '33.81px' }}
        >
          <Image
            src="/contacts-icon.svg"
            alt="Contacts"
            width={30}
            height={30}
            className="mr-[15px]"
            style={{
              // Approximate tint to #059669
              filter: 'invert(37%) sepia(86%) saturate(871%) hue-rotate(127deg) brightness(93%) contrast(96%)'
            }}
          />
          Contact Lists
        </h2>
        <div className="flex items-end">
          <SecondaryButtonWithPlus onClick={() => setCreateOpen(true)} />
        </div>
      </div>

      {/* Table header row */}
      <div className="w-full" style={{ backgroundColor: '#E9ECED', height: 52 }}>
        <div className="flex h-full">
          {/* Col 1: checkbox (72px => ~5.085%) */}
          <div className="flex items-center" style={{ width: '5.085%' }}>
            <div className="ml-[24px]" style={{ width: 23, height: 23 }} />
          </div>
          {/* Col 2: NAME (362px => ~25.529%) */}
          <div className="flex items-center" style={{ width: '25.529%' }}>
            <button
              type="button"
              onClick={() => handleSort('name')}
              className="group flex items-center"
              style={{ fontSize: '14px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}
            >
              NAME
              <Arrow active={sortKey === 'name'} dir={sortKey === 'name' ? sortDir : 'asc'} />
            </button>
          </div>
          {/* Col 3: CONTACTS (149px => ~10.516%) */}
          <div className="flex items-center" style={{ width: '10.516%' }}>
            <button
              type="button"
              onClick={() => handleSort('total')}
              className="group flex items-center"
              style={{ fontSize: '14px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}
            >
              CONTACTS
              <Arrow active={sortKey === 'total'} dir={sortKey === 'total' ? sortDir : 'desc'} />
            </button>
          </div>
          {/* Col 4: CALLED (reduced ~12%) */}
          <div className="flex items-center" style={{ width: '12%' }}>
            <button
              type="button"
              onClick={() => handleSort('called')}
              className="group flex items-center"
              style={{ fontSize: '14px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}
            >
              CALLED
              <Arrow active={sortKey === 'called'} dir={sortKey === 'called' ? sortDir : 'desc'} />
            </button>
          </div>
          {/* Col 5: CONV.RATE (~13%) */}
          <div className="flex items-center" style={{ width: '13%' }}>
            <button
              type="button"
              onClick={() => handleSort('convRate')}
              className="group flex items-center"
              style={{ fontSize: '14px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}
            >
              CONV.RATE
              <Arrow active={sortKey === 'convRate'} dir={sortKey === 'convRate' ? sortDir : 'asc'} />
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full border border-[#003333] text-[#003333] text-[12px] leading-none cursor-help bg-transparent hover:text-[#059669] hover:border-[#059669] transition-colors"
                  aria-label="What is Conversion Rate?"
                >
                  ?
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-sm bg-[#003333] text-white border border-[#003333]">
                <p>
                  Conversion Rate = Meetings Scheduled / Total Calls × 100%. Indicates the share of calls that resulted in a scheduled meeting.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {/* Col 6: AVG.CALL TIME (~16%) */}
          <div className="flex items-center" style={{ width: '16%' }}>
            <button
              type="button"
              onClick={() => handleSort('avgDurationSec')}
              className="group flex items-center"
              style={{ fontSize: '14px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}
            >
              AVG.CALL TIME
              <Arrow active={sortKey === 'avgDurationSec'} dir={sortKey === 'avgDurationSec' ? sortDir : 'asc'} />
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full border border-[#003333] text-[#003333] text-[12px] leading-none cursor-help bg-transparent hover:text-[#059669] hover:border-[#059669] transition-colors"
                  aria-label="What is Average Call Time?"
                >
                  ?
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-sm bg-[#003333] text-white border border-[#003333]">
                <p>
                  Average Call Time = Total Duration / Number of calls with duration. Shows typical call length in mm:ss.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {/* Col 7: DATE CREATED (remaining %) */}
          <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 25.529% + 10.516% + 12% + 13% + 16%))' }}>
            <button
              type="button"
              onClick={() => handleSort('created_at')}
              className="group flex items-center"
              style={{ fontSize: '14px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}
            >
              DATE CREATED
              <Arrow active={sortKey === 'created_at'} dir={sortKey === 'created_at' ? sortDir : 'desc'} />
            </button>
          </div>
        </div>
      </div>

      {/* Body rows / states */}
      <div className="w-full" style={{ minHeight: rows.length === 0 ? 489 - (44 + 29 + 52) : undefined }}>
        {(loading && hasLoaded) ? (
          // Skeleton only for in-table loading (pagination/sort)
          <div className="relative w-full" style={{ paddingBottom: 96 }}>
            {Array.from({ length: skeletonRowCount }).map((_, i) => (
              <div key={i} className="flex h-[48px] items-center border-b border-[#003333]/10">
                {/* Col 1: checkbox */}
                <div className="flex items-center" style={{ width: '5.085%' }}>
                  {/* Left spacer (no checkbox in UI) */}
                  <div className="ml-[24px]" style={{ width: 23, height: 23 }} />
                </div>
                {/* Col 2: name */}
                <div className="flex items-center" style={{ width: '25.529%' }}>
                  <div className="h-4 w-56 bg-[#E9ECED] rounded animate-pulse" />
                </div>
                {/* Col 3: contacts total */}
                <div className="flex items-center" style={{ width: '10.516%' }}>
                  <div className="h-5 w-12 bg-[#E9ECED] rounded animate-pulse" />
                </div>
                {/* Col 4: called/total */}
                <div className="flex items-center" style={{ width: '12%' }}>
                  <div className="h-5 w-16 bg-[#E9ECED] rounded animate-pulse" />
                </div>
                {/* Col 5: Conv. Rate */}
                <div className="flex items-center" style={{ width: '13%' }}>
                  <div className="h-5 w-20 bg-[#E9ECED] rounded animate-pulse" />
                </div>
                {/* Col 6: Avg. Call Time */}
                <div className="flex items-center" style={{ width: '16%' }}>
                  <div className="h-5 w-24 bg-[#E9ECED] rounded animate-pulse" />
                </div>
                {/* Col 7: date created */}
                <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 25.529% + 10.516% + 12% + 13% + 16%))' }}>
                  <div className="h-4 w-32 bg-[#E9ECED] rounded animate-pulse" />
                </div>
              </div>
            ))}

            {/* Skeleton pagination (in-table loading, mirrors real markup) */}
            <div
              className="flex items-center justify-between py-3 pointer-events-none"
              style={{ position: 'absolute', bottom: 32, marginLeft: '5.085%', width: 'calc(100% - 5.085%)', paddingRight: 40 }}
            >
              {/* Left: Rows Per Page */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center h-8 px-2 text-sm text-transparent select-none bg-[#E9ECED] rounded animate-pulse">Rows Per Page</span>
                <div className="relative">
                  <select
                    aria-label="Rows per page"
                    disabled
                    value={pageSize}
                    onChange={() => {}}
                    className="border border-[#E5E7EB] rounded appearance-none pl-2 pr-8 py-1 bg-[#E9ECED] text-transparent animate-pulse"
                    style={{ fontSize: '14px' }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 8l4 4 4-4" stroke="transparent" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>
              {/* Right: Page x of y + controls */}
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center h-8 px-2 text-sm text-transparent mr-2 select-none bg-[#E9ECED] rounded animate-pulse">Page {page} of {totalPages}</div>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center h-8 px-3 rounded border border-[#E5E7EB] text-transparent bg-[#E9ECED] animate-pulse"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled
                    className="inline-flex items-center h-8 px-2 rounded border border-[#E5E7EB] text-transparent bg-[#E9ECED] animate-pulse"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center h-8 px-3 rounded border border-[#E5E7EB] text-transparent bg-[#E9ECED] animate-pulse"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-600" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="w-full flex items-center justify-center py-12">
            <div className="flex flex-col items-center" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              <Image src="/placeholder-empty.svg" alt="Empty" width={93} height={84} />
              <h3 className="mt-4 text-[#003333] font-semibold" style={{ fontSize: '19.2px' }}>No Contact Lists Found</h3>
              <p className="mt-1 text-[#003333]" style={{ fontSize: '16px' }}>Start by creating a new list</p>
              <div className="mt-4">
                <SecondaryButtonWithPlus onClick={() => setCreateOpen(true)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div style={{ paddingBottom: 96 }}>
             {rows.map((r) => (
              <div
                key={r.id}
                className="flex h-[48px] items-center border-b border-[#003333]/10 hover:bg-[#F4F6F6] transition-colors cursor-pointer"
                onClick={() => goToList(r.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    goToList(r.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {/* Col 1: row checkbox */}
                <div className="flex items-center" style={{ width: '5.085%' }}>
                  <div className="ml-[24px]" style={{ width: 23, height: 23 }} />
                </div>
                {/* Col 2: name */}
                <div className="flex items-center" style={{ width: '25.529%' }}>
                  <span style={{ fontSize: '16px', color: '#003333', fontFamily: 'Open Sans, sans-serif' }}>{r.name}</span>
                </div>
                {/* Col 3: contacts total (badge, bold) */}
                <div className="flex items-center" style={{ width: '10.516%' }}>
                  <span
                    className="inline-flex items-center"
                    style={{
                      backgroundColor: '#F4F6F6',
                      border: '0.5px solid rgba(0,51,51,0.1)',
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: '16px',
                      color: '#003333',
                      fontFamily: 'Open Sans, sans-serif',
                    }}
                  >
                    {r.total}
                  </span>
                </div>
                {/* Col 4: called/total (badge, first number bold) */}
                <div className="flex items-center" style={{ width: '12%' }}>
                  <span
                    className="inline-flex items-center"
                    style={{
                      backgroundColor: '#F4F6F6',
                      border: '0.5px solid rgba(0,51,51,0.1)',
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: '16px',
                      color: '#003333',
                      fontFamily: 'Open Sans, sans-serif'
                    }}
                  >
                    <span>{r.called}</span>
                    <span className="mx-1">/</span>
                    <span>{r.total}</span>
                  </span>
                </div>
                {/* Col 5: Conv. Rate (badge) */}
                <div className="flex items-center" style={{ width: '13%' }}>
                  <span
                    className="inline-flex items-center"
                    style={{
                      backgroundColor: r.convAvailable ? '#F4F6F6' : '#F9FAFB',
                      border: r.convAvailable ? '0.5px solid rgba(0,51,51,0.1)' : '1px solid #E5E7EB',
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: '16px',
                      color: r.convAvailable ? '#003333' : '#6B7280',
                      fontFamily: 'Open Sans, sans-serif',
                    }}
                  >
                    {r.convAvailable ? `${r.convRate.toFixed(0)}%` : 'Not Available'}
                  </span>
                </div>
                {/* Col 6: Avg. Call Time (badge) */}
                <div className="flex items-center" style={{ width: '16%' }}>
                  <span
                    className="inline-flex items-center"
                    style={{
                      backgroundColor: r.timeAvailable ? '#F4F6F6' : '#F9FAFB',
                      border: r.timeAvailable ? '0.5px solid rgba(0,51,51,0.1)' : '1px solid #E5E7EB',
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: '16px',
                      color: r.timeAvailable ? '#003333' : '#6B7280',
                      fontFamily: 'Open Sans, sans-serif',
                    }}
                  >
                    {r.timeAvailable ? formatDuration(r.avgDurationSec) : 'Not Available'}
                  </span>
                </div>
                {/* Col 7: date created */}
                <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 25.529% + 10.516% + 12% + 13% + 16%))' }}>
                  <span style={{ fontSize: '16px', color: '#003333', fontFamily: 'Open Sans, sans-serif' }}>{formatDate(r.created_at)}</span>
                </div>
              </div>
            ))}

            </div>
            {/* Pagination */}
            <div
              className="flex items-center justify-between py-3"
              style={{ fontFamily: 'Open Sans, sans-serif', position: 'absolute', bottom: 32, marginLeft: '5.085%', width: 'calc(100% - 5.085%)', paddingRight: 40 }}
            >
              {/* Left: Rows Per Page */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#6B7280]">Rows Per Page</span>
                <div className="relative">
                  <select
                    aria-label="Rows per page"
                    value={pageSize}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setPageSize(v);
                      setPage(1);
                    }}
                    className="border border-[#003333]/20 rounded appearance-none pl-2 pr-8 py-1 text-[#003333] bg-white focus:outline-none"
                    style={{ fontSize: '14px' }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 8l4 4 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Right: Page x of y + controls */}
              <div className="flex items-center gap-2">
                <div className="text-sm text-[#6B7280] mr-2">Page {page} of {totalPages}</div>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center h-8 px-3 rounded border border-[#003333]/20 text-sm text-[#6B7280] hover:text-[#003333] hover:border-[#003333] disabled:text-[#9CA3AF] disabled:border-[#D1D5DB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPage(num)}
                    className={
                      `inline-flex items-center h-8 px-2 rounded border text-sm transition-colors ` +
                      (num === page
                        ? 'border-[#003333] bg-white text-[#003333] font-bold'
                        : 'border-[#003333]/20 text-[#6B7280] hover:text-[#003333] hover:border-[#003333]')
                    }
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center h-8 px-3 rounded border border-[#003333]/20 text-sm text-[#6B7280] hover:text-[#003333] hover:border-[#003333] disabled:text-[#9CA3AF] disabled:border-[#D1D5DB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="relative z-10 mx-4">
            <CreateAContactListPopup onCreated={() => handleCreated()} />
          </div>
        </div>
      )}
    </section>
  </TooltipProvider>
    )
  );
};

export default ContactListTable;
