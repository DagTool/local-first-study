'use client'

/**
 * TipTapEditor — Rich text editor wrapper for TipTap
 *
 * Features:
 * - StarterKit (bold, italic, heading, lists, code, blockquote, hardBreak)
 * - TaskList + TaskItem (checkbox)
 * - Placeholder
 * - onChange callback với serialized JSON string
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'

interface TipTapEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  readOnly?: boolean
}

export default function TipTapEditor({
  content,
  onChange,
  placeholder = 'Bắt đầu ghi chú...',
  readOnly = false,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: (() => {
      // Parse initial content từ JSON string
      try {
        if (content && content.trim().startsWith('{')) {
          return JSON.parse(content) as object
        }
        return content || ''
      } catch {
        return content || ''
      }
    })(),
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      // Serialize sang JSON string
      const json = JSON.stringify(editor.getJSON())
      onChange(json)
    },
  })

  // Sync content nếu bị thay đổi từ ngoài (ví dụ: load note khác)
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const current = JSON.stringify(editor.getJSON())
    if (current !== content && content) {
      try {
        const parsed = JSON.parse(content) as object
        editor.commands.setContent(parsed)
      } catch {
        // content không phải JSON — set như plain text
        editor.commands.setContent(content)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  return (
    <div
      style={{
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        fontSize: '14px',
        lineHeight: 1.7,
        color: '#e2e8f0',
      }}
    >
      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 160px;
        }
        .ProseMirror p { margin: 0.5em 0; }
        .ProseMirror h1 { font-size: 1.5em; font-weight: 800; margin: 0.75em 0 0.25em; }
        .ProseMirror h2 { font-size: 1.25em; font-weight: 700; margin: 0.6em 0 0.2em; }
        .ProseMirror h3 { font-size: 1.1em; font-weight: 700; margin: 0.5em 0 0.2em; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.5em; margin: 0.4em 0; }
        .ProseMirror blockquote {
          border-left: 3px solid #6366f1;
          padding-left: 1em;
          color: #94a3b8;
          margin: 0.5em 0;
        }
        .ProseMirror code {
          background: rgba(99,102,241,0.15);
          border-radius: 4px;
          padding: 0.1em 0.3em;
          font-family: 'Fira Code', monospace;
          font-size: 0.9em;
        }
        .ProseMirror pre {
          background: rgba(0,0,0,0.4);
          border-radius: 8px;
          padding: 1em;
          overflow-x: auto;
        }
        .ProseMirror pre code { background: none; padding: 0; }
        /* Task list */
        .ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 0; }
        .ProseMirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 8px; }
        .ProseMirror ul[data-type="taskList"] li input[type="checkbox"] {
          width: 16px; height: 16px; margin-top: 3px; cursor: pointer; accent-color: #6366f1;
        }
        /* Placeholder */
        .ProseMirror p.is-editor-empty:first-child::before {
          color: #64748b;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        /* Toolbar */
        .tiptap-toolbar {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          padding: 6px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 8px;
        }
        .tiptap-toolbar button {
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.1);
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.15s;
        }
        .tiptap-toolbar button:hover { background: rgba(99,102,241,0.2); color: #a78bfa; }
        .tiptap-toolbar button.is-active { background: rgba(99,102,241,0.3); color: #a78bfa; border-color: #6366f1; }
      `}</style>

      {/* Toolbar */}
      {!readOnly && editor && (
        <div className="tiptap-toolbar">
          <button
            className={editor.isActive('bold') ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            className={editor.isActive('italic') ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            className={editor.isActive('code') ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
          >
            {'<>'}
          </button>
          <button
            className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </button>
          <button
            className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </button>
          <button
            className={editor.isActive('bulletList') ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            • List
          </button>
          <button
            className={editor.isActive('taskList') ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            title="Checklist"
          >
            ✓ Task
          </button>
          <button
            className={editor.isActive('blockquote') ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            &ldquo;&rdquo;
          </button>
          <button
            className={editor.isActive('codeBlock') ? 'is-active' : ''}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
          >
            {'{ }'}
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}
