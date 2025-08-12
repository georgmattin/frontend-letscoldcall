"use client"

import { useState, useRef, useEffect } from "react"
import { Edit, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/data-table-ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/data-table-ui/table"
import { Badge } from "@/components/data-table-ui/badge"
import { ColumnToggle } from "@/components/data-table/column-toggle"
import { ResizableColumn } from "@/components/data-table/resizable-column"
// import { contactData } from "@/lib/data"

// Function to clean website URLs by removing prefixes
const cleanWebsiteUrl = (url: string | null): string => {
  if (!url) return '';
  
  return url
    .replace(/^https?:\/\//, '') // Remove http:// or https://
    .replace(/^www\./, '');       // Remove www.
};

type Column = {
  id: string
  title: string
  isVisible: boolean
}

interface TableVersion1Props {
  data: any[];
  columns: Column[];
  onToggleColumn: (columnId: string) => void;
  onContactClick?: (contactId: string) => void;
  contactCount?: number;
}

export function TableVersion1({ data = [], columns, onToggleColumn, onContactClick, contactCount }: TableVersion1Props) {
  const tableContentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-2">
        {/* Contact count on the left */}
        {contactCount !== undefined && (
          <span 
            className="text-sm font-medium"
            style={{ 
              fontFamily: 'Source Sans Pro, sans-serif',
              color: '#253053'
            }}
          >
            {contactCount} contacts
          </span>
        )}
        
        {/* Column toggle on the right */}
        <ColumnToggle columns={columns} onToggle={onToggleColumn} />
      </div>

      {/* Table container with relative positioning for sticky scrollbar */}
      <div className="rounded-md border relative bg-white">
        {/* Table content area with both scrolls */}
        <div ref={tableContentRef} className="pb-4 overflow-x-auto bg-white">
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-gray-50">
                {(() => {
  const visibleCols = columns.filter(col => col.isVisible);
  return visibleCols.map((col, idx) => (
    <TableHead
      key={col.id}
      className={`font-medium border-r${idx === visibleCols.length - 1 ? ' pr-[110px]' : ''}`}
    >
      {col.title}
    </TableHead>
  ));
})()}
                <TableHead className="font-medium text-right w-[100px] sticky right-0 z-20 bg-gray-50 border-l">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((contact, index) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  {(() => {
  const visibleCols = columns.filter(col => col.isVisible);
  return visibleCols.map((col, idx) => (
    <TableCell
      key={col.id}
      className={`border-r${idx === visibleCols.length - 1 ? ' pr-[110px]' : ''}`}
    >
      <ResizableColumn>
        {col.id === "title" ? contact.position : 
         col.id === "website" && contact[col.id] ? (
           <div className="flex items-center gap-1">
             <img 
               src="/linkto.png" 
               alt="External link" 
               className="w-3 h-3 flex-shrink-0" 
             />
             <a 
               href={contact[col.id].startsWith('http') ? contact[col.id] : `https://${contact[col.id]}`}
               target="_blank"
               rel="noopener noreferrer"
               className="text-blue-600 hover:text-blue-800 underline"
             >
               {cleanWebsiteUrl(contact[col.id])}
             </a>
           </div>
         ) :
         col.id === "phone" ? (
           <span className="text-[#2563EB]">{contact[col.id]}</span>
         ) :
         col.id === "name" ? (
           <span 
             className="font-semibold text-[#253053] cursor-pointer hover:text-blue-600 hover:underline" 
             onClick={() => onContactClick && onContactClick(contact.id)}
           >
             {contact[col.id]}
           </span>
         ) :
         col.id === "status" ? (
           <Badge 
             variant="secondary"
             className={`text-xs font-medium ${
               contact.status === 'called' ? 'bg-green-100 text-green-800 border-green-200' :
               contact.status === 'skipped' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
               'bg-gray-100 text-gray-800 border-gray-200'
             }`}
           >
             {contact.status === 'called' ? 'Called' :
              contact.status === 'skipped' ? 'Skipped' :
              'Not Called'}
           </Badge>
         ) :
         contact[col.id]}
      </ResizableColumn>
    </TableCell>
  ));
})()}
                  <TableCell className="font-medium text-right w-[100px] sticky right-0 z-20 bg-white border-l">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8 border-gray-200 bg-transparent" aria-label="Edit">
                        <Edit className="w-4 h-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 border-gray-200 bg-transparent">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Sticky horizontal scrollbar at bottom */}
        
      </div>
    </div>
  );
}

