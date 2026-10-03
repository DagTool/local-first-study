/**
 * E2E Tests — Notes Module (Ghi chú cá nhân)
 *
 * DoD:
 * - E1: Tạo note → hiển thị trong danh sách
 * - E2: Gắn tag → lọc theo tag → chỉ hiện đúng note đó
 * - E3: Tìm kiếm theo title → ra đúng note
 * - E4 (Offline DoD): tắt mạng hoàn toàn → tìm kiếm vẫn trả kết quả đúng
 */

import { test, expect, type Page } from '@playwright/test'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function injectAuth(page: Page) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      email: 'notes-student@university.edu',
      name: 'Notes Student',
      picture: 'https://example.com/avatar.jpg',
      sub: 'google-uid-notes-test',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://accounts.google.com',
      aud: 'test-client-id',
    }),
  ).toString('base64url')
  const idToken = `${header}.${payload}.fake-sig`

  await page.evaluate(
    ({ id, access }: { id: string; access: string }) => {
      localStorage.setItem('auth_id_token', id)
      localStorage.setItem('auth_access_token', access)
    },
    { id: idToken, access: 'fake-access-token-notes-e2e' },
  )
}

async function setupNotesPage(page: Page) {
  await page.goto('/')
  await injectAuth(page)
  await page.goto('/notes', { waitUntil: 'networkidle' })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Notes Module E2E', () => {
  test.use({ serviceWorkers: 'block' })

  // E1: Tạo note → hiển thị trong danh sách
  test('E1: tạo note mới → xuất hiện trong danh sách', async ({ page }) => {
    await setupNotesPage(page)

    // Click nút thêm note
    await page.click('[data-testid="add-note-btn"]')

    // Điền tiêu đề
    await page.fill('[data-testid="note-title-input"]', 'Ghi chú kiểm thử E2E')

    // Điền content (TipTap editor)
    const editor = page.locator('[data-testid="note-editor"]')
    await editor.click()
    await editor.type('Đây là nội dung ghi chú tích hợp E2E.')

    // Lưu note
    await page.click('[data-testid="note-save-btn"]')

    // Kiểm tra note xuất hiện trong danh sách
    await expect(page.locator('[data-testid="note-list"]')).toContainText('Ghi chú kiểm thử E2E', {
      timeout: 5000,
    })
  })

  // E2: Lọc theo tag
  test('E2: gắn tag → lọc theo tag → chỉ hiện đúng note', async ({ page }) => {
    await setupNotesPage(page)

    // Tạo tag mới
    await page.click('[data-testid="manage-tags-btn"]')
    await page.fill('[data-testid="tag-name-input"]', 'Toán')
    await page.click('[data-testid="tag-save-btn"]')
    await page.click('[data-testid="close-tags-modal-btn"]')

    // Tạo note với tag "Toán"
    await page.click('[data-testid="add-note-btn"]')
    await page.fill('[data-testid="note-title-input"]', 'Ghi chú Toán cao cấp')
    const editor = page.locator('[data-testid="note-editor"]')
    await editor.click()
    await editor.type('Đạo hàm và tích phân.')
    // Gắn tag
    await page.click('[data-testid="note-tag-select"]')
    await page.click('[data-testid="tag-option-Toán"]')
    await page.click('[data-testid="note-save-btn"]')

    // Tạo note thứ 2 không có tag Toán
    await page.click('[data-testid="add-note-btn"]')
    await page.fill('[data-testid="note-title-input"]', 'Ghi chú Lập trình')
    const editor2 = page.locator('[data-testid="note-editor"]')
    await editor2.click()
    await editor2.type('React và TypeScript.')
    await page.click('[data-testid="note-save-btn"]')

    // Lọc theo tag Toán
    await page.click('[data-testid="filter-tag-Toán"]')

    // Chỉ note Toán xuất hiện
    const list = page.locator('[data-testid="note-list"]')
    await expect(list).toContainText('Ghi chú Toán cao cấp', { timeout: 3000 })
    await expect(list).not.toContainText('Ghi chú Lập trình')
  })

  // E3: Tìm kiếm theo title và nội dung
  test('E3: tìm kiếm theo từ khóa → trả về đúng note', async ({ page }) => {
    await setupNotesPage(page)

    // Tạo 2 notes
    await page.click('[data-testid="add-note-btn"]')
    await page.fill('[data-testid="note-title-input"]', 'Ôn thi Giải tích')
    const editor = page.locator('[data-testid="note-editor"]')
    await editor.click()
    await editor.type('Chuỗi số, hàm số và giới hạn')
    await page.click('[data-testid="note-save-btn"]')

    await page.click('[data-testid="add-note-btn"]')
    await page.fill('[data-testid="note-title-input"]', 'Ôn thi Vật lý')
    const editor2 = page.locator('[data-testid="note-editor"]')
    await editor2.click()
    await editor2.type('Điện trường và từ trường')
    await page.click('[data-testid="note-save-btn"]')

    // Tìm kiếm
    await page.fill('[data-testid="notes-search-input"]', 'Giải tích')
    await page.waitForTimeout(300) // debounce

    const list = page.locator('[data-testid="note-list"]')
    await expect(list).toContainText('Ôn thi Giải tích', { timeout: 3000 })
    await expect(list).not.toContainText('Ôn thi Vật lý')
  })

  // E4: Offline search DoD — tắt mạng, tìm kiếm vẫn hoạt động
  test('E4 (Offline DoD): tắt mạng hoàn toàn → tìm kiếm offline vẫn trả kết quả đúng', async ({
    page,
    context,
  }) => {
    await setupNotesPage(page)

    // Tạo note khi còn online
    await page.click('[data-testid="add-note-btn"]')
    await page.fill('[data-testid="note-title-input"]', 'Công thức Vật lý đại cương')
    const editor = page.locator('[data-testid="note-editor"]')
    await editor.click()
    await editor.type('Định luật Newton, E = mc²')
    await page.click('[data-testid="note-save-btn"]')

    // Đợi note xuất hiện hoàn toàn trong list
    await expect(page.locator('[data-testid="note-list"]')).toContainText(
      'Công thức Vật lý đại cương',
      { timeout: 5000 },
    )

    // Xác nhận search hoạt động khi ONLINE
    await page.fill('[data-testid="notes-search-input"]', 'Vật lý')
    await page.waitForTimeout(400)
    await expect(page.locator('[data-testid="note-list"]')).toContainText(
      'Công thức Vật lý đại cương',
      { timeout: 3000 },
    )

    // Clear search
    await page.fill('[data-testid="notes-search-input"]', '')
    await page.waitForTimeout(200)

    // TẮT MẠNG hoàn toàn — IndexedDB + Fuse.js không cần network
    await context.setOffline(true)

    // Search khi OFFLINE — phải trả kết quả (Fuse.js tìm trên in-memory state từ IndexedDB)
    await page.fill('[data-testid="notes-search-input"]', 'Vật lý')
    await page.waitForTimeout(600) // debounce + render

    // Kết quả phải vẫn có mặt dù mạng đã tắt
    await expect(page.locator('[data-testid="note-list"]')).toContainText(
      'Công thức Vật lý đại cương',
      { timeout: 5000 },
    )

    // Khôi phục mạng
    await context.setOffline(false)
  })
})
