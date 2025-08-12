import React from 'react';

type Props = {
  onClick?: () => void;
  className?: string;
  label?: string;
};

const SecondaryButtonWithPlus: React.FC<Props> = ({ onClick, className = '', label = 'Create A New List' }) => {
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center gap-2 bg-white border border-[#059669] hover:border-[#003333] rounded-[16px] px-4 h-[40px] transition-colors select-none text-[#059669] hover:text-[#003333] ${className}`}
    >
      {/* Plus icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-colors"
      >
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-medium transition-colors" style={{ fontSize: '16px', fontFamily: 'Open Sans, sans-serif' }}>
        {label}
      </span>
    </button>
  );
};

export default SecondaryButtonWithPlus;
