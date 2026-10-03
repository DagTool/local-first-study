/**
 * noteSerializer.ts — Pure Functions
 *
 * Chuyển đổi giữa TipTap JSON và Markdown text (đơn giản, offline-safe).
 * Không dùng thư viện nặng — chỉ xử lý các node thông dụng:
 * - paragraph, heading (h1–h3), bold, italic, code, codeBlock
 * - bulletList, orderedList, listItem
 * - taskList, taskItem (checked/unchecked)
 * - blockquote, horizontalRule
 * - hardBreak → \n
 *
 * Dùng cho:
 * 1. Export note ra Markdown (hiển thị, clipboard)
 * 2. Full-text search index (extract plain text từ TipTap JSON)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TipTapNode {
  type: string
  text?: string
  content?: TipTapNode[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  attrs?: Record<string, unknown>
}

export interface TipTapDoc {
  type: 'doc'
  content: TipTapNode[]
}

// ─── Plain Text Extraction ────────────────────────────────────────────────────

/**
 * Trích xuất plain text từ TipTap JSON để dùng cho full-text search.
 */
export function extractPlainText(doc: TipTapDoc | TipTapNode): string {
  if (!doc) return ''
  const parts: string[] = []
  extractTextRecursive(doc, parts)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function extractTextRecursive(node: TipTapNode, parts: string[]): void {
  if (node.type === 'text' && node.text) {
    parts.push(node.text)
  }
  if (node.content) {
    for (const child of node.content) {
      extractTextRecursive(child, parts)
    }
  }
}

// ─── TipTap JSON → Markdown ───────────────────────────────────────────────────

/**
 * Chuyển TipTap JSON document sang Markdown string.
 */
export function tipTapToMarkdown(doc: TipTapDoc): string {
  if (!doc || !doc.content) return ''
  return doc.content
    .map((node) => nodeToMarkdown(node, 0))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function nodeToMarkdown(node: TipTapNode, listDepth: number): string {
  switch (node.type) {
    case 'paragraph': {
      const text = inlineToMarkdown(node.content ?? [])
      return text || ''
    }

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1
      const hashes = '#'.repeat(Math.min(level, 6))
      return `${hashes} ${inlineToMarkdown(node.content ?? [])}`
    }

    case 'bulletList': {
      return (node.content ?? []).map((item) => nodeToMarkdown(item, listDepth)).join('\n')
    }

    case 'orderedList': {
      return (node.content ?? [])
        .map((item, i) => {
          const text = (item.content ?? []).map((c) => nodeToMarkdown(c, listDepth + 1)).join('\n')
          return `${i + 1}. ${text.trim()}`
        })
        .join('\n')
    }

    case 'listItem': {
      const indent = '  '.repeat(listDepth)
      const text = (node.content ?? []).map((c) => nodeToMarkdown(c, listDepth + 1)).join('\n')
      return `${indent}- ${text.trim()}`
    }

    case 'taskList': {
      return (node.content ?? [])
        .map((item) => {
          const checked = item.attrs?.checked ? 'x' : ' '
          const text = (item.content ?? []).map((c) => nodeToMarkdown(c, listDepth + 1)).join('\n')
          return `- [${checked}] ${text.trim()}`
        })
        .join('\n')
    }

    case 'taskItem': {
      const checked = node.attrs?.checked ? 'x' : ' '
      const text = (node.content ?? []).map((c) => nodeToMarkdown(c, listDepth + 1)).join('\n')
      return `- [${checked}] ${text.trim()}`
    }

    case 'blockquote': {
      const inner = (node.content ?? []).map((c) => nodeToMarkdown(c, listDepth)).join('\n')
      return inner
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
    }

    case 'codeBlock': {
      const lang = (node.attrs?.language as string) ?? ''
      const text = inlineToMarkdown(node.content ?? [])
      return `\`\`\`${lang}\n${text}\n\`\`\``
    }

    case 'horizontalRule':
      return '---'

    case 'hardBreak':
      return '\n'

    default:
      return inlineToMarkdown(node.content ?? [])
  }
}

function inlineToMarkdown(nodes: TipTapNode[]): string {
  return nodes.map(inlineNodeToMarkdown).join('')
}

function inlineNodeToMarkdown(node: TipTapNode): string {
  if (node.type === 'hardBreak') return '\n'

  let text = node.text ?? inlineToMarkdown(node.content ?? [])

  const marks = node.marks ?? []
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        text = `**${text}**`
        break
      case 'italic':
        text = `_${text}_`
        break
      case 'code':
        text = `\`${text}\``
        break
      case 'strike':
        text = `~~${text}~~`
        break
      case 'link': {
        const href = (mark.attrs?.href as string) ?? ''
        text = `[${text}](${href})`
        break
      }
    }
  }
  return text
}

