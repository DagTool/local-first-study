/**
 * Unit Tests — Zod Schemas
 * TDD: viết TRƯỚC khi có implementation.
 * Kiểm tra từng schema accept valid data và reject invalid data.
 */
import { describe, it, expect } from 'vitest'
import {
  UserSchema,
  SemesterSchema,
  CourseSchema,
  GradeComponentSchema,
  ScheduleSlotSchema,
  NoteSchema,
  TagSchema,
} from '@/lib/db/schemas'

// ── Helper ────────────────────────────────────────────────────────────────────
const now = Date.now()

// ── User Schema ───────────────────────────────────────────────────────────────
describe('UserSchema', () => {
  const validUser = {
    id: 'user-1',
    googleId: 'google-123',
    email: 'test@example.com',
    name: 'Nguyễn Văn A',
    avatar: 'https://example.com/avatar.jpg',
    createdAt: now,
    updatedAt: now,
  }

  it('accepts valid user', () => {
    expect(() => UserSchema.parse(validUser)).not.toThrow()
  })

  it('rejects missing googleId', () => {
    expect(() => UserSchema.parse({ ...validUser, googleId: '' })).toThrow()
  })

  it('rejects invalid email', () => {
    expect(() => UserSchema.parse({ ...validUser, email: 'not-an-email' })).toThrow()
  })

  it('rejects missing name', () => {
    expect(() => UserSchema.parse({ ...validUser, name: '' })).toThrow()
  })

  it('allows avatar to be undefined', () => {
    const { avatar: _avatar, ...withoutAvatar } = validUser
    expect(() => UserSchema.parse(withoutAvatar)).not.toThrow()
  })
})

// ── Semester Schema ───────────────────────────────────────────────────────────
describe('SemesterSchema', () => {
  const validSemester = {
    id: 'sem-1',
    name: 'Học kỳ 1 — 2024-2025',
    startDate: '2024-09-01',
    endDate: '2025-01-15',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }

  it('accepts valid semester', () => {
    expect(() => SemesterSchema.parse(validSemester)).not.toThrow()
  })

  it('rejects empty name', () => {
    expect(() => SemesterSchema.parse({ ...validSemester, name: '' })).toThrow()
  })

  it('rejects invalid startDate format', () => {
    expect(() => SemesterSchema.parse({ ...validSemester, startDate: '01/09/2024' })).toThrow()
  })

  it('rejects endDate before startDate', () => {
    expect(() => SemesterSchema.parse({ ...validSemester, endDate: '2024-08-01' })).toThrow()
  })
})

// ── Course Schema ─────────────────────────────────────────────────────────────
describe('CourseSchema', () => {
  const validCourse = {
    id: 'course-1',
    semesterId: 'sem-1',
    name: 'Lập trình Web',
    credits: 3,
    color: '#6366f1',
    createdAt: now,
    updatedAt: now,
  }

  it('accepts valid course', () => {
    expect(() => CourseSchema.parse(validCourse)).not.toThrow()
  })

  it('rejects credits = 0', () => {
    expect(() => CourseSchema.parse({ ...validCourse, credits: 0 })).toThrow()
  })

  it('rejects credits > 10', () => {
    expect(() => CourseSchema.parse({ ...validCourse, credits: 11 })).toThrow()
  })

  it('rejects invalid hex color', () => {
    expect(() => CourseSchema.parse({ ...validCourse, color: 'red' })).toThrow()
  })

  it('allows color to be undefined', () => {
    const { color: _color, ...withoutColor } = validCourse
    expect(() => CourseSchema.parse(withoutColor)).not.toThrow()
  })
})

