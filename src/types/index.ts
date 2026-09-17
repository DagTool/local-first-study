/**
 * Utility types dùng chung toàn ứng dụng.
 */

export type ID = string
export type Timestamp = number // Unix ms

// Re-export tất cả các types (inferred từ Zod)
export type * from '../lib/db/schemas'
