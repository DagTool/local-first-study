'use client'

/**
 * NotesPage — Trang quản lý ghi chú cá nhân
 *
 * Features:
 * - Danh sách notes với search bar (Fuse.js offline)
 * - Filter theo tag
 * - Tạo/sửa note với TipTap editor
 * - Pin/Archive
 * - Gắn tag theo môn học
 *
 * Tất cả data-testid tuân theo E2E spec (notes.spec.ts).
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth/authStore'
import { getNamespacedDB } from '@/lib/db/namespaceDB'
import { NoteRepository, TagRepository } from '@/lib/db/repositories'
import { searchNotes, filterNotesByTags } from '@/lib/notes/noteSearch'
import type { NoteSearchItem } from '@/lib/notes/noteSearch'
import type { Note, Tag } from '@/lib/db/schemas'

// TipTap dynamic import (client-only, avoid SSR)
const TipTapEditor = dynamic(() => import('@/components/TipTapEditor'), { ssr: false })

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%)',
    color: '#e2e8f0',
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    padding: '2rem',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  } as React.CSSProperties,
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  input: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
  } as React.CSSProperties,
  label: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '4px',
    display: 'block',
  } as React.CSSProperties,
  btn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(99,102,241,0.5)',
    background: 'rgba(99,102,241,0.15)',
    color: '#a78bfa',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  btnPrimary: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
  } as React.CSSProperties,
  btnDanger: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(239,68,68,0.4)',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '12px',
  } as React.CSSProperties,
  tag: (color?: string) =>
    ({
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
      background: color ? `${color}33` : 'rgba(99,102,241,0.2)',
      color: color ?? '#a78bfa',
      border: `1px solid ${color ?? '#6366f1'}55`,
      cursor: 'pointer',
      marginRight: '4px',
      marginBottom: '4px',
    }) as React.CSSProperties,
}

// ─── Note Form ────────────────────────────────────────────────────────────────

interface NoteFormProps {
  tags: Tag[]
  initial?: Note | null
  onSave: (data: { title: string; content: string; tags: string[] }) => void
  onCancel: () => void
}

function NoteForm({ tags, initial, onSave, onCancel }: NoteFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [selectedTags, setSelectedTags] = useState<string[]>(initial?.tags ?? [])

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={S.label}>Tiêu đề</label>
        <input
          data-testid="note-title-input"
          style={S.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề ghi chú..."
          autoFocus
        />
      </div>

      <div>
        <label style={S.label}>Nội dung</label>
        <div
          data-testid="note-editor"
          style={{
            minHeight: '200px',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)',
            padding: '12px',
          }}
        >
          <TipTapEditor content={content} onChange={setContent} />
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <label style={S.label}>Tags</label>
          <div
            data-testid="note-tag-select"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}
          >
            {tags.map((tag) => (
              <button
                key={tag.id}
                data-testid={`tag-option-${tag.name}`}
                style={{
                  ...S.tag(tag.color),
                  opacity: selectedTags.includes(tag.id) ? 1 : 0.4,
                  border: selectedTags.includes(tag.id)
                    ? `2px solid ${tag.color ?? '#6366f1'}`
                    : `1px solid ${tag.color ?? '#6366f1'}55`,
                }}
                onClick={() => toggleTag(tag.id)}
              >
                {selectedTags.includes(tag.id) ? '✓ ' : ''}
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          data-testid="note-save-btn"
          style={S.btnPrimary}
          onClick={() => onSave({ title, content, tags: selectedTags })}
        >
          {initial ? 'Cập nhật' : 'Lưu ghi chú'}
        </button>
        <button style={S.btn} onClick={onCancel}>
          Hủy
        </button>
      </div>
    </div>
  )
}

// ─── Tag Manager Modal ────────────────────────────────────────────────────────

function TagManager({
  tags,
  onCreated,
  onClose,
}: {
  tags: Tag[]
  onCreated: (tag: Tag) => void
  onClose: () => void
}) {
  const { state } = useAuthStore()
  const db = state.userKey ? getNamespacedDB(state.userKey) : null
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')

  const handleSave = async () => {
    if (!db || !name.trim()) return
    const tagRepo = new TagRepository(db)
    const tag = await tagRepo.create({ name: name.trim(), color })
    onCreated(tag)
    setName('')
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{ ...S.card, width: '400px', maxWidth: '90vw' }}>
        <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>
          🏷️ Quản lý Tags
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            data-testid="tag-name-input"
            style={{ ...S.input, flex: 1 }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên tag..."
            onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
            }}
          />
          <button data-testid="tag-save-btn" style={S.btnPrimary} onClick={() => void handleSave()}>
            Thêm
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {tags.map((tag) => (
            <span key={tag.id} style={S.tag(tag.color)}>
              {tag.name}
            </span>
          ))}
          {tags.length === 0 && (
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>Chưa có tag nào</span>
          )}
        </div>

        <button data-testid="close-tags-modal-btn" style={S.btn} onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>
  )
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  tags,
  onEdit,
  onDelete,
  onPin,
}: {
  note: Note
  tags: Tag[]
  onEdit: () => void
  onDelete: () => void
  onPin: () => void
}) {
  const noteTags = tags.filter((t) => note.tags.includes(t.id))

  // Parse preview text from content
  let preview = ''
  try {
    const doc = JSON.parse(note.content) as {
      content?: Array<{ content?: Array<{ text?: string }> }>
    }
    preview =
      doc.content
        ?.slice(0, 2)
        .map((n) => n.content?.map((c) => c.text ?? '').join('') ?? '')
        .join(' ')
        .slice(0, 120) ?? ''
  } catch {
    preview = note.content.slice(0, 120)
  }

  return (
    <div
      data-testid="note-card"
      style={{
        ...S.card,
        borderLeft: note.isPinned ? '3px solid #6366f1' : '3px solid transparent',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }} onClick={onEdit}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#f1f5f9', marginBottom: '4px' }}>
            {note.isPinned && <span style={{ marginRight: '6px' }}>📌</span>}
            {note.title}
          </div>
          {preview && (
            <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
              {preview}
              {preview.length >= 120 ? '…' : ''}
            </div>
          )}
          {noteTags.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              {noteTags.map((tag) => (
                <span key={tag.id} style={S.tag(tag.color)}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
          <button
            style={{ ...S.btn, fontSize: '16px', padding: '4px 8px' }}
            onClick={onPin}
            title={note.isPinned ? 'Bỏ ghim' : 'Ghim'}
          >
            {note.isPinned ? '📍' : '📌'}
          </button>
          <button style={S.btnDanger} onClick={onDelete}>
            Xóa
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main NotesPage ───────────────────────────────────────────────────────────

export function NotesPage() {
  const { state } = useAuthStore()
  const db = state.userKey ? getNamespacedDB(state.userKey) : null

  const [notes, setNotes] = useState<Note[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTagIds, setActiveTagIds] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [showTagManager, setShowTagManager] = useState(false)

  const noteRepo = useMemo(() => (db ? new NoteRepository(db) : null), [db])
  const tagRepo = useMemo(() => (db ? new TagRepository(db) : null), [db])

  const [reloadTick, setReloadTick] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const triggerReload = useCallback(() => setReloadTick((t) => t + 1), [])

  useEffect(() => {
    if (!noteRepo || !tagRepo) return
    let cancelled = false

    Promise.all([noteRepo.findAll(), tagRepo.findAll()])
      .then(([allNotes, allTags]) => {
        if (cancelled) return
        allNotes.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return b.updatedAt - a.updatedAt
        })
        setNotes(allNotes)
        setTags(allTags)
        setIsLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : String(err))
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [noteRepo, tagRepo, reloadTick])

  // ─── Search + filter (pure, offline) ───────────────────────────────────────

  const displayedNotes = useMemo(() => {
    const searchItems: (NoteSearchItem & { tags: string[] })[] = notes
      .filter((n) => !n.isArchived)
      .map((n) => ({ id: n.id, title: n.title, content: n.content, tags: n.tags }))

    // Tag filter first
    const tagFiltered =
      activeTagIds.length > 0
        ? filterNotesByTags(searchItems, activeTagIds).map((si) =>
            notes.find((n) => n.id === si.id)!,
          )
        : notes.filter((n) => !n.isArchived)

    // Text search
    if (!searchQuery.trim()) return tagFiltered

    const searchSource: (NoteSearchItem & { tags: string[] })[] = tagFiltered.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      tags: n.tags,
    }))
    const results = searchNotes(searchSource, searchQuery)
    return results.map((r) => notes.find((n) => n.id === r.item.id)!).filter(Boolean)
  }, [notes, searchQuery, activeTagIds])

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (data: { title: string; content: string; tags: string[] }) => {
      if (!noteRepo) return
      if (editingNote) {
        await noteRepo.update(editingNote.id, data)
      } else {
        await noteRepo.create({
          ...data,
          courseId: null,
          isPinned: false,
          isArchived: false,
        })
      }
      setShowForm(false)
      setEditingNote(null)
      triggerReload()
    },
    [noteRepo, editingNote, triggerReload],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      if (!noteRepo) return
      await noteRepo.delete(id)
      triggerReload()
    },
    [noteRepo, triggerReload],
  )

  const handlePin = useCallback(
    async (note: Note) => {
      if (!noteRepo) return
      await noteRepo.update(note.id, { isPinned: !note.isPinned })
      triggerReload()
    },
    [noteRepo, triggerReload],
  )

  const toggleTagFilter = (tagId: string) => {
    setActiveTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    )
  }

  if (!db || !state.userKey) {
    return (
      <div
        data-testid="notes-page"
        style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <p>Vui lòng đăng nhập để xem ghi chú</p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="notes-page" style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>📝 Ghi chú cá nhân</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            {notes.length} ghi chú • Tìm kiếm offline
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            data-testid="manage-tags-btn"
            style={S.btn}
            onClick={() => setShowTagManager(true)}
          >
            🏷️ Tags
          </button>
          <Link href="/" style={{ ...S.btn, textDecoration: 'none' }}>
            ← Trang chủ
          </Link>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            data-testid="notes-search-input"
            style={S.input}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Tìm kiếm ghi chú (offline)..."
          />
        </div>
        <button
          data-testid="add-note-btn"
          style={S.btnPrimary}
          onClick={() => {
            setEditingNote(null)
            setShowForm(true)
          }}
        >
          + Ghi chú mới
        </button>
      </div>

      {/* Tag filters */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
          {tags.map((tag) => (
            <button
              key={tag.id}
              data-testid={`filter-tag-${tag.name}`}
              style={{
                ...S.tag(tag.color),
                opacity: activeTagIds.includes(tag.id) ? 1 : 0.5,
                fontWeight: activeTagIds.includes(tag.id) ? 700 : 500,
              }}
              onClick={() => toggleTagFilter(tag.id)}
            >
              {activeTagIds.includes(tag.id) ? '✓ ' : ''}
              {tag.name}
            </button>
          ))}
          {activeTagIds.length > 0 && (
            <button
              style={{ ...S.btn, fontSize: '11px', padding: '2px 8px' }}
              onClick={() => setActiveTagIds([])}
            >
              Xóa lọc
            </button>
          )}
        </div>
      )}

      {/* Note Form (add/edit) */}
      {showForm && (
        <div style={{ ...S.card, borderColor: 'rgba(99,102,241,0.4)' }}>
          <div style={{ fontWeight: 700, marginBottom: '16px' }}>
            {editingNote ? '✏️ Sửa ghi chú' : '📝 Ghi chú mới'}
          </div>
          <NoteForm
            tags={tags}
            initial={editingNote}
            onSave={(d) => void handleSave(d)}
            onCancel={() => {
              setShowForm(false)
              setEditingNote(null)
            }}
          />
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div
          data-testid="notes-error-state"
          role="alert"
          style={{
            padding: '12px 16px',
            marginBottom: '1rem',
            borderRadius: '8px',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            fontSize: '14px',
          }}
        >
          ⚠️ Lỗi tải dữ liệu ghi chú: {loadError}
        </div>
      )}

      {/* Note List */}
      <div data-testid="note-list">
        {isLoading && notes.length === 0 ? (
          <div
            data-testid="notes-loading-skeleton"
            style={{
              ...S.card,
              textAlign: 'center',
              color: '#94a3b8',
              padding: '2.5rem',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
            <p>Đang tải danh sách ghi chú...</p>
          </div>
        ) : displayedNotes.length === 0 ? (
          <div
            data-testid="notes-empty-state"
            style={{
              ...S.card,
              textAlign: 'center',
              color: '#94a3b8',
              padding: '3rem',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {searchQuery ? '🔍' : '📝'}
            </div>
            <p>
              {searchQuery
                ? `Không tìm thấy ghi chú nào với từ khóa "${searchQuery}"`
                : 'Chưa có ghi chú nào. Nhấn "+ Ghi chú mới" để bắt đầu.'}
            </p>
          </div>
        ) : (
          displayedNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              tags={tags}
              onEdit={() => {
                setEditingNote(note)
                setShowForm(true)
              }}
              onDelete={() => void handleDelete(note.id)}
              onPin={() => void handlePin(note)}
            />
          ))
        )}
      </div>

      {/* Tag Manager Modal */}
      {showTagManager && (
        <TagManager
          tags={tags}
          onCreated={(tag) => setTags((prev) => [...prev, tag])}
          onClose={() => {
            setShowTagManager(false)
            triggerReload()
          }}
        />
      )}
    </div>
  )
}
