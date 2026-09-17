/**
 * SemesterRepository — CRUD cho entity Semester
 */
import {
  CreateSemesterSchema,
  UpdateSemesterSchema,
  type Semester,
  type CreateSemesterInput,
  type UpdateSemesterInput,
} from '../schemas'
import { BaseRepository } from './base.repo'
import type { StudyFlowDB } from '../index'

export class SemesterRepository extends BaseRepository {
  constructor(db: StudyFlowDB) {
    super(db)
  }

  async create(input: CreateSemesterInput): Promise<Semester> {
    const validated = CreateSemesterSchema.parse(input)
    const now = this.now()
    const semester: Semester = {
      ...validated,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await this.db.semesters.add(semester)
    return semester
  }

  async findById(id: string): Promise<Semester | null> {
    const sem = await this.db.semesters.get(id)
    return sem ?? null
  }

  async findAll(): Promise<Semester[]> {
    return this.db.semesters.toArray()
  }

  /** Chỉ trả về các học kỳ đang active */
  async findActive(): Promise<Semester[]> {
    // IndexedDB spec không hỗ trợ boolean làm index key.
    // Dùng .filter() để tương thích cả real IDB và fake-indexeddb.
    return this.db.semesters.filter((s) => s.isActive === true).toArray()
  }

  async update(id: string, input: UpdateSemesterInput): Promise<Semester> {
    const existing = await this.db.semesters.get(id)
    this.assertExists(existing, id, 'Semester')

    const validated = UpdateSemesterSchema.parse(input)
    const merged = { ...existing!, ...validated }

    // Re-validate toàn bộ object sau khi merge để kiểm tra constraint (endDate > startDate)
    const fullValidated = CreateSemesterSchema.parse({
      name: merged.name,
      startDate: merged.startDate,
      endDate: merged.endDate,
      isActive: merged.isActive,
    })

    const updated: Semester = {
      ...merged,
      ...fullValidated,
      updatedAt: this.now(),
    }
    await this.db.semesters.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.db.semesters.get(id)
    this.assertExists(existing, id, 'Semester')
    await this.db.semesters.delete(id)
  }
}
