import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

type CallButtonProps = {
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  isLoading?: boolean;
};

const CallButton: React.FC<CallButtonProps> = ({ onClick, href, disabled = false, isLoading = false }) => {
  const baseClass =
    'flex items-center justify-center rounded-2xl px-[30px] py-[15px] transition-colors';
  const enabledColors = 'bg-[#059669] hover:bg-[#047857] text-white';
  const disabledColors = 'bg-[#B6B6B6] text-white cursor-not-allowed';

  const content = (
    <>
      {isLoading ? (
        <span className="mr-3 inline-flex items-center justify-center">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
        </span>
      ) : (
        <Image
          src="/call-icon.svg"
          alt="Call"
          width={24}
          height={24}
          className="mr-3"
        />
      )}
      Start Calling
    </>
  );

  const style = {
    fontFamily: 'Open Sans, sans-serif',
    fontSize: '19.2px',
    lineHeight: '1.2',
  } as const;

  // If an onClick is provided, render a button for programmatic navigation
  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => !(disabled || isLoading) && onClick()}
        disabled={disabled || isLoading}
        aria-disabled={disabled || isLoading}
        className={`${baseClass} ${(disabled || isLoading) ? disabledColors : enabledColors}`}
        style={style}
      >
        {content}
      </button>
    );
  }

  // If an href is provided, render a Link
  if (href) {
    return (
      <Link
        href={(disabled || isLoading) ? '#' : href}
        aria-disabled={disabled || isLoading}
        className={`${baseClass} ${(disabled || isLoading) ? disabledColors : enabledColors}`}
        style={style}
        onClick={(e) => {
          if (disabled || isLoading) e.preventDefault();
        }}
      >
        {content}
      </Link>
    );
  }

  // Default fallback
  return (
    <Link
      href="/contact-lists"
      className={`${baseClass} ${enabledColors}`}
      style={style}
    >
      {content}
    </Link>
  );
};

export default CallButton;
