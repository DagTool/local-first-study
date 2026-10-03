/**
 * Unit Tests — noteSerializer.ts
 *
 * TDD RED phase: test trước, sau đó implement để GREEN.
 *
 * Cover:
 * - N1–N5: tipTapToMarkdown (heading, paragraph, bulletList, taskList, codeBlock)
 * - N6–N9: markdownToTipTap round-trip
 * - N10: extractPlainText cho full-text search
 */
import { describe, it, expect } from 'vitest'
import { tipTapToMarkdown, markdownToTipTap, extractPlainText } from '@/lib/notes/noteSerializer'
import type { TipTapDoc } from '@/lib/notes/noteSerializer'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const docWithHeadingAndParagraph: TipTapDoc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Tiêu đề' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Nội dung ghi chú.' }] },
  ],
}

const docWithBulletList: TipTapDoc = {
  type: 'doc',
  content: [
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item A' }] }],
        },
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item B' }] }],
        },
      ],
    },
  ],
}

const docWithTaskList: TipTapDoc = {
  type: 'doc',
  content: [
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Đã xong' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Chưa xong' }] }],
        },
      ],
    },
  ],
}

const docWithCodeBlock: TipTapDoc = {
  type: 'doc',
  content: [
    {
      type: 'codeBlock',
      attrs: { language: 'typescript' },
      content: [{ type: 'text', text: 'const x = 1' }],
    },
  ],
}

const docWithBoldItalic: TipTapDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'world', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' and ' },
        { type: 'text', text: 'emphasis', marks: [{ type: 'italic' }] },
      ],
    },
  ],
}

// ─── tipTapToMarkdown ─────────────────────────────────────────────────────────

describe('tipTapToMarkdown — chuyển TipTap JSON sang Markdown', () => {
  it('N1: heading h1 + paragraph', () => {
    const md = tipTapToMarkdown(docWithHeadingAndParagraph)
    expect(md).toContain('# Tiêu đề')
    expect(md).toContain('Nội dung ghi chú.')
  })

  it('N2: bulletList → dòng bắt đầu bằng "- "', () => {
    const md = tipTapToMarkdown(docWithBulletList)
    expect(md).toContain('- Item A')
    expect(md).toContain('- Item B')
  })

  it('N3: taskList → "- [x]" và "- [ ]"', () => {
    const md = tipTapToMarkdown(docWithTaskList)
    expect(md).toContain('- [x] Đã xong')
    expect(md).toContain('- [ ] Chưa xong')
  })

  it('N4: codeBlock với language', () => {
    const md = tipTapToMarkdown(docWithCodeBlock)
    expect(md).toContain('```typescript')
    expect(md).toContain('const x = 1')
    expect(md).toContain('```')
  })

  it('N5: bold và italic inline', () => {
    const md = tipTapToMarkdown(docWithBoldItalic)
    expect(md).toContain('**world**')
    expect(md).toContain('_emphasis_')
  })

  it('N5b: document rỗng → chuỗi rỗng', () => {
    const md = tipTapToMarkdown({ type: 'doc', content: [] })
    expect(md).toBe('')
  })
})

// ─── markdownToTipTap ─────────────────────────────────────────────────────────

describe('markdownToTipTap — chuyển Markdown sang TipTap JSON', () => {
  it('N6: heading h1', () => {
    const doc = markdownToTipTap('# Hello World')
    const heading = doc.content.find((n) => n.type === 'heading')
    expect(heading).toBeDefined()
    expect(heading?.attrs?.level).toBe(1)
    expect(heading?.content?.[0].text).toBe('Hello World')
  })

  it('N7: paragraph thường', () => {
    const doc = markdownToTipTap('Đây là ghi chú')
    const para = doc.content.find((n) => n.type === 'paragraph')
    expect(para).toBeDefined()
    expect(para?.content?.some((n) => n.text?.includes('Đây là ghi chú'))).toBe(true)
  })

  it('N8: task list', () => {
    const md = '- [x] Đã xong\n- [ ] Chưa xong'
    const doc = markdownToTipTap(md)
    const taskList = doc.content.find((n) => n.type === 'taskList')
    expect(taskList).toBeDefined()
    const items = taskList?.content ?? []
    expect(items[0].attrs?.checked).toBe(true)
    expect(items[1].attrs?.checked).toBe(false)
  })

  it('N9: codeBlock', () => {
    const md = '```typescript\nconst x = 1\n```'
    const doc = markdownToTipTap(md)
    const cb = doc.content.find((n) => n.type === 'codeBlock')
    expect(cb).toBeDefined()
    expect(cb?.attrs?.language).toBe('typescript')
    expect(cb?.content?.[0].text).toContain('const x = 1')
  })
})

// ─── Round-trip: TipTap → MD → TipTap ────────────────────────────────────────

describe('Round-trip serialize/deserialize', () => {
  it('N10a: heading round-trip giữ nguyên level và text', () => {
    const original = '# Ghi chú quan trọng'
    const doc = markdownToTipTap(original)
    const back = tipTapToMarkdown(doc)
    expect(back).toContain('# Ghi chú quan trọng')
  })

  it('N10b: taskList round-trip giữ nguyên checked state', () => {
    const original = '- [x] Đã hoàn thành\n- [ ] Cần làm tiếp'
    const doc = markdownToTipTap(original)
    const back = tipTapToMarkdown(doc)
    expect(back).toContain('- [x] Đã hoàn thành')
    expect(back).toContain('- [ ] Cần làm tiếp')
  })
})

// ─── extractPlainText ─────────────────────────────────────────────────────────

describe('extractPlainText — trích xuất plain text cho search index', () => {
  it('N11: extract từ document phức tạp', () => {
    const doc: TipTapDoc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Lập trình hướng đối tượng' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Java và Python là hai ngôn ngữ phổ biến.' }],
        },
      ],
    }
    const text = extractPlainText(doc)
    expect(text).toContain('Lập trình hướng đối tượng')
    expect(text).toContain('Java và Python')
  })

  it('N12: document rỗng → chuỗi rỗng', () => {
    expect(extractPlainText({ type: 'doc', content: [] })).toBe('')
  })

  it('N13: chỉ có task list', () => {
    const text = extractPlainText(docWithTaskList)
    expect(text).toContain('Đã xong')
    expect(text).toContain('Chưa xong')
  })
})
