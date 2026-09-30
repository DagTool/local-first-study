/**
 * Conflict Resolver — Last Write Wins (LWW)
 *
 * Hàm thuần túy (pure function) — không có side effects, không I/O.
 * Dễ unit test và dễ thay thế thuật toán khác sau này.
 *
 * Thuật toán: so sánh modifiedTime (Unix ms).
 * Bên nào có modifiedTime lớn hơn → bên đó thắng.
 */

import type { SyncPayload, ConflictResolution } from './types'

/**
 * Giải quyết xung đột giữa local snapshot và remote snapshot.
 *
 * Ma trận kết quả:
 * | local  | remote | winner    | payload       |
 * |--------|--------|-----------|---------------|
 * | null   | null   | no-local  | null          |
 * | null   | data   | no-local  | remote        |
 * | data   | null   | no-remote | local         |
 * | t > t' | —      | local     | local         |
 * | t < t' | —      | remote    | remote        |
 * | t = t' | —      | equal     | null          |
 *
 * @param local  - Snapshot từ local IndexedDB (null nếu chưa có dữ liệu)
 * @param remote - Snapshot từ Google Drive (null nếu chưa có file)
 * @returns      ConflictResolution với winner và payload cần apply
 */
export function resolveConflict(
  local: SyncPayload | null,
  remote: SyncPayload | null,
): ConflictResolution {
  // Case: không có local → pull remote về (hoặc không có gì cả)
  if (local === null) {
    return {
      winner: 'no-local',
      payload: remote, // có thể null nếu cả 2 đều null
    }
  }

  // Case: không có remote → push local lên
  if (remote === null) {
    return {
      winner: 'no-remote',
      payload: local,
    }
  }

  // Case: cả 2 đều có dữ liệu → so sánh timestamp
  if (local.modifiedTime > remote.modifiedTime) {
    return {
      winner: 'local',
      payload: local,
    }
  }

  if (local.modifiedTime < remote.modifiedTime) {
    return {
      winner: 'remote',
      payload: remote,
    }
  }

  // Case: cùng timestamp (local.modifiedTime === remote.modifiedTime)
  return {
    winner: 'equal',
    payload: null,
  }
}
