/**
 * UserRepository — CRUD cho entity User
 */
import {
  CreateUserSchema,
  UpdateUserSchema,
  type User,
  type CreateUserInput,
  type UpdateUserInput,
} from '../schemas'
import { BaseRepository } from './base.repo'
import type { StudyFlowDB } from '../index'

export class UserRepository extends BaseRepository {
  constructor(db: StudyFlowDB) {
    super(db)
  }

  /** Tạo user mới sau khi validate Zod */
  async create(input: CreateUserInput): Promise<User> {
    const validated = CreateUserSchema.parse(input)
    const now = this.now()
    const user: User = {
      ...validated,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
    }
    await this.db.users.add(user)
    return user
  }

  /** Tìm user theo primary key */
  async findById(id: string): Promise<User | null> {
    const user = await this.db.users.get(id)
    return user ?? null
  }

  /** Tìm user theo Google ID (unique) */
  async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await this.db.users.where('googleId').equals(googleId).first()
    return user ?? null
  }

  /** Trả về tất cả users */
  async findAll(): Promise<User[]> {
    return this.db.users.toArray()
  }

  /** Cập nhật user — validate partial Zod trước khi ghi */
  async update(id: string, input: UpdateUserInput): Promise<User> {
    const existing = await this.db.users.get(id)
    this.assertExists(existing, id, 'User')

    const validated = UpdateUserSchema.parse(input)
    const updated: User = {
      ...existing!,
      ...validated,
      updatedAt: this.now(),
    }
    await this.db.users.put(updated)
    return updated
  }

  /** Xóa user theo id */
  async delete(id: string): Promise<void> {
    const existing = await this.db.users.get(id)
    this.assertExists(existing, id, 'User')
    await this.db.users.delete(id)
  }
}
