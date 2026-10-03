/**
 * Zod Schemas — StudyFlow PWA
 *
 * Định nghĩa schema validation cho tất cả entities.
 * Tất cả dữ liệu GHI vào IndexedDB phải đi qua Zod parse trước.
 *
 * Conventions:
 * - ID: string (crypto.randomUUID())
 * - Timestamp: number (Date.now() — Unix ms)
 * - Date string: 'YYYY-MM-DD'
 * - Time string: 'HH:MM' (24h)
 * - Color: hex string '#RRGGBB' hoặc '#RGB'
 */
import { z } from 'zod'

// ── Primitives ────────────────────────────────────────────────────────────────

const idSchema = z.string().min(1, 'ID không được rỗng')

const timestampSchema = z.number().int().positive('Timestamp phải là số nguyên dương')

/** 'YYYY-MM-DD' */
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có định dạng 'YYYY-MM-DD'")

/** 'HH:MM' (24h) */
const timeStringSchema = z.string().regex(/^\d{2}:\d{2}$/, "Giờ phải có định dạng 'HH:MM'")

/** '#RRGGBB' hoặc '#RGB' */
const hexColorSchema = z
  .string()
  .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Màu phải là hex hợp lệ (ví dụ '#6366f1')")

/** Base fields — tất cả entities đều có */
const baseEntityFields = {
  id: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}

// ── User ──────────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  ...baseEntityFields,
  googleId: z.string().min(1, 'Google ID không được rỗng'),
  email: z.string().email('Email không hợp lệ'),
  name: z.string().min(1, 'Tên không được rỗng').max(200, 'Tên quá dài'),
  avatar: z.string().url('Avatar phải là URL hợp lệ').optional(),
})

export type User = z.infer<typeof UserSchema>

/** Schema cho input khi tạo (bỏ id, createdAt, updatedAt — tự generate) */
export const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true, updatedAt: true })
export type CreateUserInput = z.infer<typeof CreateUserSchema>

export const UpdateUserSchema = CreateUserSchema.partial()
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

// ── Semester ──────────────────────────────────────────────────────────────────

/**
 * Base object (no refinements) — dùng để .omit() / .partial() mà không bị lỗi Zod v4.
 * Rule: ".omit() cannot be used on object schemas containing refinements"
 */
const SemesterBaseSchema = z.object({
  ...baseEntityFields,
  name: z.string().min(1, 'Tên học kỳ không được rỗng').max(100),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  isActive: z.boolean(),
})

const semesterDateRefinement = (data: { startDate: string; endDate: string }) =>
  data.endDate > data.startDate

const semesterDateRefinementParams = {
  message: 'Ngày kết thúc phải sau ngày bắt đầu',
  path: ['endDate'] as PropertyKey[],
}

export const SemesterSchema = SemesterBaseSchema.refine(
  semesterDateRefinement,
  semesterDateRefinementParams,
)

export type Semester = z.infer<typeof SemesterSchema>

export const CreateSemesterSchema = SemesterBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).refine(semesterDateRefinement, semesterDateRefinementParams)
export type CreateSemesterInput = z.infer<typeof CreateSemesterSchema>

// UpdateSemester: partial, không áp refine vì cả 2 field có thể vắng mặt
export const UpdateSemesterSchema = SemesterBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial()
export type UpdateSemesterInput = z.infer<typeof UpdateSemesterSchema>

// ── Course ────────────────────────────────────────────────────────────────────

export const CourseSchema = z.object({
  ...baseEntityFields,
  semesterId: idSchema,
  name: z.string().min(1, 'Tên môn học không được rỗng').max(200),
  credits: z.number().int().min(1, 'Số tín chỉ tối thiểu là 1').max(10, 'Số tín chỉ tối đa là 10'),
  color: hexColorSchema.optional(),
  lecturer: z.string().max(200, 'Tên giảng viên quá dài').optional(),
})

export type Course = z.infer<typeof CourseSchema>

export const CreateCourseSchema = CourseSchema.omit({ id: true, createdAt: true, updatedAt: true })
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>

export const UpdateCourseSchema = CreateCourseSchema.partial()
export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>

// ── GradeComponent ────────────────────────────────────────────────────────────

export const GradeComponentSchema = z.object({
  ...baseEntityFields,
  courseId: idSchema,
  name: z.string().min(1, 'Tên thành phần không được rỗng').max(100),
  weight: z.number().min(1, 'Trọng số tối thiểu là 1%').max(100, 'Trọng số tối đa là 100%'),
  score: z.number().min(0, 'Điểm không âm').max(10, 'Điểm tối đa là 10').nullable(),
})

export type GradeComponent = z.infer<typeof GradeComponentSchema>

export const CreateGradeComponentSchema = GradeComponentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export type CreateGradeComponentInput = z.infer<typeof CreateGradeComponentSchema>

export const UpdateGradeComponentSchema = CreateGradeComponentSchema.partial()
export type UpdateGradeComponentInput = z.infer<typeof UpdateGradeComponentSchema>

// ── ScheduleSlot ──────────────────────────────────────────────────────────────

export const ScheduleSlotSchema = z.object({
  ...baseEntityFields,
  courseId: idSchema,
  /** 1=Monday … 7=Sunday (ISO weekday) */
  dayOfWeek: z.number().int().min(1, 'dayOfWeek tối thiểu là 1').max(7, 'dayOfWeek tối đa là 7'),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
  room: z.string().max(50).optional(),
})

export type ScheduleSlot = z.infer<typeof ScheduleSlotSchema>

export const CreateScheduleSlotSchema = ScheduleSlotSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export type CreateScheduleSlotInput = z.infer<typeof CreateScheduleSlotSchema>

export const UpdateScheduleSlotSchema = CreateScheduleSlotSchema.partial()
export type UpdateScheduleSlotInput = z.infer<typeof UpdateScheduleSlotSchema>

// ── Note ──────────────────────────────────────────────────────────────────────

export const NoteSchema = z.object({
  ...baseEntityFields,
  title: z.string().min(1, 'Tiêu đề không được rỗng').max(255, 'Tiêu đề tối đa 255 ký tự'),
  content: z.string(), // HTML/Markdown — có thể rỗng (draft)
  tags: z.array(idSchema),
  courseId: idSchema.nullable(),
  isPinned: z.boolean(),
  isArchived: z.boolean(),
})

export type Note = z.infer<typeof NoteSchema>

export const CreateNoteSchema = NoteSchema.omit({ id: true, createdAt: true, updatedAt: true })
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>

export const UpdateNoteSchema = CreateNoteSchema.partial()
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>

// ── Tag ───────────────────────────────────────────────────────────────────────

export const TagSchema = z.object({
  ...baseEntityFields,
  name: z.string().min(1, 'Tên tag không được rỗng').max(50, 'Tên tag tối đa 50 ký tự'),
  color: hexColorSchema.optional(),
})

export type Tag = z.infer<typeof TagSchema>

export const CreateTagSchema = TagSchema.omit({ id: true, createdAt: true, updatedAt: true })
export type CreateTagInput = z.infer<typeof CreateTagSchema>

export const UpdateTagSchema = CreateTagSchema.partial()
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>
