"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getOutcomeColors } from './call-outcome-colors';

// Outcomes considered positive for Leads
const POSITIVE_OUTCOMES = [
  'interested',
  'positive',
  'meeting-scheduled',
  'meeting-booked',
  'sold',
] as const;

export type LeadsRow = {
  id: number;
  name: string;
  phone: string;
  type: 'Incoming Call' | 'Outgoing Call' | 'Missed Call';
  durationSec: number;
  dateTimeISO: string;
  result: string;
};

// Narrow type for Supabase rows
type SupabaseRow = {
  id: number;
  contact_name?: string | null;
  contact_phone?: string | null;
  type?: string | null;
  duration?: number | string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  call_outcome?: string | null;
};

export default function LeadsCallLogsSection({ onRowClick }: { onRowClick?: (row: LeadsRow) => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LeadsRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const formatDateTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true,
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
    return val.replace(/[_\-]+/g, ' ').split(/\s+/).filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) {
        setError('You must be signed in to view leads.');
        setRows([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('call_history')
        .select('id, contact_name, contact_phone, started_at, ended_at, duration, call_outcome, type', { count: 'exact' })
        .in('call_outcome', POSITIVE_OUTCOMES as unknown as string[]);

      // Order by most recent calls first
      query = query.order('started_at', { ascending: false });

      const { data, error: qErr, count } = await query.range(from, to);
      if (qErr) throw qErr;
      setTotalCount(count || 0);

      const pageRows: LeadsRow[] = (data || []).map((ch: SupabaseRow) => {
        const typeRaw = String(ch.type || '').toLowerCase();
        let type: 'Incoming Call' | 'Outgoing Call' | 'Missed Call';
        if (typeRaw === 'incoming_call' || typeRaw === 'incoming') type = 'Incoming Call';
        else if (typeRaw === 'missed_call' || typeRaw === 'missed') type = 'Missed Call';
        else type = 'Outgoing Call';
        const computedDuration = (() => {
          if (typeof ch.duration === 'number') return ch.duration as number;
          const parsed = parseInt((ch.duration as any) ?? '0', 10);
          if (!isNaN(parsed) && parsed > 0) return parsed;
          if (ch.started_at && ch.ended_at) {
            const start = new Date(ch.started_at).getTime();
            const end = new Date(ch.ended_at).getTime();
            if (!isNaN(start) && !isNaN(end) && end >= start) return Math.floor((end - start) / 1000);
          }
          return 0;
        })();
        return {
          id: ch.id as number,
          name: ch.contact_name || 'Unknown',
          phone: ch.contact_phone || '',
          type,
          durationSec: Math.max(0, computedDuration),
          dateTimeISO: ch.started_at || ch.created_at || '',
          result: ch.call_outcome || '',
        };
      });

      setRows(pageRows);
    } catch (e: any) {
      console.error('Failed to load leads:', e);
      setError(e?.message || 'Failed to load leads');
      setRows([]);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <TooltipProvider>
      <section
        className="relative bg-white border border-[#003333]/10 rounded-[10px]"
        style={{ width: '100%', maxWidth: 1418, minHeight: 489, margin: '0 auto' }}
      >
        {/* Header */}
        <div className="w-full flex items-end justify-between" style={{ padding: '44px 72px 29px' }}>
          <h2 className="text-[26px] font-semibold text-[#003333]">Qualified Leads</h2>
          <div className="text-sm text-[#6B7280]">Showing positive call outcomes</div>
        </div>

        {/* Loading skeleton */}
        {(loading && !hasLoaded) ? (
          <>
            <div className="w-full" style={{ backgroundColor: '#E9ECED', height: 52 }} />
            <div className="relative w-full" style={{ paddingBottom: 96 }}>
              {Array.from({ length: pageSize }).map((_, i) => (
                <div key={i} className="flex h-[48px] items-center border-b border-[#003333]/10">
                  <div className="flex items-center" style={{ width: '5.085%' }}>
                    <div className="ml-[24px]" style={{ width: 23, height: 23 }} />
                  </div>
                  <div className="flex items-center" style={{ width: '20.423%' }}>
                    <div className="h-4 w-56 bg-[#E9ECED] rounded animate-pulse" />
                  </div>
                  <div className="flex items-center" style={{ width: '14%' }}>
                    <div className="h-5 w-12 bg-[#E9ECED] rounded animate-pulse" />
                  </div>
                  <div className="flex items-center" style={{ width: '12%' }}>
                    <div className="h-5 w-16 bg-[#E9ECED] rounded animate-pulse" />
                  </div>
                  <div className="flex items-center" style={{ width: '13%' }}>
                    <div className="h-5 w-20 bg-[#E9ECED] rounded animate-pulse" />
                  </div>
                  <div className="flex items-center" style={{ width: '16%' }}>
                    <div className="h-5 w-24 bg-[#E9ECED] rounded animate-pulse" />
                  </div>
                  <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 20.423% + 14% + 12% + 13% + 16%))' }}>
                    <div className="h-4 w-32 bg-[#E9ECED] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-600" style={{ fontFamily: 'Open Sans, sans-serif' }}>
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="w-full flex items-center justify-center py-12">
            <div className="flex flex-col items-center" style={{ fontFamily: 'Open Sans, sans-serif' }}>
              <Image src="/placeholder-empty.svg" alt="Empty" width={93} height={84} />
              <h3 className="mt-4 text-[#003333] font-semibold" style={{ fontSize: '19.2px' }}>No Leads Found</h3>
              <p className="mt-1 text-[#003333]" style={{ fontSize: '16px' }}>Calls with positive outcome will appear here</p>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div style={{ paddingBottom: 96 }}>
              {rows.map((r) => {
                const colors = getOutcomeColors(r.result);
                return (
                  <div
                    key={r.id}
                    className="flex h-[48px] items-center border-b border-[#003333]/10 hover:bg-[#F4F6F6] transition-colors cursor-pointer"
                    onClick={() => onRowClick?.(r)}
                  >
                    {/* spacer */}
                    <div className="flex items-center" style={{ width: '5.085%' }}>
                      <div className="ml-[24px]" style={{ width: 23, height: 23 }} />
                    </div>
                    {/* Name */}
                    <div className="flex items-center" style={{ width: '20.423%' }}>
                      <span style={{ fontSize: '16px', color: '#253053', fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}>{r.name}</span>
                    </div>
                    {/* Phone */}
                    <div className="flex items-center" style={{ width: '14%' }}>
                      <span style={{ fontSize: '16px', color: '#003333', fontFamily: 'Open Sans, sans-serif' }}>{r.phone}</span>
                    </div>
                    {/* Type */}
                    <div className="flex items-center" style={{ width: '12%' }}>
                      {(() => {
                        if (r.type === 'Missed Call') {
                          return (
                            <span className="inline-flex items-center" style={{ fontSize: '16px', color: '#FF0000', fontFamily: 'Open Sans, sans-serif' }}>
                              <Image src="/missed-call-icon.svg" alt="Missed Call" width={16} height={16} className="mr-2" />
                              {r.type}
                            </span>
                          );
                        }
                        if (r.type === 'Incoming Call') {
                          return (
                            <span className="inline-flex items-center" style={{ fontSize: '16px', color: '#2563EB', fontFamily: 'Open Sans, sans-serif' }}>
                              <Image src="/incoming-call-arrow.svg" alt="Incoming Call" width={16} height={16} className="mr-2" />
                              {r.type}
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center" style={{ fontSize: '16px', color: '#059669', fontFamily: 'Open Sans, sans-serif' }}>
                            <Image src="/outgoing-call-arrow.svg" alt="Outgoing Call" width={16} height={16} className="mr-2" />
                            {r.type}
                          </span>
                        );
                      })()}
                    </div>
                    {/* Duration */}
                    <div className="flex items-center" style={{ width: '13%' }}>
                      <span className="inline-flex items-center" style={{ backgroundColor: '#F4F6F6', border: '0.5px solid rgba(0,51,51,0.1)', borderRadius: 6, padding: '2px 8px', fontSize: '16px', color: '#003333', fontFamily: 'Open Sans, sans-serif' }}>
                        {formatDuration(r.durationSec)}
                      </span>
                    </div>
                    {/* Date & Time */}
                    <div className="flex items-center" style={{ width: '16%' }}>
                      <span style={{ fontSize: '16px', color: '#003333', fontFamily: 'Open Sans, sans-serif' }}>{formatDateTime(r.dateTimeISO)}</span>
                    </div>
                    {/* Result badge */}
                    <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 20.423% + 14% + 12% + 13% + 16%))' }}>
                      <span className="inline-flex items-center" style={{ backgroundColor: colors.bg, border: `0.5px solid ${colors.border}`, borderRadius: 6, padding: '2px 8px', fontSize: '16px', color: colors.text, fontFamily: 'Open Sans, sans-serif' }}>
                        {toTitleCase(r.result) || '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between py-3" style={{ fontFamily: 'Open Sans, sans-serif', position: 'absolute', bottom: 32, marginLeft: '5.085%', width: 'calc(100% - 5.085%)', paddingRight: 40 }}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#6B7280]">Rows Per Page</span>
                <div className="relative">
                  <select aria-label="Rows per page" value={pageSize} onChange={(e) => { const v = parseInt(e.target.value, 10); setPageSize(v); setPage(1); }} className="border border-[#003333]/20 rounded appearance-none pl-2 pr-8 py-1 text-[#003333] bg-white focus:outline-none" style={{ fontSize: '14px' }}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-[#6B7280] mr-2">Page {page} of {totalPages}</div>
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex items-center h-8 px-3 rounded border border-[#003333]/20 text-sm text-[#6B7280] hover:text-[#003333] hover:border-[#003333] disabled:text-[#9CA3AF] disabled:border-[#D1D5DB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">Previous</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button key={num} type="button" onClick={() => setPage(num)} className={`inline-flex items-center h-8 px-2 rounded border text-sm transition-colors ${num === page ? 'border-[#003333] bg-white text-[#003333] font-bold' : 'border-[#003333]/20 text-[#6B7280] hover:text-[#003333] hover:border-[#003333]'}`}>
                    {num}
                  </button>
                ))}
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="inline-flex items-center h-8 px-3 rounded border border-[#003333]/20 text-sm text-[#6B7280] hover:text-[#003333] hover:border-[#003333] disabled:text-[#9CA3AF] disabled:border-[#D1D5DB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors">Next</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </TooltipProvider>
  );
}
