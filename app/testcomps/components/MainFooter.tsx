"use client";
import React, { useEffect, useState } from 'react';
import ReportAProblem from './ReportAProblem';

const MainFooter = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <>
      <footer className="w-full py-6 flex items-center justify-center bg-[#F4F6F6]">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setIsOpen(true);
          }}
          className="text-[16px] text-[#C1C1C1] hover:text-[#059669] underline transition-colors"
        >
          Report a problem
        </a>
      </footer>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-[#003333]/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal content - render component directly to avoid extra white area */}
          <div className="relative z-10 mx-4">
            <ReportAProblem onSubmitted={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default MainFooter;
