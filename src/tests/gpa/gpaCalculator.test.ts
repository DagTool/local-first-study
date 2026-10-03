/**
 * Unit Tests — GPA Calculator
 *
 * TDD: viết test trước (RED), chạy fail, sau đó implement để GREEN.
 *
 * Bảng quy đổi chuẩn Bộ GD&ĐT Việt Nam (Thông tư 08/2021/TT-BGDĐT):
 * ┌──────────────┬────────┬─────────┐
 * │ Thang 10     │ Thang 4│ Xếp loại│
 * ├──────────────┼────────┼─────────┤
 * │ 9.0 – 10.0   │ 4.0    │ A+      │
 * │ 8.5 – 8.9    │ 4.0    │ A       │  ← NOTE: Bộ GD&ĐT: 8.5-8.9 → A (4.0)
 * │ 8.0 – 8.4    │ 3.5    │ B+      │
 * │ 7.0 – 7.9    │ 3.0    │ B       │
 * │ 6.5 – 6.9    │ 2.5    │ C+      │
 * │ 5.5 – 5.9    │ 2.0    │ C       │  ← NOTE: 5.5-5.9 → C (2.0)
 * │ 6.0 – 6.4    │ 2.0    │ C       │  ← NOTE: nhiều trường xếp 6.0-6.4 → C
 * │ 5.0 – 5.4    │ 1.5    │ D+      │
 * │ 4.0 – 4.9    │ 1.0    │ D       │
 * │ < 4.0        │ 0.0    │ F       │
 * └──────────────┴────────┴─────────┘
 *
 * Công thức GPA hệ 4:
 *   GPA4 = Σ(gradePoint4 × credits) / Σ(credits_with_scores)
 *
 * Coverage: ≥20 reference cases + edge cases
 */

import { describe, it, expect } from 'vitest'
import {
  score10ToGrade4,
  score10ToGradeLabel,
  computeCourseGrade,
  computeSemesterGPA,
  computeCumulativeGPA,
  computeCreditSummary,
} from '@/lib/gpa/gpaCalculator'
import type { CourseGradeInput, SemesterGPAInput } from '@/lib/gpa/gpaCalculator'

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

/** Tạo course input dễ dùng trong test */
function makeCourse(
  credits: number,
  components: Array<{ weight: number; score: number | null }>,
): CourseGradeInput {
  return {
    id: `course-${Math.random()}`,
    credits,
    components: components.map((c, i) => ({
      id: `gc-${i}`,
      weight: c.weight,
      score: c.score,
    })),
  }
}

// ─── score10ToGrade4 — bảng quy đổi ─────────────────────────────────────────

describe('score10ToGrade4 — bảng quy đổi Bộ GD&ĐT', () => {
  // G1: A+ zone
  it('G1: 10.0 → 4.0', () => expect(score10ToGrade4(10.0)).toBe(4.0))
  it('G2: 9.5 → 4.0', () => expect(score10ToGrade4(9.5)).toBe(4.0))
  it('G3: 9.0 → 4.0 (boundary A+)', () => expect(score10ToGrade4(9.0)).toBe(4.0))

  // G4: A zone
  it('G4: 8.9 → 4.0 (A)', () => expect(score10ToGrade4(8.9)).toBe(4.0))
  it('G5: 8.5 → 4.0 (boundary A)', () => expect(score10ToGrade4(8.5)).toBe(4.0))

  // G6: B+ zone
  it('G6: 8.4 → 3.5 (B+)', () => expect(score10ToGrade4(8.4)).toBe(3.5))
  it('G7: 8.0 → 3.5 (boundary B+)', () => expect(score10ToGrade4(8.0)).toBe(3.5))

  // G8: B zone
  it('G8: 7.9 → 3.0 (B)', () => expect(score10ToGrade4(7.9)).toBe(3.0))
  it('G9: 7.0 → 3.0 (boundary B)', () => expect(score10ToGrade4(7.0)).toBe(3.0))

  // G10: C+ zone
  it('G10: 6.9 → 2.5 (C+)', () => expect(score10ToGrade4(6.9)).toBe(2.5))
  it('G11: 6.5 → 2.5 (boundary C+)', () => expect(score10ToGrade4(6.5)).toBe(2.5))

  // G12: C zone (6.0 – 6.4 và 5.5 – 5.9 đều → 2.0)
  it('G12: 6.4 → 2.0 (C, upper)', () => expect(score10ToGrade4(6.4)).toBe(2.0))
  it('G13: 6.0 → 2.0 (C, boundary)', () => expect(score10ToGrade4(6.0)).toBe(2.0))
  it('G14: 5.9 → 2.0 (C, lower-upper)', () => expect(score10ToGrade4(5.9)).toBe(2.0))
  it('G15: 5.5 → 2.0 (C, boundary lower)', () => expect(score10ToGrade4(5.5)).toBe(2.0))

  // G16: D+ zone
  it('G16: 5.4 → 1.5 (D+)', () => expect(score10ToGrade4(5.4)).toBe(1.5))
  it('G17: 5.0 → 1.5 (boundary D+)', () => expect(score10ToGrade4(5.0)).toBe(1.5))

  // G18: D zone
  it('G18: 4.9 → 1.0 (D)', () => expect(score10ToGrade4(4.9)).toBe(1.0))
  it('G19: 4.0 → 1.0 (boundary D)', () => expect(score10ToGrade4(4.0)).toBe(1.0))

  // G20: F zone
  it('G20: 3.9 → 0.0 (F)', () => expect(score10ToGrade4(3.9)).toBe(0.0))
  it('G21: 0.0 → 0.0 (F, absolute zero)', () => expect(score10ToGrade4(0.0)).toBe(0.0))
})

