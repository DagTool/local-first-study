/**
 * NoteRepository — CRUD cho entity Note
 */
import {
  CreateNoteSchema,
  UpdateNoteSchema,
  type Note,
  type CreateNoteInput,
  type UpdateNoteInput,
} from '../schemas'
import { BaseRepository } from './base.repo'
import type { StudyFlowDB } from '../index'

export class NoteRepository extends BaseRepository {
  constructor(db: StudyFlowDB) {
    super(db)
  }

  async create(input: CreateNoteInput): Promise<Note> {
    const validated = CreateNoteSchema.parse(input)
    const now = this.now()
    const note: Note = {
      ...validated,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await this.db.notes.add(note)
    return note
  }

  async findById(id: string): Promise<Note | null> {
    const note = await this.db.notes.get(id)
    return note ?? null
  }

  async findAll(): Promise<Note[]> {
    return this.db.notes.toArray()
  }

  /** Chỉ lấy notes isPinned = true */
  async findPinned(): Promise<Note[]> {
    // IndexedDB spec không hỗ trợ boolean làm index key.
    // Dùng .filter() để tương thích cả real IDB và fake-indexeddb.
    return this.db.notes.filter((n) => n.isPinned === true).toArray()
  }

  /** Lọc notes theo courseId */
  async findByCourse(courseId: string): Promise<Note[]> {
    return this.db.notes.where('courseId').equals(courseId).toArray()
  }

  /**
   * Lọc notes theo tagId.
   * Dexie multi-entry index (*tags) cho phép query: tìm notes có tagId trong mảng tags.
   */
  async findByTag(tagId: string): Promise<Note[]> {
    return this.db.notes.where('tags').equals(tagId).toArray()
  }

  async update(id: string, input: UpdateNoteInput): Promise<Note> {
    const existing = await this.db.notes.get(id)
    this.assertExists(existing, id, 'Note')

    const validated = UpdateNoteSchema.parse(input)
    const updated: Note = {
      ...existing!,
      ...validated,
      updatedAt: this.now(),
    }
    await this.db.notes.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.db.notes.get(id)
    this.assertExists(existing, id, 'Note')
    await this.db.notes.delete(id)
  }
}
