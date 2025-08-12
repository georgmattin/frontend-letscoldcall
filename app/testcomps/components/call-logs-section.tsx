"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import CallLogsFilterAndActionsForTable from './call-logs-filter-and-actions-for-table';

// Distinct color palette for call outcomes (badge colors)
// Keys are lowercase outcome slugs from `call_history.call_outcome`
const CALL_OUTCOME_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  // Success / positive
  'meeting-scheduled': { bg: '#ECFDF5', border: '#10B981', text: '#047857' }, // emerald
  'meeting-booked': { bg: '#ECFDF5', border: '#10B981', text: '#047857' }, // alias
  sold: { bg: '#EEF2FF', border: '#6366F1', text: '#4338CA' }, // indigo
  positive: { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' }, // green
  interested: { bg: '#F0F9FF', border: '#0EA5E9', text: '#0369A1' }, // sky

  // Follow-up
  callback: { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' }, // blue
  'callback-later': { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' }, // alias
  'left-voicemail': { bg: '#FDF4FF', border: '#D946EF', text: '#A21CAF' }, // fuchsia

  // Neutral / system
  neutral: { bg: '#F8FAFC', border: '#94A3B8', text: '#475569' }, // slate
  'not-available': { bg: '#F1F5F9', border: '#94A3B8', text: '#475569' }, // slate light
  'no-answer': { bg: '#FFF7ED', border: '#FB923C', text: '#C2410C' }, // orange
  busy: { bg: '#FEFCE8', border: '#EAB308', text: '#A16207' }, // amber
  gatekeeper: { bg: '#F5F3FF', border: '#8B5CF6', text: '#6D28D9' }, // violet

  // Negative
  'not-interested': { bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C' }, // red
  negative: { bg: '#FFF1F2', border: '#F43F5E', text: '#E11D48' }, // rose-red
  'wrong-number': { bg: '#FFE4E6', border: '#FB7185', text: '#BE123C' }, // rose
  'do-not-call': { bg: '#FFF1F2', border: '#F43F5E', text: '#E11D48' }, // red-pink
};

type CallLogsSectionProps = {
  onRowClick?: (row: {
    id: number;
    name: string;
    phone: string;
    type: 'Incoming Call' | 'Outgoing Call' | 'Missed Call';
    durationSec: number;
    dateTimeISO: string;
    result: string;
  }) => void;
  // If provided, the query will always restrict results to these outcomes (in addition to any user-selected filters)
  restrictCallOutcomes?: string[];
  // If provided, the initial selected call results filter in the UI
  initialCallResults?: string[];
  // Optional: override the section title and icon (default: Call Logs)
  title?: string;
  titleIconSrc?: string;
};

const CallLogsSection: React.FC<CallLogsSectionProps> = ({ onRowClick, restrictCallOutcomes, initialCallResults, title, titleIconSrc }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  type CallLogRow = {
    id: number;
    name: string;
    phone: string;
    // Display label for type
    type: 'Incoming Call' | 'Outgoing Call' | 'Missed Call';
    durationSec: number;
    dateTimeISO: string;
    result: string;
  };
  // Narrow type for Supabase rows to avoid using `any` during transformation
  type SupabaseRow = {
    id: number;
    contact_name?: string | null;
    contact_phone?: string | null;
    phone_from?: string | null;
    phone_to?: string | null;
    type?: string | null; // new canonical type from DB: incoming_call | outgoing_call | missed_call
    duration?: number | string | null;
    started_at?: string | null;
    ended_at?: string | null;
    created_at?: string | null;
    outcome?: string | null;
    call_outcome?: string | null;
  };
  const [rows, setRows] = useState<CallLogRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10); // user selectable: 5, 10, 15
  const [totalCount, setTotalCount] = useState(0);
  const [sortKey, setSortKey] = useState<'dateTimeISO' | 'name' | 'phone' | 'type' | 'durationSec' | 'result'>('dateTimeISO');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  const [searchText, setSearchText] = useState<string>("");
  const [callResults, setCallResults] = useState<string[]>(initialCallResults || []);
  // Track if we have completed the first load to control skeleton visibility
  const [hasLoaded, setHasLoaded] = useState(false);

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

  const formatDateTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
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
  const toTitleCase = (val?: string) => {
    if (!val) return '';
    return val
      .replace(/[_\-]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) {
        setError('You must be signed in to view call logs.');
        setRows([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Fetch call logs from call_history
      let query = supabase
        .from('call_history')
        .select(
          'id, contact_name, contact_phone, started_at, ended_at, duration, call_outcome, type',
          { count: 'exact' }
        );

      // Rely on RLS; if explicit filtering is desired and column exists, uncomment the next line
      // query = query.eq('user_id', userId);

      // Apply date range filter (inclusive days) if present
      if (dateRange.from) {
        // from at 00:00:00Z
        query = query.gte('started_at', `${dateRange.from}T00:00:00.000Z`);
      }
      if (dateRange.to) {
        // to at 23:59:59.999Z (approx by next-day exclusive bound)
        const [y, m, d] = dateRange.to.split('-').map((v) => parseInt(v, 10));
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          const next = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0));
          query = query.lt('started_at', next.toISOString());
        } else {
          // fallback inclusive lte
          query = query.lte('started_at', `${dateRange.to}T23:59:59.999Z`);
        }
      }

      // Apply search text filter across multiple columns (server-side)
      // Sanitize to avoid PostgREST operator injection and syntax issues
      const sanitizedSearch = (searchText || '')
        .trim()
        .replace(/[%,()]/g, ' ')
        .replace(/\s+/g, ' ');
      if (sanitizedSearch) {
        // PostgREST supports '*' as wildcard for like/ilike. Avoid '%'.
        const safeTerm = sanitizedSearch.replace(/\*/g, '');
        const pattern = `*${safeTerm}*`;

        // Build base OR list across text columns
        const orParts: string[] = [
          'contact_name',
          'contact_phone',
          'contact_company',
          'contact_position',
          'contact_email',
          'contact_location',
          'call_sid',
          'call_outcome',
          'notes',
          'ai_summary',
          'contact_website',
          'transcription',
        ].map((col) => `${col}.ilike.${pattern}`);

        // Special handling for phone numbers: match digits regardless of formatting.
        // Example: search "1800" should match "+1 800-943-3043". We interleave wildcards
        // between digits to allow any characters in between.
        const digitsOnly = sanitizedSearch.replace(/\D/g, '');
        if (digitsOnly.length >= 3) {
          const interleaved = `*${digitsOnly.split('').join('*')}*`;
          orParts.push(`contact_phone.ilike.${interleaved}`);
        }

        // Do not add extra parentheses; PostgREST expects a single logic expression
        query = query.or(orParts.join(','));
      }

      // Apply call results filter (server-side). Combine user-selected filters with any hard restriction.
      {
        // Expand user-selected outcomes with aliases
        const expandedSelected = new Set<string>();
        if (callResults && callResults.length > 0) {
          for (const v of callResults) {
            expandedSelected.add(v);
            if (v === 'callback') expandedSelected.add('callback-later');
            if (v === 'meeting-scheduled') expandedSelected.add('meeting-booked');
          }
        }

        // Normalize restriction set
        const restrictSet = new Set<string>((restrictCallOutcomes || []).map((v) => String(v)));

        let outcomesToFilter: string[] | null = null;
        if (expandedSelected.size > 0 && restrictSet.size > 0) {
          // Intersect user-selected with restriction
          const intersect: string[] = [];
          for (const v of expandedSelected) if (restrictSet.has(v)) intersect.push(v);
          outcomesToFilter = intersect.length > 0 ? intersect : [];
        } else if (expandedSelected.size > 0) {
          outcomesToFilter = Array.from(expandedSelected);
        } else if (restrictSet.size > 0) {
          outcomesToFilter = Array.from(restrictSet);
        }

        if (outcomesToFilter && outcomesToFilter.length > 0) {
          query = query.in('call_outcome', outcomesToFilter);
        }
      }

      // Server-side ordering for sortable primitive columns
      if (sortKey === 'name') {
        query = query.order('contact_name', { ascending: sortDir === 'asc' });
      } else if (sortKey === 'phone') {
        query = query.order('contact_phone', { ascending: sortDir === 'asc' });
      } else if (sortKey === 'dateTimeISO') {
        // Order by started_at only to avoid referencing non-existent columns
        query = query.order('started_at', { ascending: sortDir === 'asc', nullsFirst: false });
      } else {
        // Default to most recent first by started_at
        query = query.order('started_at', { ascending: false });
      }

      const { data, error: qErr, count } = await query.range(from, to);
      if (qErr) throw qErr;
      setTotalCount(count || 0);

      const pageRows: CallLogRow[] = (data || []).map((ch: SupabaseRow) => {
        const typeRaw = String(ch.type || '').toLowerCase();
        let type: 'Incoming Call' | 'Outgoing Call' | 'Missed Call';
        if (typeRaw === 'incoming_call' || typeRaw === 'incoming') type = 'Incoming Call';
        else if (typeRaw === 'missed_call' || typeRaw === 'missed') type = 'Missed Call';
        else type = 'Outgoing Call';
        const computedDuration = (() => {
          if (typeof ch.duration === 'number') return ch.duration;
          const parsed = parseInt(ch.duration ?? '0', 10);
          if (!isNaN(parsed) && parsed > 0) return parsed;
          if (ch.started_at && ch.ended_at) {
            const start = new Date(ch.started_at).getTime();
            const end = new Date(ch.ended_at).getTime();
            if (!isNaN(start) && !isNaN(end) && end >= start) {
              return Math.floor((end - start) / 1000);
            }
          }
          return 0;
        })();
        const durationSec = Math.max(0, computedDuration);
        const dateTimeISO: string = ch.started_at || ch.created_at || '';
        const phone: string = ch.contact_phone || '';
        const name: string = ch.contact_name || 'Unknown';
        const result: string = ch.call_outcome || ch.outcome || '';
        return {
          id: ch.id as number,
          name,
          phone,
          type,
          durationSec,
          dateTimeISO,
          result,
        };
      });

      // Client-side sort for derived columns
      if (sortKey === 'type' || sortKey === 'durationSec' || sortKey === 'result') {
        pageRows.sort((a, b) => {
          const aVal = a[sortKey];
          const bVal = b[sortKey];
          if (aVal === bVal) return 0;
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
          }
          // string compare
          return sortDir === 'asc'
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
        });
      }

      setRows(pageRows);
    } catch (e: any) {
      console.error('Failed to load call logs:', e);
      setError(e?.message || 'Failed to load call logs');
      setRows([]);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, [page, pageSize, sortKey, sortDir, dateRange, searchText, callResults]);

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

  const handleSort = (key: 'dateTimeISO' | 'name' | 'phone' | 'type' | 'durationSec' | 'result') => {
    if (key === sortKey) {
      // Cycle: asc -> desc -> reset to default (created_at desc)
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        // Currently desc: deactivate this column's sorting and reset to default (Date & Time desc)
        setSortKey('dateTimeISO');
        setSortDir('desc');
      }
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc'); // defaults for newly selected column
    }
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
        style={{ width: '100%', maxWidth: 1418, minHeight: 489, margin: '0 auto' }}
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
              {/* Col 2: Name */}
              <div className="flex items-center" style={{ width: '20.423%' }}>
                <div className="h-4 w-56 bg-[#E9ECED] rounded animate-pulse" />
              </div>
              {/* Col 3: Phone */}
              <div className="flex items-center" style={{ width: '14%' }}>
                <div className="h-5 w-12 bg-[#E9ECED] rounded animate-pulse" />
              </div>
              {/* Col 4: Type */}
              <div className="flex items-center" style={{ width: '12%' }}>
                <div className="h-5 w-16 bg-[#E9ECED] rounded animate-pulse" />
              </div>
              {/* Col 5: Duration */}
              <div className="flex items-center" style={{ width: '13%' }}>
                <div className="h-5 w-20 bg-[#E9ECED] rounded animate-pulse" />
              </div>
              {/* Col 6: Date & Time */}
              <div className="flex items-center" style={{ width: '16%' }}>
                <div className="h-5 w-24 bg-[#E9ECED] rounded animate-pulse" />
              </div>
              {/* Col 7: Call Result */}
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
      style={{ width: '100%', maxWidth: 1418, minHeight: 489, margin: '0 auto' }}
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
            src={titleIconSrc || "/call-logs-icon.svg"}
            alt={title || "Call Logs"}
            width={35}
            height={35}
            className="mr-[15px]"
            style={{
              // Approximate tint to #059669
              filter: 'invert(37%) sepia(86%) saturate(871%) hue-rotate(127deg) brightness(93%) contrast(96%)'
            }}
          />
          {title || 'Call Logs'}
        </h2>
        <CallLogsFilterAndActionsForTable
          dateRange={dateRange}
          searchText={searchText}
          onSearchTextChange={(t) => { setSearchText(t); setPage(1); }}
          callResults={callResults}
          onCallResultsChange={(vals) => { setCallResults(vals); setPage(1); }}
          onDateRangeChange={(v) => {
            setDateRange(v);
            setPage(1);
          }}
          totalCount={totalCount}
          allowedCallResults={restrictCallOutcomes}
        />
      </div>

      {/* Table header row */}
      <div className="w-full" style={{ backgroundColor: '#E9ECED', height: 52 }}>
        <div className="flex h-full">
          {/* Col 1: checkbox (72px => ~5.085%) */}
          <div className="flex items-center" style={{ width: '5.085%' }}>
            <div className="ml-[24px]" style={{ width: 23, height: 23 }} />
          </div>
          {/* Col 2: NAME (~20.423%) */}
          <div className="flex items-center" style={{ width: '20.423%' }}>
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
          {/* Col 3: PHONE (~14%) */}
          <div className="flex items-center" style={{ width: '14%' }}>
            <button
              type="button"
              onClick={() => handleSort('phone')}
              className="group flex items-center"
              style={{ fontSize: '14px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}
            >
              PHONE
              <Arrow active={sortKey === 'phone'} dir={sortKey === 'phone' ? sortDir : 'asc'} />
            </button>
          </div>
          {/* Col 4: TYPE (~12%) */}
          <div className="flex items-center" style={{ width: '12%' }}>
            <button
              type="button"
              onClick={() => handleSort('type')}
              className="group flex items-center"
              style={{ fontSize: '14px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}
            >
              TYPE
              <Arrow active={sortKey === 'type'} dir={sortKey === 'type' ? sortDir : 'asc'} />
            </button>
          </div>
          {/* Col 5: DURATION (~13%) */}
          <div className="flex items-center" style={{ width: '13%' }}>
            <button
              type="button"
              onClick={() => handleSort('durationSec')}
              className="group flex items-center"
              style={{ fontSize: '14px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}
            >
              DURATION
              <Arrow active={sortKey === 'durationSec'} dir={sortKey === 'durationSec' ? sortDir : 'asc'} />
            </button>
          </div>
          {/* Col 6: DATE & TIME (~16%) */}
          <div className="flex items-center" style={{ width: '16%' }}>
            <button
              type="button"
              onClick={() => handleSort('dateTimeISO')}
              className="group flex items-center"
              style={{ fontSize: '14px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}
            >
              DATE & TIME
              <Arrow active={sortKey === 'dateTimeISO'} dir={sortKey === 'dateTimeISO' ? sortDir : 'desc'} />
            </button>
          </div>
          {/* Col 7: CALL RESULT (remaining %) */}
          <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 20.423% + 14% + 12% + 13% + 16%))' }}>
            <button
              type="button"
              onClick={() => handleSort('result')}
              className="group flex items-center"
              style={{ fontSize: '14px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}
            >
              CALL RESULT
              <Arrow active={sortKey === 'result'} dir={sortKey === 'result' ? sortDir : 'asc'} />
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
                {/* Col 2: Name */}
                <div className="flex items-center" style={{ width: '20.423%' }}>
                  <div className="h-4 w-56 bg-[#E9ECED] rounded animate-pulse" />
                </div>
                {/* Col 3: Phone */}
                <div className="flex items-center" style={{ width: '14%' }}>
                  <div className="h-5 w-12 bg-[#E9ECED] rounded animate-pulse" />
                </div>
                {/* Col 4: Type */}
                <div className="flex items-center" style={{ width: '12%' }}>
                  <div className="h-5 w-16 bg-[#E9ECED] rounded animate-pulse" />
                </div>
                {/* Col 5: Duration */}
                <div className="flex items-center" style={{ width: '13%' }}>
                  <div className="h-5 w-20 bg-[#E9ECED] rounded animate-pulse" />
                </div>
                {/* Col 6: Date & Time */}
                <div className="flex items-center" style={{ width: '16%' }}>
                  <div className="h-5 w-24 bg-[#E9ECED] rounded animate-pulse" />
                </div>
                {/* Col 7: Call Result */}
                <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 20.423% + 14% + 12% + 13% + 16%))' }}>
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
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-600" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="w-full flex items-center justify-center py-12">
            <div className="flex flex-col items-center" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              <Image src="/placeholder-empty.svg" alt="Empty" width={93} height={84} />
              <h3 className="mt-4 text-[#003333] font-semibold" style={{ fontSize: '19.2px' }}>No Call Logs Found</h3>
              <p className="mt-1 text-[#003333]" style={{ fontSize: '16px' }}>Your recent calls will appear here</p>
              
            </div>
          </div>
        ) : (
          <div className="relative">
            <div style={{ paddingBottom: 96 }}>
             {rows.map((r) => (
               <div
                 key={r.id}
                 className="flex h-[48px] items-center border-b border-[#003333]/10 hover:bg-[#F4F6F6] transition-colors cursor-pointer"
                 onClick={() => onRowClick?.(r)}
               >
                {/* Col 1: row checkbox */}
                <div className="flex items-center" style={{ width: '5.085%' }}>
                  <div className="ml-[24px]" style={{ width: 23, height: 23 }} />
                </div>
                {/* Col 2: Name */}
                <div className="flex items-center" style={{ width: '20.423%' }}>
                  <span style={{ fontSize: '16px', color: '#253053', fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}>{r.name}</span>
                </div>
                {/* Col 3: Phone */}
                <div className="flex items-center" style={{ width: '14%' }}>
                  <span style={{ fontSize: '16px', color: '#003333', fontFamily: 'Open Sans, sans-serif' }}>{r.phone}</span>
                </div>
                {/* Col 4: Type (badge) */}
                <div className="flex items-center" style={{ width: '12%' }}>
                  {(() => {
                    if (r.type === 'Missed Call') {
                      return (
                        <span className="inline-flex items-center" style={{ fontSize: '16px', color: '#FF0000', fontFamily: 'Open Sans, sans-serif' }}>
                          <Image
                            src="/missed-call-icon.svg"
                            alt="Missed Call"
                            width={16}
                            height={16}
                            className="mr-2"
                          />
                          {r.type}
                        </span>
                      );
                    }
                    if (r.type === 'Incoming Call') {
                      return (
                        <span className="inline-flex items-center" style={{ fontSize: '16px', color: '#2563EB', fontFamily: 'Open Sans, sans-serif' }}>
                          <Image
                            src="/incoming-call-arrow.svg"
                            alt="Incoming Call"
                            width={16}
                            height={16}
                            className="mr-2"
                            style={{
                              // approximate blue #2563EB
                              filter: 'invert(31%) sepia(93%) saturate(1742%) hue-rotate(203deg) brightness(93%) contrast(98%)'
                            }}
                          />
                          {r.type}
                        </span>
                      );
                    }
                    // Outgoing Call default (green)
                    return (
                      <span className="inline-flex items-center" style={{ fontSize: '16px', color: '#059669', fontFamily: 'Open Sans, sans-serif' }}>
                        <Image
                          src="/outgoing-call-arrow.svg"
                          alt="Outgoing Call"
                          width={16}
                          height={16}
                          className="mr-2"
                          style={{
                            filter: 'invert(37%) sepia(86%) saturate(871%) hue-rotate(127deg) brightness(93%) contrast(96%)'
                          }}
                        />
                        {r.type}
                      </span>
                    );
                  })()}
                </div>
                {/* Col 5: Duration (badge) */}
                <div className="flex items-center" style={{ width: '13%' }}>
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
                    {formatDuration(r.durationSec)}
                  </span>
                </div>
                {/* Col 6: Date & Time */}
                <div className="flex items-center" style={{ width: '16%' }}>
                  <span style={{ fontSize: '16px', color: '#003333', fontFamily: 'Open Sans, sans-serif' }}>{formatDateTime(r.dateTimeISO)}</span>
                </div>
                {/* Col 7: Call Result (badge) */}
                <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 20.423% + 14% + 12% + 13% + 16%))' }}>
                  {(() => {
                    const key = String(r.result || '').toLowerCase();
                    const colors = CALL_OUTCOME_COLORS[key] || { bg: '#F1F5F9', border: '#CBD5E1', text: '#334155' }; // default slate
                    return (
                      <span
                        className="inline-flex items-center"
                        style={{
                          backgroundColor: colors.bg,
                          border: `0.5px solid ${colors.border}`,
                          borderRadius: 6,
                          padding: '2px 8px',
                          fontSize: '16px',
                          color: colors.text,
                          fontFamily: 'Open Sans, sans-serif',
                        }}
                      >
                        {toTitleCase(r.result) || '—'}
                      </span>
                    );
                  })()}
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

    </section>
  </TooltipProvider>
    )
  );
};

export default CallLogsSection;
