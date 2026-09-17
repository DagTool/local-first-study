/**
 * Integration Test — Schema Migration
 *
 * Kiểm tra: nâng version Dexie (v1 → v2) không mất dữ liệu cũ.
 *
 * Scenario:
 *   1. Tạo DB v1, insert Note với các field v1
 *   2. Đóng DB
 *   3. Mở DB v2 (thêm field `wordCount` vào notes store)
 *   4. Kiểm tra note cũ vẫn đọc được với đầy đủ field v1
 *   5. Note cũ có wordCount = undefined (field mới, backward compatible)
 *   6. Tạo note mới với wordCount → tìm được
 */
import { describe, it, expect } from 'vitest'
import 'fake-indexeddb/auto'
import Dexie from 'dexie'

// ── V1 DB ─────────────────────────────────────────────────────────────────────
interface NoteV1 {
  id: string
  title: string
  content: string
  tags: string[]
  courseId: string | null
  isPinned: boolean
  isArchived: boolean
  createdAt: number
  updatedAt: number
}

class StudyFlowDBv1 extends Dexie {
  notes!: Dexie.Table<NoteV1, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      notes: 'id, title, courseId, isPinned, isArchived, createdAt, updatedAt',
    })
  }
}

// ── V2 DB (thêm field wordCount vào notes) ────────────────────────────────────
interface NoteV2 extends NoteV1 {
  wordCount?: number // field mới — optional để backward compat
}

class StudyFlowDBv2 extends Dexie {
  notes!: Dexie.Table<NoteV2, string>

  constructor(name: string) {
    super(name)
    // V1 schema phải khai báo lại để migration hoạt động đúng
    this.version(1).stores({
      notes: 'id, title, courseId, isPinned, isArchived, createdAt, updatedAt',
    })
    // V2: thêm index wordCount, upgrade function set wordCount cho records cũ
    this.version(2)
      .stores({
        notes: 'id, title, courseId, isPinned, isArchived, createdAt, updatedAt, wordCount',
      })
      .upgrade(async (tx) => {
        // Set wordCount = 0 cho tất cả records cũ không có field này
        await tx
          .table('notes')
          .toCollection()
          .modify((note: NoteV2) => {
            if (note.wordCount === undefined) {
              note.wordCount = 0
            }
          })
      })
  }
}

describe('Database Migration — v1 → v2', () => {
  const DB_NAME = `migration-test-${Math.random().toString(36).slice(2)}`

  const noteV1Data: NoteV1 = {
    id: 'note-migration-1',
    title: 'Ghi chú migration test',
    content: '<p>Nội dung test</p>',
    tags: ['tag-1'],
    courseId: null,
    isPinned: false,
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  it('v1 data vẫn đọc được sau khi migrate lên v2', async () => {
    // ── Step 1: Tạo DB v1 và insert data ─────────────────────────────────────
    const dbV1 = new StudyFlowDBv1(DB_NAME)
    await dbV1.notes.add(noteV1Data)

    // Verify data tồn tại trong v1
    const inV1 = await dbV1.notes.get(noteV1Data.id)
    expect(inV1).toBeDefined()
    expect(inV1?.title).toBe(noteV1Data.title)

    // Đóng DB v1 trước khi mở v2 (tránh VersionError)
    dbV1.close()

    // ── Step 2: Mở DB v2 (migration tự động chạy) ────────────────────────────
    const dbV2 = new StudyFlowDBv2(DB_NAME)

    // ── Step 3: Kiểm tra note cũ vẫn đọc được ───────────────────────────────
    const migratedNote = await dbV2.notes.get(noteV1Data.id)
    expect(migratedNote).toBeDefined()
    expect(migratedNote?.id).toBe(noteV1Data.id)
    expect(migratedNote?.title).toBe(noteV1Data.title)
    expect(migratedNote?.content).toBe(noteV1Data.content)
    expect(migratedNote?.tags).toEqual(noteV1Data.tags)
    expect(migratedNote?.isPinned).toBe(noteV1Data.isPinned)

    // ── Step 4: Field mới wordCount được set bởi upgrade function ────────────
    expect(migratedNote?.wordCount).toBe(0) // upgrade fn set 0 cho records cũ

    // ── Step 5: Tạo note mới với wordCount ───────────────────────────────────
    const newNoteId = 'note-v2-new'
    await dbV2.notes.add({
      ...noteV1Data,
      id: newNoteId,
      title: 'Note V2 mới',
      wordCount: 42,
    })

    const newNote = await dbV2.notes.get(newNoteId)
    expect(newNote?.wordCount).toBe(42)

    // ── Step 6: Tổng số records vẫn đúng (1 cũ + 1 mới) ─────────────────────
    const allNotes = await dbV2.notes.toArray()
    expect(allNotes.length).toBe(2)

    dbV2.close()
    await dbV2.delete()
  })

  it('tất cả records cũ nhận wordCount = 0 sau migration', async () => {
    const dbName = `migration-bulk-${Math.random().toString(36).slice(2)}`
    const db1 = new StudyFlowDBv1(dbName)

    // Insert 3 notes v1
    await db1.notes.bulkAdd([
      { ...noteV1Data, id: 'm1', title: 'Note 1' },
      { ...noteV1Data, id: 'm2', title: 'Note 2' },
      { ...noteV1Data, id: 'm3', title: 'Note 3' },
    ])
    db1.close()

    const db2 = new StudyFlowDBv2(dbName)
    const all = await db2.notes.toArray()
    expect(all.length).toBe(3)
    all.forEach((note) => {
      expect(note.wordCount).toBe(0) // tất cả đều được upgrade
    })

    db2.close()
    await db2.delete()
  })
})
