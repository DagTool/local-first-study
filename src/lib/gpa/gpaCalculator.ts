/**
 * GPA Calculator — Pure Functions
 *
 * Tính GPA theo bảng quy đổi Bộ GD&ĐT Việt Nam (Thông tư 08/2021/TT-BGDĐT).
 *
 * Bảng quy đổi:
 * ┌──────────────┬────────┬─────────┐
 * │ Thang 10     │ Thang 4│ Nhãn    │
 * ├──────────────┼────────┼─────────┤
 * │ 9.0 – 10.0   │ 4.0    │ A+      │
 * │ 8.5 – 8.9    │ 4.0    │ A       │
 * │ 8.0 – 8.4    │ 3.5    │ B+      │
 * │ 7.0 – 7.9    │ 3.0    │ B       │
 * │ 6.5 – 6.9    │ 2.5    │ C+      │
 * │ 5.5 – 6.4    │ 2.0    │ C       │  (5.5–5.9 và 6.0–6.4 đều = 2.0)
 * │ 5.0 – 5.4    │ 1.5    │ D+      │
 * │ 4.0 – 4.9    │ 1.0    │ D       │
 * │ < 4.0        │ 0.0    │ F       │
 * └──────────────┴────────┴─────────┘
 *
 * Tất cả hàm là pure functions — không có side effects, dễ unit test.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GradeComponentInput {
  id: string
  name?: string
  weight: number // 1–100, phần trăm
  score: number | null // 0–10, null = chưa có điểm
}

export interface CourseGradeInput {
  id: string
  name?: string
  credits: number
  components: GradeComponentInput[]
}

export interface CourseGradeResult {
  courseId: string
  name?: string
  credits: number
  components?: GradeComponentInput[]
  /** Điểm thang 10, null nếu chưa có điểm nào */
  score10: number | null
  /** Điểm thang 4, null nếu chưa có điểm nào */
  grade4: number | null
  /** Nhãn xếp loại, null nếu chưa có điểm */
  gradeLabel: string | null
  /** true nếu chỉ có một phần điểm (chưa đủ thành phần) */
  isPartial: boolean
  /** Môn pass nếu grade4 >= 1.0 (điểm >= 4.0 thang 10) */
  isPassed: boolean
}

export interface SemesterGPAResult {
  /** GPA hệ 4 của học kỳ, null nếu chưa có môn nào có điểm */
  gpa4: number | null
  /** GPA hệ 10 tương đương, null nếu chưa có */
  gpa10: number | null
  /** Tổng số tín chỉ đăng ký trong học kỳ */
  totalCredits: number
  /** Số tín chỉ tích lũy (môn pass) */
  earnedCredits: number
  /** Chi tiết từng môn */
  courses: CourseGradeResult[]
}

export type SemesterGPAInput = CourseGradeInput[]

export interface CumulativeGPAResult {
  /** GPA tích lũy hệ 4 */
  cumulativeGPA4: number | null
  /** GPA tích lũy hệ 10 tương đương */
  cumulativeGPA10: number | null
  /** Tổng số tín chỉ đăng ký tất cả học kỳ */
  totalCredits: number
  /** Số tín chỉ tích lũy (tất cả học kỳ) */
  earnedCredits: number
}

export interface CreditSummaryItem {
  semesterIndex: number
  /** Tổng TC đăng ký học kỳ đó */
  semesterTotalCredits: number
  /** TC tích lũy học kỳ đó */
  semesterEarnedCredits: number
  /** Tổng TC tích lũy = sum của tất cả học kỳ trước và hiện tại */
  cumulativeTotalCredits: number
  /** TC tích lũy pass = sum của tất cả học kỳ trước và hiện tại */
  cumulativeEarnedCredits: number
  /** GPA hệ 4 của học kỳ này */
  semesterGPA4: number | null
}

// ─── Conversion Tables ────────────────────────────────────────────────────────

interface GradeRule {
  minScore: number // inclusive
  maxScore: number // inclusive
  grade4: number
  label: string
}

/**
 * Bảng quy đổi từ cao xuống thấp.
 * Áp dụng rule đầu tiên match (minScore <= score <= maxScore).
 */
