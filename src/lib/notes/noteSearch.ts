/**
 * noteSearch.ts — Offline full-text search dùng Fuse.js
 *
 * Tìm kiếm toàn văn offline, không cần network.
 * Index được tính toán từ plain-text extract của TipTap JSON.
 *
 * Dùng weighted search trên:
 * - title (weight: 2)
 * - plainText (weight: 1)
 * - tags (weight: 1.5)
 */
import Fuse, { type IFuseOptions } from 'fuse.js'
import type { TipTapDoc } from '@/lib/notes/noteSerializer'
import { extractPlainText } from '@/lib/notes/noteSerializer'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NoteSearchItem {
  id: string
  title: string
  /** TipTap JSON content — có thể là string JSON hoặc object */
  content: string | TipTapDoc
  /** Tên các tag gắn với note */
  tagNames?: string[]
  isPinned?: boolean
  isArchived?: boolean
}

export interface NoteSearchResult {
  item: NoteSearchItem
  score: number // 0 = perfect match, 1 = no match
}

export interface NoteSearchIndex {
  item: NoteSearchItem & { _plainText: string }
}

// ─── Build search index ───────────────────────────────────────────────────────

/**
 * Tạo danh sách indexed items từ mảng notes.
 * Parse TipTap JSON content nếu cần, extract plain text.
 */
export function buildSearchIndex(notes: NoteSearchItem[]): NoteSearchIndex['item'][] {
  return notes.map((note) => {
    let doc: TipTapDoc | null = null
    try {
      if (typeof note.content === 'string') {
        doc = JSON.parse(note.content) as TipTapDoc
      } else {
        doc = note.content as TipTapDoc
      }
    } catch {
      doc = null
    }
    const _plainText = doc
      ? extractPlainText(doc)
      : typeof note.content === 'string'
        ? note.content
        : ''
    return { ...note, _plainText }
  })
}

// ─── Fuse.js config ───────────────────────────────────────────────────────────

const DEFAULT_FUSE_OPTIONS: IFuseOptions<NoteSearchIndex['item']> = {
  includeScore: true,
  threshold: 0.35, // 0 = exact, 1 = match anything
  minMatchCharLength: 2,
  ignoreLocation: true, // tìm ở bất kỳ vị trí nào trong text
  keys: [
    { name: 'title', weight: 2 },
    { name: '_plainText', weight: 1 },
    { name: 'tagNames', weight: 1.5 },
  ],
}

// ─── Search function ──────────────────────────────────────────────────────────

/**
 * Tìm kiếm offline trên danh sách notes.
 *
 * @param notes - Danh sách notes cần tìm
 * @param query - Chuỗi tìm kiếm (hỗ trợ tiếng Việt có dấu)
 * @param options - Tùy chỉnh Fuse.js (ghi đè DEFAULT_FUSE_OPTIONS)
 * @returns Mảng kết quả có điểm score, sắp xếp theo độ liên quan
 */
export function searchNotes(
  notes: NoteSearchItem[],
  query: string,
  options?: Partial<IFuseOptions<NoteSearchIndex['item']>>,
): NoteSearchResult[] {
  if (!query || query.trim().length === 0) {
    // Không có query → trả về tất cả, score = 0
    return notes.map((item) => ({ item, score: 0 }))
  }

  const indexed = buildSearchIndex(notes)
  const fuse = new Fuse(indexed, { ...DEFAULT_FUSE_OPTIONS, ...options })
  const results = fuse.search(query.trim())

  return results.map((r) => ({
    item: r.item,
    score: r.score ?? 0,
  }))
}

/**
 * Lọc notes theo tag ID (exact match).
 * @param notes - Danh sách notes
 * @param tagIds - Tag IDs cần lọc (OR logic — note có ít nhất 1 tag match)
 * @returns Danh sách notes có chứa ít nhất 1 trong các tagId
 */
export function filterNotesByTags(notes: NoteSearchItem[], tagIds: string[]): NoteSearchItem[] {
  if (tagIds.length === 0) return notes
  return notes.filter((note) => {
    // tags là mảng IDs, tagIds là mảng IDs cần lọc
    const noteTags = (note as NoteSearchItem & { tags?: string[] }).tags ?? []
    return tagIds.some((t) => noteTags.includes(t))
  })
}
