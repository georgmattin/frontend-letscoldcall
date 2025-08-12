"use client"
import React from "react";

interface CallResultDropdownProps {
  value?: string[];
  onChange?: (values: string[]) => void;
  // Optional list of allowed option values to display
  allowedValues?: string[];
}

const options = [
  { value: "interested", label: "Interested" },
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
  { value: "not-interested", label: "Not Interested" },
  { value: "callback", label: "Callback Later" },            // alias of "callback-later"
  { value: "callback_scheduled", label: "Callback Scheduled" },
  { value: "meeting-scheduled", label: "Meeting Booked" },   // alias of "meeting-booked"
  { value: "no-answer", label: "No Answer" },
  { value: "busy", label: "Busy" },
  { value: "gatekeeper", label: "Gatekeeper" },
  { value: "left-voicemail", label: "Left Voicemail" },
  { value: "wrong-number", label: "Wrong Number" },
  { value: "not-available", label: "Not Available" },
  { value: "sold", label: "Sold" },
  { value: "do-not-call", label: "Do Not Call" },
  { value: "skipped", label: "Skipped" },
];

export default function CallResultDropdown({ value, onChange, allowedValues }: CallResultDropdownProps) {
  const [internalValue, setInternalValue] = React.useState<string[]>(value ?? []);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const visibleOptions = React.useMemo(() => {
    if (!allowedValues || allowedValues.length === 0) return options;
    const allow = new Set(allowedValues.map(String));
    return options.filter(o => allow.has(o.value));
  }, [allowedValues]);

  const handleToggle = (val: string) => {
    setInternalValue(prev => {
      const exists = prev.includes(val);
      const next = exists ? prev.filter(v => v !== val) : [...prev, val];
      onChange?.(next);
      return next;
    });
  };

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Keep internal state in sync with external value
  React.useEffect(() => {
    setInternalValue(value ?? []);
  }, [value]);

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
          {internalValue.length === 1 ? (
            <span className="inline-flex items-center h-[24px] px-3 rounded-[6px] bg-[#F4F6F6] border-[0.5px] border-[rgba(0,51,51,0.1)] text-[16px] font-normal text-[#0B3333]">
              {visibleOptions.find(o => o.value === internalValue[0])?.label || "1 Call Result Selected"}
            </span>
          ) : (
            <span className="truncate text-[16px]">
              {internalValue.length === 0
                ? "Filter by call results ..."
                : `${internalValue.length} Call Results Selected`}
            </span>
          )}
        </span>
        <svg aria-hidden="true" className="ml-2 h-4 w-4 text-[#253053]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.354a.75.75 0 111.02 1.1l-4.22 3.814a.75.75 0 01-1.02 0L5.21 8.33a.75.75 0 01.02-1.12z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute z-50 mt-1 w-[249px] rounded-[6px] border border-[rgba(0,51,51,0.1)] bg-white shadow-sm p-2">
          <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
            {internalValue.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setInternalValue([]);
                  onChange?.([]);
                }}
                className="self-start text-[12px] font-bold text-[#FF0000] hover:underline"
              >
                Reset filters
              </button>
            )}
            {visibleOptions.map((opt) => {
              const checked = internalValue.includes(opt.value);
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleToggle(opt.value)}
                  className="flex items-center gap-2 text-left"
                >
                  {/* Checkbox */}
                  <span
                    className={`${checked ? "bg-[#059669] border-[#059669]" : "bg-white border-[rgba(0,51,51,0.2)]"} inline-flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border`}
                  >
                    {checked && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.415l-7.5 7.5a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.415l2.293 2.293 6.793-6.793a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  {/* Badge */}
                  <span className="inline-flex items-center h-[24px] px-3 rounded-[6px] bg-[#F4F6F6] border-[0.5px] border-[rgba(0,51,51,0.1)] text-[16px] font-normal text-[#0B3333]">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