// ── GradeComponent Schema ─────────────────────────────────────────────────────
describe('GradeComponentSchema', () => {
  const validGrade = {
    id: 'grade-1',
    courseId: 'course-1',
    name: 'Kiểm tra giữa kỳ',
    weight: 30,
    score: null,
    createdAt: now,
    updatedAt: now,
  }

  it('accepts valid grade component with null score', () => {
    expect(() => GradeComponentSchema.parse(validGrade)).not.toThrow()
  })

  it('accepts grade component with score', () => {
    expect(() => GradeComponentSchema.parse({ ...validGrade, score: 8.5 })).not.toThrow()
  })

  it('rejects weight = 0', () => {
    expect(() => GradeComponentSchema.parse({ ...validGrade, weight: 0 })).toThrow()
  })

  it('rejects weight > 100', () => {
    expect(() => GradeComponentSchema.parse({ ...validGrade, weight: 101 })).toThrow()
  })

  it('rejects score < 0', () => {
    expect(() => GradeComponentSchema.parse({ ...validGrade, score: -1 })).toThrow()
  })

  it('rejects score > 10', () => {
    expect(() => GradeComponentSchema.parse({ ...validGrade, score: 11 })).toThrow()
  })
})

// ── ScheduleSlot Schema ───────────────────────────────────────────────────────
describe('ScheduleSlotSchema', () => {
  const validSlot = {
    id: 'slot-1',
    courseId: 'course-1',
    dayOfWeek: 1, // Monday
    startTime: '07:30',
    endTime: '09:30',
    room: 'A101',
    createdAt: now,
    updatedAt: now,
  }

  it('accepts valid schedule slot', () => {
    expect(() => ScheduleSlotSchema.parse(validSlot)).not.toThrow()
  })

  it('rejects dayOfWeek = 0', () => {
    expect(() => ScheduleSlotSchema.parse({ ...validSlot, dayOfWeek: 0 })).toThrow()
  })

  it('rejects dayOfWeek = 8', () => {
    expect(() => ScheduleSlotSchema.parse({ ...validSlot, dayOfWeek: 8 })).toThrow()
  })

  it('rejects invalid time format', () => {
    expect(() => ScheduleSlotSchema.parse({ ...validSlot, startTime: '7:30' })).toThrow()
  })

  it('allows room to be undefined', () => {
    const { room: _room, ...withoutRoom } = validSlot
    expect(() => ScheduleSlotSchema.parse(withoutRoom)).not.toThrow()
  })
})

// ── Note Schema ───────────────────────────────────────────────────────────────
describe('NoteSchema', () => {
  const validNote = {
    id: 'note-1',
    title: 'Ghi chú Web',
    content: '<p>Nội dung ghi chú</p>',
    tags: ['tag-1', 'tag-2'],
    courseId: null,
    isPinned: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  }

  it('accepts valid note', () => {
    expect(() => NoteSchema.parse(validNote)).not.toThrow()
  })

  it('accepts note with courseId', () => {
    expect(() => NoteSchema.parse({ ...validNote, courseId: 'course-1' })).not.toThrow()
  })

  it('rejects empty title', () => {
    expect(() => NoteSchema.parse({ ...validNote, title: '' })).toThrow()
  })

  it('rejects title longer than 255 chars', () => {
    expect(() => NoteSchema.parse({ ...validNote, title: 'a'.repeat(256) })).toThrow()
  })

  it('accepts empty content (draft)', () => {
    expect(() => NoteSchema.parse({ ...validNote, content: '' })).not.toThrow()
  })

  it('accepts empty tags array', () => {
    expect(() => NoteSchema.parse({ ...validNote, tags: [] })).not.toThrow()
  })
})

// ── Tag Schema ────────────────────────────────────────────────────────────────
describe('TagSchema', () => {
  const validTag = {
    id: 'tag-1',
    name: 'Quan trọng',
    color: '#ef4444',
    createdAt: now,
    updatedAt: now,
  }

  it('accepts valid tag', () => {
    expect(() => TagSchema.parse(validTag)).not.toThrow()
  })

  it('rejects empty name', () => {
    expect(() => TagSchema.parse({ ...validTag, name: '' })).toThrow()
  })

  it('rejects name longer than 50 chars', () => {
    expect(() => TagSchema.parse({ ...validTag, name: 'a'.repeat(51) })).toThrow()
  })

  it('rejects invalid hex color', () => {
    expect(() => TagSchema.parse({ ...validTag, color: '#xyz' })).toThrow()
  })

  it('allows color to be undefined', () => {
    const { color: _color, ...withoutColor } = validTag
    expect(() => TagSchema.parse(withoutColor)).not.toThrow()
  })
})
