"use client"
import React from "react"
import { createClient } from '@/utils/supabase/client'
import SearchFilter from "./search-filter"
import CallResultDropdown from "./call-result-dropdown"
import CallDateDropdownFilter from "./call-date-dropdown-filter"
import ExportButton from "./export-button"
import ExportCallResultsPopup from "./export-call-results-popup"

interface DateRangeValue {
  from?: string;
  to?: string;
}

interface Props {
  className?: string;
  dateRange?: DateRangeValue;
  onDateRangeChange?: (value: DateRangeValue) => void;
  searchText?: string;
  onSearchTextChange?: (val: string) => void;
  callResults?: string[];
  onCallResultsChange?: (values: string[]) => void;
  totalCount?: number;
  // Optional: limit which call result badges appear in the dropdown
  allowedCallResults?: string[];
}

export default function CallLogsFilterAndActionsForTable({ className, dateRange, onDateRangeChange, searchText, onSearchTextChange, callResults, onCallResultsChange, totalCount, allowedCallResults }: Props) {
  const [isExportOpen, setIsExportOpen] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)

  type FieldKey =
    | "name"
    | "phone"
    | "type"
    | "duration"
    | "datetime"
    | "result"
    | "notes"
    | "ai_transcription"
    | "ai_summary"
    | "ai_suggestions";

  const formatDuration = (secs?: number | null) => {
    const s = Math.max(0, Math.floor(Number(secs || 0)));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true,
      }).format(d);
    } catch {
      return iso ?? '';
    }
  };

  const escapeCSV = (val: any) => {
    const s = (val ?? '').toString();
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const buildCSV = (rows: any[], fields: FieldKey[]) => {
    const headers = fields.map((f) => {
      switch (f) {
        case 'name': return 'Name';
        case 'phone': return 'Phone';
        case 'type': return 'Type';
        case 'duration': return 'Duration';
        case 'datetime': return 'Date And Time';
        case 'result': return 'Result';
        case 'notes': return 'Notes';
        case 'ai_transcription': return 'AI Transcription';
        case 'ai_summary': return 'AI Summary';
        case 'ai_suggestions': return 'AI Suggestions';
      }
    });
    const lines = [headers.join(',')];
    for (const r of rows) {
      const values = fields.map((f) => {
        switch (f) {
          case 'name': return escapeCSV(r.contact_name);
          case 'phone': return escapeCSV(r.contact_phone);
          case 'type': return escapeCSV('Outgoing');
          case 'duration': return escapeCSV(formatDuration(r.duration));
          case 'datetime': return escapeCSV(formatDateTime(r.started_at || r.created_at));
          case 'result': return escapeCSV(r.call_outcome || r.outcome || '');
          case 'notes': return escapeCSV(r.notes);
          case 'ai_transcription': return escapeCSV(r.transcription);
          case 'ai_summary': return escapeCSV(r.ai_summary);
          case 'ai_suggestions': return escapeCSV(
            typeof r.ai_suggestions === 'object' && r.ai_suggestions !== null
              ? JSON.stringify(r.ai_suggestions)
              : r.ai_suggestions
          );
        }
      });
      lines.push(values.join(','));
    }
    return lines.join('\r\n');
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (fields: FieldKey[]) => {
    if (exporting) return;
    setExporting(true);
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error('Not signed in');

      // Build query matching current filters (no pagination)
      let query = supabase
        .from('call_history')
        .select('id, user_id, contact_name, contact_phone, duration, started_at, created_at, call_outcome, notes, transcription, ai_summary, ai_suggestions');

      // Restrict to current user (RLS-safe)
      query = query.eq('user_id', userId);

      if (dateRange?.from) {
        query = query.gte('started_at', `${dateRange.from}T00:00:00.000Z`);
      }
      if (dateRange?.to) {
        const [y, m, d] = dateRange.to.split('-').map((v) => parseInt(v, 10));
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          const next = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0));
          query = query.lt('started_at', next.toISOString());
        } else {
          query = query.lte('started_at', `${dateRange.to}T23:59:59.999Z`);
        }
      }

      const sanitizedSearch = (searchText || '')
        .trim()
        .replace(/[%,()]/g, ' ')
        .replace(/\s+/g, ' ');
      if (sanitizedSearch) {
        const safeTerm = sanitizedSearch.replace(/\*/g, '');
        const pattern = `*${safeTerm}*`;
        const orParts: string[] = [
          'contact_name', 'contact_phone', 'contact_company', 'contact_position', 'contact_email', 'contact_location',
          'call_sid', 'call_outcome', 'notes', 'ai_summary', 'contact_website', 'transcription',
        ].map((col) => `${col}.ilike.${pattern}`);
        const digitsOnly = sanitizedSearch.replace(/\D/g, '');
        if (digitsOnly.length >= 3) {
          const interleaved = `*${digitsOnly.split('').join('*')}*`;
          orParts.push(`contact_phone.ilike.${interleaved}`);
        }
        query = query.or(orParts.join(','));
      }

      if (callResults && callResults.length > 0) {
        const expanded = new Set<string>();
        for (const v of callResults) {
          expanded.add(v);
          if (v === 'callback') expanded.add('callback-later');
          if (v === 'meeting-scheduled') expanded.add('meeting-booked');
        }
        query = query.in('call_outcome', Array.from(expanded));
      }

      // Order by most recent
      query = query.order('started_at', { ascending: false });

      const { data } = await query.throwOnError();
      const rows = data || [];
      if (!rows.length) {
        alert('No call logs match the current filters to export.');
        return;
      }

      const csv = buildCSV(rows, fields);
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const parts: string[] = [`call-logs-${yyyy}-${mm}-${dd}`];
      if (searchText) parts.push(`search-${searchText.replace(/\s+/g, '-')}`);
      if (callResults && callResults.length) parts.push(`results-${callResults.join('_')}`);
      if (dateRange?.from || dateRange?.to) parts.push('daterange');
      const filename = parts.join('-') + '.csv';
      downloadFile(csv, filename);
    } catch (e) {
      const err: any = e;
      const message = err?.message || err?.error_description || err?.hint || err?.details || (typeof err === 'string' ? err : 'Unknown error');
      try {
        console.error('Export failed:', message, err);
      } catch {
        console.error('Export failed');
      }
      alert(`Failed to export call logs. ${message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={["flex items-center gap-3", className].filter(Boolean).join(" ")}> 
      {/* Count label to the left of the search input */}
      <div className="mr-1" style={{ fontFamily: 'Open Sans, sans-serif' }}>
        <span className="text-[#003333] font-semibold">{typeof totalCount === 'number' ? totalCount : 0}</span>
        <span className="text-[#003333]"> {" "}Call Logs Found</span>
      </div>
      <SearchFilter value={searchText} onChange={onSearchTextChange} placeholder="Search call logs" />
      <CallResultDropdown value={callResults} onChange={onCallResultsChange} allowedValues={allowedCallResults} />
      <CallDateDropdownFilter value={dateRange} onChange={onDateRangeChange} />
      <ExportButton onClick={() => setIsExportOpen(true)} />

      {/* Modal for Export Call Results */}
      <ExportCallResultsPopup
        modal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={async (selected) => {
          await handleExport(selected as FieldKey[])
        }}
      />
    </div>
  )
}