const GRADE_RULES: GradeRule[] = [
  { minScore: 9.0, maxScore: 10.0, grade4: 4.0, label: 'A+' },
  { minScore: 8.5, maxScore: 8.99, grade4: 4.0, label: 'A' },
  { minScore: 8.0, maxScore: 8.49, grade4: 3.5, label: 'B+' },
  { minScore: 7.0, maxScore: 7.99, grade4: 3.0, label: 'B' },
  { minScore: 6.5, maxScore: 6.99, grade4: 2.5, label: 'C+' },
  { minScore: 5.5, maxScore: 6.49, grade4: 2.0, label: 'C' }, // gộp 5.5-5.9 và 6.0-6.4
  { minScore: 5.0, maxScore: 5.49, grade4: 1.5, label: 'D+' },
  { minScore: 4.0, maxScore: 4.99, grade4: 1.0, label: 'D' },
  { minScore: 0.0, maxScore: 3.99, grade4: 0.0, label: 'F' },
]

// ─── Core Conversion Functions ────────────────────────────────────────────────

/**
 * Chuyển điểm thang 10 → điểm hệ 4 theo bảng Bộ GD&ĐT.
 * score phải thuộc [0.0, 10.0].
 */
export function score10ToGrade4(score: number): number {
  // Clamp về [0, 10]
  const s = Math.max(0, Math.min(10, score))
  for (const rule of GRADE_RULES) {
    if (s >= rule.minScore && s <= rule.maxScore) {
      return rule.grade4
    }
  }
  return 0.0 // fallback
}

/**
 * Chuyển điểm thang 10 → nhãn xếp loại (A+, A, B+, B, C+, C, D+, D, F).
 */
export function score10ToGradeLabel(score: number): string {
  const s = Math.max(0, Math.min(10, score))
  for (const rule of GRADE_RULES) {
    if (s >= rule.minScore && s <= rule.maxScore) {
      return rule.label
    }
  }
  return 'F'
}

/**
 * Chuyển GPA hệ 4 → GPA hệ 10 xấp xỉ.
 * Dùng cho hiển thị — dựa trên trung điểm của từng khoảng.
 */
export function grade4ToScore10Approx(grade4: number): number {
  if (grade4 >= 4.0) return 9.25 // midpoint của A+(9.0-10.0) + A(8.5-8.9)
  if (grade4 >= 3.5) return 8.2 // midpoint B+ (8.0-8.4)
  if (grade4 >= 3.0) return 7.5 // midpoint B (7.0-7.9)
  if (grade4 >= 2.5) return 6.75 // midpoint C+ (6.5-6.9)
  if (grade4 >= 2.0) return 6.0 // midpoint C (5.5-6.4)
  if (grade4 >= 1.5) return 5.2 // midpoint D+ (5.0-5.4)
  if (grade4 >= 1.0) return 4.5 // midpoint D (4.0-4.9)
  return 2.0 // F
}

// ─── Course Grade Computation ─────────────────────────────────────────────────

/**
 * Tính điểm tổng kết một môn học từ các thành phần điểm.
 *
 * Công thức: score10 = Σ(score_i × weight_i) / Σ(weight_i của những phần có điểm)
 *
 * Nếu tất cả components đều null → score10 = null (chưa có điểm).
 * Nếu một số null → tính trên phần có điểm, đánh dấu isPartial = true.
 */
export function computeCourseGrade(course: CourseGradeInput): CourseGradeResult {
  const { id, name, credits, components } = course

  if (components.length > 0) {
    const totalDeclaredWeight = components.reduce((sum, c) => sum + c.weight, 0)
    if (Math.round(totalDeclaredWeight * 100) !== 10000) {
      throw new Error('Tổng trọng số các thành phần điểm phải bằng 100%')
    }
  }

  if (components.length === 0) {
    return {
      courseId: id,
      name,
      credits,
      components,
      score10: null,
      grade4: null,
      gradeLabel: null,
      isPartial: false,
      isPassed: false,
    }
  }

  const withScore = components.filter((c) => c.score !== null)

  if (withScore.length === 0) {
    return {
      courseId: id,
      name,
      credits,
      components,
      score10: null,
      grade4: null,
      gradeLabel: null,
      isPartial: false,
      isPassed: false,
    }
  }

  const isPartial = withScore.length < components.length

  // Tính weighted average chỉ trên phần có điểm
  const totalWeight = withScore.reduce((sum, c) => sum + c.weight, 0)
  const weightedSum = withScore.reduce((sum, c) => sum + (c.score as number) * c.weight, 0)
  const score10 = totalWeight > 0 ? weightedSum / totalWeight : null

  if (score10 === null) {
    return {
      courseId: id,
      name,
      credits,
      components,
      score10: null,
      grade4: null,
      gradeLabel: null,
      isPartial,
      isPassed: false,
    }
  }

  const grade4 = score10ToGrade4(score10)
  const gradeLabel = score10ToGradeLabel(score10)
  const isPassed = grade4 >= 1.0 && !isPartial // chỉ pass nếu đủ điểm thành phần

  return {
    courseId: id,
    name,
    credits,
    components,
    score10,
    grade4,
    gradeLabel,
    isPartial,
    isPassed,
  }
}

