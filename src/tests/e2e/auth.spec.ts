/**
 * E2E Tests — Auth UI Smoke Tests
 *
 * NOTE: Full GIS stub E2E tests yêu cầu setup phức tạp (MSW hoặc stub trong _document).
 * Core auth logic (token decode, namespace isolation, state management) được test bằng:
 * - Unit tests: src/lib/auth/authUtils.test.ts (17 tests)
 * - Integration tests: src/tests/auth/namespace-isolation.test.ts (12 tests)
 * - Integration tests: src/tests/auth/authStore.integration.test.tsx (15 tests)
 */
import { test, expect } from '@playwright/test'

test.describe('Auth UI — Smoke', () => {
  test('trang chủ hiển thị AuthButtons mà không crash', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('StudyFlow')
    // AuthButtons render, có nút sign-in
    await expect(page.locator('[data-testid="sign-in-button"]')).toBeVisible()
  })
})
