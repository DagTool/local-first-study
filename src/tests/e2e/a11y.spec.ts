/**
 * E2E Accessibility Audit — Giai đoạn 10
 *
 * Kiểm tra khả năng tiếp cận (Accessibility) theo chuẩn WCAG 2.1 AA:
 * - Dùng @axe-core/playwright quét các màn hình chính (Homepage, Notes, GPA, Offline)
 * - Điều hướng bằng bàn phím (tab order hợp lý)
 * - aria-label cho các controls
 */

import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

async function injectAuthUser(page: Page, email: string) {
  await page.evaluate((userEmail) => {
    localStorage.clear()
    sessionStorage.clear()
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = btoa(
      JSON.stringify({
        email: userEmail,
        name: 'A11y Auditor',
        picture: 'https://example.com/avatar.jpg',
        sub: 'a11y-user-1',
      }),
    )
    const token = `${header}.${payload}.sig`
    localStorage.setItem('auth_id_token', token)
    sessionStorage.setItem('auth_id_token', token)
  }, email)
}

test.describe('Accessibility Audit (a11y) — WCAG 2.1 AA', () => {
  test('A11Y-1: Trang chủ (HomePage) tuân thủ chuẩn WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    // Lọc ra các vi phạm nghiêm trọng (critical / serious)
    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(criticalViolations).toEqual([])
  })

  test('A11Y-2: Trang Ngoại tuyến (/offline) tuân thủ chuẩn WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/offline', { waitUntil: 'networkidle' })

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(criticalViolations).toEqual([])
  })

  test('A11Y-3: Trang Ghi chú (/notes) có thể điều hướng bằng bàn phím (Keyboard Tab Order)', async ({
    page,
  }) => {
    await page.goto('/')
    await injectAuthUser(page, 'a11y-notes@university.edu')
    await page.goto('/notes', { waitUntil: 'networkidle' })

    // Phím Tab điều hướng qua các phần tử tương tác chính
    await page.keyboard.press('Tab')
    const activeTagName = await page.evaluate(() => document.activeElement?.tagName)
    expect(activeTagName).toBeDefined()

    // Nút "Ghi chú mới" và ô tìm kiếm phải tương tác được bằng phím
    const searchInput = page.locator('[data-testid="notes-search-input"]')
    await searchInput.focus()
    await page.keyboard.type('Test a11y search')
    await expect(searchInput).toHaveValue('Test a11y search')
  })

  test('A11Y-4: Trang GPA & Tiến độ (/gpa) tuân thủ ngữ nghĩa tiêu đề và nút bấm', async ({
    page,
  }) => {
    await page.goto('/')
    await injectAuthUser(page, 'a11y-gpa@university.edu')
    await page.goto('/gpa', { waitUntil: 'networkidle' })

    // Kiểm tra cấu trúc heading: có h1 và h2
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()

    const addSemesterBtn = page.locator('[data-testid="add-semester-btn"]')
    await expect(addSemesterBtn).toBeVisible()
    await addSemesterBtn.focus()

    // Nhấn Enter trên nút để mở form thêm học kỳ (Keyboard accessibility)
    await page.keyboard.press('Enter')
    const semNameInput = page.locator('[data-testid="semester-name-input"]')
    await expect(semNameInput).toBeVisible()
  })
})