// ─── Semester GPA ─────────────────────────────────────────────────────────────

/**
 * Tính GPA học kỳ từ danh sách môn học.
 *
 * Chỉ tính GPA từ các môn có điểm đầy đủ (không partial).
 * Môn partial hoặc null không tính vào GPA nhưng tính totalCredits.
 */
export function computeSemesterGPA(courses: SemesterGPAInput): SemesterGPAResult {
  const courseResults = courses.map(computeCourseGrade)

  const totalCredits = courseResults.reduce((sum, c) => sum + c.credits, 0)
  const earnedCredits = courseResults
    .filter((c) => c.isPassed)
    .reduce((sum, c) => sum + c.credits, 0)

  // Chỉ tính GPA trên môn có điểm (score10 != null, kể cả partial)
  const scoredCourses = courseResults.filter((c) => c.grade4 !== null && c.score10 !== null)

  if (scoredCourses.length === 0) {
    return { gpa4: null, gpa10: null, totalCredits, earnedCredits, courses: courseResults }
  }

  const totalScoredCredits = scoredCourses.reduce((sum, c) => sum + c.credits, 0)
  const weightedGPA4 = scoredCourses.reduce((sum, c) => sum + (c.grade4 as number) * c.credits, 0)
  const gpa4 = totalScoredCredits > 0 ? weightedGPA4 / totalScoredCredits : null
  const gpa10 = gpa4 !== null ? grade4ToScore10Approx(gpa4) : null

  return { gpa4, gpa10, totalCredits, earnedCredits, courses: courseResults }
}

// ─── Cumulative GPA ───────────────────────────────────────────────────────────

/**
 * Tính GPA tích lũy từ nhiều học kỳ.
 * Input: mảng SemesterGPAResult (đã tính trước bởi computeSemesterGPA).
 */
export function computeCumulativeGPA(semesters: SemesterGPAResult[]): CumulativeGPAResult {
  if (semesters.length === 0) {
    return { cumulativeGPA4: null, cumulativeGPA10: null, totalCredits: 0, earnedCredits: 0 }
  }

  const totalCredits = semesters.reduce((sum, s) => sum + s.totalCredits, 0)
  const earnedCredits = semesters.reduce((sum, s) => sum + s.earnedCredits, 0)

  // Tính GPA4 tích lũy = weighted average qua tất cả môn có điểm
  let totalScoredCredits = 0
  let weightedSum = 0

  for (const sem of semesters) {
    for (const course of sem.courses) {
      if (course.grade4 !== null) {
        totalScoredCredits += course.credits
        weightedSum += course.grade4 * course.credits
      }
    }
  }

  if (totalScoredCredits === 0) {
    return { cumulativeGPA4: null, cumulativeGPA10: null, totalCredits, earnedCredits }
  }

  const cumulativeGPA4 = weightedSum / totalScoredCredits
  const cumulativeGPA10 = grade4ToScore10Approx(cumulativeGPA4)

  return { cumulativeGPA4, cumulativeGPA10, totalCredits, earnedCredits }
}

// ─── Credit Summary (cho biểu đồ) ────────────────────────────────────────────

/**
 * Tính mảng tín chỉ tích lũy theo từng học kỳ — dữ liệu cho biểu đồ Chart.js.
 *
 * Trả về mảng có cùng length với input, mỗi item có:
 * - cumulativeTotalCredits: tổng TC đăng ký đến hết học kỳ này
 * - cumulativeEarnedCredits: tổng TC tích lũy đến hết học kỳ này
 */
export function computeCreditSummary(semesters: SemesterGPAResult[]): CreditSummaryItem[] {
  let cumTotal = 0
  let cumEarned = 0

  return semesters.map((sem, index) => {
    cumTotal += sem.totalCredits
    cumEarned += sem.earnedCredits
    return {
      semesterIndex: index,
      semesterTotalCredits: sem.totalCredits,
      semesterEarnedCredits: sem.earnedCredits,
      cumulativeTotalCredits: cumTotal,
      cumulativeEarnedCredits: cumEarned,
      semesterGPA4: sem.gpa4,
    }
  })
}
