/**
 * Unit tests — serializer: dumpDB() + restoreDB()
 *
 * TDD: viết test trước, chạy RED, sau đó implement để GREEN.
 *
 * Coverage:
 *   S1: dumpDB trên DB rỗng → payload có arrays rỗng, cấu trúc đúng
 *   S2: dumpDB với 1 note → note xuất hiện trong payload
 *   S3: dumpDB với multi-table data → tất cả tables trong payload
 *   S4: dumpDB → payload.modifiedTime là số hợp lệ (Unix ms)
 *   S5: dumpDB → payload.userKey khớp input
 *   S6: dumpDB → payload.version = SYNC_PAYLOAD_VERSION
 *   S7: restoreDB → DB có đúng dữ liệu sau restore
 *   S8: restoreDB → overwrite dữ liệu cũ (bulkPut semantics)
 *   S9: roundtrip idempotent: dumpDB → restoreDB → dumpDB → cùng data
 *   S10: restoreDB với payload rỗng → DB tables rỗng sau restore
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StudyFlowDB } from '@/lib/db'
import { dumpDB, restoreDB } from '@/lib/sync/serializer'
import { SYNC_PAYLOAD_VERSION } from '@/lib/sync/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createTestDB(): StudyFlowDB {
  return new StudyFlowDB(`test-sync-db-${Math.random().toString(36).slice(2)}`)
}

const TEST_USER_KEY = 'test@example.com'
const BASE_TIME = 1_700_000_000_000

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('dumpDB', () => {
  let db: StudyFlowDB

  beforeEach(() => {
    db = createTestDB()
  })

  afterEach(async () => {
    await db.delete()
  })

  // S1: DB rỗng → payload có arrays rỗng
  it('S1: DB rỗng → tất cả arrays trong payload đều rỗng', async () => {
    const payload = await dumpDB(db, TEST_USER_KEY)

    expect(payload.data.users).toEqual([])
    expect(payload.data.semesters).toEqual([])
    expect(payload.data.courses).toEqual([])
    expect(payload.data.gradeComponents).toEqual([])
    expect(payload.data.scheduleSlots).toEqual([])
    expect(payload.data.notes).toEqual([])
    expect(payload.data.tags).toEqual([])
  })

  // S2: dumpDB với 1 note → note xuất hiện trong payload
  it('S2: có 1 note trong DB → note xuất hiện trong payload', async () => {
    const note = {
      id: 'note-1',
      title: 'Test Note',
      content: 'Hello World',
      tags: [],
      courseId: null,
      isPinned: false,
      isArchived: false,
      createdAt: BASE_TIME,
      updatedAt: BASE_TIME,
    }
    await db.notes.add(note)

    const payload = await dumpDB(db, TEST_USER_KEY)

    expect(payload.data.notes).toHaveLength(1)
    expect(payload.data.notes[0]).toMatchObject(note)
  })

  // S3: dumpDB với multi-table data → tất cả tables trong payload
  it('S3: multi-table data → tất cả tables được serialize', async () => {
    await db.tags.add({
      id: 'tag-1',
      name: 'Tag A',
      createdAt: BASE_TIME,
      updatedAt: BASE_TIME,
    })
    await db.notes.add({
      id: 'note-1',
      title: 'Note 1',
      content: '',
      tags: ['tag-1'],
      courseId: null,
      isPinned: false,
      isArchived: false,
      createdAt: BASE_TIME,
      updatedAt: BASE_TIME,
    })

    const payload = await dumpDB(db, TEST_USER_KEY)

    expect(payload.data.tags).toHaveLength(1)
    expect(payload.data.notes).toHaveLength(1)
    expect(payload.data.tags[0].name).toBe('Tag A')
  })

  // S4: modifiedTime là Unix ms hợp lệ
  it('S4: payload.modifiedTime là timestamp hợp lệ gần thời điểm hiện tại', async () => {
    const before = Date.now()
    const payload = await dumpDB(db, TEST_USER_KEY)
    const after = Date.now()

    expect(payload.modifiedTime).toBeGreaterThanOrEqual(before)
    expect(payload.modifiedTime).toBeLessThanOrEqual(after)
  })

  // S5: payload.userKey khớp input
  it('S5: payload.userKey = userKey được truyền vào', async () => {
    const payload = await dumpDB(db, 'specific@user.com')
    expect(payload.userKey).toBe('specific@user.com')
  })

  // S6: payload.version = SYNC_PAYLOAD_VERSION
  it('S6: payload.version = SYNC_PAYLOAD_VERSION', async () => {
    const payload = await dumpDB(db, TEST_USER_KEY)
    expect(payload.version).toBe(SYNC_PAYLOAD_VERSION)
  })
})

describe('restoreDB', () => {
  let db: StudyFlowDB

  beforeEach(() => {
    db = createTestDB()
  })

  afterEach(async () => {
    await db.delete()
  })

  // S7: restoreDB → DB có đúng dữ liệu sau restore
  it('S7: restoreDB → DB chứa đúng dữ liệu từ payload', async () => {
    const payload = {
      version: SYNC_PAYLOAD_VERSION,
      modifiedTime: BASE_TIME,
      userKey: TEST_USER_KEY,
      data: {
        users: [],
        semesters: [],
        courses: [],
        gradeComponents: [],
        scheduleSlots: [],
        notes: [
          {
            id: 'note-restore-1',
            title: 'Restored Note',
            content: 'Content',
            tags: [],
            courseId: null,
            isPinned: false,
            isArchived: false,
            createdAt: BASE_TIME,
            updatedAt: BASE_TIME,
          },
        ],
        tags: [],
      },
    }

    await restoreDB(db, payload)

    const notes = await db.notes.toArray()
    expect(notes).toHaveLength(1)
    expect(notes[0].title).toBe('Restored Note')
  })

  // S8: restoreDB → overwrite dữ liệu cũ
  it('S8: restoreDB overwrites existing data (bulkPut semantics)', async () => {
    // Thêm note cũ
    await db.notes.add({
      id: 'note-old',
      title: 'Old Note',
      content: 'Old',
      tags: [],
      courseId: null,
      isPinned: false,
      isArchived: false,
      createdAt: BASE_TIME - 1000,
      updatedAt: BASE_TIME - 1000,
    })

    // Restore payload với note mới (cùng id → overwrite)
    await restoreDB(db, {
      version: SYNC_PAYLOAD_VERSION,
      modifiedTime: BASE_TIME,
      userKey: TEST_USER_KEY,
      data: {
        users: [],
        semesters: [],
        courses: [],
        gradeComponents: [],
        scheduleSlots: [],
        notes: [
          {
            id: 'note-old',
            title: 'Updated Note',
            content: 'New content',
            tags: [],
            courseId: null,
            isPinned: true,
            isArchived: false,
            createdAt: BASE_TIME - 1000,
            updatedAt: BASE_TIME,
          },
        ],
        tags: [],
      },
    })

    const notes = await db.notes.toArray()
    expect(notes).toHaveLength(1)
    expect(notes[0].title).toBe('Updated Note')
    expect(notes[0].isPinned).toBe(true)
  })

  // S9: roundtrip idempotent
  it('S9: roundtrip dumpDB → restoreDB → dumpDB cho cùng data', async () => {
    // Setup initial data
    await db.tags.add({
      id: 'tag-rt',
      name: 'Roundtrip Tag',
      createdAt: BASE_TIME,
      updatedAt: BASE_TIME,
    })
    await db.notes.add({
      id: 'note-rt',
      title: 'Roundtrip Note',
      content: 'Test content',
      tags: ['tag-rt'],
      courseId: null,
      isPinned: true,
      isArchived: false,
      createdAt: BASE_TIME,
      updatedAt: BASE_TIME,
    })

    // First dump
    const dump1 = await dumpDB(db, TEST_USER_KEY)

    // Restore into fresh DB
    const db2 = createTestDB()
    await restoreDB(db2, dump1)

    // Second dump từ DB đã restore
    const dump2 = await dumpDB(db2, TEST_USER_KEY)

    // Data phải giống nhau (modifiedTime có thể khác nhau vì dumpDB luôn dùng Date.now())
    expect(dump2.data.notes).toEqual(dump1.data.notes)
    expect(dump2.data.tags).toEqual(dump1.data.tags)

    await db2.delete()
  })

  // S10: restoreDB với payload rỗng → DB tables rỗng
  it('S10: restoreDB với payload rỗng → DB tables rỗng', async () => {
    // Có sẵn dữ liệu
    await db.tags.add({
      id: 'tag-existing',
      name: 'Existing',
      createdAt: BASE_TIME,
      updatedAt: BASE_TIME,
    })

    const emptyPayload = {
      version: SYNC_PAYLOAD_VERSION,
      modifiedTime: BASE_TIME,
      userKey: TEST_USER_KEY,
      data: {
        users: [],
        semesters: [],
        courses: [],
        gradeComponents: [],
        scheduleSlots: [],
        notes: [],
        tags: [],
      },
    }

    await restoreDB(db, emptyPayload)

    // Tags bị clear và replace với empty
    const tags = await db.tags.toArray()
    expect(tags).toHaveLength(0)
  })
})
