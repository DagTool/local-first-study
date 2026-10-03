export interface TimeSlot {
  dayOfWeek: number
  startTime: string // 'HH:MM'
  endTime: string // 'HH:MM'
}

/**
 * Phát hiện trùng lịch học (overlap 2 slot cùng thời gian)
 * Trả về true nếu có bất kỳ 2 slot nào bị trùng.
 */
export function hasScheduleOverlap(slots: TimeSlot[]): boolean {
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]
      const b = slots[j]

      if (a.dayOfWeek === b.dayOfWeek) {
        // String so sánh từ điển hoạt động tốt với định dạng 'HH:MM' 24h
        if (a.startTime < b.endTime && a.endTime > b.startTime) {
          return true
        }
      }
    }
  }
  return false
}
