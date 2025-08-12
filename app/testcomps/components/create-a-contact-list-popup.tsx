'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import SuccessBadge from './SuccessBadge';
import { useRouter } from 'next/navigation';

type Props = {
  onCreated?: (list: { id: number; name: string }) => void;
};

const CreateAContactListPopup: React.FC<Props> = ({ onCreated }) => {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || isCreating) return;
    setIsCreating(true);
    try {
      const supabase = createClient();
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) {
        console.error('No authenticated user');
        setIsCreating(false);
        return;
      }

      const { data, error } = await supabase
        .from('contact_lists')
        .insert({ user_id: userId, name: trimmed })
        .select('id, name')
        .single();

      if (error) {
        console.error('Failed to create contact list:', error);
      } else if (data) {
        // Log user activity for creating a new contact list
        try {
          await supabase.from('user_activity_logs').insert({
            user_id: userId,
            action: 'Create A New List',
            entity_type: 'contact_list',
            // entity_id column is UUID; our contact_lists.id is integer, so store id in metadata
            metadata: {
              table: 'contact_lists',
              name: data.name,
              id: data.id,
            },
          });
        } catch (logErr) {
          console.warn('Failed to log user activity (create contact list):', logErr);
        }

        setCreated(true);
        // Slight delay to show success badge, then navigate to the new list page
        setTimeout(() => {
          try {
            if (onCreated) {
              onCreated({ id: data.id as number, name: data.name as string });
            }
            // Navigate to the newly created contact list page
            router.push(`/contacts/list/${data.id}`);
          } catch (cbErr) {
            console.error('Redirection or onCreated callback error:', cbErr);
          }
        }, 1500);
      }
    } catch (e) {
      console.error('Unexpected error while creating list:', e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section
      className="border border-[#0033331a] bg-white rounded-[10px]"
      style={{ width: 561, minHeight: 260 }}
    >
      <div className="h-full w-full p-[30px] flex flex-col">
        <h2
          className="text-[23.04px] font-semibold text-[#003333]"
          style={{ fontFamily: 'Open Sans, sans-serif' }}
        >
          Create a new list
        </h2>
        <p
          className="mt-2 text-[16px] text-[#003333]"
          style={{ fontFamily: 'Open Sans, sans-serif' }}
        >
          Give your contact list a name
        </p>

        <div className="mt-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (!isCreating && name.trim()) {
                  handleCreate();
                }
              }
            }}
            placeholder="Enter contact list name here"
            className="w-full h-[49px] px-4 rounded-[16px] border border-[#0033331a] placeholder:text-[#C1C1C1] text-[#003333] focus:outline-none focus:ring-0 focus:border-[#0033331a]"
            style={{ fontFamily: 'Open Sans, sans-serif', fontSize: '16px' }}
          />
        </div>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="w-full h-[41px] rounded-[16px] bg-[#059669] hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[19.2px] font-semibold transition-colors duration-200"
            style={{ fontFamily: 'Open Sans, sans-serif' }}
          >
            {isCreating ? (
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
                <span>Creating List</span>
              </span>
            ) : (
              'Create'
            )}
          </button>
          {created && <SuccessBadge message="Contact list created succesfully" />}
        </div>
      </div>
    </section>
  );
};

export default CreateAContactListPopup;
