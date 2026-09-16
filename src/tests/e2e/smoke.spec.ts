import { test, expect } from '@playwright/test'

/**
 * E2E Smoke test — Giai đoạn 0
 * Xác nhận trang chủ render đúng tiêu đề.
 * TDD: test này được viết TRƯỚC khi có UI, sẽ FAIL cho đến khi
 * page.tsx có h1 chứa "StudyFlow".
 */
test.describe('smoke — trang chủ', () => {
  test('hiển thị đúng tiêu đề trang (document title)', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/StudyFlow/)
  })

  test('hiển thị heading h1 "StudyFlow"', async ({ page }) => {
    await page.goto('/')
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toHaveText('StudyFlow')
  })
})
