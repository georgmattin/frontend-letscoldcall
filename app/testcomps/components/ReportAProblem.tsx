'use client';

import React from 'react';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/utils/supabase/client';
import { usePathname } from 'next/navigation';
import SuccessBadge from './SuccessBadge';

type ReportAProblemProps = {
  onSubmitted?: () => void;
};

const ReportAProblem: React.FC<ReportAProblemProps> = ({ onSubmitted }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const pathname = usePathname();

  const handleSend = async () => {
    if (!message.trim() || isSending) return;
    setIsSending(true);
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;

      if (!userId) {
        console.error('No authenticated user found.');
        setIsSending(false);
        return;
      }

      const { error } = await supabase
        .from('reports')
        .insert({
          user_id: userId,
          page_path: pathname || '/',
          message: message.trim(),
        });

      if (error) {
        console.error('Failed to send report:', error);
      } else {
        setSent(true);
        setMessage('');
        // Auto-close via callback after 2 seconds if provided
        if (onSubmitted) {
          setTimeout(() => {
            try {
              onSubmitted();
            } catch (cbErr) {
              console.error('onSubmitted callback error:', cbErr);
            }
          }, 2000);
        }
      }
    } catch (e) {
      console.error('Unexpected error while sending report:', e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section
      className="border border-[#0033331a] bg-white rounded-[10px]"
      style={{ width: 561, minHeight: 452 }}
    >
      <div className="h-full w-full p-[30px] flex flex-col">
        <h2
          className="text-[23.04px] font-semibold text-[#003333]"
          style={{ fontFamily: 'Open Sans, sans-serif' }}
        >
          Report A Problem
        </h2>
        {/* Description textarea */}
        <div className="mt-4">
          <Textarea
            placeholder="Please describe the issue you are facing?"
            className="w-full h-[275px] p-[25px] resize-none border border-[#0033331a] placeholder:text-[#C1C1C1] placeholder:text-[19.2px] text-[#003333] focus:outline-none focus:ring-0 focus-visible:ring-0 focus:border-[#0033331a] focus-visible:outline-none"
            style={{ fontFamily: 'Open Sans, sans-serif' }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !message.trim()}
            className="w-full h-[41px] rounded-[16px] bg-[#059669] hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[19.2px] font-semibold transition-colors duration-200"
            style={{ fontFamily: 'Open Sans, sans-serif' }}
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
          {sent && (
            <SuccessBadge message="Report sent succesfully" />
          )}
        </div>
      </div>
    </section>
  );
};

export default ReportAProblem;
