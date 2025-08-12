"use client";

import React from "react";
import { Edit, Trash2 } from "lucide-react";

export type ObjectionItem = {
  id: string;
  objection: string;
  response: string;
  category: string;
  priority: string;
};

type Props = {
  objection: ObjectionItem;
  index: number;
  onEdit: (objection: ObjectionItem) => void;
  onDelete: (id: string) => void;
};

const ObjectionCard: React.FC<Props> = ({ objection, index, onEdit, onDelete }) => {
  const toTitleCase = (s: string) => s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return (
    <div className="bg-white border-[0.5px] border-[#003333]/10 rounded-lg p-6" style={{ fontFamily: 'Open Sans, sans-serif' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Priority badge */}
          <span
            className={`inline-flex items-center h-[26px] px-2.5 rounded-[6px] border border-[#003333]/10 text-[12.8px] font-semibold ${
              objection.priority === 'high'
                ? 'bg-red-50 text-red-700'
                : objection.priority === 'medium'
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-green-50 text-green-700'
            }`}
          >
            {toTitleCase(objection.priority)} Priority
          </span>
          {/* Category badge */}
          <span className="inline-flex items-center h-[26px] px-2.5 rounded-[6px] border border-[#003333]/10 bg-[#F4F6F6] text-[#111827] text-[12.8px] font-semibold">
            {toTitleCase(objection.category)}
          </span>
          {/* Index badge */}
          <span className="inline-flex items-center h-[26px] px-2.5 rounded-[6px] border border-[#003333]/10 bg-[#F4F6F6] text-[#6B7280] text-[12.8px] font-semibold">
            #{index + 1}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Edit button styled like table badges */}
          <button
            type="button"
            aria-label="Edit objection"
            onClick={() => onEdit(objection)}
            className="group inline-flex items-center justify-center w-[26px] h-[25px] rounded-[5px] border border-[#003333]/10 bg-[#F4F6F6] hover:border-[#059669]"
            title="Edit"
          >
            <Edit className="h-[14px] w-[14px] text-[#003333]" />
          </button>
          {/* Delete button styled like table badges */}
          <button
            type="button"
            aria-label="Delete objection"
            onClick={() => onDelete(objection.id)}
            className="group inline-flex items-center justify-center w-[26px] h-[25px] rounded-[5px] border border-[#003333]/10 bg-[#F4F6F6] hover:border-[#059669]"
            title="Delete"
          >
            <Trash2 className="h-[14px] w-[14px] text-[#B91C1C]" />
          </button>
        </div>
      </div>
      <div className="mb-4">
        <p className="text-gray-600 text-sm mb-2 font-medium">Objection:</p>
        <div className="border border-[#003333]/10 rounded-[6px] bg-white h-[38px] px-3 flex items-center">
          <span className="text-[#111827] text-[14.4px]">{objection.objection}</span>
        </div>
      </div>
      <div>
        <p className="text-gray-600 text-sm mb-2 font-medium">Response:</p>
        <div className="border border-[#003333]/10 rounded-[6px] bg-white px-3 py-2 min-h-[96px]">
          <p className="text-[#111827] text-[14.4px] whitespace-pre-line">{objection.response}</p>
        </div>
      </div>
    </div>
  );
};

export default ObjectionCard;
