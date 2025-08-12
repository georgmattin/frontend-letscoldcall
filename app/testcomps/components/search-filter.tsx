"use client"
import React from "react";

interface SearchFilterProps {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
}

export default function SearchFilter({ value, onChange, placeholder = "Search call logs" }: SearchFilterProps) {
  const [internal, setInternal] = React.useState(value ?? "");
  React.useEffect(() => {
    setInternal(value ?? "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternal(e.target.value);
    onChange?.(e.target.value);
  };

  return (
    <div className="relative" style={{ width: 280 }}>
      <img
        src="/search-icon.svg"
        alt=""
        aria-hidden="true"
        className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4"
      />
      <input
        type="text"
        value={internal}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-[280px] h-[37px] rounded-[6px] border border-[rgba(0,51,51,0.1)] hover:border-[#003333] transition-colors pl-7 pr-2 bg-white text-[16px] text-[#253053] placeholder-[#253053]/60 focus:outline-none"
      />
    </div>
  );
}
