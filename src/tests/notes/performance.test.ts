/**
 * Performance Benchmark Tests — Giai đoạn 10
 *
 * Kiểm tra hiệu năng với tập dữ liệu lớn:
 * - 500 ghi chú (Notes)
 * - 200 môn học (Courses)
 *
 * Ngưỡng chấp nhận:
 * - Tìm kiếm toàn văn Fuse.js trên 500 notes: < 1000ms (DoD: < 1s)
 * - Tính toán GPA / CPA trên 200 môn học: < 500ms
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StudyFlowDB } from '@/lib/db'
import { searchNotes, filterNotesByTags } from '@/lib/notes/noteSearch'
import { computeSemesterGPA, type CourseGradeInput } from '@/lib/gpa/gpaCalculator'
import type { Note } from '@/lib/db/schemas'

describe('Performance Audit — Benchmark dữ liệu lớn', () => {
  let db: StudyFlowDB

  beforeEach(() => {
    db = new StudyFlowDB(`perf-test-db-${Math.random().toString(36).slice(2)}`)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('PERF-1: Tìm kiếm toàn văn Fuse.js trên 500 ghi chú hoàn thành < 1000ms', async () => {
    const NOTES_COUNT = 500
    const now = Date.now()

    const mockNotes: Note[] = []
    for (let i = 1; i <= NOTES_COUNT; i++) {
      mockNotes.push({
        id: `note-perf-${i}`,
        title: `Bài giảng môn học số ${i}: Lý thuyết và Thực hành thuật toán nâng cao`,
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              text: `Nội dung ghi chú chi tiết cho bài ${i}. Đề tài nghiên cứu khoa học về Local-First architecture, IndexedDB, PWA và hiệu năng xử lý offline. Khóa học kỳ ${Math.ceil(i / 50)}.`,
            },
          ],
        }),
        tags: [`tag-${i % 10}`, `subject-${i % 20}`],
        courseId: `course-${i % 50}`,
        isPinned: i % 25 === 0,
        isArchived: false,
        createdAt: now - i * 1000,
        updatedAt: now - i * 1000,
      })
    }

    const startTime = performance.now()
    const results = searchNotes(mockNotes, 'thuật toán nâng cao')
    const duration = performance.now() - startTime

    expect(results.length).toBeGreaterThan(0)
    expect(duration).toBeLessThan(1000)
  })

  it('PERF-2: Tính toán GPA trên 200 môn học hoàn tất < 500ms', () => {
    const COURSES_COUNT = 200

    const coursesInput: CourseGradeInput[] = []
    for (let i = 1; i <= COURSES_COUNT; i++) {
      coursesInput.push({
        id: `course-${i}`,
        name: `Môn học số ${i}`,
        credits: (i % 4) + 1,
        components: [
          { id: `c-${i}-1`, name: 'Quá trình', weight: 40, score: 7.0 + (i % 30) * 0.1 },
          { id: `c-${i}-2`, name: 'Cuối kỳ', weight: 60, score: 6.5 + (i % 35) * 0.1 },
        ],
      })
    }

    const startTime = performance.now()
    const gpaResult = computeSemesterGPA(coursesInput)
    const duration = performance.now() - startTime

    expect(gpaResult.totalCredits).toBeGreaterThan(0)
    expect(gpaResult.gpa4).toBeGreaterThan(0)
    expect(duration).toBeLessThan(500)
  })

  it('PERF-3: Lọc theo Tags trên 500 ghi chú hoàn tất < 500ms', () => {
    const mockNotes: Note[] = []
    const now = Date.now()
    for (let i = 1; i <= 500; i++) {
      mockNotes.push({
        id: `note-${i}`,
        title: `Note ${i}`,
        content: '{}',
        tags: [`tag-${i % 5}`],
        courseId: null,
        isPinned: false,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      })
    }

    const startTime = performance.now()
    const filtered = filterNotesByTags(mockNotes, ['tag-1', 'tag-2'])
    const duration = performance.now() - startTime

    expect(filtered.length).toBeGreaterThan(0)
    expect(duration).toBeLessThan(500)
  })
})
