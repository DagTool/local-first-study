/**
 * E2E Tests — UX Polish & State Management (Empty, Loading, Error States)
 *
 * Kiểm tra:
 * - UX-1: Khi chưa có notes -> hiển thị notes-empty-state
 * - UX-2: Khi chưa có semesters -> hiển thị gpa-empty-state
 * - UX-3: Xóa hết môn học trong học kỳ -> hiển thị courses-empty-state
 * - UX-4: Tìm kiếm ghi chú không có kết quả -> hiển thị empty state chứa từ khóa
 * - UX-5: Trạng thái lỗi đồng bộ (Sync error state) hiển thị thông báo lỗi rõ ràng
 */

import { test, expect, type Page } from '@playwright/test'

function makeFakeIdToken(email: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      email,
      name: 'UX Tester',
      picture: 'https://example.com/avatar.jpg',
      sub: 'ux-uid-12345',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://accounts.google.com',
      aud: 'test-client-id',
    }),
  ).toString('base64url')
  return `${header}.${payload}.fake-signature`
}

async function injectAuth(page: Page, email: string, accessToken?: string) {
  const idToken = makeFakeIdToken(email)
  await page.evaluate(
    ({ id, access }) => {
      localStorage.setItem('auth_id_token', id)
      sessionStorage.setItem('auth_id_token', id)
      if (access) {
        localStorage.setItem('auth_access_token', access)
        sessionStorage.setItem('auth_access_token', access)
      }
    },
    { id: idToken, access: accessToken || '' },
  )
}

test.describe('UX Polish & State Management', () => {
  test.use({ serviceWorkers: 'block' })

  test('UX-1: NotesPage hiển thị empty state rõ ràng khi chưa có ghi chú', async ({ page }) => {
    await page.goto('/')
    await injectAuth(page, 'empty-notes@test.com')
    await page.goto('/notes', { waitUntil: 'networkidle' })

    const emptyState = page.locator('[data-testid="notes-empty-state"]')
    await expect(emptyState).toBeVisible({ timeout: 5000 })
    await expect(emptyState).toContainText('Chưa có ghi chú nào')
  })

  test('UX-2: GPAPage hiển thị empty state rõ ràng khi chưa có học kỳ', async ({ page }) => {
    await page.goto('/')
    await injectAuth(page, 'empty-gpa@test.com')
    await page.goto('/gpa', { waitUntil: 'networkidle' })

    const emptyState = page.locator('[data-testid="gpa-empty-state"]')
    await expect(emptyState).toBeVisible({ timeout: 5000 })
    await expect(emptyState).toContainText('Chưa có học kỳ nào')
  })

  test('UX-3: Khi học kỳ không có môn học hoặc xóa hết môn -> hiển thị đúng courses-empty-state', async ({
    page,
  }) => {
    await page.goto('/')
    await injectAuth(page, 'ux-courses@test.com')
    await page.goto('/gpa', { waitUntil: 'networkidle' })

    // 1. Thêm 1 học kỳ
    await page.locator('[data-testid="add-semester-btn"]').click()
    await page.locator('[data-testid="semester-name-input"]').fill('Học kỳ Test UX')
    await page.locator('[data-testid="semester-start-input"]').fill('2026-09-01')
    await page.locator('[data-testid="semester-end-input"]').fill('2027-01-15')
    await page.locator('[data-testid="semester-save-btn"]').click()

    // 2. Mở rộng học kỳ vừa tạo
    const toggleBtn = page.locator('[data-testid="toggle-expand-btn"]').first()
    await expect(toggleBtn).toBeVisible({ timeout: 5000 })
    await toggleBtn.click()

    // 3. Học kỳ chưa có môn học nào -> hiển thị courses-empty-state
    const coursesEmpty = page.locator('[data-testid="courses-empty-state"]')
    await expect(coursesEmpty).toBeVisible()
    await expect(coursesEmpty).toContainText('Chưa có môn học nào trong học kỳ này')

    // 4. Thêm 1 môn học
    await page.locator('[data-testid="add-course-btn"]').click()
    await page.locator('[data-testid="course-name-input"]').fill('Môn thử nghiệm')
    await page.locator('[data-testid="course-credits-input"]').fill('3')
    await page.locator('[data-testid="course-save-btn"]').click()

    // Empty state biến mất
    await expect(coursesEmpty).not.toBeVisible()

    // 5. Xóa môn học vừa thêm -> courses-empty-state xuất hiện trở lại
    const deleteCourseBtn = page.locator('text=Xóa môn')
    await deleteCourseBtn.click()
    await expect(coursesEmpty).toBeVisible()
  })

  test('UX-4: Tìm kiếm ghi chú không có kết quả -> hiển thị empty state phù hợp', async ({
    page,
  }) => {
    await page.goto('/')
    await injectAuth(page, 'ux-search@test.com')
    await page.goto('/notes', { waitUntil: 'networkidle' })

    // Tạo 1 note
    await page.locator('[data-testid="add-note-btn"]').click()
    await page.locator('[data-testid="note-title-input"]').fill('Ghi chú môn Lý')
    await page.locator('[data-testid="note-save-btn"]').click()

    // Chờ note xuất hiện
    await expect(page.locator('[data-testid="note-list"]')).toContainText('Ghi chú môn Lý')

    // Tìm kiếm với từ khóa không tồn tại
    const searchInput = page.locator('[data-testid="notes-search-input"]')
    await searchInput.fill('TừKhoáKhôngTồnTại123')

    const emptyState = page.locator('[data-testid="notes-empty-state"]')
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText('TừKhoáKhôngTồnTại123')
  })

  test('UX-5: SyncStatus hiển thị trạng thái lỗi rõ ràng khi sync thất bại', async ({ page }) => {
    // Mock Drive API trả lỗi 500
    await page.context().route(/googleapis\.com/, (route) => {
      void route.fulfill({
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
        body: 'Internal Server Error',
      })
    })

    await page.goto('/')
    await injectAuth(page, 'sync-error@test.com', 'fake-access-token')
    await page.goto('/', { waitUntil: 'networkidle' })

    const syncBtn = page.locator('[data-testid="sync-button"]')
    await expect(syncBtn).toBeVisible({ timeout: 5000 })
    await syncBtn.click()

    const syncBadge = page.locator('[data-testid="sync-badge"]')
    await expect(syncBadge).toContainText('Lỗi sync', { timeout: 10000 })
  })
})
