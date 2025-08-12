"use client";

import React from "react";

export type DeleteContactConfirmPopupProps = {
  title?: string;
  contactName?: string | null;
  customMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDeleting?: boolean;
  onCancel?: () => void;
  onConfirm?: () => Promise<void> | void;
};

const DeleteContactConfirmPopup: React.FC<DeleteContactConfirmPopupProps> = ({
  title = "Delete Contact",
  contactName,
  customMessage,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isDeleting,
  onCancel,
  onConfirm,
}) => {
  const fontStyle: React.CSSProperties = { fontFamily: "Open Sans, sans-serif" };
  return (
    <section
      className="border border-[#0033331a] bg-white rounded-[10px]"
      style={{ width: 561, minHeight: 220 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="h-full w-full p-[30px] flex flex-col">
        <div className="flex items-start justify-between">
          <h2 className="text-[23.04px] font-semibold text-[#003333]" style={fontStyle}>
            {title}
          </h2>
          {/* Optional close X could be added by parent overlay click; keeping clean here */}
        </div>
        <p className="mt-2 text-[16px] text-[#003333]" style={fontStyle}>
          {customMessage ? (
            <span>{customMessage}</span>
          ) : (
            <>
              Are you sure you want to delete {" "}
              <span className="font-semibold">“{contactName || "this contact"}”</span>?
            </>
          )}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full h-[48px] rounded-[16px] bg-[#FF0000] hover:bg-[#e00000] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[19.2px] font-semibold transition-colors duration-200"
            style={fontStyle}
            aria-busy={isDeleting}
            aria-live="polite"
          >
            {isDeleting ? (
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
                <span>Deleting</span>
              </span>
            ) : (
              confirmLabel
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full h-[48px] rounded-[16px] border border-[#0033331a] text-[#003333] hover:bg-[#F4F6F6] text-[16px]"
            style={fontStyle}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </section>
  );
};

export default DeleteContactConfirmPopup;
