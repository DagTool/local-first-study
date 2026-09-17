/**
 * Unit Tests — NoteRepository CRUD
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import 'fake-indexeddb/auto'
import { StudyFlowDB } from '@/lib/db'
import { NoteRepository } from '@/lib/db/repositories'

let db: StudyFlowDB
let repo: NoteRepository

beforeEach(() => {
  db = new StudyFlowDB(`test-note-${Math.random().toString(36).slice(2)}`)
  repo = new NoteRepository(db)
})

afterEach(async () => {
  await db.delete()
})

describe('NoteRepository', () => {
  const validInput = {
    title: 'Ghi chú về React Hooks',
    content: '<p>useState, useEffect, useCallback...</p>',
    tags: ['tag-1'],
    courseId: null,
    isPinned: false,
    isArchived: false,
  }

  it('create — tạo note thành công', async () => {
    const note = await repo.create(validInput)
    expect(note.id).toBeTruthy()
    expect(note.title).toBe('Ghi chú về React Hooks')
    expect(note.tags).toEqual(['tag-1'])
    expect(note.isPinned).toBe(false)
  })

  it('create — từ chối title rỗng', async () => {
    await expect(repo.create({ ...validInput, title: '' })).rejects.toThrow()
  })

  it('create — từ chối title > 255 ký tự', async () => {
    await expect(repo.create({ ...validInput, title: 'x'.repeat(256) })).rejects.toThrow()
  })

  it('create — chấp nhận content rỗng (draft)', async () => {
    const note = await repo.create({ ...validInput, content: '' })
    expect(note.content).toBe('')
  })

  it('create — chấp nhận note với courseId', async () => {
    const note = await repo.create({ ...validInput, courseId: 'course-1' })
    expect(note.courseId).toBe('course-1')
  })

  it('create — chấp nhận tags rỗng', async () => {
    const note = await repo.create({ ...validInput, tags: [] })
    expect(note.tags).toEqual([])
  })

  it('findById — tìm được', async () => {
    const created = await repo.create(validInput)
    const found = await repo.findById(created.id)
    expect(found?.id).toBe(created.id)
    expect(found?.title).toBe(validInput.title)
  })

  it('findById — null nếu không tồn tại', async () => {
    expect(await repo.findById('x')).toBeNull()
  })

  it('findAll — trả về tất cả notes', async () => {
    await repo.create(validInput)
    await repo.create({ ...validInput, title: 'Ghi chú 2' })
    expect((await repo.findAll()).length).toBe(2)
  })

  it('findPinned — chỉ trả về notes isPinned = true', async () => {
    await repo.create({ ...validInput, isPinned: true, title: 'Pinned' })
    await repo.create({ ...validInput, isPinned: false, title: 'Not pinned' })
    const pinned = await repo.findPinned()
    expect(pinned.length).toBe(1)
    expect(pinned[0].isPinned).toBe(true)
  })

  it('findByTag — lọc notes theo tagId', async () => {
    await repo.create({ ...validInput, tags: ['t1', 't2'], title: 'Note A' })
    await repo.create({ ...validInput, tags: ['t2'], title: 'Note B' })
    await repo.create({ ...validInput, tags: ['t3'], title: 'Note C' })

    const byT2 = await repo.findByTag('t2')
    expect(byT2.length).toBe(2)
    byT2.forEach((n) => expect(n.tags).toContain('t2'))
  })

  it('findByCourse — lọc notes theo courseId', async () => {
    await repo.create({ ...validInput, courseId: 'c1', title: 'Note C1-A' })
    await repo.create({ ...validInput, courseId: 'c1', title: 'Note C1-B' })
    await repo.create({ ...validInput, courseId: 'c2', title: 'Note C2' })
    await repo.create({ ...validInput, courseId: null, title: 'General' })

    const byCourse = await repo.findByCourse('c1')
    expect(byCourse.length).toBe(2)
  })

  it('update — cập nhật title và isPinned', async () => {
    const created = await repo.create(validInput)
    const updated = await repo.update(created.id, { title: 'Updated', isPinned: true })
    expect(updated.title).toBe('Updated')
    expect(updated.isPinned).toBe(true)
    expect(updated.content).toBe(validInput.content) // không đổi
  })

  it('update — throw nếu title rỗng', async () => {
    const created = await repo.create(validInput)
    await expect(repo.update(created.id, { title: '' })).rejects.toThrow()
  })

  it('update — throw nếu id không tồn tại', async () => {
    await expect(repo.update('ghost', { title: 'X' })).rejects.toThrow()
  })

  it('delete — xóa thành công', async () => {
    const created = await repo.create(validInput)
    await repo.delete(created.id)
    expect(await repo.findById(created.id)).toBeNull()
  })

  it('delete — throw nếu không tồn tại', async () => {
    await expect(repo.delete('ghost')).rejects.toThrow()
  })
})
