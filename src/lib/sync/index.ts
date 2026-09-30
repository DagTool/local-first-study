/**
 * Sync Engine — Public API
 *
 * Re-exports tất cả public symbols từ sync module.
 */

export { SyncEngine } from './syncEngine'
export { resolveConflict } from './conflictResolver'
export { dumpDB, restoreDB } from './serializer'
export { readDriveSnapshot, writeDriveSnapshot, DriveAuthError, DriveApiError } from './driveClient'
export type {
  SyncPayload,
  ConflictWinner,
  ConflictResolution,
  SyncResult,
  DriveFileMetadata,
} from './types'
export { SYNC_PAYLOAD_VERSION, DRIVE_FILE_NAME } from './types'
