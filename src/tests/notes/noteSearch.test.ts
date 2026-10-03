/**
 * Unit Tests — noteSearch.ts (Fuse.js)
 *
 * Test độ chính xác của tìm kiếm offline trên bộ dữ liệu mẫu đã biết trước kết quả.
 *
 * Cover:
 * - F1–F5: searchNotes trả về đúng kết quả với dataset cố định
 * - F6: query rỗng → trả về tất cả
 * - F7: tiếng Việt có dấu
 * - F8–F9: filterNotesByTags
 */
import { describe, it, expect } from 'vitest'
import { searchNotes, filterNotesByTags, buildSearchIndex } from '@/lib/notes/noteSearch'
import type { NoteSearchItem } from '@/lib/notes/noteSearch'

// ─── Dataset mẫu cố định ──────────────────────────────────────────────────────

const SAMPLE_NOTES: (NoteSearchItem & { tags: string[] })[] = [
  {
    id: 'note-1',
    title: 'Công thức tính GPA hệ 4',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Điểm trung bình tích lũy theo tín chỉ. Môn A+ bằng 4.0 điểm.' },
          ],
        },
      ],
    }),
    tagNames: ['GPA', 'Học tập'],
    tags: ['tag-gpa', 'tag-hoctap'],
  },
  {
    id: 'note-2',
    title: 'Lịch học kỳ 2 2024-2025',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Lịch thi môn Toán cao cấp và Vật lý đại cương tuần 16.' },
          ],
        },
      ],
    }),
    tagNames: ['Lịch học', 'Toán'],
    tags: ['tag-lh', 'tag-toan'],
  },
  {
    id: 'note-3',
    title: 'Checklist ôn thi cuối kỳ',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Ôn chương 1-5 môn Toán' }] },
              ],
            },
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Nộp báo cáo thực hành' }] },
              ],
            },
          ],
        },
      ],
    }),
    tagNames: ['Ôn thi', 'Checklist'],
    tags: ['tag-onthi', 'tag-checklist'],
  },
  {
    id: 'note-4',
    title: 'React hooks cơ bản',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'useState, useEffect, useCallback là các hooks quan trọng trong React.',
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'tsx' },
          content: [{ type: 'text', text: 'const [count, setCount] = useState(0)' }],
        },
      ],
    }),
    tagNames: ['Lập trình', 'React'],
    tags: ['tag-lp', 'tag-react'],
  },
  {
    id: 'note-5',
    title: 'Ghi chú buổi học Toán cao cấp',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Đạo hàm riêng và tích phân bội là nội dung chính.' }],
        },
      ],
    }),
    tagNames: ['Toán', 'Bài giảng'],
    tags: ['tag-toan', 'tag-baigiảng'],
  },
]

// ─── searchNotes ──────────────────────────────────────────────────────────────

describe('searchNotes — Fuse.js offline full-text search', () => {
  it('F1: tìm "GPA" → note-1 phải nằm trong kết quả', () => {
    const results = searchNotes(SAMPLE_NOTES, 'GPA')
    const ids = results.map((r) => r.item.id)
    expect(ids).toContain('note-1')
  })

  it('F2: tìm "Toán" → note-2 và note-5 phải nằm trong kết quả', () => {
    const results = searchNotes(SAMPLE_NOTES, 'Toán')
    const ids = results.map((r) => r.item.id)
    expect(ids).toContain('note-2')
    expect(ids).toContain('note-5')
  })

  it('F3: tìm "React hooks" → note-4 phải có score thấp nhất (relevant nhất)', () => {
    const results = searchNotes(SAMPLE_NOTES, 'React hooks')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].item.id).toBe('note-4')
  })

  it('F4: tìm "checklist ôn thi" → note-3 phải nằm đầu', () => {
    const results = searchNotes(SAMPLE_NOTES, 'checklist ôn thi')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].item.id).toBe('note-3')
  })

  it('F5: tìm chuỗi không liên quan "xyz123abc" → không có kết quả', () => {
    const results = searchNotes(SAMPLE_NOTES, 'xyz123abc')
    expect(results.length).toBe(0)
  })

  it('F6: query rỗng → trả về tất cả notes', () => {
    const results = searchNotes(SAMPLE_NOTES, '')
    expect(results.length).toBe(SAMPLE_NOTES.length)
  })

  it('F7: tìm tiếng Việt có dấu "tích phân" → note-5', () => {
    const results = searchNotes(SAMPLE_NOTES, 'tích phân')
    const ids = results.map((r) => r.item.id)
    expect(ids).toContain('note-5')
  })

  it('F8: score là số trong [0, 1]', () => {
    const results = searchNotes(SAMPLE_NOTES, 'Toán')
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(1)
    }
  })
})

// ─── buildSearchIndex ─────────────────────────────────────────────────────────

describe('buildSearchIndex — trích xuất plainText từ TipTap JSON', () => {
  it('F9: plainText chứa nội dung từ taskList', () => {
    const indexed = buildSearchIndex([SAMPLE_NOTES[2]])
    expect(indexed[0]._plainText).toContain('Ôn chương 1-5 môn Toán')
    expect(indexed[0]._plainText).toContain('Nộp báo cáo thực hành')
  })

  it('F10: plainText chứa nội dung từ codeBlock', () => {
    const indexed = buildSearchIndex([SAMPLE_NOTES[3]])
    expect(indexed[0]._plainText).toContain('useState')
  })

  it('F11: content là string JSON không hợp lệ → không crash, plainText là string gốc', () => {
    const badNote: NoteSearchItem = {
      id: 'bad',
      title: 'Bad content',
      content: 'not-json {{{{',
    }
    const indexed = buildSearchIndex([badNote])
    expect(indexed[0]._plainText).toBe('not-json {{{{')
  })
})

// ─── filterNotesByTags ────────────────────────────────────────────────────────

describe('filterNotesByTags — lọc theo tag ID', () => {
  it('F12: lọc theo tag-toan → note-2 và note-5', () => {
    const result = filterNotesByTags(SAMPLE_NOTES, ['tag-toan'])
    const ids = result.map((n) => n.id)
    expect(ids).toContain('note-2')
    expect(ids).toContain('note-5')
    expect(ids).not.toContain('note-1')
  })

  it('F13: tagIds rỗng → trả về tất cả', () => {
    const result = filterNotesByTags(SAMPLE_NOTES, [])
    expect(result.length).toBe(SAMPLE_NOTES.length)
  })

  it('F14: tag không tồn tại → mảng rỗng', () => {
    const result = filterNotesByTags(SAMPLE_NOTES, ['tag-nonexistent'])
    expect(result.length).toBe(0)
  })

  it('F15: nhiều tags → OR logic (note có ít nhất 1 match)', () => {
    const result = filterNotesByTags(SAMPLE_NOTES, ['tag-gpa', 'tag-react'])
    const ids = result.map((n) => n.id)
    expect(ids).toContain('note-1') // has tag-gpa
    expect(ids).toContain('note-4') // has tag-react
    expect(ids).not.toContain('note-3')
  })
})
