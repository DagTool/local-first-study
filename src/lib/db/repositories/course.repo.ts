/**
 * CourseRepository — CRUD cho entity Course
 */
import {
  CreateCourseSchema,
  UpdateCourseSchema,
  type Course,
  type CreateCourseInput,
  type UpdateCourseInput,
} from '../schemas'
import { BaseRepository } from './base.repo'
import type { StudyFlowDB } from '../index'

export class CourseRepository extends BaseRepository {
  constructor(db: StudyFlowDB) {
    super(db)
  }

  async create(input: CreateCourseInput): Promise<Course> {
    const validated = CreateCourseSchema.parse(input)
    const now = this.now()
    const course: Course = {
      ...validated,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await this.db.courses.add(course)
    return course
  }

  async findById(id: string): Promise<Course | null> {
    const course = await this.db.courses.get(id)
    return course ?? null
  }

  async findAll(): Promise<Course[]> {
    return this.db.courses.toArray()
  }

  /** Lọc courses theo semester */
  async findBySemester(semesterId: string): Promise<Course[]> {
    return this.db.courses.where('semesterId').equals(semesterId).toArray()
  }

  async update(id: string, input: UpdateCourseInput): Promise<Course> {
    const existing = await this.db.courses.get(id)
    this.assertExists(existing, id, 'Course')

    const validated = UpdateCourseSchema.parse(input)
    const updated: Course = {
      ...existing!,
      ...validated,
      updatedAt: this.now(),
    }
    await this.db.courses.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.db.courses.get(id)
    this.assertExists(existing, id, 'Course')
    await this.db.courses.delete(id)
  }
}
