/**
 * Namespace DB — isolate data per user
 *
 * Mỗi user (defined by userKey = canonical email) có DB riêng.
 * DB name: "studyflow-db:{userKey}"
 *
 * Usage:
 *   const userKey = deriveUserKey(email)
 *   const db = getNamespacedDB(userKey)
 *   const noteRepo = new NoteRepository(db)
 */

import { StudyFlowDB } from './index'

/** Format DB name từ userKey */
export function getDBNameForUser(userKey: string): string {
  return `studyflow-db:${userKey}`
}

/**
 * Cache DB instances để tránh tạo lại khi cùng userKey.
 * Key: DB name (string), Value: StudyFlowDB instance
 */
const _dbCache = new Map<string, StudyFlowDB>()

/**
 * Trả về DB instance cho userKey đã được normalize.
 * Reuse instance nếu cùng userKey, tạo mới nếu khác.
 *
 * IMPORTANT: userKey PHẢI đã được normalize (lowercase + trim)
 * trước khi gọi hàm này — gọi deriveUserKey(email) trước.
 */
export function getNamespacedDB(userKey: string): StudyFlowDB {
  if (!userKey) {
    throw new Error('getNamespacedDB: userKey must be non-empty')
  }

  const dbName = getDBNameForUser(userKey)

  if (!_dbCache.has(dbName)) {
    _dbCache.set(dbName, new StudyFlowDB(dbName))
  }

  return _dbCache.get(dbName)!
}

/**
 * Clear cache + close all DB instances.
 * FOR TESTING ONLY — do not call in production.
 */
export async function _clearNamespacedDBCache(): Promise<void> {
  const promises: Promise<void>[] = []
  for (const db of _dbCache.values()) {
    promises.push(db.delete())
  }
  await Promise.all(promises)
  _dbCache.clear()
}
