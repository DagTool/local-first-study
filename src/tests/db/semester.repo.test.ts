/**
 * Unit Tests — SemesterRepository CRUD
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StudyFlowDB } from '@/lib/db'
import { SemesterRepository } from '@/lib/db/repositories'

let db: StudyFlowDB
let repo: SemesterRepository

beforeEach(() => {
  db = new StudyFlowDB(`test-sem-${Math.random().toString(36).slice(2)}`)
  repo = new SemesterRepository(db)
})

afterEach(async () => {
  await db.delete()
})

describe('SemesterRepository', () => {
  const validInput = {
    name: 'Học kỳ 1 — 2024-2025',
    startDate: '2024-09-01',
    endDate: '2025-01-15',
    isActive: true,
  }

  it('create — tạo semester thành công', async () => {
    const sem = await repo.create(validInput)
    expect(sem.id).toBeTruthy()
    expect(sem.name).toBe(validInput.name)
    expect(sem.isActive).toBe(true)
    expect(sem.createdAt).toBeTypeOf('number')
  })

  it('create — từ chối name rỗng', async () => {
    await expect(repo.create({ ...validInput, name: '' })).rejects.toThrow()
  })

  it('create — từ chối endDate trước startDate', async () => {
    await expect(repo.create({ ...validInput, endDate: '2024-08-01' })).rejects.toThrow()
  })

  it('create — từ chối định dạng ngày sai', async () => {
    await expect(repo.create({ ...validInput, startDate: '01/09/2024' })).rejects.toThrow()
  })

  it('findById — tìm được semester vừa tạo', async () => {
    const created = await repo.create(validInput)
    const found = await repo.findById(created.id)
    expect(found?.id).toBe(created.id)
    expect(found?.name).toBe(validInput.name)
  })

  it('findById — trả về null nếu không tồn tại', async () => {
    expect(await repo.findById('x')).toBeNull()
  })

  it('findAll — trả về tất cả semesters', async () => {
    await repo.create(validInput)
    await repo.create({
      ...validInput,
      name: 'Học kỳ 2 — 2024-2025',
      startDate: '2025-02-01',
      endDate: '2025-06-30',
      isActive: false,
    })
    const all = await repo.findAll()
    expect(all.length).toBe(2)
  })

  it('findActive — chỉ trả về semester đang active', async () => {
    await repo.create(validInput)
    await repo.create({
      ...validInput,
      name: 'Học kỳ 2',
      startDate: '2025-02-01',
      endDate: '2025-06-30',
      isActive: false,
    })
    const active = await repo.findActive()
    expect(active.length).toBe(1)
    expect(active[0].isActive).toBe(true)
  })

  it('update — cập nhật isActive thành công', async () => {
    const created = await repo.create(validInput)
    const updated = await repo.update(created.id, { isActive: false })
    expect(updated.isActive).toBe(false)
    expect(updated.name).toBe(validInput.name)
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
