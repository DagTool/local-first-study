/**
 * Google Drive REST API v3 Client
 *
 * Gọi trực tiếp Drive API từ browser — không có backend proxy.
 * Scope yêu cầu: https://www.googleapis.com/auth/drive.appdata
 *
 * Chiến lược lưu trữ:
 * - 1 file duy nhất: DRIVE_FILE_NAME ('studyflow-snapshot.json')
 * - Nằm trong appDataFolder (ẩn, chỉ app này truy cập được)
 * - Tìm file bằng query: name='studyflow-snapshot.json' trong spaces=appDataFolder
 *
 * Upload format: multipart (metadata + content trong 1 request)
 */

import { type SyncPayload, DRIVE_FILE_NAME } from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com'
const MULTIPART_BOUNDARY = '-------StudyFlowBoundary'

// ─── Error Types ──────────────────────────────────────────────────────────────

export class DriveAuthError extends Error {
  constructor(message = 'Drive API: 401 Unauthorized — access token invalid or expired') {
    super(message)
    this.name = 'DriveAuthError'
  }
}

export class DriveApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'DriveApiError'
  }
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/** Headers cơ bản với Bearer token */
function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

/**
 * Kiểm tra response status và throw error phù hợp.
 * Không throw cho 200-299.
 */
async function checkResponse(res: Response): Promise<void> {
  if (res.ok) return

  if (res.status === 401) {
    throw new DriveAuthError()
  }

  let message = `Drive API error: ${res.status} ${res.statusText}`
  try {
    const body = (await res.json()) as { error?: { message?: string } }
    if (body.error?.message) {
      message = `Drive API error ${res.status}: ${body.error.message}`
    }
  } catch {
    // ignore JSON parse error
  }
  throw new DriveApiError(message, res.status)
}

/**
 * Tìm file ID của snapshot trong appDataFolder.
 * Trả về null nếu chưa có file.
 */
async function findSnapshotFileId(accessToken: string): Promise<string | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${DRIVE_FILE_NAME}'`,
    fields: 'files(id,name,modifiedTime)',
    pageSize: '1',
  })

  const res = await fetch(`${DRIVE_API}/files?${params.toString()}`, {
    headers: authHeaders(accessToken),
  })

  await checkResponse(res)

  const json = (await res.json()) as { files: Array<{ id: string; name: string }> }
  return json.files?.[0]?.id ?? null
}

/**
 * Build multipart body cho upload/update request.
 * Format: RFC 2046 multipart/related
 */
function buildMultipartBody(metadata: Record<string, unknown>, content: SyncPayload): string {
  const metadataJson = JSON.stringify(metadata)
  const contentJson = JSON.stringify(content)

  return [
    `--${MULTIPART_BOUNDARY}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    metadataJson,
    `--${MULTIPART_BOUNDARY}`,
    'Content-Type: application/json',
    '',
    contentJson,
    `--${MULTIPART_BOUNDARY}--`,
  ].join('\r\n')
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Đọc snapshot từ Google Drive appDataFolder.
 *
 * @param accessToken - Google OAuth 2.0 access token (scope: drive.appdata)
 * @returns SyncPayload nếu có file, null nếu chưa có
 * @throws DriveAuthError khi token hết hạn (401)
 * @throws DriveApiError khi có lỗi khác từ Drive API
 */
export async function readDriveSnapshot(accessToken: string): Promise<SyncPayload | null> {
  // Bước 1: tìm file ID
  const fileId = await findSnapshotFileId(accessToken)
  if (!fileId) return null

  // Bước 2: download content
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: authHeaders(accessToken),
  })

  await checkResponse(res)

  const payload = (await res.json()) as SyncPayload
  return payload
}

/**
 * Ghi snapshot lên Google Drive appDataFolder.
 * - Nếu chưa có file → POST (tạo mới)
 * - Nếu đã có file → PATCH (cập nhật)
 *
 * @param accessToken - Google OAuth 2.0 access token (scope: drive.appdata)
 * @param payload     - SyncPayload cần ghi lên Drive
 * @throws DriveAuthError khi token hết hạn (401)
 * @throws DriveApiError khi có lỗi khác từ Drive API
 */
export async function writeDriveSnapshot(accessToken: string, payload: SyncPayload): Promise<void> {
  const existingFileId = await findSnapshotFileId(accessToken)

  const contentType = `multipart/related; boundary=${MULTIPART_BOUNDARY}`

  if (!existingFileId) {
    // CREATE — POST multipart upload
    const metadata = {
      name: DRIVE_FILE_NAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
    }
    const body = buildMultipartBody(metadata, payload)

    const res = await fetch(`${DRIVE_UPLOAD_API}/upload/drive/v3/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
        'Content-Type': contentType,
      },
      body,
    })

    await checkResponse(res)
  } else {
    // UPDATE — PATCH multipart upload
    const metadata = {
      mimeType: 'application/json',
    }
    const body = buildMultipartBody(metadata, payload)

    const res = await fetch(
      `${DRIVE_UPLOAD_API}/upload/drive/v3/files/${existingFileId}?uploadType=multipart`,
      {
        method: 'PATCH',
        headers: {
          ...authHeaders(accessToken),
          'Content-Type': contentType,
        },
        body,
      },
    )

    await checkResponse(res)
  }
}