// ─── score10ToGradeLabel ──────────────────────────────────────────────────────

describe('score10ToGradeLabel — xếp loại chữ', () => {
  it('L1: 10.0 → "A+"', () => expect(score10ToGradeLabel(10.0)).toBe('A+'))
  it('L2: 9.0 → "A+"', () => expect(score10ToGradeLabel(9.0)).toBe('A+'))
  it('L3: 8.7 → "A"', () => expect(score10ToGradeLabel(8.7)).toBe('A'))
  it('L4: 8.2 → "B+"', () => expect(score10ToGradeLabel(8.2)).toBe('B+'))
  it('L5: 7.5 → "B"', () => expect(score10ToGradeLabel(7.5)).toBe('B'))
  it('L6: 6.7 → "C+"', () => expect(score10ToGradeLabel(6.7)).toBe('C+'))
  it('L7: 6.2 → "C"', () => expect(score10ToGradeLabel(6.2)).toBe('C'))
  it('L8: 5.6 → "C"', () => expect(score10ToGradeLabel(5.6)).toBe('C'))
  it('L9: 5.2 → "D+"', () => expect(score10ToGradeLabel(5.2)).toBe('D+'))
  it('L10: 4.5 → "D"', () => expect(score10ToGradeLabel(4.5)).toBe('D'))
  it('L11: 3.0 → "F"', () => expect(score10ToGradeLabel(3.0)).toBe('F'))
})

// ─── computeCourseGrade — tính điểm tổng kết môn ──────────────────────────────

describe('computeCourseGrade — tính điểm môn học', () => {
  // C1: Môn có 2 thành phần đầy đủ
  it('C1: GK(30%,7.0) + CK(70%,8.5) = 8.05 → B+/3.5', () => {
    const course = makeCourse(3, [
      { weight: 30, score: 7.0 },
      { weight: 70, score: 8.5 },
    ])
    const result = computeCourseGrade(course)
    expect(result.score10).toBeCloseTo(8.05, 2)
    expect(result.grade4).toBe(3.5)
    expect(result.gradeLabel).toBe('B+')
  })

  // C2: Tất cả điểm null → chưa có điểm
  it('C2: tất cả score=null → null (chưa có điểm)', () => {
    const course = makeCourse(3, [
      { weight: 30, score: null },
      { weight: 70, score: null },
    ])
    const result = computeCourseGrade(course)
    expect(result.score10).toBeNull()
    expect(result.grade4).toBeNull()
  })

  // C3: Một thành phần null → tính theo phần có điểm (partial)
  it('C3: GK(30%,8.0) + CK(70%,null) → partial score = 8.0 (chỉ GK)', () => {
    const course = makeCourse(3, [
      { weight: 30, score: 8.0 },
      { weight: 70, score: null },
    ])
    const result = computeCourseGrade(course)
    // partial: chỉ tính phần có điểm
    expect(result.score10).toBeCloseTo(8.0, 2)
    expect(result.isPartial).toBe(true)
  })

  // C4: Điểm F (< 4.0)
  it('C4: Điểm tổng 3.0 → F, grade4 = 0', () => {
    const course = makeCourse(3, [{ weight: 100, score: 3.0 }])
    const result = computeCourseGrade(course)
    expect(result.score10).toBeCloseTo(3.0, 1)
    expect(result.grade4).toBe(0.0)
    expect(result.gradeLabel).toBe('F')
  })

  // C5: Điểm hoàn hảo
  it('C5: GK(40%,10) + CK(60%,10) = 10.0 → A+/4.0', () => {
    const course = makeCourse(4, [
      { weight: 40, score: 10.0 },
      { weight: 60, score: 10.0 },
    ])
    const result = computeCourseGrade(course)
    expect(result.score10).toBeCloseTo(10.0, 1)
    expect(result.grade4).toBe(4.0)
    expect(result.gradeLabel).toBe('A+')
  })

  // C6: Không có thành phần nào
  it('C6: không có thành phần → null', () => {
    const course = makeCourse(3, [])
    const result = computeCourseGrade(course)
    expect(result.score10).toBeNull()
  })

  // C7: Tổng trọng số khác 100%
  it('C7: tổng trọng số khác 100% → throw error', () => {
    const course = makeCourse(3, [
      { weight: 50, score: 8.0 },
      { weight: 40, score: 7.0 },
    ])
    expect(() => computeCourseGrade(course)).toThrow(
      'Tổng trọng số các thành phần điểm phải bằng 100%',
    )
  })
})

