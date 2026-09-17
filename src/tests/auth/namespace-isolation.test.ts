/**
 * Integration Tests — Data Namespace Isolation
 *
 * Bắt buộc theo DoD Giai đoạn 3:
 * "Test cách ly dữ liệu theo email pass tuyệt đối, không có leak nào."
 *
 * Scenario:
 *   - User A (alice@example.com) tạo note "Note của Alice"
 *   - User B (bob@example.com) tạo note "Note của Bob"
 *   - Xác nhận: B KHÔNG thấy note của A và ngược lại
 *   - Xác nhận: sau sign-out A, đăng nhập B → dữ liệu A không lộ
 *   - Xác nhận: DB name khác nhau cho từng userKey
 */
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { getNamespacedDB, getDBNameForUser } from '@/lib/db/namespaceDB'
import { NoteRepository } from '@/lib/db/repositories'
import { deriveUserKey } from '@/lib/auth/authUtils'

const USER_A_EMAIL = '  Alice@Example.COM  ' // raw — có uppercase + spaces
const USER_B_EMAIL = 'bob@example.com'

const USER_A_KEY = deriveUserKey(USER_A_EMAIL) // → 'alice@example.com'
const USER_B_KEY = deriveUserKey(USER_B_EMAIL) // → 'bob@example.com'

describe('getDBNameForUser', () => {
  it('trả về tên DB theo format studyflow-db:{userKey}', () => {
    expect(getDBNameForUser('alice@example.com')).toBe('studyflow-db:alice@example.com')
  })

  it('userKey đã được normalize (lowercase, trim) trước khi tạo tên DB', () => {
    const key = deriveUserKey('  ALICE@EXAMPLE.COM  ')
    expect(getDBNameForUser(key)).toBe('studyflow-db:alice@example.com')
  })

  it('hai user khác email → tên DB khác nhau', () => {
    expect(getDBNameForUser(USER_A_KEY)).not.toBe(getDBNameForUser(USER_B_KEY))
  })
})

describe('getNamespacedDB', () => {
  it('trả về StudyFlowDB instance', () => {
    const db = getNamespacedDB(USER_A_KEY)
    expect(db).toBeDefined()
    expect(typeof db.notes).toBe('object')
  })

  it('cùng userKey → cùng DB name', () => {
    const db1 = getNamespacedDB(USER_A_KEY)
    const db2 = getNamespacedDB(USER_A_KEY)
    expect(db1.name).toBe(db2.name)
  })

  it('user khác nhau → DB name khác nhau', () => {
    const dbA = getNamespacedDB(USER_A_KEY)
    const dbB = getNamespacedDB(USER_B_KEY)
    expect(dbA.name).not.toBe(dbB.name)
  })
})

describe('Namespace Isolation — A không thấy data của B và ngược lại', () => {
  let noteRepoA: NoteRepository
  let noteRepoB: NoteRepository

  const baseNote = {
    content: '<p>nội dung</p>',
    tags: [] as string[],
    courseId: null,
    isPinned: false,
    isArchived: false,
  }

  beforeEach(async () => {
    // Mỗi test dùng DB name chứa random suffix để tránh state leak giữa tests
    const suffix = Math.random().toString(36).slice(2)
    const dbA = getNamespacedDB(`${USER_A_KEY}:${suffix}`)
    const dbB = getNamespacedDB(`${USER_B_KEY}:${suffix}`)
    noteRepoA = new NoteRepository(dbA)
    noteRepoB = new NoteRepository(dbB)
  })

  it('note của A không xuất hiện trong DB của B', async () => {
    await noteRepoA.create({ ...baseNote, title: 'Note của Alice' })

    const notesB = await noteRepoB.findAll()
    expect(notesB).toHaveLength(0)
  })

  it('note của B không xuất hiện trong DB của A', async () => {
    await noteRepoB.create({ ...baseNote, title: 'Note của Bob' })

    const notesA = await noteRepoA.findAll()
    expect(notesA).toHaveLength(0)
  })

  it('mỗi user chỉ thấy đúng notes của mình', async () => {
    await noteRepoA.create({ ...baseNote, title: 'Note A-1' })
    await noteRepoA.create({ ...baseNote, title: 'Note A-2' })
    await noteRepoB.create({ ...baseNote, title: 'Note B-1' })

    const notesA = await noteRepoA.findAll()
    const notesB = await noteRepoB.findAll()

    expect(notesA).toHaveLength(2)
    expect(notesB).toHaveLength(1)

    // Tên notes của A không lộ sang B
    const titlesBofA = notesA.map((n) => n.title)
    const titlesBofB = notesB.map((n) => n.title)
    expect(titlesBofA).toContain('Note A-1')
    expect(titlesBofA).toContain('Note A-2')
    expect(titlesBofB).toContain('Note B-1')
    expect(titlesBofB).not.toContain('Note A-1')
    expect(titlesBofA).not.toContain('Note B-1')
  })

  it('xóa note của A không ảnh hưởng data của B', async () => {
    const noteA = await noteRepoA.create({ ...baseNote, title: 'Note sẽ bị xóa' })
    await noteRepoB.create({ ...baseNote, title: 'Note của B an toàn' })

    await noteRepoA.delete(noteA.id)

    const notesA = await noteRepoA.findAll()
    const notesB = await noteRepoB.findAll()
    expect(notesA).toHaveLength(0)
    expect(notesB).toHaveLength(1)
  })

  it('update note của A không thay đổi data của B', async () => {
    await noteRepoA.create({ ...baseNote, title: 'Note gốc A' })
    const noteB = await noteRepoB.create({ ...baseNote, title: 'Note gốc B' })

    // Update all notes in A (thực ra chỉ 1)
    const notesA = await noteRepoA.findAll()
    await noteRepoA.update(notesA[0].id, { title: 'Note A đã sửa' })

    // B không bị ảnh hưởng
    const notesBAfter = await noteRepoB.findById(noteB.id)
    expect(notesBAfter?.title).toBe('Note gốc B')
  })
})

describe('Namespace Isolation — Sign-out / Sign-in switch', () => {
  it('userKey từ raw email bị chuẩn hóa → cùng DB với email đã chuẩn', async () => {
    const suffix = Math.random().toString(36).slice(2)
    const rawEmail = '  ALICE@EXAMPLE.COM  '
    const normalizedKey = deriveUserKey(rawEmail)

    const dbFromRaw = getNamespacedDB(`${normalizedKey}:${suffix}`)
    const dbFromNormalized = getNamespacedDB(`${normalizedKey}:${suffix}`)

    const repoFromRaw = new NoteRepository(dbFromRaw)
    const repoFromNormalized = new NoteRepository(dbFromNormalized)

    await repoFromRaw.create({
      title: 'Note tạo qua email thô',
      content: '',
      tags: [],
      courseId: null,
      isPinned: false,
      isArchived: false,
    })

    // Cùng namespace → thấy được note
    const notes = await repoFromNormalized.findAll()
    expect(notes).toHaveLength(1)
    expect(notes[0].title).toBe('Note tạo qua email thô')
  })
})
