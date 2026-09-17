/**
 * Unit Tests — UserRepository CRUD
 * TDD: viết TRƯỚC implementation. Sẽ FAIL cho đến khi có src/lib/db/
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StudyFlowDB } from '@/lib/db'
import { UserRepository } from '@/lib/db/repositories'

let db: StudyFlowDB
let repo: UserRepository

beforeEach(() => {
  const name = `test-user-${Math.random().toString(36).slice(2)}`
  db = new StudyFlowDB(name)
  repo = new UserRepository(db)
})

afterEach(async () => {
  await db.delete()
})

describe('UserRepository', () => {
  const validInput = {
    googleId: 'google-abc123',
    email: 'user@example.com',
    name: 'Nguyễn Văn A',
    avatar: 'https://example.com/avatar.jpg',
  }

  it('create — tạo user thành công và trả về entity đầy đủ', async () => {
    const user = await repo.create(validInput)
    expect(user.id).toBeTruthy()
    expect(user.googleId).toBe('google-abc123')
    expect(user.email).toBe('user@example.com')
    expect(user.name).toBe('Nguyễn Văn A')
    expect(user.createdAt).toBeTypeOf('number')
    expect(user.updatedAt).toBeTypeOf('number')
  })

  it('create — từ chối email không hợp lệ', async () => {
    await expect(repo.create({ ...validInput, email: 'not-email' })).rejects.toThrow()
  })

  it('create — từ chối googleId rỗng', async () => {
    await expect(repo.create({ ...validInput, googleId: '' })).rejects.toThrow()
  })

  it('create — từ chối name rỗng', async () => {
    await expect(repo.create({ ...validInput, name: '' })).rejects.toThrow()
  })

  it('findById — tìm được user vừa tạo', async () => {
    const created = await repo.create(validInput)
    const found = await repo.findById(created.id)
    expect(found).not.toBeNull()
    expect(found?.id).toBe(created.id)
    expect(found?.email).toBe(validInput.email)
  })

  it('findById — trả về null nếu không tìm thấy', async () => {
    const found = await repo.findById('non-existent-id')
    expect(found).toBeNull()
  })

  it('findAll — trả về tất cả users', async () => {
    await repo.create(validInput)
    await repo.create({ ...validInput, googleId: 'google-def456', email: 'other@example.com' })
    const all = await repo.findAll()
    expect(all.length).toBe(2)
  })

  it('findAll — trả về mảng rỗng khi chưa có data', async () => {
    const all = await repo.findAll()
    expect(all).toEqual([])
  })

  it('update — cập nhật name thành công', async () => {
    const created = await repo.create(validInput)
    const updated = await repo.update(created.id, { name: 'Trần Thị B' })
    expect(updated.name).toBe('Trần Thị B')
    expect(updated.email).toBe(validInput.email) // field khác không đổi
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)
  })

  it('update — throw nếu id không tồn tại', async () => {
    await expect(repo.update('ghost-id', { name: 'X' })).rejects.toThrow()
  })

  it('delete — xóa user thành công', async () => {
    const created = await repo.create(validInput)
    await repo.delete(created.id)
    const found = await repo.findById(created.id)
    expect(found).toBeNull()
  })

  it('delete — throw nếu id không tồn tại', async () => {
    await expect(repo.delete('ghost-id')).rejects.toThrow()
  })

  it('findByGoogleId — tìm được user theo googleId', async () => {
    await repo.create(validInput)
    const found = await repo.findByGoogleId('google-abc123')
    expect(found).not.toBeNull()
    expect(found?.email).toBe('user@example.com')
  })

  it('findByGoogleId — trả về null nếu không tìm thấy', async () => {
    const found = await repo.findByGoogleId('not-existing')
    expect(found).toBeNull()
  })
})
