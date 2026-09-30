/**
 * DB Serializer — dumpDB() + restoreDB()
 *
 * dumpDB: Đọc toàn bộ Dexie DB → SyncPayload JSON
 * restoreDB: Ghi SyncPayload JSON → Dexie DB (dùng bulkPut để overwrite)
 *
 * Strategy restore:
 * - Dùng Dexie transaction để đảm bảo atomicity
 * - clear() rồi bulkPut() để đảm bảo state remote = state local sau restore
 * - Nếu có lỗi → transaction rollback tự động
 */

import type { StudyFlowDB } from '../db/index'
import { type SyncPayload, SYNC_PAYLOAD_VERSION } from './types'

/**
 * Tính max(updatedAt) trên tất cả entities trong data.
 * Dùng làm modifiedTime của SyncPayload.
 * Trả về Date.now() nếu không có entity nào (DB rỗng).
 */
function computeModifiedTime(data: SyncPayload['data']): number {
  const allEntities = [
    ...data.users,
    ...data.semesters,
    ...data.courses,
    ...data.gradeComponents,
    ...data.scheduleSlots,
    ...data.notes,
    ...data.tags,
  ]

  if (allEntities.length === 0) return Date.now()

  return Math.max(...allEntities.map((e) => e.updatedAt))
}

/**
 * Serialize toàn bộ Dexie DB thành SyncPayload.
 * Đọc song song từ tất cả 7 tables bằng Promise.all() để tối ưu tốc độ.
 *
 * modifiedTime = max(updatedAt) trên tất cả entities.
 * Điều này đảm bảo LWW hoạt động đúng: DB có record mới nhất sẽ thắng.
 *
 * @param db       - Dexie DB instance (đã mở)
 * @param userKey  - Canonical email key của user (lowercase + trim)
 * @returns        SyncPayload với modifiedTime = max(updatedAt)
 */
export async function dumpDB(db: StudyFlowDB, userKey: string): Promise<SyncPayload> {
  const [users, semesters, courses, gradeComponents, scheduleSlots, notes, tags] =
    await Promise.all([
      db.users.toArray(),
      db.semesters.toArray(),
      db.courses.toArray(),
      db.gradeComponents.toArray(),
      db.scheduleSlots.toArray(),
      db.notes.toArray(),
      db.tags.toArray(),
    ])

  const data = { users, semesters, courses, gradeComponents, scheduleSlots, notes, tags }

  return {
    version: SYNC_PAYLOAD_VERSION,
    modifiedTime: computeModifiedTime(data),
    userKey,
    data,
  }
}

/**
 * Restore SyncPayload vào Dexie DB.
 * Dùng Dexie transaction + clear + bulkPut để đảm bảo:
 * 1. Atomicity: hoặc tất cả thành công hoặc rollback
 * 2. State final = state trong payload (không có orphan records)
 *
 * ⚠️  Destructive: xóa toàn bộ dữ liệu cũ trước khi ghi mới.
 *     Chỉ gọi sau khi conflict resolution đã xác nhận remote thắng.
 *
 * @param db      - Dexie DB instance (đã mở)
 * @param payload - SyncPayload từ Google Drive
 */
export async function restoreDB(db: StudyFlowDB, payload: SyncPayload): Promise<void> {
  await db.transaction(
    'rw',
    [db.users, db.semesters, db.courses, db.gradeComponents, db.scheduleSlots, db.notes, db.tags],
    async () => {
      // Clear tất cả tables trước
      await Promise.all([
        db.users.clear(),
        db.semesters.clear(),
        db.courses.clear(),
        db.gradeComponents.clear(),
        db.scheduleSlots.clear(),
        db.notes.clear(),
        db.tags.clear(),
      ])

      // BulkPut từng table (chỉ put nếu có dữ liệu)
      const { data } = payload
      await Promise.all([
        data.users.length > 0 ? db.users.bulkPut(data.users) : Promise.resolve(),
        data.semesters.length > 0 ? db.semesters.bulkPut(data.semesters) : Promise.resolve(),
        data.courses.length > 0 ? db.courses.bulkPut(data.courses) : Promise.resolve(),
        data.gradeComponents.length > 0
          ? db.gradeComponents.bulkPut(data.gradeComponents)
          : Promise.resolve(),
        data.scheduleSlots.length > 0
          ? db.scheduleSlots.bulkPut(data.scheduleSlots)
          : Promise.resolve(),
        data.notes.length > 0 ? db.notes.bulkPut(data.notes) : Promise.resolve(),
        data.tags.length > 0 ? db.tags.bulkPut(data.tags) : Promise.resolve(),
      ])
    },
  )
}
