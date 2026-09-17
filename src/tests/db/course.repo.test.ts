/**
 * Unit Tests — CourseRepository CRUD
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StudyFlowDB } from '@/lib/db'
import { CourseRepository, SemesterRepository } from '@/lib/db/repositories'

let db: StudyFlowDB
let courseRepo: CourseRepository
let semesterRepo: SemesterRepository

beforeEach(() => {
  db = new StudyFlowDB(`test-course-${Math.random().toString(36).slice(2)}`)
  courseRepo = new CourseRepository(db)
  semesterRepo = new SemesterRepository(db)
})

afterEach(async () => {
  await db.delete()
})

describe('CourseRepository', () => {
  const validInput = {
    semesterId: 'sem-placeholder',
    name: 'Lập trình Web',
    credits: 3,
    color: '#6366f1',
  }

  it('create — tạo course thành công', async () => {
    const course = await courseRepo.create(validInput)
    expect(course.id).toBeTruthy()
    expect(course.name).toBe('Lập trình Web')
    expect(course.credits).toBe(3)
    expect(course.color).toBe('#6366f1')
  })

  it('create — từ chối credits = 0', async () => {
    await expect(courseRepo.create({ ...validInput, credits: 0 })).rejects.toThrow()
  })

  it('create — từ chối credits > 10', async () => {
    await expect(courseRepo.create({ ...validInput, credits: 11 })).rejects.toThrow()
  })

  it('create — từ chối color không phải hex', async () => {
    await expect(courseRepo.create({ ...validInput, color: 'blue' })).rejects.toThrow()
  })

  it('create — cho phép color undefined', async () => {
    const { color: _c, ...noColor } = validInput
    const course = await courseRepo.create(noColor)
    expect(course.color).toBeUndefined()
  })

  it('findById — tìm được', async () => {
    const created = await courseRepo.create(validInput)
    const found = await courseRepo.findById(created.id)
    expect(found?.id).toBe(created.id)
  })

  it('findById — null nếu không tồn tại', async () => {
    expect(await courseRepo.findById('x')).toBeNull()
  })

  it('findBySemester — lọc đúng theo semesterId', async () => {
    const sem = await semesterRepo.create({
      name: 'HK1',
      startDate: '2024-09-01',
      endDate: '2025-01-15',
      isActive: true,
    })
    await courseRepo.create({ ...validInput, semesterId: sem.id })
    await courseRepo.create({ ...validInput, semesterId: sem.id, name: 'Toán rời rạc' })
    await courseRepo.create({ ...validInput, semesterId: 'other-sem', name: 'Khác' })

    const courses = await courseRepo.findBySemester(sem.id)
    expect(courses.length).toBe(2)
    courses.forEach((c) => expect(c.semesterId).toBe(sem.id))
  })

  it('findAll — trả về tất cả courses', async () => {
    await courseRepo.create(validInput)
    await courseRepo.create({ ...validInput, name: 'Toán rời rạc' })
    const all = await courseRepo.findAll()
    expect(all.length).toBe(2)
  })

  it('update — cập nhật name thành công', async () => {
    const created = await courseRepo.create(validInput)
    const updated = await courseRepo.update(created.id, { name: 'Web nâng cao' })
    expect(updated.name).toBe('Web nâng cao')
    expect(updated.credits).toBe(3) // không đổi
  })

  it('update — throw nếu id không tồn tại', async () => {
    await expect(courseRepo.update('ghost', { name: 'X' })).rejects.toThrow()
  })

  it('delete — xóa thành công', async () => {
    const created = await courseRepo.create(validInput)
    await courseRepo.delete(created.id)
    expect(await courseRepo.findById(created.id)).toBeNull()
  })

  it('delete — throw nếu không tồn tại', async () => {
    await expect(courseRepo.delete('ghost')).rejects.toThrow()
  })
})
