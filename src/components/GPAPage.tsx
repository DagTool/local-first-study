'use client'

/**
 * GPAPage — Trang quản lý tiến trình học tập
 *
 * Layout:
 *   - Header: GPA tích lũy hệ 4 + hệ 10 + tổng TC
 *   - Biểu đồ tín chỉ tích lũy (CreditChart)
 *   - Danh sách học kỳ (SemesterList) với inline CRUD môn học và điểm
 *
 * Tất cả data-testid tuân theo E2E spec (gpa.spec.ts).
 */

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth/authStore'
import { getNamespacedDB } from '@/lib/db/namespaceDB'
import { useGPA } from '@/features/gpa/useGPA'
import { SemesterRepository } from '@/lib/db/repositories'
import { CourseRepository } from '@/lib/db/repositories'
import { GradeComponentRepository } from '@/lib/db/repositories'
import type { GradeComponent } from '@/lib/db/schemas'
import type { SemesterSummary } from '@/features/gpa/useGPA'

// Code-splitting CreditChart (Chart.js)
const CreditChart = dynamic(
  () => import('@/components/CreditChart').then((mod) => mod.CreditChart),
  { ssr: false },
)

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    color: '#e2e8f0',
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    padding: '2rem',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  } as React.CSSProperties,
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    backdropFilter: 'blur(10px)',
  } as React.CSSProperties,
  gpaGiant: {
    fontSize: '3.5rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    lineHeight: 1,
  } as React.CSSProperties,
  btn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(99,102,241,0.5)',
    background: 'rgba(99,102,241,0.15)',
    color: '#a78bfa',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  btnPrimary: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
  } as React.CSSProperties,
  btnDanger: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid rgba(239,68,68,0.4)',
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    cursor: 'pointer',
    fontSize: '12px',
  } as React.CSSProperties,
  input: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
  } as React.CSSProperties,
  label: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '4px',
    display: 'block',
  } as React.CSSProperties,
  row: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' as const },
  gradeBadge: (grade: string | null) =>
    ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 700,
      background:
        grade === 'F'
          ? 'rgba(239,68,68,0.2)'
          : grade?.startsWith('A')
            ? 'rgba(16,185,129,0.2)'
            : grade?.startsWith('B')
              ? 'rgba(59,130,246,0.2)'
              : 'rgba(245,158,11,0.2)',
      color:
        grade === 'F'
          ? '#f87171'
          : grade?.startsWith('A')
            ? '#34d399'
            : grade?.startsWith('B')
              ? '#60a5fa'
              : '#fbbf24',
    }) as React.CSSProperties,
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SemesterForm({
  onSave,
  onCancel,
}: {
  onSave: (d: { name: string; startDate: string; endDate: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
      <div>
        <label style={S.label}>Tên học kỳ</label>
        <input
          data-testid="semester-name-input"
          style={S.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Học kỳ 1 2024-2025"
        />
      </div>
      <div style={S.row}>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Ngày bắt đầu</label>
          <input
            data-testid="semester-start-input"
            type="date"
            style={S.input}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={S.label}>Ngày kết thúc</label>
          <input
            data-testid="semester-end-input"
            type="date"
            style={S.input}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <div style={S.row}>
        <button
          data-testid="semester-save-btn"
          style={S.btnPrimary}
          onClick={() => onSave({ name, startDate, endDate })}
        >
          Lưu học kỳ
        </button>
        <button style={S.btn} onClick={onCancel}>
          Hủy
        </button>
      </div>
    </div>
  )
}

function CourseForm({
  onSave,
  onCancel,
}: {
  onSave: (d: { name: string; credits: number }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [credits, setCredits] = useState('3')

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        marginTop: '8px',
        padding: '12px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
      }}
    >
      <div style={{ flex: 2 }}>
        <label style={S.label}>Tên môn học</label>
        <input
          data-testid="course-name-input"
          style={S.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên môn học"
        />
      </div>
      <div style={{ flex: 1 }}>
        <label style={S.label}>Số TC</label>
        <input
          data-testid="course-credits-input"
          type="number"
          min={1}
          max={10}
          style={S.input}
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
        />
      </div>
      <button
        data-testid="course-save-btn"
        style={S.btnPrimary}
        onClick={() => onSave({ name, credits: parseInt(credits) || 3 })}
      >
        Thêm
      </button>
      <button style={S.btn} onClick={onCancel}>
        Hủy
      </button>
    </div>
  )
}

function GradeComponentForm({
  existing,
  onSave,
  onCancel,
}: {
  courseId?: string
  existing?: GradeComponent | null
  onSave: (d: { name: string; weight: number; score: number | null }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [weight, setWeight] = useState(String(existing?.weight ?? 100))
  const [scoreStr, setScoreStr] = useState(existing?.score != null ? String(existing.score) : '')

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', padding: '8px 0' }}>
      <div style={{ flex: 2 }}>
        <label style={S.label}>Thành phần điểm</label>
        <input
          data-testid="grade-component-name-input"
          style={S.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Giữa kỳ, Cuối kỳ"
        />
      </div>
      <div style={{ flex: 1 }}>
        <label style={S.label}>Trọng số (%)</label>
        <input
          data-testid="grade-component-weight-input"
          type="number"
          min={1}
          max={100}
          style={S.input}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      </div>
      <div style={{ flex: 1 }}>
        <label style={S.label}>Điểm (0–10)</label>
        <input
          data-testid="grade-component-score-input"
          type="number"
          min={0}
          max={10}
          step={0.1}
          style={S.input}
          value={scoreStr}
          onChange={(e) => setScoreStr(e.target.value)}
          placeholder="—"
        />
      </div>
      <button
        data-testid="grade-component-save-btn"
        style={S.btnPrimary}
        onClick={() => {
          const score = scoreStr.trim() !== '' ? parseFloat(scoreStr) : null
          onSave({ name, weight: parseInt(weight) || 100, score })
        }}
      >
        {existing ? 'Cập nhật' : 'Lưu'}
      </button>
      <button style={S.btn} onClick={onCancel}>
        Hủy
      </button>
    </div>
  )
}

// ─── SemesterCard ─────────────────────────────────────────────────────────────

function SemesterCard({
  summary,
  db,
  expanded,
  onToggleExpand,
  onChanged,
}: {
  summary: SemesterSummary
  db: ReturnType<typeof getNamespacedDB>
  expanded: boolean
  onToggleExpand: () => void
  onChanged: () => void
}) {
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [showGCForms, setShowGCForms] = useState<Record<string, boolean>>({})
  const [editingGC, setEditingGC] = useState<GradeComponent | null>(null)

  const courseRepo = new CourseRepository(db)
  const gcRepo = new GradeComponentRepository(db)

  const handleAddCourse = async (d: { name: string; credits: number }) => {
    try {
      await courseRepo.create({ semesterId: summary.semesterId, name: d.name, credits: d.credits })
      setShowCourseForm(false)
      onChanged()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    try {
      // Delete all grade components first
      const gcs = await db.gradeComponents.where('courseId').equals(courseId).toArray()
      for (const gc of gcs) await gcRepo.delete(gc.id)
      await courseRepo.delete(courseId)
      onChanged()
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveGC = async (
    courseId: string,
    d: { name: string; weight: number; score: number | null },
    editId?: string,
  ) => {
    try {
      if (editId) {
        await gcRepo.update(editId, d)
      } else {
        await gcRepo.create({ courseId, ...d })
      }
      setShowGCForms({})
      setEditingGC(null)
      onChanged()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteGC = async (gcId: string) => {
    try {
      await gcRepo.delete(gcId)
      onChanged()
    } catch (e) {
      console.error(e)
    }
  }

  const semGPA4 = summary.gpa4
  const gpaColor =
    semGPA4 === null
      ? '#9ca3af'
      : semGPA4 >= 3.5
        ? '#34d399'
        : semGPA4 >= 2.5
          ? '#60a5fa'
          : semGPA4 >= 1.0
            ? '#fbbf24'
            : '#f87171'

  return (
    <div style={S.card}>
      {/* Semester header */}
      <div
        data-testid="toggle-expand-btn"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={onToggleExpand}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px' }}>{summary.semesterName}</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
            {summary.courses.length} môn • {summary.totalCredits} TC đăng ký •{' '}
            {summary.earnedCredits} TC tích lũy
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>GPA học kỳ</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: gpaColor }}>
            {semGPA4 !== null ? semGPA4.toFixed(2) : '—'}
          </div>
        </div>
      </div>

      {/* Expanded: course list */}
      {expanded && (
        <div style={{ marginTop: '16px' }}>
          {/* Course empty state */}
          {summary.courses.length === 0 ? (
            <div
              data-testid="courses-empty-state"
              style={{
                textAlign: 'center',
                padding: '1.25rem',
                color: '#94a3b8',
                fontSize: '13px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                border: '1px dashed rgba(255,255,255,0.1)',
                marginBottom: '8px',
              }}
            >
              Chưa có môn học nào trong học kỳ này.
            </div>
          ) : (
            summary.courses.map((courseResult) => {
              const courseId = courseResult.courseId
              return (
                <div
                  key={courseId}
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    paddingTop: '12px',
                    marginTop: '12px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#f1f5f9' }}>
                        {courseResult.name || `Môn ${courseId.slice(-4)}`}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{courseResult.credits} TC</span>
                        <span style={{ marginLeft: '8px', color: '#94a3b8', fontSize: '13px' }}>
                          {courseResult.score10 !== null
                            ? `${courseResult.score10.toFixed(2)} điểm`
                            : 'Chưa có điểm'}
                        </span>
                        {courseResult.gradeLabel && (
                          <span
                            style={{ ...S.gradeBadge(courseResult.gradeLabel), marginLeft: '8px' }}
                          >
                            {courseResult.gradeLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        data-testid="add-grade-component-btn"
                        style={S.btn}
                        onClick={() => {
                          setEditingGC(null)
                          setShowGCForms((p) => ({ ...p, [courseId]: !p[courseId] }))
                        }}
                      >
                        + Điểm
                      </button>
                      <button style={S.btnDanger} onClick={() => handleDeleteCourse(courseId)}>
                        Xóa môn
                      </button>
                    </div>
                  </div>

                  {/* Grade components list */}
                  {courseResult.components && courseResult.components.length > 0 && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '8px',
                      }}
                    >
                      {courseResult.components.map((gc) => (
                        <div
                          key={gc.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 0',
                          }}
                        >
                          <div style={{ fontSize: '13px' }}>
                            <span style={{ color: '#cbd5e1' }}>{gc.name || 'Thành phần'}</span>
                            <span style={{ color: '#94a3b8', marginLeft: '6px' }}>
                              ({gc.weight}%)
                            </span>
                            <span style={{ fontWeight: 600, marginLeft: '8px' }}>
                              {gc.score !== null ? `${gc.score.toFixed(1)} đ` : '—'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              data-testid="edit-grade-component-btn"
                              style={S.btn}
                              onClick={() => {
                                setEditingGC({
                                  id: gc.id,
                                  courseId,
                                  name: gc.name || '',
                                  weight: gc.weight,
                                  score: gc.score,
                                  createdAt: 0,
                                  updatedAt: 0,
                                })
                                setShowGCForms({ [courseId]: true })
                              }}
                            >
                              Sửa
                            </button>
                            <button style={S.btnDanger} onClick={() => void handleDeleteGC(gc.id)}>
                              Xóa
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Grade components (display existing) */}
                  {courseResult.isPartial && (
                    <div style={{ fontSize: '11px', color: '#fbbf24', marginTop: '4px' }}>
                      ⚠ Chưa đủ thành phần điểm
                    </div>
                  )}

                  {/* GC form */}
                  {showGCForms[courseId] && (
                    <div style={{ marginTop: '8px' }}>
                      <GradeComponentForm
                        existing={editingGC}
                        onSave={(d) => handleSaveGC(courseId, d, editingGC?.id)}
                        onCancel={() => {
                          setShowGCForms({})
                          setEditingGC(null)
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })
          )}

          {/* Add course button / form */}
          {showCourseForm ? (
            <CourseForm onSave={handleAddCourse} onCancel={() => setShowCourseForm(false)} />
          ) : (
            <button
              data-testid="add-course-btn"
              style={{ ...S.btn, marginTop: '12px', width: '100%' }}
              onClick={() => setShowCourseForm(true)}
            >
              + Thêm môn học
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main GPAPage ─────────────────────────────────────────────────────────────

export function GPAPage() {
  const { state } = useAuthStore()
  const db = state.userKey ? getNamespacedDB(state.userKey) : null

  const gpa = useGPA(db!)
  const [showSemForm, setShowSemForm] = useState(false)
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({})

  const semesterRepo = useMemo(() => (db ? new SemesterRepository(db) : null), [db])

  const handleAddSemester = useCallback(
    async (d: { name: string; startDate: string; endDate: string }) => {
      if (!semesterRepo) return
      try {
        await semesterRepo.create({ ...d, isActive: true })
        setShowSemForm(false)
        gpa.reload()
      } catch (e) {
        console.error(e)
      }
    },
    [semesterRepo, gpa],
  )

  const handleChanged = useCallback(() => {
    gpa.reload()
  }, [gpa])

  if (!db || !state.userKey) {
    return (
      <div
        data-testid="gpa-page"
        style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <p>Vui lòng đăng nhập để xem tiến trình học tập</p>
        </div>
      </div>
    )
  }

  const gpa4Display = gpa.cumulativeGPA4 !== null ? gpa.cumulativeGPA4.toFixed(2) : '—'
  const gpa10Display = gpa.cumulativeGPA10 !== null ? gpa.cumulativeGPA10.toFixed(2) : '—'

  return (
    <div data-testid="gpa-page" style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>📚 Tiến trình Học tập</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            GPA & Tín chỉ tích lũy
          </p>
        </div>
        <Link href="/" style={{ ...S.btn, textDecoration: 'none' }}>
          ← Về trang chủ
        </Link>
      </div>

      {/* GPA Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* GPA hệ 4 */}
        <div style={S.card}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            GPA tích lũy (Hệ 4)
          </div>
          <div data-testid="cumulative-gpa4" style={S.gpaGiant}>
            {gpa4Display}
          </div>
        </div>

        {/* GPA hệ 10 */}
        <div style={S.card}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            GPA tích lũy (Hệ 10)
          </div>
          <div style={{ ...S.gpaGiant, fontSize: '3rem' }}>{gpa10Display}</div>
        </div>

        {/* Tín chỉ */}
        <div style={S.card}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
            Tín chỉ tích lũy
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#34d399' }}>
            {gpa.earnedCredits}
            <span style={{ fontSize: '1.2rem', color: '#94a3b8', fontWeight: 400 }}>
              {' '}
              / {gpa.totalCredits}
            </span>
          </div>
        </div>

        {/* Số học kỳ */}
        <div style={S.card}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Số học kỳ</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#a78bfa' }}>
            {gpa.semesterSummaries.length}
          </div>
        </div>
      </div>

      {/* Credit Chart */}
      <div style={S.card}>
        <div style={{ fontWeight: 700, marginBottom: '1rem' }}>📈 Biểu đồ tín chỉ tích lũy</div>
        <CreditChart
          data={gpa.creditChartData}
          labels={gpa.semesterSummaries.map((s) => s.semesterName)}
        />
      </div>

      {/* Semester list */}
      <div
        style={{
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Danh sách học kỳ</h2>
        <button
          data-testid="add-semester-btn"
          style={S.btnPrimary}
          onClick={() => setShowSemForm(true)}
        >
          + Thêm học kỳ
        </button>
      </div>

      {showSemForm && (
        <div style={S.card}>
          <div style={{ fontWeight: 700 }}>Thêm học kỳ mới</div>
          <SemesterForm onSave={handleAddSemester} onCancel={() => setShowSemForm(false)} />
        </div>
      )}

      {/* Semester cards */}
      <div data-testid="semester-list">
        {gpa.isLoading && gpa.semesterSummaries.length === 0 ? (
          <div
            data-testid="gpa-loading-skeleton"
            style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}
          >
            Đang tải tiến trình học tập...
          </div>
        ) : gpa.semesterSummaries.length === 0 ? (
          <div
            data-testid="gpa-empty-state"
            style={{ ...S.card, textAlign: 'center', color: '#94a3b8', padding: '3rem' }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
            <p>Chưa có học kỳ nào. Nhấn &ldquo;+ Thêm học kỳ&rdquo; để bắt đầu.</p>
          </div>
        ) : (
          gpa.semesterSummaries.map((summary) => (
            <SemesterCard
              key={summary.semesterId}
              summary={summary}
              db={db}
              expanded={!!expandedSemesters[summary.semesterId]}
              onToggleExpand={() =>
                setExpandedSemesters((p) => ({
                  ...p,
                  [summary.semesterId]: !p[summary.semesterId],
                }))
              }
              onChanged={handleChanged}
            />
          ))
        )}
      </div>
    </div>
  )
}
