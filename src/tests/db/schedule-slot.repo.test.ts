/**
 * Unit Tests — ScheduleSlotRepository CRUD
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StudyFlowDB } from '@/lib/db'
import { ScheduleSlotRepository } from '@/lib/db/repositories'

let db: StudyFlowDB
let repo: ScheduleSlotRepository

beforeEach(() => {
  db = new StudyFlowDB(`test-slot-${Math.random().toString(36).slice(2)}`)
  repo = new ScheduleSlotRepository(db)
})

afterEach(async () => {
  await db.delete()
})

describe('ScheduleSlotRepository', () => {
  const validInput = {
    courseId: 'course-1',
    dayOfWeek: 2, // Tuesday
    startTime: '07:30',
    endTime: '09:30',
    room: 'A101',
  }

  it('create — tạo slot thành công', async () => {
    const slot = await repo.create(validInput)
    expect(slot.id).toBeTruthy()
    expect(slot.dayOfWeek).toBe(2)
    expect(slot.startTime).toBe('07:30')
    expect(slot.room).toBe('A101')
  })

  it('create — từ chối dayOfWeek = 0', async () => {
    await expect(repo.create({ ...validInput, dayOfWeek: 0 })).rejects.toThrow()
  })

  it('create — từ chối dayOfWeek = 8', async () => {
    await expect(repo.create({ ...validInput, dayOfWeek: 8 })).rejects.toThrow()
  })

  it('create — từ chối giờ sai định dạng', async () => {
    await expect(repo.create({ ...validInput, startTime: '7:30' })).rejects.toThrow()
  })

  it('create — cho phép room undefined', async () => {
    const { room: _r, ...noRoom } = validInput
    const slot = await repo.create(noRoom)
    expect(slot.room).toBeUndefined()
  })

  it('findById — tìm được', async () => {
    const created = await repo.create(validInput)
    const found = await repo.findById(created.id)
    expect(found?.id).toBe(created.id)
  })

  it('findById — null nếu không tồn tại', async () => {
    expect(await repo.findById('x')).toBeNull()
  })

  it('findByCourse — lọc theo courseId', async () => {
    await repo.create({ ...validInput, courseId: 'c1' })
    await repo.create({ ...validInput, courseId: 'c1', dayOfWeek: 4 })
    await repo.create({ ...validInput, courseId: 'c2', dayOfWeek: 3 })

    const slots = await repo.findByCourse('c1')
    expect(slots.length).toBe(2)
    slots.forEach((s) => expect(s.courseId).toBe('c1'))
  })

  it('findByDay — lọc theo ngày trong tuần', async () => {
    await repo.create({ ...validInput, dayOfWeek: 2 })
    await repo.create({ ...validInput, dayOfWeek: 2, courseId: 'c2' })
    await repo.create({ ...validInput, dayOfWeek: 4 })

    const daySlots = await repo.findByDay(2)
    expect(daySlots.length).toBe(2)
    daySlots.forEach((s) => expect(s.dayOfWeek).toBe(2))
  })

  it('findAll — trả về tất cả slots', async () => {
    await repo.create(validInput)
    await repo.create({ ...validInput, dayOfWeek: 4 })
    expect((await repo.findAll()).length).toBe(2)
  })

  it('update — cập nhật room', async () => {
    const created = await repo.create(validInput)
    const updated = await repo.update(created.id, { room: 'B202' })
    expect(updated.room).toBe('B202')
    expect(updated.dayOfWeek).toBe(validInput.dayOfWeek)
  })

  it('update — throw nếu id không tồn tại', async () => {
    await expect(repo.update('ghost', { room: 'X' })).rejects.toThrow()
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
