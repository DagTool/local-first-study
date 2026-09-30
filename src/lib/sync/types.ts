/**
 * Sync Engine — Type Definitions
 *
 * Mô tả kiến trúc đồng bộ:
 * - 1 file JSON duy nhất `studyflow-snapshot.json` trong Google Drive appDataFolder
 * - Snapshot = toàn bộ DB state tại một thời điểm
 * - Conflict resolution: Last Write Wins (LWW) theo `modifiedTime`
 */

import type { User, Semester, Course, GradeComponent, ScheduleSlot, Note, Tag } from '../db/schemas'

// ─── Snapshot Payload ─────────────────────────────────────────────────────────

/**
 * Toàn bộ DB state được serialize thành 1 JSON object.
 * Đây là đơn vị đồng bộ duy nhất giữa local và Drive.
 */
export interface SyncPayload {
  /** Schema version — tăng khi thay đổi cấu trúc SyncPayload */
  version: number
  /** Unix ms — thời điểm tạo snapshot này */
  modifiedTime: number
  /** Canonical email của owner (lowercase + trim) */
  userKey: string
  /** Dữ liệu của tất cả 7 tables */
  data: {
    users: User[]
    semesters: Semester[]
    courses: Course[]
    gradeComponents: GradeComponent[]
    scheduleSlots: ScheduleSlot[]
    notes: Note[]
    tags: Tag[]
  }
}

/** Version hiện tại của SyncPayload schema */
export const SYNC_PAYLOAD_VERSION = 1

/** Tên file cố định trong appDataFolder */
export const DRIVE_FILE_NAME = 'studyflow-snapshot.json'

// ─── Conflict Resolution ──────────────────────────────────────────────────────

/**
 * Kết quả phân tích xung đột giữa local và remote.
 *
 * - 'local'     : local mới hơn → push local lên Drive
 * - 'remote'    : remote mới hơn → pull remote về DB
 * - 'equal'     : cùng timestamp → không cần làm gì
 * - 'no-local'  : không có dữ liệu local → pull remote về
 * - 'no-remote' : không có dữ liệu remote → push local lên
 */
export type ConflictWinner = 'local' | 'remote' | 'equal' | 'no-local' | 'no-remote'

export interface ConflictResolution {
  /** Bên thắng xung đột */
  winner: ConflictWinner
  /**
   * Payload của bên thắng (để apply).
   * null khi winner='equal' (không cần apply gì)
   * null khi cả 2 đều null (winner='no-local', không có gì để pull)
   */
  payload: SyncPayload | null
}

// ─── Sync Result ──────────────────────────────────────────────────────────────

/** Kết quả của một chu trình đồng bộ */
export interface SyncResult {
  success: boolean
  /** Bên thắng xung đột (nếu sync thành công) */
  winner?: ConflictWinner
  /** Thông báo lỗi (nếu thất bại) */
  error?: string
  /** Thời gian thực thi toàn bộ cycle (ms) */
  durationMs?: number
}

// ─── Drive File Metadata ──────────────────────────────────────────────────────

/** Metadata của file trên Google Drive */
export interface DriveFileMetadata {
  id: string
  name: string
  modifiedTime: string // ISO 8601 string từ Drive API
}
