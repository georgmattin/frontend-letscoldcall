"use client";

import React, { useEffect, useState } from "react";
import SuccessBadge from "@/app/testcomps/components/SuccessBadge";

export type EditContact = {
  id?: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  position: string | null;
  website: string | null;
  notes: string | null;
};

export type EditContactPopupProps = {
  title?: string;
  description?: string;
  submitLabel?: string;
  cancelLabel?: string;
  isSaving?: boolean;
  successMessage?: string;
  initialContact?: EditContact;
  onCancel?: () => void;
  onSave?: (updated: EditContact) => Promise<void> | void;
};

const EditContactPopup: React.FC<EditContactPopupProps> = ({
  title = "Edit Contact",
  description = "Update the contact details",
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSaving: isSavingProp,
  successMessage = "Contact updated",
  initialContact,
  onCancel,
  onSave,
}) => {
  const [form, setForm] = useState<EditContact>({
    id: initialContact?.id,
    name: initialContact?.name ?? "",
    phone: initialContact?.phone ?? "",
    email: initialContact?.email ?? "",
    company: initialContact?.company ?? "",
    position: initialContact?.position ?? "",
    website: initialContact?.website ?? "",
    notes: initialContact?.notes ?? "",
  });
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      id: initialContact?.id,
      name: initialContact?.name ?? "",
      phone: initialContact?.phone ?? "",
      email: initialContact?.email ?? "",
      company: initialContact?.company ?? "",
      position: initialContact?.position ?? "",
      website: initialContact?.website ?? "",
      notes: initialContact?.notes ?? "",
    });
  }, [initialContact]);

  const isSaving = isSavingProp ?? isSavingLocal;

  const handleSave = async () => {
    if (isSaving) return;
    if (!onSave) return;

    const payload: EditContact = {
      ...form,
      name: (form.name ?? "").toString().trim() || null,
      phone: (form.phone ?? "").toString().trim() || null,
      email: (form.email ?? "").toString().trim() || null,
      company: (form.company ?? "").toString().trim() || null,
      position: (form.position ?? "").toString().trim() || null,
      website: (form.website ?? "").toString().trim() || null,
      notes: (form.notes ?? "").toString().trim() || null,
    };

    // Basic validation: require at least name or phone
    if (!payload.name && !payload.phone) {
      return; // keep dialog open; you can add toast externally if needed
    }

    try {
      setIsSavingLocal(true);
      await onSave(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSavingLocal(false);
    }
  };

  const inputClass =
    "w-full h-[49px] px-4 rounded-[16px] border border-[#0033331a] placeholder:text-[#C1C1C1] text-[#003333] focus:outline-none focus:ring-0 focus:border-[#0033331a]";
  const labelClass = "block mb-2 text-[14px] text-[#003333]";
  const fontStyle: React.CSSProperties = { fontFamily: "Open Sans, sans-serif" };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isSaving) {
        handleSave();
      }
    }
  };

  return (
    <section
      className="border border-[#0033331a] bg-white rounded-[10px]"
      style={{ width: 720, minHeight: 260 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="h-full w-full p-[30px] flex flex-col">
        <h2 className="text-[23.04px] font-semibold text-[#003333]" style={fontStyle}>
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-[16px] text-[#003333]" style={fontStyle}>
            {description}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={fontStyle}>
              Name
            </label>
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={handleInputKeyDown}
              placeholder="John Doe"
              className={inputClass}
              style={{ ...fontStyle, fontSize: 16 }}
            />
          </div>
          <div>
            <label className={labelClass} style={fontStyle}>
              Phone
            </label>
            <input
              type="text"
              value={form.phone ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              onKeyDown={handleInputKeyDown}
              placeholder="+123456789"
              className={inputClass}
              style={{ ...fontStyle, fontSize: 16 }}
            />
          </div>
          <div>
            <label className={labelClass} style={fontStyle}>
              Email
            </label>
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              onKeyDown={handleInputKeyDown}
              placeholder="john@example.com"
              className={inputClass}
              style={{ ...fontStyle, fontSize: 16 }}
            />
          </div>
          <div>
            <label className={labelClass} style={fontStyle}>
              Company
            </label>
            <input
              type="text"
              value={form.company ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              onKeyDown={handleInputKeyDown}
              placeholder="ACME Inc."
              className={inputClass}
              style={{ ...fontStyle, fontSize: 16 }}
            />
          </div>
          <div>
            <label className={labelClass} style={fontStyle}>
              Position
            </label>
            <input
              type="text"
              value={form.position ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              onKeyDown={handleInputKeyDown}
              placeholder="Sales Manager"
              className={inputClass}
              style={{ ...fontStyle, fontSize: 16 }}
            />
          </div>
          <div>
            <label className={labelClass} style={fontStyle}>
              Website
            </label>
            <input
              type="text"
              value={form.website ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              onKeyDown={handleInputKeyDown}
              placeholder="https://example.com"
              className={inputClass}
              style={{ ...fontStyle, fontSize: 16 }}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass} style={fontStyle}>
              Notes
            </label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes"
              className="w-full px-4 py-3 rounded-[16px] border border-[#0033331a] placeholder:text-[#C1C1C1] text-[#003333] focus:outline-none focus:ring-0 focus:border-[#0033331a]"
              style={{ ...fontStyle, fontSize: 16, minHeight: 96 }}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full h-[41px] rounded-[16px] border border-[#0033331a] text-[#003333] hover:bg-[#F4F6F6] text-[16px]"
            style={fontStyle}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-[41px] rounded-[16px] bg-[#059669] hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[19.2px] font-semibold transition-colors duration-200"
            style={fontStyle}
          >
            {isSaving ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                <span>Saving</span>
              </span>
            ) : (
              submitLabel
            )}
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

export default EditContactPopup;
