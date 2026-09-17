/**
 * Unit Tests — TagRepository CRUD
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StudyFlowDB } from '@/lib/db'
import { TagRepository } from '@/lib/db/repositories'

let db: StudyFlowDB
let repo: TagRepository

beforeEach(() => {
  db = new StudyFlowDB(`test-tag-${Math.random().toString(36).slice(2)}`)
  repo = new TagRepository(db)
})

afterEach(async () => {
  await db.delete()
})

describe('TagRepository', () => {
  const validInput = {
    name: 'Quan trọng',
    color: '#ef4444',
  }

  it('create — tạo tag thành công', async () => {
    const tag = await repo.create(validInput)
    expect(tag.id).toBeTruthy()
    expect(tag.name).toBe('Quan trọng')
    expect(tag.color).toBe('#ef4444')
  })

  it('create — từ chối name rỗng', async () => {
    await expect(repo.create({ ...validInput, name: '' })).rejects.toThrow()
  })

  it('create — từ chối name > 50 ký tự', async () => {
    await expect(repo.create({ ...validInput, name: 'a'.repeat(51) })).rejects.toThrow()
  })

  it('create — từ chối color không hợp lệ', async () => {
    await expect(repo.create({ ...validInput, color: '#xyz' })).rejects.toThrow()
  })

  it('create — cho phép color undefined', async () => {
    const { color: _c, ...noColor } = validInput
    const tag = await repo.create(noColor)
    expect(tag.color).toBeUndefined()
  })

  it('findById — tìm được', async () => {
    const created = await repo.create(validInput)
    const found = await repo.findById(created.id)
    expect(found?.id).toBe(created.id)
    expect(found?.name).toBe(validInput.name)
  })

  it('findById — null nếu không tồn tại', async () => {
    expect(await repo.findById('x')).toBeNull()
  })

  it('findAll — trả về tất cả tags', async () => {
    await repo.create(validInput)
    await repo.create({ name: 'Cần xem lại', color: '#f59e0b' })
    expect((await repo.findAll()).length).toBe(2)
  })

  it('findByName — tìm tag theo name chính xác', async () => {
    await repo.create(validInput)
    const found = await repo.findByName('Quan trọng')
    expect(found).not.toBeNull()
    expect(found?.name).toBe('Quan trọng')
  })

  it('findByName — null nếu không tồn tại', async () => {
    expect(await repo.findByName('Không có')).toBeNull()
  })

  it('update — cập nhật name và color', async () => {
    const created = await repo.create(validInput)
    const updated = await repo.update(created.id, { name: 'Ưu tiên cao', color: '#8b5cf6' })
    expect(updated.name).toBe('Ưu tiên cao')
    expect(updated.color).toBe('#8b5cf6')
  })

  it('update — throw nếu id không tồn tại', async () => {
    await expect(repo.update('ghost', { name: 'X' })).rejects.toThrow()
  })

  it('delete — xóa thành công', async () => {
    const created = await repo.create(validInput)
    await repo.delete(created.id)
    expect(await repo.findById(created.id)).toBeNull()
  })

  it('delete — throw nếu không tồn tại', async () => {
    await expect(repo.delete('ghost')).rejects.toThrow()
  })
})
