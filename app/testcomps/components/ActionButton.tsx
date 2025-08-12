import React from 'react';

const ActionButton: React.FC = () => {
  return (
    <button
      type="button"
      className="w-full h-[41px] rounded-[16px] bg-[#059669] hover:bg-[#047857] text-white text-[19.2px] font-semibold transition-colors duration-200"
      style={{ fontFamily: 'Open Sans, sans-serif' }}
    >
      Send
    </button>
  );
};

export default ActionButton;
