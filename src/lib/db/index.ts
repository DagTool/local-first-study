/**
 * StudyFlowDB — Dexie Database
 *
 * Định nghĩa IndexedDB schema và singleton instance.
 *
 * Index strategy:
 * - Primary key: `id` (string uuid) cho tất cả tables
 * - Foreign key indexes để query nhanh theo parent
 * - Composite indexes cho các query phổ biến
 *
 * Versioning:
 * - Version 1: schema ban đầu với đầy đủ 7 tables
 * - Nâng version tại đây khi thay đổi schema
 */
import Dexie, { type EntityTable } from 'dexie'
import type { User, Semester, Course, GradeComponent, ScheduleSlot, Note, Tag } from './schemas'

export class StudyFlowDB extends Dexie {
  // Tables — typed via EntityTable<T, PrimaryKey>
  users!: EntityTable<User, 'id'>
  semesters!: EntityTable<Semester, 'id'>
  courses!: EntityTable<Course, 'id'>
  gradeComponents!: EntityTable<GradeComponent, 'id'>
  scheduleSlots!: EntityTable<ScheduleSlot, 'id'>
  notes!: EntityTable<Note, 'id'>
  tags!: EntityTable<Tag, 'id'>

  constructor(name = 'studyflow-db') {
    super(name)

    this.version(1).stores({
      // Syntax: 'primaryKey, index1, index2, *multiValueIndex'
      users: 'id, googleId, email, createdAt',
      semesters: 'id, isActive, startDate, endDate, createdAt',
      courses: 'id, semesterId, name, createdAt',
      gradeComponents: 'id, courseId, createdAt',
      scheduleSlots: 'id, courseId, dayOfWeek, createdAt',
      // *tags = multi-entry index — cho phép query note theo từng tag
      notes: 'id, courseId, isPinned, isArchived, *tags, createdAt, updatedAt',
      tags: 'id, name, createdAt',
    })
  }
}

/**
 * Singleton instance — dùng cho toàn bộ ứng dụng production.
 * Trong test, tạo instance riêng qua `new StudyFlowDB(randomName)`.
 */
export const db = new StudyFlowDB()

export default db
