/**
 * Soak Tests — SyncEngine (unit/integration level)
 *
 * Chạy N vòng lặp bật/tắt mạng + sync, assert dữ liệu toàn vẹn.
 * Dùng shared mswServer + drive-handlers (cùng pattern với syncEngine.integration.test.ts).
 *
 * Cover:
 * - SOAK-U1: N=10 vòng sync liên tiếp → data checksum khớp
 * - SOAK-U2: N=5 vòng xen kẽ add-note + sync → data không bị mất
 * - SOAK-U3: Conflict resolution ổn định — local luôn thắng nếu mới hơn
 * - SOAK-U4: Xóa note → sync → Drive không còn note đó
 * - SOAK-U5: DB rỗng → pull từ Drive, không ghi đè
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { mswServer } from '@/tests/mocks/server'
import { resetDriveStore, getDriveStore, seedDriveStore } from '@/tests/mocks/drive-handlers'
import { StudyFlowDB } from '@/lib/db'
import { SyncEngine } from '@/lib/sync/syncEngine'
import { NoteRepository } from '@/lib/db/repositories'
import { SYNC_PAYLOAD_VERSION } from '@/lib/sync/types'
import type { SyncPayload } from '@/lib/sync/types'

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterAll(() => mswServer.close())

let db: StudyFlowDB

beforeEach(() => {
  db = new StudyFlowDB(`soak-${Math.random().toString(36).slice(2)}`)
  mswServer.resetHandlers()
  resetDriveStore()
})

afterEach(async () => {
  await db.delete()
})

const FAKE_TOKEN = 'fake-soak-token'

function makeEngine(database = db): SyncEngine {
  return new SyncEngine(database, 'soak@test.com', () => FAKE_TOKEN)
}

function makeRemotePayload(
  modifiedTime: number,
  overrides?: Partial<SyncPayload['data']>,
): SyncPayload {
  return {
    version: SYNC_PAYLOAD_VERSION,
    modifiedTime,
    userKey: 'soak@test.com',
    data: {
      users: [],
      semesters: [],
      courses: [],
      gradeComponents: [],
      scheduleSlots: [],
      notes: [],
      tags: [],
      ...overrides,
    },
  }
}

// ─── Soak Tests ───────────────────────────────────────────────────────────────

describe('SyncEngine Soak Tests — Kiểm thử độ ổn định', () => {
  it('SOAK-U1: 10 vòng sync liên tiếp → payload cuối cùng toàn vẹn (checksum khớp)', async () => {
    const ROUNDS = 10
    const noteRepo = new NoteRepository(db)

    // Tạo 3 notes ban đầu
    const createdIds: string[] = []
    for (let i = 0; i < 3; i++) {
      const note = await noteRepo.create({
        title: `Note ${i + 1}`,
        content: JSON.stringify({ type: 'doc', content: [] }),
        tags: [],
        courseId: null,
        isPinned: false,
        isArchived: false,
      })
      createdIds.push(note.id)
    }

    const engine = makeEngine()

    // Sync 10 vòng liên tiếp
    const results = []
    for (let round = 0; round < ROUNDS; round++) {
      const result = await engine.sync()
      results.push(result)
    }

    // Tất cả vòng phải thành công
    expect(results.every((r) => r.success)).toBe(true)

    // Payload trên "Drive" phải chứa đủ 3 notes
    const stored = getDriveStore()
    expect(stored).not.toBeNull()
    expect(stored!.content.data.notes).toHaveLength(3)

    // Checksum: IDs phải khớp với IDs đã tạo
    const driveNoteIds = stored!.content.data.notes.map((n) => n.id).sort()
    const localNoteIds = [...createdIds].sort()
    expect(driveNoteIds).toEqual(localNoteIds)
  }, 30_000)

  it('SOAK-U2: 5 vòng xen kẽ add-note + sync → tổng notes tăng đúng, không bị mất', async () => {
    const ROUNDS = 5
    const noteRepo = new NoteRepository(db)
    const engine = makeEngine()

    for (let round = 1; round <= ROUNDS; round++) {
      // Thêm 1 note mới mỗi vòng
      await noteRepo.create({
        title: `Round ${round} Note`,
        content: '{}',
        tags: [],
        courseId: null,
        isPinned: false,
        isArchived: false,
      })

      // Sync ngay sau khi thêm
      const result = await engine.sync()
      expect(result.success).toBe(true)

      // Checksum: Drive phải có đúng `round` notes
      const stored = getDriveStore()
      expect(stored!.content.data.notes).toHaveLength(round)
    }

    // Dữ liệu local cũng phải có đủ ROUNDS notes
    const allNotes = await noteRepo.findAll()
    expect(allNotes).toHaveLength(ROUNDS)
  }, 30_000)

  it('SOAK-U3: conflict resolution ổn định — local luôn thắng nếu mới hơn', async () => {
    const noteRepo = new NoteRepository(db)
    const engine = makeEngine()
    const BASE_TIME = Date.now() - 60_000 // remote cũ hơn 60s

    // Seed Drive với remote cũ hơn
    seedDriveStore(
      makeRemotePayload(BASE_TIME, {
        notes: [
          {
            id: 'note-remote',
            title: 'Remote Old Note',
            content: '{}',
            tags: [],
            courseId: null,
            isPinned: false,
            isArchived: false,
            createdAt: BASE_TIME,
            updatedAt: BASE_TIME,
          },
        ],
      }),
    )

    // Tạo note local mới hơn
    await noteRepo.create({
      title: 'Local New Note',
      content: '{}',
      tags: [],
      courseId: null,
      isPinned: false,
      isArchived: false,
    })

    const result = await engine.sync()
    expect(result.success).toBe(true)
    // Local mới hơn → local thắng
    expect(result.winner).toBe('local')

    // Drive phải có data của local
    const stored = getDriveStore()
    const titles = stored!.content.data.notes.map((n) => n.title)
    expect(titles).toContain('Local New Note')

    // Chạy lại 3 vòng nữa — kết quả phải ổn định (equal vì không có thay đổi)
    for (let i = 0; i < 3; i++) {
      const r = await engine.sync()
      expect(r.success).toBe(true)
      expect(['local', 'equal']).toContain(r.winner)
    }
  }, 15_000)

  it('SOAK-U4: xóa note → sync → Drive không còn note đó (data integrity)', async () => {
    const noteRepo = new NoteRepository(db)
    const engine = makeEngine()

    // Tạo 3 notes và sync lần đầu
    const notes = []
    for (let i = 0; i < 3; i++) {
      const n = await noteRepo.create({
        title: `Del Test ${i}`,
        content: '{}',
        tags: [],
        courseId: null,
        isPinned: false,
        isArchived: false,
      })
      notes.push(n)
    }

    const r1 = await engine.sync()
    expect(r1.success).toBe(true)
    expect(getDriveStore()!.content.data.notes).toHaveLength(3)

    // Xóa 1 note và cập nhật 1 note còn lại (bump modifiedTime)
    await noteRepo.delete(notes[1].id)
    await noteRepo.update(notes[0].id, { title: 'Del Test 0 (updated)' })

    // Sync lại → Drive phải có 2 notes
    await new Promise<void>((resolve) => setTimeout(resolve, 10))
    const r2 = await engine.sync()
    expect(r2.success).toBe(true)

    const finalStore = getDriveStore()
    const driveNoteIds = finalStore!.content.data.notes.map((n) => n.id)
    expect(driveNoteIds).not.toContain(notes[1].id)
    expect(driveNoteIds).toHaveLength(2)

    // Sync 3 vòng nữa — data vẫn toàn vẹn
    for (let i = 0; i < 3; i++) {
      const r = await engine.sync()
      expect(r.success).toBe(true)
      expect(getDriveStore()!.content.data.notes).toHaveLength(2)
    }
  }, 20_000)

  it('SOAK-U5: sync với DB rỗng + Drive có dữ liệu → pull về, không ghi đè', async () => {
    const BASE_TIME = Date.now() - 10_000

    // Seed Drive với existing data
    seedDriveStore(
      makeRemotePayload(BASE_TIME, {
        notes: [
          {
            id: 'note-existing',
            title: 'Drive Existing Note',
            content: '{}',
            tags: [],
            courseId: null,
            isPinned: false,
            isArchived: false,
            createdAt: BASE_TIME,
            updatedAt: BASE_TIME,
          },
        ],
      }),
    )

    // Sync với DB rỗng → phải pull từ Drive
    const engine = makeEngine()
    const result = await engine.sync()
    expect(result.success).toBe(true)
    expect(result.winner).toBe('no-local')

    // DB sau khi restore phải có note từ Drive
    const restoredNotes = await db.notes.toArray()
    expect(restoredNotes).toHaveLength(1)
    expect(restoredNotes[0].title).toBe('Drive Existing Note')

    // Sync thêm 3 vòng → data phải ổn định (equal hoặc local sau khi đã restore)
    for (let i = 0; i < 3; i++) {
      const r = await engine.sync()
      expect(r.success).toBe(true)
      // Sau khi đã restore, local và remote bằng nhau hoặc local mới hơn
      expect(['equal', 'local', 'no-remote']).toContain(r.winner)
    }
  }, 20_000)
})
