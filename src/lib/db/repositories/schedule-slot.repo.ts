/**
 * ScheduleSlotRepository — CRUD cho entity ScheduleSlot
 */
import {
  CreateScheduleSlotSchema,
  UpdateScheduleSlotSchema,
  type ScheduleSlot,
  type CreateScheduleSlotInput,
  type UpdateScheduleSlotInput,
} from '../schemas'
import { BaseRepository } from './base.repo'
import type { StudyFlowDB } from '../index'

export class ScheduleSlotRepository extends BaseRepository {
  constructor(db: StudyFlowDB) {
    super(db)
  }

  async create(input: CreateScheduleSlotInput): Promise<ScheduleSlot> {
    const validated = CreateScheduleSlotSchema.parse(input)
    const now = this.now()
    const slot: ScheduleSlot = {
      ...validated,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await this.db.scheduleSlots.add(slot)
    return slot
  }

  async findById(id: string): Promise<ScheduleSlot | null> {
    const slot = await this.db.scheduleSlots.get(id)
    return slot ?? null
  }

  async findAll(): Promise<ScheduleSlot[]> {
    return this.db.scheduleSlots.toArray()
  }

  /** Lọc slots theo course */
  async findByCourse(courseId: string): Promise<ScheduleSlot[]> {
    return this.db.scheduleSlots.where('courseId').equals(courseId).toArray()
  }

  /** Lọc slots theo ngày trong tuần (1=Mon … 7=Sun) */
  async findByDay(dayOfWeek: number): Promise<ScheduleSlot[]> {
    return this.db.scheduleSlots.where('dayOfWeek').equals(dayOfWeek).toArray()
  }

  async update(id: string, input: UpdateScheduleSlotInput): Promise<ScheduleSlot> {
    const existing = await this.db.scheduleSlots.get(id)
    this.assertExists(existing, id, 'ScheduleSlot')

    const validated = UpdateScheduleSlotSchema.parse(input)
    const updated: ScheduleSlot = {
      ...existing!,
      ...validated,
      updatedAt: this.now(),
    }
    await this.db.scheduleSlots.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.db.scheduleSlots.get(id)
    this.assertExists(existing, id, 'ScheduleSlot')
    await this.db.scheduleSlots.delete(id)
  }
}
