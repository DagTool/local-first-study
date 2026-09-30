/**
 * MSW Handlers — Google Drive REST API v3 (Mock)
 *
 * Mock các endpoints Drive API v3 dùng trong tests:
 *   GET  /drive/v3/files                            — list files in appDataFolder
 *   GET  /drive/v3/files/:id                        — download file content (alt=media)
 *   POST /upload/drive/v3/files                     — upload mới (multipart)
 *   PATCH /upload/drive/v3/files/:id                — update file (multipart)
 *
 * State:
 *   driveStore — in-memory store giả lập Drive storage
 *   Có thể reset bằng resetDriveStore() trong beforeEach
 */

import { http, HttpResponse } from 'msw'
import type { SyncPayload } from '@/lib/sync/types'
import { DRIVE_FILE_NAME } from '@/lib/sync/types'

// ─── In-memory Drive Store ────────────────────────────────────────────────────

interface DriveFile {
  id: string
  name: string
  content: SyncPayload
  modifiedTime: string
}

/** Fake Drive storage — reset between tests */
let driveStore: DriveFile | null = null

let nextFileId = 1

/** Reset Drive store — gọi trong beforeEach */
export function resetDriveStore(): void {
  driveStore = null
  nextFileId = 1
}

/** Inject dữ liệu vào Drive store để test pull scenarios */
export function seedDriveStore(payload: SyncPayload): void {
  driveStore = {
    id: `drive-file-${nextFileId++}`,
    name: DRIVE_FILE_NAME,
    content: payload,
    modifiedTime: new Date(payload.modifiedTime).toISOString(),
  }
}

/** Đọc nội dung hiện tại của Drive store */
export function getDriveStore(): DriveFile | null {
  return driveStore
}

// ─── Multipart Parser ─────────────────────────────────────────────────────────

/**
 * Parse SyncPayload từ multipart/related body.
 * Tìm part có chứa 'modifiedTime' + 'version' (content part, không phải metadata).
 */
function parseMultipartContent(text: string): SyncPayload | null {
  try {
    // Lấy boundary từ dòng đầu tiên (e.g. "-------StudyFlowBoundary")
    const firstLine = text.split('\r\n')[0]
    const parts = text.split(firstLine)
    // parts[0] = '' | parts[1] = metadata part | parts[2] = content part | parts[3] = '--'
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]
      if (part.includes('modifiedTime') && part.includes('version')) {
        // Body bắt đầu sau blank line (CRLF CRLF)
        const bodyStart = part.indexOf('\r\n\r\n')
        if (bodyStart === -1) continue
        const body = part
          .slice(bodyStart + 4)
          .replace(/\r\n$/, '')
          .trimEnd()
        if (body.startsWith('{')) {
          return JSON.parse(body) as SyncPayload
        }
      }
    }
    return null
  } catch {
    return null
  }
}

// ─── MSW Handlers ─────────────────────────────────────────────────────────────

const DRIVE_BASE = 'https://www.googleapis.com'

export const driveHandlers = [
  // LIST files in appDataFolder
  http.get(`${DRIVE_BASE}/drive/v3/files`, ({ request }) => {
    const url = new URL(request.url)
    const spaces = url.searchParams.get('spaces')
    const q = url.searchParams.get('q')

    // Chỉ mock appDataFolder
    if (spaces !== 'appDataFolder') {
      return HttpResponse.json({ files: [] })
    }

    if (driveStore === null) {
      return HttpResponse.json({ files: [] })
    }

    // Filter theo name nếu có query
    if (q && !q.includes(driveStore.name)) {
      return HttpResponse.json({ files: [] })
    }

    return HttpResponse.json({
      files: [
        {
          id: driveStore.id,
          name: driveStore.name,
          modifiedTime: driveStore.modifiedTime,
        },
      ],
    })
  }),

  // DOWNLOAD file content (alt=media)
  http.get(`${DRIVE_BASE}/drive/v3/files/:id`, ({ params, request }) => {
    const url = new URL(request.url)
    const altMedia = url.searchParams.get('alt') === 'media'

    if (!altMedia) {
      // Metadata request
      if (!driveStore || driveStore.id !== params.id) {
        return HttpResponse.json({ error: 'Not Found' }, { status: 404 })
      }
      return HttpResponse.json({
        id: driveStore.id,
        name: driveStore.name,
        modifiedTime: driveStore.modifiedTime,
      })
    }

    // Content request
    if (!driveStore || driveStore.id !== params.id) {
      return HttpResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    return HttpResponse.json(driveStore.content)
  }),

  // UPLOAD new file (multipart POST)
  http.post(`${DRIVE_BASE}/upload/drive/v3/files`, async ({ request }) => {
    const text = await request.text()
    const payload = parseMultipartContent(text)

    const newId = `drive-file-${nextFileId++}`
    driveStore = {
      id: newId,
      name: DRIVE_FILE_NAME,
      content: payload ?? ({} as SyncPayload),
      modifiedTime: new Date().toISOString(),
    }

    return HttpResponse.json({
      id: newId,
      name: DRIVE_FILE_NAME,
      modifiedTime: driveStore.modifiedTime,
    })
  }),

  // UPDATE existing file (multipart PATCH)
  http.patch(`${DRIVE_BASE}/upload/drive/v3/files/:id`, async ({ params, request }) => {
    if (!driveStore || driveStore.id !== params.id) {
      return HttpResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    const text = await request.text()
    const payload = parseMultipartContent(text)

    if (payload) {
      driveStore.content = payload
      driveStore.modifiedTime = new Date().toISOString()
    }

    return HttpResponse.json({
      id: driveStore.id,
      name: driveStore.name,
      modifiedTime: driveStore.modifiedTime,
    })
  }),
]

// ─── Error scenario handlers (override trong specific tests) ──────────────────

/** Handler giả lập 401 Unauthorized */
export function make401Handler() {
  return http.get(`${DRIVE_BASE}/drive/v3/files`, () => {
    return HttpResponse.json(
      { error: { code: 401, message: 'Invalid Credentials' } },
      { status: 401 },
    )
  })
}

/** Handler giả lập 429 Rate Limit */
export function make429Handler() {
  return http.get(`${DRIVE_BASE}/drive/v3/files`, () => {
    return HttpResponse.json(
      { error: { code: 429, message: 'Rate Limit Exceeded' } },
      { status: 429 },
    )
  })
}

/** Handler giả lập network error */
export function makeNetworkErrorHandler() {
  return http.get(`${DRIVE_BASE}/drive/v3/files`, () => {
    return HttpResponse.error()
  })
}