// ─── computeSemesterGPA ────────────────────────────────────────────────────────

describe('computeSemesterGPA — GPA học kỳ', () => {
  // S1: Không có môn nào
  it('S1: không có môn → GPA = null', () => {
    const result = computeSemesterGPA([])
    expect(result.gpa4).toBeNull()
    expect(result.gpa10).toBeNull()
    expect(result.totalCredits).toBe(0)
    expect(result.earnedCredits).toBe(0)
  })

  // S2: Tất cả môn chưa có điểm
  it('S2: tất cả môn chưa điểm → GPA = null', () => {
    const courses: SemesterGPAInput = [
      makeCourse(3, [{ weight: 100, score: null }]),
      makeCourse(4, [{ weight: 100, score: null }]),
    ]
    const result = computeSemesterGPA(courses)
    expect(result.gpa4).toBeNull()
    expect(result.totalCredits).toBe(7)
    expect(result.earnedCredits).toBe(0)
  })

  // S3: Một học kỳ điển hình
  it('S3: 3 môn đa dạng điểm → GPA đúng', () => {
    // Môn A: 3TC, điểm 8.5 (A, 4.0)
    // Môn B: 4TC, điểm 7.0 (B, 3.0)
    // Môn C: 2TC, điểm 5.5 (C, 2.0)
    // GPA4 = (4.0×3 + 3.0×4 + 2.0×2) / (3+4+2) = (12+12+4)/9 = 28/9 ≈ 3.11
    const courses: SemesterGPAInput = [
      makeCourse(3, [{ weight: 100, score: 8.5 }]),
      makeCourse(4, [{ weight: 100, score: 7.0 }]),
      makeCourse(2, [{ weight: 100, score: 5.5 }]),
    ]
    const result = computeSemesterGPA(courses)
    expect(result.gpa4).toBeCloseTo(28 / 9, 2)
    expect(result.totalCredits).toBe(9)
    // 5.5 → C/2.0 → isPassed=true (grade4 >= 1.0), tất cả 3 môn đều pass
    expect(result.earnedCredits).toBe(9)
  })

  // S4: Toàn điểm F → GPA = 0, earnedCredits = 0
  it('S4: toàn điểm F → GPA4 = 0, earnedCredits = 0', () => {
    const courses: SemesterGPAInput = [
      makeCourse(3, [{ weight: 100, score: 1.0 }]),
      makeCourse(2, [{ weight: 100, score: 2.5 }]),
    ]
    const result = computeSemesterGPA(courses)
    expect(result.gpa4).toBeCloseTo(0.0, 2)
    expect(result.earnedCredits).toBe(0)
    expect(result.totalCredits).toBe(5)
  })

  // S5: Mix có điểm và chưa điểm
  it('S5: mix có điểm + chưa điểm → chỉ tính môn có điểm', () => {
    const courses: SemesterGPAInput = [
      makeCourse(3, [{ weight: 100, score: 9.0 }]), // A+ = 4.0
      makeCourse(4, [{ weight: 100, score: null }]), // chưa có
    ]
    const result = computeSemesterGPA(courses)
    // Chỉ tính môn 3TC → GPA = 4.0
    expect(result.gpa4).toBeCloseTo(4.0, 2)
    expect(result.totalCredits).toBe(7)
  })

  // S6: Môn học lại (điểm cũ F, điểm mới pass)
  it('S6: môn học lại với điểm mới 6.5 → tính điểm mới', () => {
    // Chỉ 1 môn (đã học lại, điểm mới 6.5 = C+/2.5)
    const courses: SemesterGPAInput = [makeCourse(3, [{ weight: 100, score: 6.5 }])]
    const result = computeSemesterGPA(courses)
    expect(result.gpa4).toBeCloseTo(2.5, 2)
    expect(result.earnedCredits).toBe(3)
  })
})

