/**
 * Smoke test — Giai đoạn 0
 * Xác nhận test infrastructure hoạt động đúng.
 * TDD: viết test này TRƯỚC, chạy sẽ FAIL nếu setup sai.
 */
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('should run unit tests correctly', () => {
    expect(1 + 1).toBe(2)
  })

  it('should support modern JS features', () => {
    const arr = [1, 2, 3]
    expect(arr.map((x) => x * 2)).toEqual([2, 4, 6])
  })
})
