/**
 * Unit tests — driveClient: readDriveSnapshot() + writeDriveSnapshot()
 *
 * TDD: viết test trước, chạy RED, sau đó implement để GREEN.
 * MSW mock toàn bộ Drive API v3 — không có network thật.
 *
 * Coverage:
 *   D1: readDriveSnapshot khi Drive trống → null
 *   D2: readDriveSnapshot khi có file → trả về SyncPayload đúng
 *   D3: writeDriveSnapshot khi chưa có file → tạo mới (POST)
 *   D4: writeDriveSnapshot khi đã có file → update (PATCH)
 *   D5: writeDriveSnapshot → Drive store chứa đúng payload sau khi ghi
 *   D6: readDriveSnapshot sau writeDriveSnapshot → roundtrip consistent
 *   D7: 401 Unauthorized → throw error với message auth
 *   D8: Network error → throw error
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { mswServer } from '@/tests/mocks/server'
import {
  resetDriveStore,
  seedDriveStore,
  getDriveStore,
  make401Handler,
  makeNetworkErrorHandler,
} from '@/tests/mocks/drive-handlers'
import { readDriveSnapshot, writeDriveSnapshot } from '@/lib/sync/driveClient'
import type { SyncPayload } from '@/lib/sync/types'
import { SYNC_PAYLOAD_VERSION } from '@/lib/sync/types'

// ─── MSW Setup ────────────────────────────────────────────────────────────────

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterAll(() => mswServer.close())
beforeEach(() => {
  mswServer.resetHandlers()
  resetDriveStore()
})

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FAKE_TOKEN = 'fake-access-token-test'
const BASE_TIME = 1_700_000_000_000

function makePayload(modifiedTime = BASE_TIME): SyncPayload {
  return {
    version: SYNC_PAYLOAD_VERSION,
    modifiedTime,
    userKey: 'test@example.com',
    data: {
      users: [],
      semesters: [],
      courses: [],
      gradeComponents: [],
      scheduleSlots: [],
      notes: [
        {
          id: 'note-drive-test',
          title: 'Drive Test Note',
          content: 'Hello from Drive',
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
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('readDriveSnapshot', () => {
  // D1: Drive trống → null
  it('D1: Drive trống (không có file) → trả về null', async () => {
    // driveStore đã reset (rỗng)
    const result = await readDriveSnapshot(FAKE_TOKEN)
    expect(result).toBeNull()
  })

  // D2: Có file trên Drive → trả về SyncPayload đúng
  it('D2: Drive có file → trả về SyncPayload đúng', async () => {
    const payload = makePayload()
    seedDriveStore(payload)

    const result = await readDriveSnapshot(FAKE_TOKEN)

    expect(result).not.toBeNull()
    expect(result?.version).toBe(SYNC_PAYLOAD_VERSION)
    expect(result?.userKey).toBe('test@example.com')
    expect(result?.data.notes).toHaveLength(1)
    expect(result?.data.notes[0].title).toBe('Drive Test Note')
  })
})

describe('writeDriveSnapshot', () => {
  // D3: Chưa có file → tạo mới (POST)
  it('D3: Drive trống → writeDriveSnapshot tạo file mới', async () => {
    const payload = makePayload()
    // Drive rỗng, chưa có file
    expect(getDriveStore()).toBeNull()

    await writeDriveSnapshot(FAKE_TOKEN, payload)

    // Drive store phải có file sau khi ghi
    const stored = getDriveStore()
    expect(stored).not.toBeNull()
  })

  // D4: Đã có file → update (PATCH)
  it('D4: Drive đã có file → writeDriveSnapshot cập nhật file hiện có', async () => {
    // Seed file đầu tiên
    const existingPayload = makePayload(BASE_TIME)
    seedDriveStore(existingPayload)
    const existingId = getDriveStore()?.id

    // Write payload mới
    const newPayload = makePayload(BASE_TIME + 10000)
    await writeDriveSnapshot(FAKE_TOKEN, newPayload)

    // ID phải giữ nguyên (PATCH không tạo file mới)
    const stored = getDriveStore()
    expect(stored?.id).toBe(existingId)
  })

  // D5: Drive store chứa đúng payload sau khi ghi
  it('D5: writeDriveSnapshot → Drive store chứa đúng content', async () => {
    const payload = makePayload()
    await writeDriveSnapshot(FAKE_TOKEN, payload)

    const stored = getDriveStore()
    expect(stored?.content.userKey).toBe('test@example.com')
    expect(stored?.content.data.notes[0].title).toBe('Drive Test Note')
  })

  // D6: Roundtrip write → read consistent
  it('D6: write → read roundtrip → data nhất quán', async () => {
    const payload = makePayload(BASE_TIME + 5000)
    await writeDriveSnapshot(FAKE_TOKEN, payload)

    const readBack = await readDriveSnapshot(FAKE_TOKEN)

    expect(readBack).not.toBeNull()
    expect(readBack?.modifiedTime).toBe(BASE_TIME + 5000)
    expect(readBack?.data.notes).toHaveLength(1)
    expect(readBack?.data.notes[0].id).toBe('note-drive-test')
  })
})

describe('Error handling', () => {
  // D7: 401 Unauthorized → throw với message auth
  it('D7: 401 response → throw DriveAuthError', async () => {
    mswServer.use(make401Handler())

    await expect(readDriveSnapshot(FAKE_TOKEN)).rejects.toThrow(/401|auth|unauthorized/i)
  })

  // D8: Network error → throw
  it('D8: network error → throw', async () => {
    mswServer.use(makeNetworkErrorHandler())

    await expect(readDriveSnapshot(FAKE_TOKEN)).rejects.toThrow()
  })
})
