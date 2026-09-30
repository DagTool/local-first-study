/**
 * Unit tests — resolveConflict()
 *
 * TDD: viết test trước, chạy RED, sau đó implement để GREEN.
 *
 * Ma trận 5 cases (+ boundary + edge):
 *   T1: local=null, remote=payload  → no-local
 *   T2: local=payload, remote=null  → no-remote
 *   T3: local.time < remote.time    → remote wins
 *   T4: local.time > remote.time    → local wins
 *   T5: local.time === remote.time  → equal
 *   T6: both null                   → edge case
 *   T7: local mới hơn 1ms          → local wins (boundary)
 *   T8: remote mới hơn 1ms         → remote wins (boundary)
 */

import { describe, it, expect } from 'vitest'
import { resolveConflict } from '@/lib/sync/conflictResolver'
import type { SyncPayload } from '@/lib/sync/types'

// ─── Test Fixtures ────────────────────────────────────────────────────────────

function makePayload(modifiedTime: number, userKey = 'test@example.com'): SyncPayload {
  return {
    version: 1,
    modifiedTime,
    userKey,
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
}

const BASE_TIME = 1_700_000_000_000 // arbitrary fixed timestamp

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('resolveConflict — Last Write Wins', () => {
  // T1: Không có dữ liệu local → pull remote về
  it('T1: local=null, remote=payload → winner=no-local, payload=remote', () => {
    const remote = makePayload(BASE_TIME)
    const result = resolveConflict(null, remote)

    expect(result.winner).toBe('no-local')
    expect(result.payload).toBe(remote)
  })

  // T2: Không có dữ liệu remote → push local lên
  it('T2: local=payload, remote=null → winner=no-remote, payload=local', () => {
    const local = makePayload(BASE_TIME)
    const result = resolveConflict(local, null)

    expect(result.winner).toBe('no-remote')
    expect(result.payload).toBe(local)
  })

  // T3: Remote mới hơn local → pull remote về
  it('T3: remote.time > local.time → winner=remote, payload=remote', () => {
    const local = makePayload(BASE_TIME)
    const remote = makePayload(BASE_TIME + 5000) // remote 5s sau

    const result = resolveConflict(local, remote)

    expect(result.winner).toBe('remote')
    expect(result.payload).toBe(remote)
  })

  // T4: Local mới hơn remote → push local lên
  it('T4: local.time > remote.time → winner=local, payload=local', () => {
    const local = makePayload(BASE_TIME + 5000) // local 5s sau
    const remote = makePayload(BASE_TIME)

    const result = resolveConflict(local, remote)

    expect(result.winner).toBe('local')
    expect(result.payload).toBe(local)
  })

  // T5: Cùng timestamp → không làm gì
  it('T5: local.time === remote.time → winner=equal, payload=null', () => {
    const local = makePayload(BASE_TIME)
    const remote = makePayload(BASE_TIME)

    const result = resolveConflict(local, remote)

    expect(result.winner).toBe('equal')
    expect(result.payload).toBeNull()
  })

  // T6: Cả 2 đều null → edge case (không có gì để sync)
  it('T6: both null → winner=no-local, payload=null', () => {
    const result = resolveConflict(null, null)

    expect(result.winner).toBe('no-local')
    expect(result.payload).toBeNull()
  })

  // T7: Boundary — local mới hơn đúng 1ms
  it('T7: local newer by exactly 1ms → winner=local', () => {
    const local = makePayload(BASE_TIME + 1)
    const remote = makePayload(BASE_TIME)

    const result = resolveConflict(local, remote)

    expect(result.winner).toBe('local')
    expect(result.payload).toBe(local)
  })

  // T8: Boundary — remote mới hơn đúng 1ms
  it('T8: remote newer by exactly 1ms → winner=remote', () => {
    const local = makePayload(BASE_TIME)
    const remote = makePayload(BASE_TIME + 1)

    const result = resolveConflict(local, remote)

    expect(result.winner).toBe('remote')
    expect(result.payload).toBe(remote)
  })

  // T9: Kiểm tra payload chứa đúng dữ liệu của bên thắng
  it('T9: winner payload preserves correct data (not just timestamp)', () => {
    const local = makePayload(BASE_TIME + 1000, 'user-a@test.com')
    const remote = makePayload(BASE_TIME, 'user-a@test.com')
    // Inject some data
    local.data.tags = [
      {
        id: 'tag-local',
        name: 'LocalTag',
        createdAt: BASE_TIME,
        updatedAt: BASE_TIME,
      },
    ]
    remote.data.tags = [
      {
        id: 'tag-remote',
        name: 'RemoteTag',
        createdAt: BASE_TIME - 1000,
        updatedAt: BASE_TIME - 1000,
      },
    ]

    const result = resolveConflict(local, remote)

    expect(result.winner).toBe('local')
    expect(result.payload?.data.tags[0].name).toBe('LocalTag')
  })
})
