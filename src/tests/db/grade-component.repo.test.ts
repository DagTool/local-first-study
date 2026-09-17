/**
 * Unit Tests — GradeComponentRepository CRUD
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StudyFlowDB } from '@/lib/db'
import { GradeComponentRepository } from '@/lib/db/repositories'

let db: StudyFlowDB
let repo: GradeComponentRepository

beforeEach(() => {
  db = new StudyFlowDB(`test-grade-${Math.random().toString(36).slice(2)}`)
  repo = new GradeComponentRepository(db)
})

afterEach(async () => {
  await db.delete()
})

describe('GradeComponentRepository', () => {
  const validInput = {
    courseId: 'course-1',
    name: 'Kiểm tra giữa kỳ',
    weight: 30,
    score: null,
  }

  it('create — tạo grade component với score = null', async () => {
    const gc = await repo.create(validInput)
    expect(gc.id).toBeTruthy()
    expect(gc.name).toBe('Kiểm tra giữa kỳ')
    expect(gc.weight).toBe(30)
    expect(gc.score).toBeNull()
  })

  it('create — tạo với score hợp lệ', async () => {
    const gc = await repo.create({ ...validInput, score: 8.5 })
    expect(gc.score).toBe(8.5)
  })

  it('create — từ chối weight = 0', async () => {
    await expect(repo.create({ ...validInput, weight: 0 })).rejects.toThrow()
  })

  it('create — từ chối weight > 100', async () => {
    await expect(repo.create({ ...validInput, weight: 101 })).rejects.toThrow()
  })

  it('create — từ chối score < 0', async () => {
    await expect(repo.create({ ...validInput, score: -1 })).rejects.toThrow()
  })

  it('create — từ chối score > 10', async () => {
    await expect(repo.create({ ...validInput, score: 11 })).rejects.toThrow()
  })

  it('findById — tìm được', async () => {
    const created = await repo.create(validInput)
    const found = await repo.findById(created.id)
    expect(found?.id).toBe(created.id)
  })

  it('findById — null nếu không tồn tại', async () => {
    expect(await repo.findById('x')).toBeNull()
  })

  it('findByCourse — lọc đúng theo courseId', async () => {
    await repo.create({ ...validInput, courseId: 'c1', name: 'GK' })
    await repo.create({ ...validInput, courseId: 'c1', name: 'CK', weight: 70 })
    await repo.create({ ...validInput, courseId: 'c2', name: 'GK2' })

    const components = await repo.findByCourse('c1')
    expect(components.length).toBe(2)
    components.forEach((g) => expect(g.courseId).toBe('c1'))
  })

  it('findAll — trả về tất cả', async () => {
    await repo.create(validInput)
    await repo.create({ ...validInput, name: 'Cuối kỳ', weight: 70 })
    expect((await repo.findAll()).length).toBe(2)
  })

  it('update — cập nhật score', async () => {
    const created = await repo.create(validInput)
    const updated = await repo.update(created.id, { score: 9.0 })
    expect(updated.score).toBe(9.0)
    expect(updated.name).toBe(validInput.name) // không đổi
  })

  it('update — throw nếu score không hợp lệ', async () => {
    const created = await repo.create(validInput)
    await expect(repo.update(created.id, { score: 15 })).rejects.toThrow()
  })

  it('update — throw nếu id không tồn tại', async () => {
    await expect(repo.update('ghost', { score: 8 })).rejects.toThrow()
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
