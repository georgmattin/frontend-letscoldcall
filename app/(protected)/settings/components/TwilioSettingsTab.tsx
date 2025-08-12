"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Edit, Trash2 } from "lucide-react";

export type TwilioConfig = {
  id: string;
  friendly_name?: string | null;
  is_default: boolean;
  is_active: boolean;
  phone_number?: string | null;
  created_at: string;
};

type Props = {
  loading: boolean;
  configs: TwilioConfig[];
  onAdd: () => void;
  onSetDefault: (id: string) => void;
  onEdit: (config: TwilioConfig) => void;
  onDelete: (id: string) => void;
};

const TwilioSettingsTab: React.FC<Props> = ({ loading, configs, onAdd, onSetDefault, onEdit, onDelete }) => {
  // Selection and pagination (following contacts-table patterns)
  const rows = useMemo(() =>
    (configs || []).map((c) => ({
      id: c.id,
      name: c.friendly_name ?? "",
      phone: c.phone_number ?? "",
      is_default: !!c.is_default,
      is_active: !!c.is_active,
      created_at: c.created_at,
      raw: c,
    })),
  [configs]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const allSelected = useMemo(() => rows.length > 0 && rows.every((r) => !!selected[r.id]), [rows, selected]);
  const toggleSelectAll = () => {
    setSelected((prev) => {
      if (allSelected) return {};
      const next: Record<string, boolean> = {};
      rows.forEach((r) => { next[r.id] = true; });
      return next;
    });
  };
  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = { ...prev } as Record<string, boolean>;
      if (next[id]) delete next[id]; else next[id] = true;
      return next;
    });
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  return (
    <div className="bg-white rounded-[5px] border p-8" style={{ borderColor: 'rgba(0,51,51,0.1)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#003333' }}>Twilio Configurations</h2>
          <p style={{ color: '#003333' }}>Manage your Twilio phone configurations</p>
        </div>
        <div>
          <Button
            onClick={onAdd}
            className="bg-white border border-[#059669] text-[#059669] rounded-[11px] hover:bg-white hover:text-[#059669] hover:border-[#059669] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Configuration
          </Button>
        </div>
      </div>

      <section
        className="relative bg-white rounded-[10px]"
        style={{ width: "100%", maxWidth: 1418, minHeight: 489, margin: "0 auto" }}
      >
        {/* Header removed per request */}

      {/* Table body */}
      <div className="w-full" style={{ backgroundColor: "#E9ECED", height: 52 }}>
        <div className="flex h-full">
          {/* Checkbox column header (Select All) */}
          <div className="flex items-center" style={{ width: "5.085%" }}>
            <input
              type="checkbox"
              aria-label="Select all"
              className="ml-[24px] h-[18px] w-[18px] cursor-pointer"
              checked={allSelected}
              onChange={toggleSelectAll}
              style={{ accentColor: '#003333' }}
            />
          </div>
          <div className="flex items-center" style={{ width: "40%" }}>
            <span className="text-[#6B7280] text-[12.8px] font-semibold tracking-wide">NAME</span>
          </div>
          {/* TYPE */}
          <div className="flex items-center" style={{ width: 120 }}>
            <span className="text-[#6B7280] text-[12.8px] font-semibold tracking-wide">TYPE</span>
          </div>
          <div className="flex items-center" style={{ width: "calc(100% - (5.085% + 40% + 120px + 190px + 180px))" }}>
            <span className="text-[#6B7280] text-[12.8px] font-semibold tracking-wide">PHONE</span>
          </div>
          {/* ACTIONS */}
          <div className="flex items-center justify-end" style={{ width: 190 }}>
            <span className="text-[#6B7280] text-[12.8px] font-semibold tracking-wide">ACTIONS</span>
          </div>
          <div className="flex items-center" style={{ width: 180 }} />
        </div>
      </div>

      <div className="w-full" style={{ minHeight: pageRows.length === 0 ? 489 - 52 : undefined }}>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading configurations…</div>
        ) : totalCount === 0 ? (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Twilio Configurations</h3>
            <p className="text-gray-600 mb-4">Add your first Twilio configuration to start making calls.</p>
            <Button
              onClick={onAdd}
              className="bg-white border border-[#059669] text-[#059669] rounded-[11px] hover:bg-white hover:text-[#059669] hover:border-[#059669]"
            >
              Add Configuration
            </Button>
          </div>
        ) : (
          <div className="relative w-full" style={{ paddingBottom: 0 }}>
            {pageRows.map((r) => (
              <div
                key={r.id}
                className={`flex h-[48px] items-center border-b border-[#003333]/10 transition-all duration-300 ease-out hover:bg-[#F9FBFB]`}
              >
                {/* Checkbox */}
                <div className="flex items-center" style={{ width: "5.085%" }}>
                  <input
                    type="checkbox"
                    aria-label={`Select config ${r.name || r.phone || r.id}`}
                    className="ml-[24px] h-[18px] w-[18px] cursor-pointer"
                    checked={!!selected[r.id]}
                    onChange={() => toggleRow(r.id)}
                    style={{ accentColor: '#003333' }}
                  />
                </div>
                {/* NAME */}
                <div className="flex items-center" style={{ width: "40%" }}>
                  <span className="text-[#111827] text-[14.4px]">{r.name || "Unnamed Configuration"}</span>
                </div>
                {/* TYPE */}
                <div className="flex items-center" style={{ width: 120 }}>
                  {r.is_default ? (
                    <span className="inline-flex items-center h-[22px] px-2 rounded-full text-[12px] font-medium bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                      Default
                    </span>
                  ) : (
                    <span className="inline-flex items-center h-[22px] px-2 rounded-full text-[12px] font-medium bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                      Secondary
                    </span>
                  )}
                </div>
                {/* PHONE */}
                <div className="flex items-center" style={{ width: "calc(100% - (5.085% + 40% + 120px + 190px + 180px))" }}>
                  <span className="text-[#111827] text-[14.4px]">{r.phone || "—"}</span>
                </div>
                {/* ACTIONS */}
                <div className="flex items-center justify-end gap-2" style={{ width: 190 }}>
                  {/* Edit */}
                  <button
                    type="button"
                    aria-label="Edit configuration"
                    className="group inline-flex items-center justify-center w-[26px] h-[25px] rounded-[6px] border border-[#003333]/10 bg-[#F4F6F6] hover:border-[#059669]"
                    onClick={() => onEdit(r.raw)}
                  >
                    <img
                      src="/edit-icon.svg"
                      alt="Edit"
                      className="h-[14px] w-[14px] transition-colors group-hover:[filter:invert(33%)_sepia(63%)_saturate(729%)_hue-rotate(127deg)_brightness(93%)_contrast(91%)]"
                    />
                  </button>
                  {/* Delete */}
                  <button
                    type="button"
                    aria-label="Delete configuration"
                    className="group inline-flex items-center justify-center w-[26px] h-[25px] rounded-[6px] border border-[#003333]/10 bg-[#F4F6F6] hover:border-[#059669]"
                    onClick={() => onDelete(r.raw.id)}
                  >
                    <img
                      src="/delete-icon.svg"
                      alt="Delete"
                      className="h-[14px] w-[14px] transition-colors group-hover:[filter:invert(33%)_sepia(63%)_saturate(729%)_hue-rotate(127deg)_brightness(93%)_contrast(91%)]"
                    />
                  </button>
                </div>
                {/* Right spacer */}
                <div className="flex items-center" style={{ width: 180 }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div
          className="flex items-center justify-between py-3"
          style={{ marginLeft: "5.085%", width: "calc(100% - 5.085%)", paddingRight: 40, marginTop: 10 }}
        >
          {/* Rows Per Page */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#374151]">Rows Per Page</span>
            <div className="relative">
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-[#E5E7EB] rounded appearance-none pl-2 pr-8 py-1 text-[14px]"
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
          {/* Page controls */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center h-8 px-2 text-sm text-[#374151] mr-2">Page {page} of {totalPages}</div>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center h-8 px-3 rounded border border-[#E5E7EB] text-[#374151] disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPage(num)}
                className={`inline-flex items-center h-8 px-2 rounded border border-[#E5E7EB] ${num === page ? "bg[#E9ECED]" : ""}`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center h-8 px-3 rounded border border-[#E5E7EB] text-[#374151] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
      </section>
    </div>
  );
};

export default TwilioSettingsTab;
