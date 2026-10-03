/**
 * Integration Tests — useGPA hook
 *
 * TDD: viết test trước (RED), implement để GREEN.
 *
 * Coverage:
 *   H1: hook trả về GPA đúng khi thêm môn học với điểm
 *   H2: GPA tự tính lại ngay khi cập nhật điểm môn học
 *   H3: hook trả về creditSummary theo từng học kỳ đúng
 *   H4: hook trả về cumulativeGPA đúng từ nhiều học kỳ
 *   H5: môn chưa có điểm không ảnh hưởng GPA nhưng có trong totalCredits
 *   H6: hook xử lý DB rỗng (không có học kỳ) → null GPA
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { StudyFlowDB } from '@/lib/db'
import { GradeComponentRepository } from '@/lib/db/repositories'
import { CourseRepository } from '@/lib/db/repositories'
import { SemesterRepository } from '@/lib/db/repositories'
import { useGPA } from '@/features/gpa/useGPA'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createTestDB(): StudyFlowDB {
  return new StudyFlowDB(`test-gpa-hook-${Math.random().toString(36).slice(2)}`)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useGPA hook — integration', () => {
  let db: StudyFlowDB
  let semesterRepo: SemesterRepository
  let courseRepo: CourseRepository
  let gcRepo: GradeComponentRepository

  beforeEach(() => {
    db = createTestDB()
    semesterRepo = new SemesterRepository(db)
    courseRepo = new CourseRepository(db)
    gcRepo = new GradeComponentRepository(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  // H6: DB rỗng → null
  it('H6: DB rỗng → gpa4 null, totalCredits = 0', async () => {
    const { result } = renderHook(() => useGPA(db))

    // Đợi hook load
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(result.current.cumulativeGPA4).toBeNull()
    expect(result.current.totalCredits).toBe(0)
  })

  // H1: Thêm môn học có điểm → GPA đúng
  it('H1: thêm 1 học kỳ + 1 môn có điểm → GPA tính đúng', async () => {
    const sem = await semesterRepo.create({
      name: 'HK1 2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-01-15',
      isActive: true,
    })
    const course = await courseRepo.create({
      semesterId: sem.id,
      name: 'Toán cao cấp',
      credits: 3,
    })
    await gcRepo.create({
      courseId: course.id,
      name: 'Điểm tổng kết',
      weight: 100,
      score: 8.5, // A / 4.0
    })

    const { result } = renderHook(() => useGPA(db))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(result.current.cumulativeGPA4).toBeCloseTo(4.0, 1)
    expect(result.current.totalCredits).toBe(3)
    expect(result.current.earnedCredits).toBe(3)
  })

  // H2: Cập nhật điểm → GPA tự tính lại
  it('H2: cập nhật điểm môn học → GPA tự cập nhật', async () => {
    const sem = await semesterRepo.create({
      name: 'HK1',
      startDate: '2024-09-01',
      endDate: '2025-01-15',
      isActive: true,
    })
    const course = await courseRepo.create({
      semesterId: sem.id,
      name: 'Vật lý',
      credits: 3,
    })
    const gc = await gcRepo.create({
      courseId: course.id,
      name: 'CK',
      weight: 100,
      score: 7.0, // B / 3.0
    })

    const { result } = renderHook(() => useGPA(db))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    const gpa1 = result.current.cumulativeGPA4
    expect(gpa1).toBeCloseTo(3.0, 1)

    // Cập nhật điểm → GPA phải reload
    await act(async () => {
      await gcRepo.update(gc.id, { score: 9.0 }) // A+ / 4.0
      // Trigger reload
      result.current.reload()
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(result.current.cumulativeGPA4).toBeCloseTo(4.0, 1)
  })

  // H3: creditSummary theo học kỳ
  it('H3: creditSummary có đúng số phần tử = số học kỳ', async () => {
    // Tạo 2 học kỳ
    const sem1 = await semesterRepo.create({
      name: 'HK1',
      startDate: '2024-09-01',
      endDate: '2025-01-15',
      isActive: false,
    })
    const sem2 = await semesterRepo.create({
      name: 'HK2',
      startDate: '2025-02-01',
      endDate: '2025-06-30',
      isActive: true,
    })

    const c1 = await courseRepo.create({ semesterId: sem1.id, name: 'Môn 1', credits: 3 })
    await gcRepo.create({ courseId: c1.id, name: 'CK', weight: 100, score: 8.0 })

    const c2 = await courseRepo.create({ semesterId: sem2.id, name: 'Môn 2', credits: 4 })
    await gcRepo.create({ courseId: c2.id, name: 'CK', weight: 100, score: 7.5 })

    const { result } = renderHook(() => useGPA(db))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(result.current.semesterSummaries).toHaveLength(2)

    // Tín chỉ tích lũy sau 2 học kỳ
    const lastSummary =
      result.current.semesterSummaries[result.current.semesterSummaries.length - 1]
    expect(lastSummary.cumulativeEarnedCredits).toBe(7)
  })

  // H4: cumulative GPA từ nhiều học kỳ
  it('H4: cumulative GPA4 từ 2 học kỳ khác nhau → tính đúng theo weighted average', async () => {
    // HK1: 4TC điểm 8.0 (B+/3.5)
    const sem1 = await semesterRepo.create({
      name: 'HK1',
      startDate: '2024-09-01',
      endDate: '2025-01-15',
      isActive: false,
    })
    const c1 = await courseRepo.create({ semesterId: sem1.id, name: 'M1', credits: 4 })
    await gcRepo.create({ courseId: c1.id, name: 'CK', weight: 100, score: 8.0 })

    // HK2: 3TC điểm 7.0 (B/3.0)
    const sem2 = await semesterRepo.create({
      name: 'HK2',
      startDate: '2025-02-01',
      endDate: '2025-06-30',
      isActive: true,
    })
    const c2 = await courseRepo.create({ semesterId: sem2.id, name: 'M2', credits: 3 })
    await gcRepo.create({ courseId: c2.id, name: 'CK', weight: 100, score: 7.0 })

    const { result } = renderHook(() => useGPA(db))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    // cumGPA4 = (3.5×4 + 3.0×3) / 7 = 23/7 ≈ 3.286
    expect(result.current.cumulativeGPA4).toBeCloseTo(23 / 7, 2)
    expect(result.current.totalCredits).toBe(7)
  })

  // H5: Môn chưa điểm → không ảnh hưởng GPA nhưng trong totalCredits
  it('H5: môn chưa có điểm → không tính vào GPA, vẫn tính totalCredits', async () => {
    const sem = await semesterRepo.create({
      name: 'HK1',
      startDate: '2024-09-01',
      endDate: '2025-01-15',
      isActive: true,
    })
    const c1 = await courseRepo.create({ semesterId: sem.id, name: 'Có điểm', credits: 3 })
    await gcRepo.create({ courseId: c1.id, name: 'CK', weight: 100, score: 9.0 }) // A+

    const c2 = await courseRepo.create({ semesterId: sem.id, name: 'Chưa điểm', credits: 4 })
    await gcRepo.create({ courseId: c2.id, name: 'CK', weight: 100, score: null })

    const { result } = renderHook(() => useGPA(db))

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    expect(result.current.cumulativeGPA4).toBeCloseTo(4.0, 1) // chỉ 3TC điểm 9.0
    expect(result.current.totalCredits).toBe(7) // cả 2 môn đều tính
    expect(result.current.earnedCredits).toBe(3) // chỉ môn có điểm pass
  })
})
