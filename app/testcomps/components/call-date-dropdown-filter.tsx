"use client"
import React from "react";

interface DateRangeValue {
  from?: string; // ISO date string YYYY-MM-DD
  to?: string;   // ISO date string YYYY-MM-DD
}

interface CallDateDropdownFilterProps {
  value?: DateRangeValue;
  onChange?: (value: DateRangeValue) => void;
}

function formatDisplay(d?: string) {
  if (!d) return "";
  // Expecting ISO YYYY-MM-DD -> DD/MM/YY
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(d);
  if (!m) return d;
  const [_, y, mo, da] = m;
  return `${da}/${mo}/${y.slice(2)}`;
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CallDateDropdownFilter({ value, onChange }: CallDateDropdownFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [from, setFrom] = React.useState<string>(value?.from || "");
  const [to, setTo] = React.useState<string>(value?.to || "");
  const [selectedPreset, setSelectedPreset] = React.useState<"" | "last24h" | "last7d" | "last30d" | "custom">("");
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setFrom(value?.from || "");
    setTo(value?.to || "");
  }, [value?.from, value?.to]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const hasRange = Boolean(from || to);
  const label = from && to
    ? `${formatDisplay(from)} - ${formatDisplay(to)}`
    : "Filter by date range ...";

  const apply = () => {
    if (selectedPreset && selectedPreset !== "custom") {
      const now = new Date();
      const toDate = toISODate(now);
      let fromDate = toDate;
      const d = new Date(now);
      if (selectedPreset === "last24h") {
        d.setDate(d.getDate() - 1);
      } else if (selectedPreset === "last7d") {
        d.setDate(d.getDate() - 7);
      } else if (selectedPreset === "last30d") {
        d.setDate(d.getDate() - 30);
      }
      fromDate = toISODate(d);
      onChange?.({ from: fromDate, to: toDate });
      setFrom(fromDate);
      setTo(toDate);
      setOpen(false);
      return;
    }
    // custom
    onChange?.({ from: from || undefined, to: to || undefined });
    setOpen(false);
  };

  const reset = () => {
    setFrom("");
    setTo("");
    setSelectedPreset("");
    onChange?.({});
  };

  return (
    <div ref={ref} className="relative w-[249px]">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-[249px] h-[37px] bg-white rounded-[6px] border border-[rgba(0,51,51,0.1)] hover:border-[#003333] transition-colors text-[13px] text-[#253053] px-2 flex items-center justify-between"
      >
        <span className="flex items-center gap-2 min-w-0">
          <img src="/filter-icon.svg" alt="" aria-hidden="true" className="w-4 h-4 shrink-0" />
          <span className="truncate text-[16px]">{label}</span>
        </span>
        <svg aria-hidden="true" className="ml-2 h-4 w-4 text-[#253053]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.354a.75.75 0 111.02 1.1l-4.22 3.814a.75.75 0 01-1.02 0L5.21 8.33a.75.75 0 01.02-1.12z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute z-50 mt-1 w-[249px] rounded-[6px] border border-[rgba(0,51,51,0.1)] bg-white shadow-sm p-3">
          <div className="flex flex-col gap-3">
            {(hasRange || selectedPreset) && (
              <button
                type="button"
                onClick={reset}
                className="self-start text-[12px] font-bold text-[#FF0000] hover:underline"
              >
                Reset filters
              </button>
            )}

            {/* Presets (hidden when custom selected) */}
            {selectedPreset !== "custom" && (
              <div className="flex flex-col gap-2">
                {[
                  { key: "last24h", label: "Last 24 hours" },
                  { key: "last7d", label: "Last 7 days" },
                  { key: "last30d", label: "Last 30 days" },
                  { key: "custom", label: "Custom range" },
                ].map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setSelectedPreset(p.key as any)}
                    className={`w-full inline-flex items-center h-[24px] text-left px-3 rounded-[6px] border-[0.5px] bg-[#F4F6F6] ${selectedPreset === p.key ? "border-[#003333]" : "border-[rgba(0,51,51,0.1)] hover:border-[#003333]"} text-[16px] text-[#0B3333] transition-colors`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Custom range inputs */}
            {selectedPreset === "custom" && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-[#0B3333] text-[13px]">From</span>
                  <div className="relative">
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      placeholder="DD/MM/YY"
                      className="w-full h-[32px] pl-2 pr-2 bg-[#F4F6F6] rounded-[6px] border-[0.5px] border-[rgba(0,51,51,0.1)] text-[16px] text-[#0B3333] focus:outline-none focus:ring-2 focus:ring-[#0D8BFF]/30"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[#0B3333] text-[13px]">To</span>
                  <div className="relative">
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      placeholder="DD/MM/YY"
                      className="w-full h-[32px] pl-2 pr-2 bg-[#F4F6F6] rounded-[6px] border-[0.5px] border-[rgba(0,51,51,0.1)] text-[16px] text-[#0B3333] focus:outline-none focus:ring-2 focus:ring-[#0D8BFF]/30"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={apply}
                disabled={selectedPreset === "custom" ? !from || !to : !selectedPreset}
                className={`inline-flex items-center justify-center h-[32px] px-4 rounded-[11px] text-[14px] font-medium ${selectedPreset === "custom" ? (!from || !to ? "bg-[#D1D5DB] text-[#6B7280] cursor-not-allowed" : "bg-[#059669] text-white hover:opacity-90") : (!selectedPreset ? "bg-[#D1D5DB] text-[#6B7280] cursor-not-allowed" : "bg-[#059669] text-white hover:opacity-90")}`}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