// ─── Markdown → TipTap JSON ───────────────────────────────────────────────────

/**
 * Chuyển Markdown string sang TipTap JSON (parser cơ bản).
 * Hỗ trợ: heading, paragraph, bulletList, orderedList, taskList, codeBlock,
 * blockquote, horizontalRule, bold, italic, inline code.
 */
export function markdownToTipTap(markdown: string): TipTapDoc {
  const lines = markdown.split('\n')
  const content: TipTapNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Blank line
    if (line.trim() === '') {
      i++
      continue
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      content.push({ type: 'horizontalRule' })
      i++
      continue
    }

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      content.push({
        type: 'codeBlock',
        attrs: { language: lang || null },
        content: [{ type: 'text', text: codeLines.join('\n') }],
      })
      continue
    }

    // Heading
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line)
    if (headingMatch) {
      content.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: parseInline(headingMatch[2]),
      })
      i++
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const bqLines: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqLines.push(lines[i].slice(2))
        i++
      }
      const inner = markdownToTipTap(bqLines.join('\n'))
      content.push({ type: 'blockquote', content: inner.content })
      continue
    }

    // Task list item
    const taskMatch = /^- \[(x| )\] (.*)$/.exec(line)
    if (taskMatch) {
      const taskItems: TipTapNode[] = []
      let j = i
      while (j < lines.length) {
        const tm = /^- \[(x| )\] (.*)$/.exec(lines[j])
        if (!tm) break
        taskItems.push({
          type: 'taskItem',
          attrs: { checked: tm[1] === 'x' },
          content: [{ type: 'paragraph', content: parseInline(tm[2]) }],
        })
        j++
      }
      content.push({ type: 'taskList', content: taskItems })
      i = j
      continue
    }

    // Ordered list
    const orderedMatch = /^(\d+)\. (.*)$/.exec(line)
    if (orderedMatch) {
      const items: TipTapNode[] = []
      let j = i
      while (j < lines.length) {
        const om = /^(\d+)\. (.*)$/.exec(lines[j])
        if (!om) break
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(om[2]) }],
        })
        j++
      }
      content.push({ type: 'orderedList', attrs: { start: 1 }, content: items })
      i = j
      continue
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: TipTapNode[] = []
      let j = i
      while (j < lines.length) {
        const bl = lines[j]
        if (!bl.startsWith('- ') && !bl.startsWith('* ')) break
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInline(bl.slice(2)) }],
        })
        j++
      }
      content.push({ type: 'bulletList', content: items })
      i = j
      continue
    }

    // Paragraph
    const paraLines: string[] = []
    while (i < lines.length && lines[i].trim() !== '') {
      // stop if next line is a special marker
      if (
        /^#{1,6} /.test(lines[i]) ||
        lines[i].startsWith('```') ||
        lines[i].startsWith('> ') ||
        /^- \[(x| )\]/.test(lines[i]) ||
        /^\d+\. /.test(lines[i]) ||
        /^---+$/.test(lines[i].trim())
      )
        break
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      content.push({
        type: 'paragraph',
        content: parseInline(paraLines.join(' ')),
      })
    }
  }

  return { type: 'doc', content }
}

/**
 * Parse inline markdown (bold, italic, code) thành mảng TipTapNode.
 */
function parseInline(text: string): TipTapNode[] {
  // Rất đơn giản: áp dụng regex lần lượt
  const nodes: TipTapNode[] = []
  // Regex cho **bold**, _italic_, `code`
  const pattern = /(\*\*(.+?)\*\*|_(.+?)_|`(.+?)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    // plain text trước match
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }

    if (match[0].startsWith('**')) {
      nodes.push({ type: 'text', text: match[2], marks: [{ type: 'bold' }] })
    } else if (match[0].startsWith('_')) {
      nodes.push({ type: 'text', text: match[3], marks: [{ type: 'italic' }] })
    } else if (match[0].startsWith('`')) {
      nodes.push({ type: 'text', text: match[4], marks: [{ type: 'code' }] })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', text }]
}
