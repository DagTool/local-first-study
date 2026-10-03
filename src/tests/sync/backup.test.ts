/**
 * Unit tests — Backup & Restore (exportBackup + importBackup)
 *
 * Kiểm tra:
 * - Roundtrip: export DB có dữ liệu -> import vào DB mới -> 100% dữ liệu nguyên vẹn
 * - Xử lý lỗi: JSON hỏng, thiếu trường, cấu trúc không hợp lệ
 * - B4: Roundtrip đầy đủ 7 bảng dữ liệu sang tài khoản mới
 * - B5: Google Drive API tạm thời không khả dụng (503/mất mạng) -> Local-First hoạt động bình thường,
 *      không mất dữ liệu và tự đồng bộ khi kết nối được phục hồi.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import 'fake-indexeddb/auto'
import { http, HttpResponse } from 'msw'
import { mswServer } from '@/tests/mocks/server'
import { resetDriveStore, getDriveStore } from '@/tests/mocks/drive-handlers'
import { StudyFlowDB } from '@/lib/db'
import { exportBackup, importBackup } from '@/lib/sync/backup'
import { SyncEngine } from '@/lib/sync/syncEngine'

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }))
afterAll(() => mswServer.close())

describe('Backup & Restore Service', () => {
  let db1: StudyFlowDB
  let db2: StudyFlowDB

  beforeEach(() => {
    resetDriveStore()
    db1 = new StudyFlowDB(`test-backup-src-${Math.random().toString(36).slice(2)}`)
    db2 = new StudyFlowDB(`test-backup-dest-${Math.random().toString(36).slice(2)}`)
  })

  afterEach(async () => {
    await db1.delete()
    await db2.delete()
    mswServer.resetHandlers()
  })

  it('B1: Roundtrip: export từ db1 và import vào db2 khôi phục 100% dữ liệu', async () => {
    const now = Date.now()
    await db1.semesters.add({
      id: 'sem-1',
      name: 'Học kỳ 1 2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-01-15',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    await db1.courses.add({
      id: 'course-1',
      semesterId: 'sem-1',
      name: 'Kiến trúc Phần mềm',
      credits: 3,
      lecturer: 'TS. Nguyễn Văn A',
      color: '#4f46e5',
      createdAt: now,
      updatedAt: now,
    })

    await db1.notes.add({
      id: 'note-1',
      title: 'Ghi chú bài 1',
      content: '{"type":"doc","content":[{"type":"paragraph","text":"Nội dung"}]}',
      tags: ['tag-arch'],
      courseId: 'course-1',
      isPinned: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    })

    const jsonString = await exportBackup(db1, 'student@university.edu')
    expect(typeof jsonString).toBe('string')
    expect(jsonString).toContain('Kiến trúc Phần mềm')
    expect(jsonString).toContain('Ghi chú bài 1')

    const result = await importBackup(db2, jsonString)
    expect(result.success).toBe(true)
    expect(result.message).toContain('thành công')

    const semesters = await db2.semesters.toArray()
    const courses = await db2.courses.toArray()
    const notes = await db2.notes.toArray()

    expect(semesters).toHaveLength(1)
    expect(semesters[0].name).toBe('Học kỳ 1 2026-2027')
    expect(courses).toHaveLength(1)
    expect(courses[0].name).toBe('Kiến trúc Phần mềm')
    expect(notes).toHaveLength(1)
    expect(notes[0].title).toBe('Ghi chú bài 1')
    expect(notes[0].isPinned).toBe(true)
  })

  it('B2: Import chuỗi JSON rỗng hoặc không hợp lệ -> trả về lỗi rõ ràng', async () => {
    const r1 = await importBackup(db2, '')
    expect(r1.success).toBe(false)

    const r2 = await importBackup(db2, 'invalid json {{{')
    expect(r2.success).toBe(false)
    expect(r2.message).toContain('Lỗi')
  })

  it('B3: Import JSON thiếu trường "data" hoặc bảng dữ liệu -> từ chối an toàn', async () => {
    const invalidPayload = JSON.stringify({ version: 1, userKey: 'test@mail.com' })
    const res = await importBackup(db2, invalidPayload)
    expect(res.success).toBe(false)
    expect(res.message).toContain('data')
  })

  it('B4: Roundtrip toàn diện cả 7 bảng dữ liệu sang tài khoản/DB mới (khôi phục nguyên vẹn 100%)', async () => {
    const now = Date.now()

    // 1. users
    await db1.users.add({
      id: 'usr-orig',
      googleId: 'google-usr-orig',
      email: 'original@edu.vn',
      name: 'Nguyen Van A',
      avatar: 'https://example.com/avatar.jpg',
      createdAt: now,
      updatedAt: now,
    })

    // 2. semesters
    await db1.semesters.add({
      id: 'sem-roundtrip',
      name: 'HK 2 2026-2027',
      startDate: '2027-02-01',
      endDate: '2027-06-30',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    // 3. courses
    await db1.courses.add({
      id: 'course-roundtrip',
      semesterId: 'sem-roundtrip',
      name: 'Lập trình Phân tán',
      credits: 4,
      lecturer: 'PGS. TS. Tran',
      color: '#10b981',
      createdAt: now,
      updatedAt: now,
    })

    // 4. gradeComponents
    await db1.gradeComponents.add({
      id: 'grade-1',
      courseId: 'course-roundtrip',
      name: 'Giữa kỳ',
      weight: 30,
      score: 8.5,
      createdAt: now,
      updatedAt: now,
    })

    // 5. scheduleSlots
    await db1.scheduleSlots.add({
      id: 'slot-1',
      courseId: 'course-roundtrip',
      dayOfWeek: 2,
      startTime: '07:30',
      endTime: '09:30',
      room: 'A101',
      createdAt: now,
      updatedAt: now,
    })

    // 6. notes
    await db1.notes.add({
      id: 'note-roundtrip',
      title: 'Paxos & Raft consensus',
      content: 'So sánh thuật toán đồng thuận phân tán',
      tags: ['distributed', 'consensus'],
      courseId: 'course-roundtrip',
      isPinned: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    })

    // 7. tags
    await db1.tags.add({
      id: 'tag-dist',
      name: 'distributed',
      color: '#3b82f6',
      createdAt: now,
      updatedAt: now,
    })

    // Export sang JSON
    const exportedJSON = await exportBackup(db1, 'original@edu.vn')
    expect(typeof exportedJSON).toBe('string')

    // Import vào DB tài khoản mới (hoàn toàn rỗng lúc đầu)
    const restoreResult = await importBackup(db2, exportedJSON)
    expect(restoreResult.success).toBe(true)

    // So khớp chi tiết 7 bảng dữ liệu
    const [u2, s2, c2, g2, sl2, n2, t2] = await Promise.all([
      db2.users.toArray(),
      db2.semesters.toArray(),
      db2.courses.toArray(),
      db2.gradeComponents.toArray(),
      db2.scheduleSlots.toArray(),
      db2.notes.toArray(),
      db2.tags.toArray(),
    ])

    expect(u2).toHaveLength(1)
    expect(u2[0].name).toBe('Nguyen Van A')

    expect(s2).toHaveLength(1)
    expect(s2[0].name).toBe('HK 2 2026-2027')

    expect(c2).toHaveLength(1)
    expect(c2[0].name).toBe('Lập trình Phân tán')
    expect(c2[0].credits).toBe(4)

    expect(g2).toHaveLength(1)
    expect(g2[0].score).toBe(8.5)

    expect(sl2).toHaveLength(1)
    expect(sl2[0].room).toBe('A101')

    expect(n2).toHaveLength(1)
    expect(n2[0].title).toBe('Paxos & Raft consensus')

    expect(t2).toHaveLength(1)
    expect(t2[0].name).toBe('distributed')
  })

  it('B5: Google Drive API tạm thời không khả dụng (503/mạng lỗi) -> Local-First hoạt động bình thường, tự đồng bộ khi có mạng', async () => {
    const userKey = 'offline-user@studyflow.edu'
    const now = Date.now()
    const engine = new SyncEngine(db1, userKey, () => 'mock-token')

    // 1. Google Drive API gặp sự cố (503 Service Unavailable)
    mswServer.use(
      http.get('https://www.googleapis.com/drive/v3/files', () => {
        return new HttpResponse('Google Drive API 503 Unavailable', { status: 503 })
      }),
      http.post('https://www.googleapis.com/upload/drive/v3/files', () => {
        return new HttpResponse('Google Drive API 503 Unavailable', { status: 503 })
      }),
    )

    // 2. Người dùng tiếp tục tạo và lưu dữ liệu cục bộ trong IndexedDB (Local-First)
    await db1.courses.add({
      id: 'local-course-1',
      semesterId: 'sem-offline',
      name: 'Kiến trúc Local-First',
      credits: 3,
      lecturer: 'Dr. Martin Kleppmann',
      color: '#6366f1',
      createdAt: now,
      updatedAt: now,
    })

    await db1.notes.add({
      id: 'local-note-1',
      title: 'Offline Ghi chú',
      content: 'Nội dung ghi chú tạo khi không có kết nối Google Drive',
      tags: ['offline'],
      courseId: 'local-course-1',
      isPinned: true,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    })

    // Dữ liệu cục bộ hoàn toàn truy vấn được và nguyên vẹn
    const localCourses = await db1.courses.toArray()
    const localNotes = await db1.notes.toArray()
    expect(localCourses).toHaveLength(1)
    expect(localCourses[0].name).toBe('Kiến trúc Local-First')
    expect(localNotes).toHaveLength(1)
    expect(localNotes[0].title).toBe('Offline Ghi chú')

    // 3. Khi sync cố gắng chạy trong lúc Drive bị 503 -> Báo lỗi an toàn, không làm hỏng dữ liệu cục bộ
    const failedSync = await engine.sync()
    expect(failedSync.success).toBe(false)
    expect(failedSync.error).toBeDefined()

    // Xác nhận dữ liệu cục bộ vẫn an toàn 100% sau sync thất bại
    const coursesAfterFail = await db1.courses.toArray()
    expect(coursesAfterFail).toHaveLength(1)
    expect(coursesAfterFail[0].id).toBe('local-course-1')

    // 4. Google Drive phục hồi trở lại (200 OK)
    mswServer.resetHandlers() // Reset về handlers mặc định hoạt động bình thường

    // 5. Hệ thống tự động đồng bộ lại (sync retry) -> Thành công
    const recoveredSync = await engine.syncWithRetry(2)
    expect(recoveredSync.success).toBe(true)

    // 6. Kiểm tra dữ liệu trên Google Drive store: đã được cập nhật đầy đủ dữ liệu đã tạo lúc offline
    const store = getDriveStore()
    expect(store).not.toBeNull()
    expect(store?.content.data.courses[0].name).toBe('Kiến trúc Local-First')
    expect(store?.content.data.notes[0].title).toBe('Offline Ghi chú')
  })
})
