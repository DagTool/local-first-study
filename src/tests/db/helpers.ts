/**
 * Test helper — tạo fresh DB instance với fake-indexeddb cho mỗi test.
 * Mỗi test suite dùng hàm này để đảm bảo isolation hoàn toàn.
 */
import 'fake-indexeddb/auto'
import { StudyFlowDB } from '@/lib/db'

/**
 * Tạo một instance DB mới với tên ngẫu nhiên để tránh xung đột giữa các test.
 */
export function createTestDB(): StudyFlowDB {
  const name = `test-db-${Math.random().toString(36).slice(2)}`
  return new StudyFlowDB(name)
}
