import { describe, it, expect } from 'vitest'
import { hasScheduleOverlap } from '@/lib/schedule/scheduleUtils'

describe('scheduleUtils - hasScheduleOverlap', () => {
  it('nên trả về false nếu không có slot nào', () => {
    expect(hasScheduleOverlap([])).toBe(false)
  })

  it('nên trả về false nếu chỉ có 1 slot', () => {
    expect(hasScheduleOverlap([{ dayOfWeek: 2, startTime: '07:00', endTime: '09:00' }])).toBe(false)
  })

  it('nên trả về false nếu 2 slot khác ngày', () => {
    expect(
      hasScheduleOverlap([
        { dayOfWeek: 2, startTime: '07:00', endTime: '09:00' },
        { dayOfWeek: 3, startTime: '07:00', endTime: '09:00' },
      ]),
    ).toBe(false)
  })

  it('nên trả về false nếu 2 slot liền kề nhau', () => {
    expect(
      hasScheduleOverlap([
        { dayOfWeek: 2, startTime: '07:00', endTime: '09:00' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '11:00' },
      ]),
    ).toBe(false)
  })

  it('nên trả về true nếu 2 slot đè lên nhau một phần', () => {
    expect(
      hasScheduleOverlap([
        { dayOfWeek: 2, startTime: '07:00', endTime: '09:00' },
        { dayOfWeek: 2, startTime: '08:30', endTime: '11:00' },
      ]),
    ).toBe(true)
  })

  it('nên trả về true nếu 2 slot đè lên nhau hoàn toàn', () => {
    expect(
      hasScheduleOverlap([
        { dayOfWeek: 2, startTime: '07:00', endTime: '09:00' },
        { dayOfWeek: 2, startTime: '07:00', endTime: '09:00' },
      ]),
    ).toBe(true)
  })

  it('nên trả về true nếu 1 slot nằm gọn trong slot kia', () => {
    expect(
      hasScheduleOverlap([
        { dayOfWeek: 2, startTime: '07:00', endTime: '11:00' },
        { dayOfWeek: 2, startTime: '08:00', endTime: '09:00' },
      ]),
    ).toBe(true)
  })
})
