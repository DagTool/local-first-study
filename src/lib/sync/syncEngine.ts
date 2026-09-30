/**
 * Sync Engine Orchestrator
 *
 * Điều phối toàn bộ chu trình đồng bộ:
 *   1. dumpDB()       — serialize local DB → SyncPayload
 *   2. readDriveSnapshot() — lấy remote snapshot
 *   3. resolveConflict()  — LWW decision
 *   4. apply winner:
 *      - local/no-remote → writeDriveSnapshot()
 *      - remote/no-local → restoreDB()
 *      - equal           → nothing
 *
 * Retry strategy: exponential backoff với jitter.
 *   Delay = base * 2^attempt + jitter (0-200ms)
 *   Delays: ~500ms, ~1000ms, ~2000ms (maxRetries=3)
 *
 * Không retry DriveAuthError (401) — cần user re-authenticate.
 */

import type { StudyFlowDB } from '../db/index'
import type { SyncResult, SyncPayload } from './types'
import { dumpDB, restoreDB } from './serializer'
import { resolveConflict } from './conflictResolver'
import { readDriveSnapshot, writeDriveSnapshot } from './driveClient'

// ─── Retry Config ─────────────────────────────────────────────────────────────

const DEFAULT_MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 500

/** Sleep helper */
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Tính delay cho lần retry thứ `attempt` (0-indexed).
 * Exponential backoff: base * 2^attempt + jitter
 */
function calcRetryDelay(attempt: number): number {
  const base = RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
  const jitter = Math.random() * 200
  return base + jitter
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Kiểm tra xem một SyncPayload có rỗng không (tất cả tables đều []).
 * Nếu DB rỗng, trong conflict resolution cần treat như null (no-local)
 * để không bị override remote bởi một snapshot rỗng có Date.now() mới hơn.
 */
function isEmptyPayload(payload: SyncPayload): boolean {
  const { data } = payload
  return (
    data.users.length === 0 &&
    data.semesters.length === 0 &&
    data.courses.length === 0 &&
    data.gradeComponents.length === 0 &&
    data.scheduleSlots.length === 0 &&
    data.notes.length === 0 &&
    data.tags.length === 0
  )
}

// ─── SyncEngine ───────────────────────────────────────────────────────────────

export class SyncEngine {
  constructor(
    private readonly db: StudyFlowDB,
    private readonly userKey: string,
    private readonly getAccessToken: () => string | null,
  ) {}

  /**
   * Chạy 1 chu trình đồng bộ đầy đủ.
   * Không retry — dùng syncWithRetry() nếu cần retry.
   *
   * @returns SyncResult với success, winner, durationMs
   */
  async sync(): Promise<SyncResult> {
    const startTime = Date.now()

    const accessToken = this.getAccessToken()
    if (!accessToken) {
      return {
        success: false,
        error: 'No access token available. Please sign in.',
        durationMs: Date.now() - startTime,
      }
    }

    try {
      // Bước 1: Dump local DB
      const localSnapshot: SyncPayload = await dumpDB(this.db, this.userKey)

      // Bước 2: Đọc remote snapshot
      const remoteSnapshot: SyncPayload | null = await readDriveSnapshot(accessToken)

      // Bước 3: Resolve conflict
      // Nếu local DB rỗng → treat như null (no-local) để remote có thể pull về
      const localForResolution = isEmptyPayload(localSnapshot) ? null : localSnapshot
      const resolution = resolveConflict(localForResolution, remoteSnapshot)

      // Bước 4: Apply resolution
      switch (resolution.winner) {
        case 'local':
        case 'no-remote':
          // Local thắng → push lên Drive
          await writeDriveSnapshot(accessToken, localSnapshot)
          break

        case 'remote':
        case 'no-local':
          // Remote thắng → pull về DB (nếu có payload)
          if (resolution.payload !== null) {
            await restoreDB(this.db, resolution.payload)
          }
          break

        case 'equal':
          // Không cần làm gì
          break
      }

      return {
        success: true,
        winner: resolution.winner,
        durationMs: Date.now() - startTime,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        error: message,
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Sync với exponential backoff retry.
   * Không retry khi gặp DriveAuthError (401) — cần re-authenticate.
   *
   * @param maxRetries - Số lần retry tối đa (default: 3)
   * @returns SyncResult của lần thành công hoặc lỗi cuối cùng
   */
  async syncWithRetry(maxRetries = DEFAULT_MAX_RETRIES): Promise<SyncResult> {
    let lastResult: SyncResult = { success: false, error: 'Not started' }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Delay trước retry (không delay lần đầu)
      if (attempt > 0) {
        await sleep(calcRetryDelay(attempt - 1))
      }

      const result = await this.sync()

      if (result.success) {
        return result
      }

      lastResult = result

      // Không retry DriveAuthError
      if (result.error?.match(/401|auth|unauthorized/i)) {
        return result
      }
    }

    return lastResult
  }
}
