"use client"
import React from "react";

interface ExportButtonProps {
  onClick?: () => void;
  title?: string;
}

export default function ExportButton({ onClick, title = "Export" }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-[41px] h-[37px] inline-flex items-center justify-center bg-white rounded-[6px] border border-[rgba(0,51,51,0.1)] hover:border-[#003333] transition-colors"
      aria-label={title}
    >
      <img src={"/export-icon.svg"} alt="" aria-hidden="true" className="w-4 h-4" />
    </button>
  );
}
