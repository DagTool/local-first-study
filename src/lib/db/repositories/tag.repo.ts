/**
 * TagRepository — CRUD cho entity Tag
 */
import {
  CreateTagSchema,
  UpdateTagSchema,
  type Tag,
  type CreateTagInput,
  type UpdateTagInput,
} from '../schemas'
import { BaseRepository } from './base.repo'
import type { StudyFlowDB } from '../index'

export class TagRepository extends BaseRepository {
  constructor(db: StudyFlowDB) {
    super(db)
  }

  async create(input: CreateTagInput): Promise<Tag> {
    const validated = CreateTagSchema.parse(input)
    const now = this.now()
    const tag: Tag = {
      ...validated,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await this.db.tags.add(tag)
    return tag
  }

  async findById(id: string): Promise<Tag | null> {
    const tag = await this.db.tags.get(id)
    return tag ?? null
  }

  async findAll(): Promise<Tag[]> {
    return this.db.tags.toArray()
  }

  /** Tìm tag theo tên chính xác (case-sensitive) */
  async findByName(name: string): Promise<Tag | null> {
    const tag = await this.db.tags.where('name').equals(name).first()
    return tag ?? null
  }

  async update(id: string, input: UpdateTagInput): Promise<Tag> {
    const existing = await this.db.tags.get(id)
    this.assertExists(existing, id, 'Tag')

    const validated = UpdateTagSchema.parse(input)
    const updated: Tag = {
      ...existing!,
      ...validated,
      updatedAt: this.now(),
    }
    await this.db.tags.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.db.tags.get(id)
    this.assertExists(existing, id, 'Tag')
    await this.db.tags.delete(id)
  }
}