// ─── computeCumulativeGPA ──────────────────────────────────────────────────────

describe('computeCumulativeGPA — GPA tích lũy', () => {
  // CU1: Không có học kỳ nào
  it('CU1: không có học kỳ → cumulative GPA = null', () => {
    const result = computeCumulativeGPA([])
    expect(result.cumulativeGPA4).toBeNull()
    expect(result.cumulativeGPA10).toBeNull()
    expect(result.totalCredits).toBe(0)
  })

  // CU2: Nhiều học kỳ tích lũy
  it('CU2: 2 học kỳ → GPA tích lũy đúng', () => {
    // HK1: 1 môn 4TC điểm 8.0 (B+/3.5)
    // HK2: 1 môn 3TC điểm 7.0 (B/3.0)
    // CumGPA4 = (3.5×4 + 3.0×3) / (4+3) = (14+9)/7 = 23/7 ≈ 3.29
    const sem1Courses: SemesterGPAInput = [makeCourse(4, [{ weight: 100, score: 8.0 }])]
    const sem2Courses: SemesterGPAInput = [makeCourse(3, [{ weight: 100, score: 7.0 }])]
    const result = computeCumulativeGPA([
      computeSemesterGPA(sem1Courses),
      computeSemesterGPA(sem2Courses),
    ])
    expect(result.cumulativeGPA4).toBeCloseTo(23 / 7, 2)
    expect(result.totalCredits).toBe(7)
  })

  // CU3: Môn cải thiện điểm — chỉ tính điểm cao nhất (giả định: consumer đã lọc)
  it('CU3: không có môn nào pass → cumulative = 0', () => {
    const sem1: SemesterGPAInput = [makeCourse(3, [{ weight: 100, score: 2.0 }])] // F
    const result = computeCumulativeGPA([computeSemesterGPA(sem1)])
    expect(result.cumulativeGPA4).toBeCloseTo(0.0, 2)
    expect(result.earnedCredits).toBe(0)
  })
})

// ─── computeCreditSummary ──────────────────────────────────────────────────────

describe('computeCreditSummary — tín chỉ tích lũy theo từng học kỳ', () => {
  it('CS1: không có học kỳ → mảng rỗng', () => {
    expect(computeCreditSummary([])).toEqual([])
  })

  it('CS2: 3 học kỳ → cumulativeEarnedCredits tăng dần', () => {
    const s1 = computeSemesterGPA([makeCourse(4, [{ weight: 100, score: 8.0 }])]) // earned 4
    const s2 = computeSemesterGPA([makeCourse(3, [{ weight: 100, score: 7.0 }])]) // earned 3
    const s3 = computeSemesterGPA([makeCourse(2, [{ weight: 100, score: 2.0 }])]) // F, earned 0

    const summary = computeCreditSummary([s1, s2, s3])
    expect(summary).toHaveLength(3)
    expect(summary[0].cumulativeEarnedCredits).toBe(4)
    expect(summary[1].cumulativeEarnedCredits).toBe(7)
    expect(summary[2].cumulativeEarnedCredits).toBe(7) // F không tăng
  })

  it('CS3: tín chỉ tổng cộng cũng tăng dần (bất kể F)', () => {
    const s1 = computeSemesterGPA([makeCourse(4, [{ weight: 100, score: 8.0 }])])
    const s2 = computeSemesterGPA([makeCourse(3, [{ weight: 100, score: 2.0 }])]) // F

    const summary = computeCreditSummary([s1, s2])
    expect(summary[0].cumulativeTotalCredits).toBe(4)
    expect(summary[1].cumulativeTotalCredits).toBe(7) // total tăng kể cả F
    expect(summary[1].cumulativeEarnedCredits).toBe(4) // earned không tăng
  })
})
