/**
 * Base Repository — abstract class cho tất cả repositories.
 *
 * Cung cấp:
 * - generateId(): crypto.randomUUID()
 * - now(): Date.now()
 * - assertExists(): throw nếu record không tồn tại
 */
import type { StudyFlowDB } from '../index'

export abstract class BaseRepository {
  protected db: StudyFlowDB

  constructor(db: StudyFlowDB) {
    this.db = db
  }

  /** Tạo UUID v4 */
  protected generateId(): string {
    return crypto.randomUUID()
  }

  /** Unix timestamp ms */
  protected now(): number {
    return Date.now()
  }

  /**
   * Throw nếu record không tồn tại — dùng cho update/delete.
   * @throws Error nếu id không tìm thấy
   */
  protected assertExists(record: unknown, id: string, entity: string): void {
    if (record === undefined || record === null) {
      throw new Error(`${entity} với id "${id}" không tồn tại`)
    }
  }
}
