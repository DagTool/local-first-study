/**
 * Integration Tests — Notes: create → tag → filter
 *
 * Test luồng: tạo note → gắn tag → lọc theo tag trả về đúng note.
 * Dùng real Dexie + fake-indexeddb (không mock).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestDB } from '@/tests/db/helpers'
import type { StudyFlowDB } from '@/lib/db'
import { NoteRepository } from '@/lib/db/repositories'
import { TagRepository } from '@/lib/db/repositories'
import { filterNotesByTags, searchNotes } from '@/lib/notes/noteSearch'
import type { NoteSearchItem } from '@/lib/notes/noteSearch'
import type { TipTapDoc } from '@/lib/notes/noteSerializer'

let db: StudyFlowDB

beforeEach(() => {
  db = createTestDB()
})

afterEach(async () => {
  await db.delete()
})

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeTipTapDoc(text: string): string {
  const doc: TipTapDoc = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }
  return JSON.stringify(doc)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Notes Integration — create → tag → filter', () => {
  it('I1: tạo note, gắn tag, lọc theo tag ID → trả về đúng note', async () => {
    const tagRepo = new TagRepository(db)
    const noteRepo = new NoteRepository(db)

    // Tạo 2 tags
    const tagA = await tagRepo.create({ name: 'Toán', color: '#6366f1' })
    const tagB = await tagRepo.create({ name: 'Lý', color: '#f59e0b' })

    // Tạo 2 notes với tags khác nhau
    const note1 = await noteRepo.create({
      title: 'Ghi chú Toán',
      content: makeTipTapDoc('Nội dung toán học'),
      tags: [tagA.id],
      courseId: null,
      isPinned: false,
      isArchived: false,
    })

    const note2 = await noteRepo.create({
      title: 'Ghi chú Vật Lý',
      content: makeTipTapDoc('Nội dung vật lý đại cương'),
      tags: [tagB.id],
      courseId: null,
      isPinned: false,
      isArchived: false,
    })

    // Lọc theo tagA
    const allNotes = await noteRepo.findAll()
    const searchItems: (NoteSearchItem & { tags: string[] })[] = allNotes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      tags: n.tags,
    }))

    const filtered = filterNotesByTags(searchItems, [tagA.id])
    const ids = filtered.map((n) => n.id)

    expect(ids).toContain(note1.id)
    expect(ids).not.toContain(note2.id)
  })

  it('I2: tạo note → full-text search tìm theo nội dung TipTap', async () => {
    const noteRepo = new NoteRepository(db)

    await noteRepo.create({
      title: 'Tích phân bội',
      content: makeTipTapDoc('Đạo hàm riêng theo biến x và y, tích phân hai lớp'),
      tags: [],
      courseId: null,
      isPinned: false,
      isArchived: false,
    })

    await noteRepo.create({
      title: 'React State Management',
      content: makeTipTapDoc('useState useReducer và Redux là các pattern quản lý state'),
      tags: [],
      courseId: null,
      isPinned: false,
      isArchived: false,
    })

    const allNotes = await noteRepo.findAll()
    const searchItems: NoteSearchItem[] = allNotes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
    }))

    // Tìm "tích phân" → phải ra note toán học
    const results = searchNotes(searchItems, 'tích phân')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].item.title).toContain('Tích phân')
  })

  it('I3: note bị archive → vẫn có thể tìm (archive filter là UI concern)', async () => {
    const noteRepo = new NoteRepository(db)

    const archived = await noteRepo.create({
      title: 'Ghi chú cũ đã lưu trữ',
      content: makeTipTapDoc('Nội dung đã archive'),
      tags: [],
      courseId: null,
      isPinned: false,
      isArchived: true,
    })

    const allNotes = await noteRepo.findAll()
    const searchItems: NoteSearchItem[] = allNotes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
    }))

    const results = searchNotes(searchItems, 'archive')
    const ids = results.map((r) => r.item.id)
    expect(ids).toContain(archived.id)
  })

  it('I4: update note content → search theo nội dung mới', async () => {
    const noteRepo = new NoteRepository(db)

    const note = await noteRepo.create({
      title: 'Ghi chú ban đầu',
      content: makeTipTapDoc('Nội dung gốc ban đầu'),
      tags: [],
      courseId: null,
      isPinned: false,
      isArchived: false,
    })

    // Update content
    await noteRepo.update(note.id, {
      content: makeTipTapDoc('Nội dung đã được cập nhật với thông tin mới'),
    })

    const allNotes = await noteRepo.findAll()
    const searchItems: NoteSearchItem[] = allNotes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
    }))

    // Search theo nội dung mới
    const results = searchNotes(searchItems, 'cập nhật thông tin')
    const ids = results.map((r) => r.item.id)
    expect(ids).toContain(note.id)
  })
})
