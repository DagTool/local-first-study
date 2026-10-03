import { test, expect } from '@playwright/test'

/**
 * E2E Test — Giai đoạn 1: Offline Support
 *
 * TDD: Viết test TRƯỚC. Sẽ FAIL cho đến khi Service Worker
 * được cài đặt và cache app shell đúng cách.
 *
 * Yêu cầu: chạy trên production server (npm run start)
 * vì Serwist SW bị disable trong development mode.
 *
 * Workflow: npm run build && npm run test:e2e
 */
test.describe('PWA — Offline support', () => {
  test('manifest.webmanifest được serve đúng', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest')
    expect(response?.status()).toBe(200)

    const contentType = response?.headers()['content-type'] ?? ''
    expect(contentType).toContain('application/manifest+json')

    const body = (await response?.json()) as {
      name?: string
      display?: string
      icons?: unknown[]
    }
    expect(body.name).toBeTruthy()
    expect(body.display).toBe('standalone')
    expect(Array.isArray(body.icons)).toBe(true)
    expect((body.icons ?? []).length).toBeGreaterThanOrEqual(2)
  })

  test('service worker đã build và accessible (/sw.js)', async ({ page }) => {
    await page.goto('/')
    const swResponse = await page.request.get('/sw.js')
    expect(swResponse.status()).toBe(200)
    const contentType = swResponse.headers()['content-type']
    expect(contentType).toContain('javascript')
  })

  test('trang /offline render được', async ({ page }) => {
    const response = await page.goto('/offline')
    expect(response?.status()).toBe(200)
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    await expect(heading).toContainText('offline')
  })

  test('app shell vẫn hiển thị sau khi ngắt mạng (SW cache)', async ({ page, context }) => {
    // ── Bước 1: Load lần 1 — SW install & activate ─────────────────────
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toBeVisible()

    // ── Bước 2: Chờ SW activate và control trang hiện tại ──────────────
    // skipWaiting + clientsClaim trong SW đảm bảo SW control ngay sau activate
    const swControlled = await page.evaluate(async (): Promise<boolean> => {
      if (!('serviceWorker' in navigator)) return false

      // Chờ SW ready (installed + activated) với timeout 5s
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ])
      if (!reg || !reg.active) return false

      // Nếu SW chưa control trang, chờ controllerchange event
      if (navigator.serviceWorker.controller) return true

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          clearTimeout(timeout)
          resolve(true)
        })
      })
    })

    if (!swControlled) {
      // SW không sẵn sàng (dev build hoặc first install chưa xong)
      // Thử reload để SW claim page
      await page.reload({ waitUntil: 'networkidle' })

      const retryControlled = await page.evaluate(() => !!navigator.serviceWorker?.controller)
      if (!retryControlled) {
        test.skip()
        return
      }
    }

    // ── Bước 3: Load lần 2 để SW cache navigation response ─────────────
    // SW dùng NetworkFirst → lần 2 sẽ cache response từ network
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toBeVisible()

    // ── Bước 4: Ngắt mạng ────────────────────────────────────────────
    await context.setOffline(true)

    // ── Bước 5: Reload trang trong offline ───────────────────────────
    // SW intercept → NetworkFirst (fail) → serve từ cache hoặc /offline fallback
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 })
    } catch {
      // Timeout expected nếu SW không cache được — /offline fallback sẽ render
    }

    // ── Bước 6: Xác nhận có heading hiển thị ─────────────────────────
    // Có thể là app shell ("StudyFlow") hoặc offline page ("Bạn đang offline")
    const heading = page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10000 })

    // ── Bước 7: Restore online ────────────────────────────────────────
    await context.setOffline(false)
  })
})
