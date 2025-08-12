'use client';

import React, { useRef, useState, useEffect } from 'react';
import CallButton from './CallButton';
import SecondaryButtonWithPlus from './secondary-button-with-plus';
import { createClient as createSupabaseClient } from '../../../utils/supabase/client';
import CreateAContactListPopup from './create-a-contact-list-popup';
import { useRouter } from 'next/navigation';

const StartCallingSection: React.FC = () => {
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  type ListSummary = {
    listId?: number;
    name?: string;
    total: number;
    called: number;
    listCount: number;
    loaded: boolean;
  };
  const [summary, setSummary] = useState<ListSummary>({ total: 0, called: 0, listCount: 0, loaded: false });
  const [selected, setSelected] = useState<{ id?: number; name?: string } | null>(null);
  const [lists, setLists] = useState<Array<{ id: number; name: string; total: number; called: number }>>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Close dropdown on outside click or ESC
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rowRef.current) return;
      if (!rowRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Load contact list data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createSupabaseClient();
        const { data: userResp } = await supabase.auth.getUser();
        const user = userResp?.user;
        if (!user) {
          setSummary((s) => ({ ...s, loaded: true }));
          return;
        }

        const { data: listsRaw, count: listsCount, error: listErr } = await supabase
          .from('contact_lists')
          .select('id,name,created_at', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (listErr) {
          setSummary({ total: 0, called: 0, listCount: 0, loaded: true });
          setLists([]);
          return;
        }

        if (!listsRaw || listsRaw.length === 0) {
          setSummary({ total: 0, called: 0, listCount: listsCount ?? 0, loaded: true });
          setLists([]);
          return;
        }

        const counts = await Promise.all(
          listsRaw.map(async (l: { id: number; name: string }) => {
            const [{ count: totalCount }, { count: calledCount }] = await Promise.all([
              supabase
                .from('contacts')
                .select('id', { count: 'exact', head: true })
                .eq('contact_list_id', l.id),
              supabase
                .from('contacts')
                .select('id', { count: 'exact', head: true })
                .eq('contact_list_id', l.id)
                .neq('status', 'not_called'),
            ]);
            return { id: l.id, name: l.name, total: totalCount ?? 0, called: calledCount ?? 0 };
          })
        );

        setLists(counts);
        setSummary({ total: 0, called: 0, listCount: listsCount ?? counts.length, loaded: true });
        // Default select the first list (most recent by created_at desc)
        setSelected({ id: counts[0].id, name: counts[0].name });
      } catch {
        setSummary({ total: 0, called: 0, listCount: 0, loaded: true });
      }
    };
    loadData();
  }, []);

  return (
    <section
      className="bg-white border border-[#0033331a] rounded-[10px]"
      style={{ width: 812, padding: '30px 40px' }}
    >
      <h2
        className="text-[#003333] font-bold"
        style={{ fontSize: '33.81px', fontFamily: 'Open Sans, sans-serif' }}
      >
        Start Calling
      </h2>

      {/* Full-bleed separator that spans over the 40px horizontal padding */}
      <div className="-mx-[40px] mt-[20px] h-px bg-[#0033331a]" />

      {/* Input + Button row */}
      <div className="mt-[20px] flex items-center gap-4" ref={rowRef}>
        {/* Dropdown input */}
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="group w-full text-left border border-[#0033331a] rounded-[16px] h-[54px] pl-4 pr-12 flex items-center justify-between text-[#003333] hover:text-[#059669]"
            style={{ fontSize: '19.2px', fontFamily: 'Open Sans, sans-serif' }}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="truncate">{selected?.name ?? 'Select Contact List'}</span>
            {/* Chevron */}
            <svg
              className={`absolute right-4 transition-transform ${open ? 'rotate-180' : ''}`}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Dropdown panel */}
          {open && (
            <div
              className="absolute left-0 w-full border border-[#0033331a] rounded-[16px] bg-white overflow-hidden"
              style={{ marginTop: '11px' }}
              role="listbox"
            >
              {!summary.loaded ? (
                <div className="p-[25px] h-full flex items-center justify-between">
                  <span style={{ fontSize: '16px', color: '#C1C1C1', fontFamily: 'Open Sans, sans-serif' }}>
                    Loading…
                  </span>
                </div>
              ) : summary.listCount > 0 ? (
                <div className="p-[25px]">
                  <div
                    style={{
                      maxHeight: `${Math.min(summary.listCount, 5) * 54}px`,
                      overflowY: summary.listCount > 5 ? 'auto' as const : 'visible' as const,
                    }}
                  >
                    {lists.map((l) => (
                      <div
                        key={l.id}
                        role="option"
                        aria-selected={selected?.id === l.id}
                        tabIndex={0}
                        onClick={() => {
                          setSelected({ id: l.id, name: l.name });
                          setOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelected({ id: l.id, name: l.name });
                            setOpen(false);
                          }
                        }}
                        className={`flex items-center justify-between h-[54px] rounded-[12px] px-3 transition-colors cursor-pointer outline-none ${
                          selected?.id === l.id ? 'bg-[#F4F6F6]' : 'hover:bg-[#F4F6F6] focus:bg-[#F4F6F6]'
                        }`}
                      >
                        <span
                          style={{
                            fontSize: '19.2px',
                            color: '#003333',
                            fontFamily: 'Open Sans, sans-serif',
                            fontWeight: 600,
                          }}
                        >
                          {l.name}
                        </span>
                        <span
                          className="inline-flex items-center"
                          style={{
                            backgroundColor: '#F4F6F6',
                            borderStyle: 'solid',
                            borderColor: '#0033331a',
                            borderWidth: '0.5px',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '19.2px',
                            color: '#003333',
                            fontFamily: 'Open Sans, sans-serif',
                          }}
                        >
                          <strong style={{ fontWeight: 700 }}>{l.called}</strong>
                          <span>/{l.total}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-[20px]">
                    <span
                      style={{
                        fontSize: '14px',
                        color: '#C1C1C1',
                        fontFamily: 'Open Sans, sans-serif',
                      }}
                    >
                      Showing {Math.min(lists.length, 5)} of {summary.listCount} lists
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-[25px] h-full flex items-center justify-between">
                  <span style={{ fontSize: '16px', color: '#C1C1C1', fontFamily: 'Open Sans, sans-serif' }}>
                    No Contact Lists
                  </span>
                  <SecondaryButtonWithPlus onClick={() => setCreateOpen(true)} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0">
          <CallButton
            disabled={!selected?.id}
            isLoading={isStarting}
            onClick={() => {
              if (!selected?.id || isStarting) return;
              setIsStarting(true);
              // Navigate to the protected calling page with selected listId
              const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              router.push(`/calling?sessionId=${sessionId}&listId=${selected.id}`);
            }}
          />
        </div>
      </div>
      {/* Create Contact List Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" />
          <div className="relative z-10 mx-4">
            <CreateAContactListPopup
              onCreated={(newList) => {
                // Insert new list at the top and select it
                setLists((prev) => [{ id: newList.id, name: newList.name, total: 0, called: 0 }, ...prev]);
                setSummary((s) => ({ ...s, listCount: (s.listCount ?? 0) + 1, loaded: true }));
                setSelected({ id: newList.id, name: newList.name });
                // Close dropdown if open
                // Do not close the popup here; it will stay open until navigation occurs
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default StartCallingSection;
