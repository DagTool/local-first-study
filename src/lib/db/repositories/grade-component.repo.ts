/**
 * GradeComponentRepository — CRUD cho entity GradeComponent
 */
import {
  CreateGradeComponentSchema,
  UpdateGradeComponentSchema,
  type GradeComponent,
  type CreateGradeComponentInput,
  type UpdateGradeComponentInput,
} from '../schemas'
import { BaseRepository } from './base.repo'
import type { StudyFlowDB } from '../index'

export class GradeComponentRepository extends BaseRepository {
  constructor(db: StudyFlowDB) {
    super(db)
  }

  async create(input: CreateGradeComponentInput): Promise<GradeComponent> {
    const validated = CreateGradeComponentSchema.parse(input)
    const now = this.now()
    const gc: GradeComponent = {
      ...validated,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await this.db.gradeComponents.add(gc)
    return gc
  }

  async findById(id: string): Promise<GradeComponent | null> {
    const gc = await this.db.gradeComponents.get(id)
    return gc ?? null
  }

  async findAll(): Promise<GradeComponent[]> {
    return this.db.gradeComponents.toArray()
  }

  /** Lấy tất cả thành phần điểm của một môn học */
  async findByCourse(courseId: string): Promise<GradeComponent[]> {
    return this.db.gradeComponents.where('courseId').equals(courseId).toArray()
  }

  async update(id: string, input: UpdateGradeComponentInput): Promise<GradeComponent> {
    const existing = await this.db.gradeComponents.get(id)
    this.assertExists(existing, id, 'GradeComponent')

    const validated = UpdateGradeComponentSchema.parse(input)
    const updated: GradeComponent = {
      ...existing!,
      ...validated,
      updatedAt: this.now(),
    }
    await this.db.gradeComponents.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.db.gradeComponents.get(id)
    this.assertExists(existing, id, 'GradeComponent')
    await this.db.gradeComponents.delete(id)
  }
}
