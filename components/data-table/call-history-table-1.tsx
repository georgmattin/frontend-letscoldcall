"use client"

import { useState, useRef, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-table-ui/table"
import { Badge } from "@/components/data-table-ui/badge"
import { ColumnToggle } from "@/components/data-table/column-toggle"
import { ResizableColumn } from "@/components/data-table/resizable-column"

// Function to format date and time
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleDateString('en-US', options).replace(',', ',');
};

// Function to format duration from seconds to MM:SS
const formatDuration = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

type Column = {
  id: string
  title: string
  isVisible: boolean
}

interface CallHistoryTable1Props {
  data: any[];
  columns: Column[];
  onToggleColumn: (columnId: string) => void;
  onRowClick?: (callId: string) => void;
}

export function CallHistoryTable1({ data = [], columns, onToggleColumn, onRowClick }: CallHistoryTable1Props) {
  const tableContentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-center mb-2">
        <ColumnToggle columns={columns} onToggle={onToggleColumn} />
      </div>

      {/* Table container with relative positioning for sticky scrollbar */}
      <div className="rounded-md border relative bg-white">
        {/* Table content area with both scrolls */}
        <div ref={tableContentRef} className="pb-4 overflow-x-auto bg-white">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-white">
                {(() => {
  const visibleCols = columns.filter(col => col.isVisible);
  return visibleCols.map((col, idx) => (
    <TableHead
      key={col.id}
      className={`font-medium border-r`}
      style={{
        width: col.id === 'call_type' || col.id === 'duration' ? '100px' : 
               col.id === 'ai_summary' || col.id === 'ai_suggestions' || col.id === 'ai_transcript' ? '250px' : 'auto',
        minWidth: col.id === 'call_type' || col.id === 'duration' ? '100px' : 
                  col.id === 'ai_summary' || col.id === 'ai_suggestions' || col.id === 'ai_transcript' ? '200px' : 'auto'
      }}
    >
      {col.title}
    </TableHead>
  ));
})()}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((call, index) => (
                <TableRow 
                  key={index} 
                  className="hover:bg-gray-50 cursor-pointer" 
                  onClick={() => onRowClick && onRowClick(call.id)}
                >
                  {(() => {
  const visibleCols = columns.filter(col => col.isVisible);
  return visibleCols.map((col, idx) => (
    <TableCell
      key={col.id}
      className={`border-r`}
      style={{
        width: col.id === 'call_type' || col.id === 'duration' ? '100px' : 
               col.id === 'ai_summary' || col.id === 'ai_suggestions' || col.id === 'ai_transcript' ? '250px' : 'auto',
        minWidth: col.id === 'call_type' || col.id === 'duration' ? '100px' : 
                  col.id === 'ai_summary' || col.id === 'ai_suggestions' || col.id === 'ai_transcript' ? '200px' : 'auto'
      }}
    >
      <ResizableColumn 
        width={col.id === 'call_type' || col.id === 'duration' ? 100 : 
               col.id === 'ai_summary' || col.id === 'ai_suggestions' || col.id === 'ai_transcript' ? 250 : 200}
        minWidth={col.id === 'call_type' || col.id === 'duration' ? 100 : 
                  col.id === 'ai_summary' || col.id === 'ai_suggestions' || col.id === 'ai_transcript' ? 200 : 100}
        maxWidth={col.id === 'call_type' || col.id === 'duration' ? 100 : 
                  col.id === 'ai_summary' || col.id === 'ai_suggestions' || col.id === 'ai_transcript' ? 400 : 500}
      >
        {col.id === "name" ? (
          <span className="font-semibold text-[#253053]">{call.contact_name || call.name}</span>
        ) :
        col.id === "phone" ? (
          <span className="text-[#2563EB]">{call.phone_number || call.phone}</span>
        ) :
        col.id === "call_type" ? (
          <Badge 
            variant={call.call_type === 'outgoing' ? 'default' : 'secondary'}
            className={call.call_type === 'outgoing' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
          >
            {call.call_type === 'outgoing' ? 'Outgoing' : 'Incoming'}
          </Badge>
        ) :
        col.id === "duration" ? (
          <span>{formatDuration(call.duration)}</span>
        ) :
        col.id === "outcome" ? (
          <Badge 
            variant="outline"
            className={
              call.outcome === 'interested' ? 'bg-green-100 text-green-800 border-green-300' :
              call.outcome === 'not_interested' ? 'bg-red-100 text-red-800 border-red-300' :
              call.outcome === 'callback' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
              call.outcome === 'no_answer' ? 'bg-gray-100 text-gray-800 border-gray-300' :
              'bg-gray-100 text-gray-600 border-gray-300'
            }
          >
            {call.outcome ? (
              call.outcome === 'interested' ? 'Interested' :
              call.outcome === 'not_interested' ? 'Not Interested' :
              call.outcome === 'callback' ? 'Callback' :
              call.outcome === 'no_answer' ? 'No Answer' :
              call.outcome
            ) : 'No Outcome'}
          </Badge>
        ) :
        col.id === "date_time" ? (
          <span>{formatDateTime(call.created_at || call.call_date || call.date_time)}</span>
        ) :
        col.id === "ai_summary" ? (
          <div className="max-w-xs">
            <span 
              className="text-sm text-gray-700" 
              title={call.ai_summary}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {call.ai_summary || 'No summary available'}
            </span>
          </div>
        ) :
        col.id === "ai_suggestions" ? (
          <div className="max-w-xs">
            <span 
              className="text-sm text-gray-700" 
              title={call.ai_suggestions}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {call.ai_suggestions ? (
                typeof call.ai_suggestions === 'string' 
                  ? call.ai_suggestions.substring(0, 100) + (call.ai_suggestions.length > 100 ? '...' : '')
                  : JSON.stringify(call.ai_suggestions).substring(0, 100) + '...'
              ) : 'No suggestions available'}
            </span>
          </div>
        ) :
        col.id === "ai_transcript" ? (
          <div className="max-w-xs">
            <span 
              className="text-sm text-gray-700" 
              title={call.ai_transcript}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {call.ai_transcript || 'No transcript available'}
            </span>
          </div>
        ) :
        call[col.id]}
      </ResizableColumn>
    </TableCell>
  ));
})()}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
