"use client"
import React from "react";
import SuccessBadge from './SuccessBadge';

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

interface ExportCallResultsPopupProps {
  onExport?: (selected: FieldKey[]) => void;
  // Modal props
  modal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const ALL_FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: "name", label: "Name (Required)", required: true },
  { key: "phone", label: "Phone Number (Required)", required: true },
  { key: "type", label: "Type (Required)", required: true },
  { key: "duration", label: "Duration (Required)", required: true },
  { key: "datetime", label: "Date & Time (Required)", required: true },
  { key: "result", label: "Call Result" },
  { key: "notes", label: "Call Notes" },
  { key: "ai_transcription", label: "AI Transcription (If Available)" },
  { key: "ai_summary", label: "AI Summary (If Available)" },
  { key: "ai_suggestions", label: "AI Suggestions (If Available)" },
];

export default function ExportCallResultsPopup({ onExport, modal = false, isOpen = true, onClose }: ExportCallResultsPopupProps) {
  const requiredKeys = ALL_FIELDS.filter(f => f.required).map(f => f.key);
  const [selected, setSelected] = React.useState<FieldKey[]>(requiredKeys);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exported, setExported] = React.useState(false);

  // Close on ESC when used as a modal
  React.useEffect(() => {
    if (!(modal && isOpen)) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal, isOpen, onClose]);

  const toggle = (key: FieldKey, disabled?: boolean) => {
    if (disabled) return;
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleExport = async () => {
    if (isExporting) return;
    setExported(false);
    setIsExporting(true);
    try {
      const maybePromise = onExport?.(selected);
      if (maybePromise && typeof (maybePromise as any).then === 'function') {
        await (maybePromise as Promise<any>);
      }
      setExported(true);
    } finally {
      setIsExporting(false);
    }
  };

  // If used as modal and closed, render nothing
  if (modal && !isOpen) return null;

  const content = (
    <section className="bg-white rounded-[12px] border border-[rgba(0,51,51,0.1)]" style={{ width: 561 }}>
      <div className="p-[30px] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[22px] font-semibold text-[#0B3333]">Export Call Logs</h2>
            <p className="text-[14px] text-[#0B3333] mt-1">Select the fields you want to include</p>
          </div>
        </div>

        {/* Fields */}
        <div className="mt-5 space-y-3 overflow-auto pr-1">
          {ALL_FIELDS.map((f, idx) => {
            const isRequired = !!f.required;
            const isChecked = selected.includes(f.key);
            const isMuted = idx < 5; // first five options muted
            return (
              <label key={f.key} className="flex items-center gap-3 cursor-pointer">
                {/* Custom checkbox */}
                <span
                  onClick={() => toggle(f.key, isRequired)}
                  className={`w-[18px] h-[18px] rounded-[4px] border flex items-center justify-center ${isChecked ? "bg-[#059669] border-[#059669]" : "bg-white border-[rgba(0,51,51,0.4)]"} ${isRequired ? "opacity-100" : ""}`}
                  aria-hidden
                >
                  {isChecked && (
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 10.5L8.5 14L15 7.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {/* Badge-like label */}
                <span
                  onClick={() => toggle(f.key, isRequired)}
                  className={`inline-flex items-center min-h-[24px] px-3 rounded-[6px] bg-[#F4F6F6] border-[0.5px] text-[16px] ${
                    isMuted
                      ? "text-[#0B3333]/60 border-[rgba(0,51,51,0.1)]"
                      : `${isChecked ? "border-[#003333]" : "border-[rgba(0,51,51,0.1)] hover:border-[#003333]"} text-[#0B3333]`
                  } ${isRequired ? "cursor-default" : ""}`}
                >
                  {f.label}
                </span>
                {isRequired && (
                  <span className="sr-only">Required</span>
                )}
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-[30px] space-y-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className={`w-full h-[41px] rounded-[16px] ${isExporting ? 'bg-[#059669]/80' : 'bg-[#059669] hover:bg-[#047857]'} text-white text-[19.2px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2`}
            style={{ fontFamily: 'Open Sans, sans-serif' }}
          >
            {isExporting && (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            )}
            {isExporting ? 'Exporting call logs' : 'Export'}
          </button>
          {exported && (
            <SuccessBadge message="Call logs were succesfully exported" />
          )}
        </div>
      </div>
    </section>
  );

  if (!modal) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm" onClick={() => onClose && onClose()} />
      <div className="relative z-10">
        {content}
      </div>
    </div>
  );
}
