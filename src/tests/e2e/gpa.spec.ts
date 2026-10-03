/**
 * E2E Tests — Learning Progress Module (GPA & Biểu đồ)
 *
 * DoD:
 * - Luồng thêm học kỳ + môn học → hiển thị GPA đúng
 * - Biểu đồ tín chỉ được assert qua DOM (canvas hoặc data-testid)
 * - GPA tính lại realtime khi cập nhật điểm
 */

import { test, expect, type Page } from '@playwright/test'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Inject auth tokens (giống sync.spec.ts) */
async function injectAuth(page: Page) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      email: 'student@university.edu',
      name: 'Test Student',
      picture: 'https://example.com/avatar.jpg',
      sub: 'google-uid-gpa-test',
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
    { id: idToken, access: 'fake-access-token-gpa-e2e' },
  )
}

/** Goto trang GPA sau khi đã inject auth */
async function setupGPAPage(page: Page) {
  await page.goto('/')
  await injectAuth(page)
  await page.goto('/gpa', { waitUntil: 'networkidle' })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Learning Progress — GPA Module E2E', () => {
  test.use({ serviceWorkers: 'block' })

  // P1: Trang GPA render được
  test('P1: trang /gpa render được với heading', async ({ page }) => {
    await setupGPAPage(page)

    await expect(page.getByTestId('gpa-page')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('heading', { name: /GPA|Tiến trình|Học tập/i })).toBeVisible()
  })

  // P2: Thêm học kỳ → hiển thị trong danh sách
  test('P2: thêm học kỳ → hiển thị trong danh sách học kỳ', async ({ page }) => {
    await setupGPAPage(page)

    // Click nút thêm học kỳ
    await page.getByTestId('add-semester-btn').click()

    // Điền form
    await page.getByTestId('semester-name-input').fill('Học kỳ 1 2024-2025')
    await page.getByTestId('semester-start-input').fill('2024-09-01')
    await page.getByTestId('semester-end-input').fill('2025-01-15')
    await page.getByTestId('semester-save-btn').click()

    // Học kỳ phải xuất hiện trong list
    await expect(page.getByTestId('semester-list')).toContainText('Học kỳ 1 2024-2025', {
      timeout: 3000,
    })
  })

  // P3: Thêm môn học + điểm → GPA tính đúng
  test('P3: thêm môn học + điểm → GPA hiển thị đúng', async ({ page }) => {
    await setupGPAPage(page)

    // Thêm học kỳ
    await page.getByTestId('add-semester-btn').click()
    await page.getByTestId('semester-name-input').fill('HK1 Test GPA')
    await page.getByTestId('semester-start-input').fill('2024-09-01')
    await page.getByTestId('semester-end-input').fill('2025-01-15')
    await page.getByTestId('semester-save-btn').click()
    await expect(page.getByTestId('semester-list')).toContainText('HK1 Test GPA', { timeout: 3000 })

    // Click vào học kỳ để mở
    await page.getByTestId('semester-list').getByText('HK1 Test GPA').click()

    // Thêm môn học
    await page.getByTestId('add-course-btn').click()
    await page.getByTestId('course-name-input').fill('Toán cao cấp A1')
    await page.getByTestId('course-credits-input').fill('3')
    await page.getByTestId('course-save-btn').click()

    // Thêm điểm cho môn học
    await expect(page.getByText('Toán cao cấp A1')).toBeVisible({ timeout: 3000 })
    await page.getByTestId('add-grade-component-btn').first().click()
    await page.getByTestId('grade-component-name-input').fill('Điểm tổng kết')
    await page.getByTestId('grade-component-weight-input').fill('100')
    await page.getByTestId('grade-component-score-input').fill('8.5')
    await page.getByTestId('grade-component-save-btn').click()

    // GPA phải hiển thị ≈ 4.0 (vì 8.5 → A/4.0)
    await expect(page.getByTestId('cumulative-gpa4')).toContainText(/4[,.]0|4\.00/, {
      timeout: 3000,
    })
  })

  // P4: Biểu đồ tín chỉ tích lũy được render (assert qua DOM)
  test('P4: biểu đồ tín chỉ tích lũy xuất hiện trong DOM', async ({ page }) => {
    await setupGPAPage(page)

    // Biểu đồ phải tồn tại (canvas hoặc fallback data-testid)
    const chart = page.getByTestId('credit-chart')
    await expect(chart).toBeVisible({ timeout: 5000 })

    // Assert thông qua data attribute (chart data)
    const chartData = await chart.getAttribute('data-chart-type')
    expect(chartData).toBeTruthy()
  })

  // P5: GPA tính lại realtime sau khi sửa điểm
  test('P5: sửa điểm môn học → GPA cập nhật ngay (< 1s)', async ({ page }) => {
    await setupGPAPage(page)

    // Setup nhanh: thêm học kỳ + môn + điểm ban đầu
    await page.getByTestId('add-semester-btn').click()
    await page.getByTestId('semester-name-input').fill('HK Realtime Test')
    await page.getByTestId('semester-start-input').fill('2024-09-01')
    await page.getByTestId('semester-end-input').fill('2025-01-15')
    await page.getByTestId('semester-save-btn').click()
    await page.getByText('HK Realtime Test').click()

    await page.getByTestId('add-course-btn').click()
    await page.getByTestId('course-name-input').fill('Lý thuyết đồ thị')
    await page.getByTestId('course-credits-input').fill('3')
    await page.getByTestId('course-save-btn').click()

    await page.getByTestId('add-grade-component-btn').first().click()
    await page.getByTestId('grade-component-name-input').fill('CK')
    await page.getByTestId('grade-component-weight-input').fill('100')
    await page.getByTestId('grade-component-score-input').fill('7.0') // B/3.0
    await page.getByTestId('grade-component-save-btn').click()

    // Đợi GPA hiển thị B (3.0)
    await expect(page.getByTestId('cumulative-gpa4')).toContainText(/3[,.]0/, { timeout: 3000 })

    // Sửa điểm lên 9.0 (A+/4.0)
    await page.getByTestId('edit-grade-component-btn').first().click()
    await page.getByTestId('grade-component-score-input').clear()
    await page.getByTestId('grade-component-score-input').fill('9.0')

    const start = Date.now()
    await page.getByTestId('grade-component-save-btn').click()

    // GPA phải cập nhật lên 4.0 trong < 1s
    await expect(page.getByTestId('cumulative-gpa4')).toContainText(/4[,.]0/, { timeout: 2000 })
    const elapsed = Date.now() - start
    expect(elapsed, `GPA update took ${elapsed}ms — expected < 1000ms`).toBeLessThan(1000)
  })
})
