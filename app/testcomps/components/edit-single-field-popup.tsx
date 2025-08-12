"use client";

import React, { useState, useEffect } from "react";
import SuccessBadge from "./SuccessBadge";

export type EditSingleFieldPopupProps = {
  title?: string;
  description?: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  cancelLabel?: string;
  isSaving?: boolean;
  successMessage?: string;
  onCancel?: () => void;
  onSave?: (value: string) => Promise<void> | void;
};

const EditSingleFieldPopup: React.FC<EditSingleFieldPopupProps> = ({
  title = "Edit",
  description,
  label,
  placeholder,
  initialValue = "",
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSaving: isSavingProp,
  successMessage = "Saved successfully",
  onCancel,
  onSave,
}) => {
  const [value, setValue] = useState<string>(initialValue || "");
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(initialValue || "");
  }, [initialValue]);

  const isSaving = isSavingProp ?? isSavingLocal;

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || isSaving) return;
    if (!onSave) return;

    try {
      setIsSavingLocal(true);
      await onSave(trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSavingLocal(false);
    }
  };

  return (
    <section
      className="border border-[#0033331a] bg-white rounded-[10px]"
      style={{ width: 561, minHeight: 260 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="h-full w-full p-[30px] flex flex-col">
        <h2
          className="text-[23.04px] font-semibold text-[#003333]"
          style={{ fontFamily: "Open Sans, sans-serif" }}
        >
          {title}
        </h2>
        {description && (
          <p
            className="mt-2 text-[16px] text-[#003333]"
            style={{ fontFamily: "Open Sans, sans-serif" }}
          >
            {description}
          </p>
        )}

        <div className="mt-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!isSaving && value.trim()) {
                  handleSave();
                }
              }
            }}
            placeholder={placeholder}
            className="w-full h-[49px] px-4 rounded-[16px] border border-[#0033331a] placeholder:text-[#C1C1C1] text-[#003333] focus:outline-none focus:ring-0 focus:border-[#0033331a]"
            style={{ fontFamily: "Open Sans, sans-serif", fontSize: "16px" }}
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full h-[41px] rounded-[16px] border border-[#0033331a] text-[#003333] hover:bg-[#F4F6F6] text-[16px]"
            style={{ fontFamily: "Open Sans, sans-serif" }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !value.trim()}
            className="w-full h-[41px] rounded-[16px] bg-[#059669] hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[19.2px] font-semibold transition-colors duration-200"
            style={{ fontFamily: "Open Sans, sans-serif" }}
          >
            {isSaving ? "Saving..." : submitLabel}
          </button>
        </div>
        {saved && (
          <div className="mt-3">
            <SuccessBadge message={successMessage} />
          </div>
        )}
      </div>
    </section>
  );
};

export default EditSingleFieldPopup;
