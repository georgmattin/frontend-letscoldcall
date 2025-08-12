"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import SecondaryButtonWithPlus from './secondary-button-with-plus';
import CreateAScriptPopup from './create-a-script-popup';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const CallScriptsTable: React.FC = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{ id: number; name: string; created_at: string; connectedTo?: string | null; connectedToId?: number | null; connectedToExtra?: number; connectedToExtraNames?: string[] }>>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10); // user selectable: 5, 10, 15
  const [totalCount, setTotalCount] = useState(0);
  const [sortKey, setSortKey] = useState<'created_at' | 'name'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  // Track if we have completed the first load to control skeleton visibility
  const [hasLoaded, setHasLoaded] = useState(false);
  const router = useRouter();

  const goToScript = (id: number) => {
    if (!id) return;
    router.push(`/scripts/edit-script/${id}`);
  };
  const goToContactList = (id?: number | null) => {
    if (!id) return;
    // Navigate to dynamic contact list page
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

      // Fetch scripts; sorting by name or created_at
      let query = supabase
        .from('scripts')
        .select('id, name, created_at, linked_lists', { count: 'exact' })
        .eq('user_id', userId);

      if (sortKey === 'name') {
        query = query.order('name', { ascending: sortDir === 'asc' });
      } else {
        query = query.order('created_at', { ascending: sortDir === 'asc' });
      }

      const { data: scripts, error: scriptsErr, count } = await query.range(from, to);
      if (scriptsErr) throw scriptsErr;

      setTotalCount(count || 0);

      // Collect unique contact_list ids from linked_lists arrays
      const allIds = new Set<number>();
      (scripts || []).forEach((s: any) => {
        const arr = (s.linked_lists || []) as number[];
        arr?.forEach((id) => {
          if (typeof id === 'number') allIds.add(id);
          if (typeof id === 'string') {
            const n = parseInt(id as any, 10);
            if (!Number.isNaN(n)) allIds.add(n);
          }
        });
      });

      // Fetch names for those lists
      let listNameMap: Record<number, string> = {};
      if (allIds.size > 0) {
        const ids = Array.from(allIds.values());
        const { data: listsNames, error: namesErr } = await supabase
          .from('contact_lists')
          .select('id, name')
          .in('id', ids)
          .eq('user_id', userId);
        if (namesErr) throw namesErr;
        (listsNames || []).forEach((row: any) => {
          const nid = typeof row.id === 'string' ? parseInt(row.id, 10) : row.id;
          if (!Number.isNaN(nid)) listNameMap[nid] = row.name as string;
        });
      }

      const pageRows = (scripts || []).map((s: any) => {
        const firstLinkedId = Array.isArray(s.linked_lists) && s.linked_lists.length > 0 ? s.linked_lists[0] : null;
        const firstIdNum = typeof firstLinkedId === 'string' ? parseInt(firstLinkedId, 10) : firstLinkedId;
        let connectedTo: string | null = null;
        if (firstIdNum != null) {
          const name = listNameMap[firstIdNum];
          if (name) connectedTo = name;
          else {
            // If we have an ID but no name (likely due to RLS or type mismatch), show ID as fallback and log for debugging
            connectedTo = `List #${firstIdNum}`;
            try { console.warn('[CallScriptsTable] Linked list id has no resolved name', { scriptId: s.id, firstIdNum, listNameMapKeys: Object.keys(listNameMap) }); } catch {}
          }
        }
        const extraCount = Array.isArray(s.linked_lists) && s.linked_lists.length > 1 ? (s.linked_lists.length - 1) : 0;
        const extraIdsRaw = Array.isArray(s.linked_lists) ? s.linked_lists.slice(1) : [];
        const extraIdsNums = extraIdsRaw.map((x: any) => (typeof x === 'string' ? parseInt(x, 10) : x)).filter((n: any) => typeof n === 'number' && !Number.isNaN(n));
        const extraNames: string[] = extraIdsNums.map((n: number) => listNameMap[n] ?? `List #${n}`);
        return {
          id: s.id as number,
          name: s.name as string,
          created_at: s.created_at as string,
          connectedTo,
          connectedToId: (typeof firstIdNum === 'number' ? firstIdNum : (Number.isFinite(firstIdNum) ? Number(firstIdNum) : null)) as number | null,
          connectedToExtra: extraCount,
          connectedToExtraNames: extraNames,
        };
      });

      setRows(pageRows);
    } catch (e: any) {
      console.error('Failed to load scripts:', e);
      setError(e?.message || 'Failed to load scripts');
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

  const handleSort = (key: 'created_at' | 'name') => {
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

  const handleCreated = (created?: { id: number; name: string }) => {
    // Close modal immediately
    setCreateOpen(false);
    if (created?.id) {
      // Go straight to edit page for the new script
      router.push(`/scripts/edit-script/${created.id}`);
      return;
    }
    // Fallback: After creation, show newest first and reload list
    setPage(1);
    setSortKey('created_at');
    setSortDir('desc');
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
              {/* Col 2: NAME */}
              <div className="flex items-center" style={{ width: '35%' }}>
                <div className="h-4 w-56 bg-[#E9ECED] rounded animate-pulse" />
              </div>
              {/* Col 3: CONNECTED TO */}
              <div className="flex items-center" style={{ width: '35%' }}>
                <div className="h-5 w-40 bg-[#E9ECED] rounded animate-pulse" />
              </div>
              {/* Col 4: DATE CREATED */}
              <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 35% + 35%))' }}>
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
            src="/scripts-icon.svg"
            alt="Scripts"
            width={30}
            height={30}
            className="mr-[15px]"
            style={{
              // Approximate tint to #059669
              filter: 'invert(37%) sepia(86%) saturate(871%) hue-rotate(127deg) brightness(93%) contrast(96%)'
            }}
          />
          Scripts
        </h2>
        <div className="flex items-end">
          <SecondaryButtonWithPlus onClick={() => setCreateOpen(true)} label="Create A New Script" />
        </div>
      </div>

      {/* Table header row */}
      <div className="w-full" style={{ backgroundColor: '#E9ECED', height: 52 }}>
        <div className="flex h-full">
          {/* Col 1: checkbox (72px => ~5.085%) */}
          <div className="flex items-center" style={{ width: '5.085%' }}>
            <div className="ml-[24px]" style={{ width: 23, height: 23 }} />
          </div>
          {/* Col 2: NAME */}
          <div className="flex items-center" style={{ width: '35%' }}>
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
          {/* Col 3: CONNECTED TO */}
          <div className="flex items-center" style={{ width: '35%' }}>
            <span
              className="group flex items-center"
              style={{ fontSize: '14px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 700 }}
            >
              CONNECTED TO
            </span>
          </div>
          {/* Col 4: DATE CREATED (remaining %) */}
          <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 35% + 35%))' }}>
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
                <div className="flex items-center" style={{ width: '35%' }}>
                  <div className="h-4 w-56 bg-[#E9ECED] rounded animate-pulse" />
                </div>
                {/* Col 3: CONNECTED TO */}
                <div className="flex items-center" style={{ width: '35%' }}>
                  <div className="h-5 w-40 bg-[#E9ECED] rounded animate-pulse" />
                </div>
                {/* Col 4: date created */}
                <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 35% + 35%))' }}>
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
              <h3 className="mt-4 text-[#003333] font-semibold" style={{ fontSize: '19.2px' }}>No Scripts Found</h3>
              <p className="mt-1 text-[#003333]" style={{ fontSize: '16px' }}>Start by creating a new script</p>
              <div className="mt-4">
                <SecondaryButtonWithPlus onClick={() => setCreateOpen(true)} label="Create A New Script" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Data rows */}
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex h-[48px] items-center border-b border-[#003333]/10 cursor-pointer hover:bg-gray-50"
                onClick={() => goToScript(r.id)}
              >
                {/* Col 1: left spacer */}
                <div className="flex items-center" style={{ width: '5.085%' }}>
                  <div className="ml-[24px]" style={{ width: 23, height: 23 }} />
                </div>
                {/* Col 2: NAME */}
                <div className="flex items-center" style={{ width: '35%' }}>
                  <span
                    className="text-left hover:underline"
                    style={{ fontSize: '16px', color: '#003333', fontFamily: 'Open Sans, sans-serif', fontWeight: 600 }}
                  >
                    {r.name}
                  </span>
                </div>
                {/* Col 3: CONNECTED TO */}
                <div className="flex items-center" style={{ width: '35%' }}>
                  {r.connectedTo ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); goToContactList(r.connectedToId ?? null); }}
                        className="inline-flex items-center hover:underline"
                        style={{
                          backgroundColor: '#F4F6F6',
                          border: '0.5px solid rgba(0,51,51,0.1)',
                          borderRadius: 6,
                          padding: '2px 8px',
                          fontSize: '16px',
                          color: '#003333',
                          fontFamily: 'Open Sans, sans-serif',
                        }}
                        aria-label={`Open contact list ${r.connectedTo}`}
                      >
                        {r.connectedTo}
                      </button>
                      {(r.connectedToExtra ?? 0) > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="inline-flex items-center cursor-default"
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
                              +{r.connectedToExtra}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start">
                            <div style={{ maxWidth: 280 }}>
                              <div style={{ fontWeight: 700, marginBottom: 4 }}>Also connected to:</div>
                              <ul style={{ listStyle: 'disc', paddingLeft: 16 }}>
                                {(r.connectedToExtraNames ?? []).map((nm, idx) => (
                                  <li key={idx}>{nm}</li>
                                ))}
                              </ul>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  ) : (
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
                      —
                    </span>
                  )}
                </div>
                {/* Col 4: DATE CREATED */}
                <div className="flex items-center" style={{ width: 'calc(100% - (5.085% + 35% + 35%))' }}>
                  <span style={{ fontSize: '16px', color: '#003333', fontFamily: 'Open Sans, sans-serif' }}>{formatDate(r.created_at)}</span>
                </div>
              </div>
            ))}

            {/* Pagination */}
            <div
              className="flex items-center justify-between py-3"
              style={{ marginLeft: '5.085%', width: 'calc(100% - 5.085%)', paddingRight: 40 }}
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
          </>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="relative z-10 mx-4">
            <CreateAScriptPopup onCreated={(s) => handleCreated(s)} />
          </div>
        </div>
      )}
    </section>
  </TooltipProvider>
    )
  );
};

export default CallScriptsTable;
