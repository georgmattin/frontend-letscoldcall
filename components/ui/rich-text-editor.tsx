"use client"

import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Undo,
  Redo
} from 'lucide-react'
import { Button } from './button'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  onInsertVariable?: (insertFunction: (variable: string) => void) => void
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null
  }



  const colors = [
    '#000000', '#374151', '#6b7280', '#dc2626', '#ea580c', 
    '#d97706', '#65a30d', '#059669', '#0891b2', '#2563eb', 
    '#7c3aed', '#c026d3', '#db2777'
  ]

  return (
    <div className="border-b border-gray-200 bg-gray-50 p-3 flex flex-wrap gap-1 rounded-t-xl">
      {/* Text Formatting */}
      <div className="flex gap-1 mr-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : ''}`}
          title="Paks"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : ''}`}
          title="Kaldkiri"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-blue-100 text-blue-700' : ''}`}
          title="Allajoonitud"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
      </div>



      {/* Lists */}
      <div className="flex gap-1 mr-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : ''}`}
          title="Punktiloend"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : ''}`}
          title="Nummerdatud loend"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      {/* Alignment */}
      <div className="flex gap-1 mr-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-700' : ''}`}
          title="Vasakule"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-700' : ''}`}
          title="Keskele"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-700' : ''}`}
          title="Paremale"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Colors */}
      <div className="flex gap-1 mr-3">
        <div className="flex items-center gap-1">
          {colors.slice(0, 6).map((color) => (
            <button
              key={color}
              className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => editor.chain().focus().setColor(color).run()}
              title={`Värv: ${color}`}
            />
          ))}
        </div>
      </div>



      {/* Undo/Redo */}
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="h-8 w-8 p-0"
          title="Võta tagasi"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="h-8 w-8 p-0"
          title="Tee uuesti"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Sisesta tekst...",
  className = "",
  disabled = false,
  onInsertVariable
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      FontFamily,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editable: !disabled,
    immediatelyRender: false,
  })

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  // Funktsioon teksti sisestamiseks kursori asukohta
  const insertTextAtCursor = React.useCallback((text: string) => {
    console.log('insertTextAtCursor called with:', text)
    if (editor && !editor.isDestroyed) {
      // Focus first and wait a bit
      editor.commands.focus()
      
      // Use setTimeout to ensure focus is applied
      setTimeout(() => {
        if (editor && !editor.isDestroyed) {
          // Try TipTap's insertContent
          editor.commands.insertContent(text)
          console.log('Text inserted via TipTap')
        }
      }, 50)
    }
  }, [editor])

  // Edasta insert funktsioon väljapoole
  React.useEffect(() => {
    if (editor && onInsertVariable && editor.isEditable) {
      console.log('Setting insert function in RichTextEditor')
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        onInsertVariable(insertTextAtCursor)
      }, 0)
    }
  }, [editor, onInsertVariable, insertTextAtCursor])

  return (
    <div className={`rich-text-editor border border-gray-200 rounded-[5px] focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-400/20 ${className} flex flex-col`}>
      {!disabled && (
        <div className="sticky top-0 z-10 bg-white">
          <MenuBar editor={editor} />
        </div>
      )}
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto">
          <EditorContent 
            editor={editor} 
            className="prose prose-gray max-w-none h-full focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-full [&_.ProseMirror]:p-4 [&_.ProseMirror_p]:mb-2 [&_.ProseMirror_p:first-child]:mt-0"
          />
          {editor?.isEmpty && (
            <div className="absolute top-4 left-4 text-gray-400 pointer-events-none select-none">
              {placeholder}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 