/**
 * Utility types dùng chung toàn ứng dụng.
 * Sẽ được mở rộng trong các giai đoạn tiếp theo.
 */

export type ID = string

export type Timestamp = number // Unix ms

export interface BaseEntity {
  id: ID
  createdAt: Timestamp
  updatedAt: Timestamp
}
