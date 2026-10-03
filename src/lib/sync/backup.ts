/**
 * Backup & Restore Service — StudyFlow PWA
 *
 * Cho phép người dùng export toàn bộ dữ liệu ra 1 file JSON
 * và import lại để khôi phục dữ liệu hoàn toàn khi cần.
 */

import type { StudyFlowDB } from '../db'
import { dumpDB, restoreDB } from './serializer'
import type { SyncPayload } from './types'
import { SYNC_PAYLOAD_VERSION } from './types'

export interface BackupResult {
  success: boolean
  message: string
  payload?: SyncPayload
}

/**
 * Xuất toàn bộ dữ liệu của người dùng ra chuỗi JSON.
 *
 * @param db - Instance Dexie DB của người dùng
 * @param userKey - Canonical email của người dùng
 * @returns Chuỗi JSON định dạng sẵn
 */
export async function exportBackup(db: StudyFlowDB, userKey: string): Promise<string> {
  const payload = await dumpDB(db, userKey)
  return JSON.stringify(payload, null, 2)
}

/**
 * Nhập dữ liệu từ chuỗi JSON và khôi phục vào cơ sở dữ liệu.
 *
 * @param db - Instance Dexie DB của người dùng
 * @param jsonString - Chuỗi JSON chứa SyncPayload
 * @returns BackupResult cho biết thành công hay thất bại
 */
export async function importBackup(db: StudyFlowDB, jsonString: string): Promise<BackupResult> {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return { success: false, message: 'Dữ liệu sao lưu không hợp lệ (chuỗi rỗng)' }
    }

    const parsed = JSON.parse(jsonString) as unknown

    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, message: 'Định dạng JSON sao lưu không hợp lệ' }
    }

    const payload = parsed as Partial<SyncPayload>

    // Validate cấu trúc tối thiểu
    if (!payload.data || typeof payload.data !== 'object') {
      return { success: false, message: 'File sao lưu thiếu trường dữ liệu "data"' }
    }

    const { data } = payload
    if (
      !Array.isArray(data.users) ||
      !Array.isArray(data.semesters) ||
      !Array.isArray(data.courses) ||
      !Array.isArray(data.gradeComponents) ||
      !Array.isArray(data.scheduleSlots) ||
      !Array.isArray(data.notes) ||
      !Array.isArray(data.tags)
    ) {
      return { success: false, message: 'File sao lưu không đúng cấu trúc 7 bảng dữ liệu' }
    }

    // Đảm bảo version và modifiedTime hợp lệ
    const validPayload: SyncPayload = {
      version: payload.version ?? SYNC_PAYLOAD_VERSION,
      modifiedTime: payload.modifiedTime ?? Date.now(),
      userKey: payload.userKey ?? 'restored_user',
      data: data as SyncPayload['data'],
    }

    await restoreDB(db, validPayload)

    return {
      success: true,
      message: 'Khôi phục dữ liệu thành công',
      payload: validPayload,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `Lỗi khôi phục sao lưu: ${errorMsg}`,
    }
  }
}
