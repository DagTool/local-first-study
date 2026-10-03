/**
 * useGPA — React hook tính GPA từ Dexie DB
 *
 * Load toàn bộ semesters → courses → gradeComponents từ DB,
 * tính GPA qua gpaCalculator, trả về kết quả reactive.
 *
 * reload() được expose để trigger re-fetch thủ công (sau khi update DB).
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { StudyFlowDB } from '@/lib/db'
import {
  computeSemesterGPA,
  computeCumulativeGPA,
  computeCreditSummary,
} from '@/lib/gpa/gpaCalculator'
import type {
  CourseGradeInput,
  SemesterGPAResult,
  CumulativeGPAResult,
  CreditSummaryItem,
} from '@/lib/gpa/gpaCalculator'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SemesterSummary extends SemesterGPAResult {
  semesterId: string
  semesterName: string
  cumulativeEarnedCredits: number
  cumulativeTotalCredits: number
}

export interface UseGPAResult extends CumulativeGPAResult {
  /** Dữ liệu từng học kỳ (sorted by startDate asc) */
  semesterSummaries: SemesterSummary[]
  /** Dữ liệu cho biểu đồ tín chỉ tích lũy */
  creditChartData: CreditSummaryItem[]
  /** Loading state */
  isLoading: boolean
  /** Trigger re-fetch từ DB */
  reload: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGPA(db: StudyFlowDB): UseGPAResult {
  const [data, setData] = useState<
    Omit<UseGPAResult, 'reload' | 'isLoading'> & { isLoading: boolean }
  >({
    cumulativeGPA4: null,
    cumulativeGPA10: null,
    totalCredits: 0,
    earnedCredits: 0,
    semesterSummaries: [],
    creditChartData: [],
    isLoading: true,
  })

  const fetchGPA = useCallback(async () => {
    try {
      // 1. Load all semesters, sorted by startDate
      const allSemesters = await db.semesters.toArray()
      allSemesters.sort((a, b) => a.startDate.localeCompare(b.startDate))

      // 2. For each semester, load courses + gradeComponents
      const semesterGPAResults: Array<
        SemesterGPAResult & { semesterId: string; semesterName: string }
      > = []

      for (const sem of allSemesters) {
        const courses = await db.courses.where('semesterId').equals(sem.id).toArray()

        const courseInputs: CourseGradeInput[] = await Promise.all(
          courses.map(async (course) => {
            const gcs = await db.gradeComponents.where('courseId').equals(course.id).toArray()
            return {
              id: course.id,
              name: course.name,
              credits: course.credits,
              components: gcs.map((gc) => ({
                id: gc.id,
                name: gc.name,
                weight: gc.weight,
                score: gc.score,
              })),
            }
          }),
        )

        const semGPA = computeSemesterGPA(courseInputs)
        semesterGPAResults.push({ ...semGPA, semesterId: sem.id, semesterName: sem.name })
      }

      // 3. Compute cumulative GPA
      const cumulative = computeCumulativeGPA(semesterGPAResults)

      // 4. Compute credit chart data
      const creditSummary = computeCreditSummary(semesterGPAResults)

      // 5. Build semesterSummaries with cumulative credit counters
      const semesterSummaries: SemesterSummary[] = semesterGPAResults.map((s, i) => ({
        ...s,
        cumulativeEarnedCredits: creditSummary[i]?.cumulativeEarnedCredits ?? 0,
        cumulativeTotalCredits: creditSummary[i]?.cumulativeTotalCredits ?? 0,
      }))

      setData({
        ...cumulative,
        semesterSummaries,
        creditChartData: creditSummary,
        isLoading: false,
      })
    } catch (err) {
      console.error('[useGPA] error loading GPA data:', err)
      setData((prev) => ({ ...prev, isLoading: false }))
    }
  }, [db])

  const reload = useCallback(() => {
    void fetchGPA()
  }, [fetchGPA])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchGPA()
  }, [fetchGPA])

  return { ...data, reload }
}
