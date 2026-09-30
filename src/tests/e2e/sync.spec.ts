/**
 * E2E Tests — Sync Engine (Google Drive)
 *
 * Giai đoạn Sync Engine — DoD:
 * - Đo độ trễ đồng bộ sau khi có mạng lại phải < 3 giây (yêu cầu đề tài)
 * - Kết quả được ASSERT trong test, không chỉ observe
 *
 * Strategy:
 * - Dùng Playwright route interception để mock Drive API
 * - Giả lập accessToken hợp lệ qua localStorage injection
 * - Đo thời gian từ lúc trigger sync đến khi badge = 'Đã sync'
 */

import { test, expect, type Page } from '@playwright/test'

// ─── Fake Auth Tokens ─────────────────────────────────────────────────────────

/** Fake Google ID token (JWT format — 3 parts base64) */
function makeFakeIdToken(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      email: 'testuser@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      sub: 'google-uid-12345',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://accounts.google.com',
      aud: 'test-client-id',
    }),
  ).toString('base64url')
  return `${header}.${payload}.fake-signature`
}

const FAKE_ACCESS_TOKEN = 'fake-drive-access-token-e2e'

// ─── Route Mock Helpers ───────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

/**
 * Setup tất cả Drive API route mocks cho một page.
 * Drive trống → upload (POST) tạo file mới, luôn trả về thành công.
 */
async function setupDriveMocks(page: Page) {
  const context = page.context()

  // 1. LIST files → trả về empty (Drive trống)
  await context.route(/googleapis\.com\/drive\/v3\/files(\?|$)/, (route) => {
    const method = route.request().method()
    if (method === 'OPTIONS') {
      void route.fulfill({ status: 200, headers: corsHeaders, body: '' })
    } else if (method === 'GET') {
      void route.fulfill({
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: [] }),
      })
    } else {
      void route.continue()
    }
  })

  // 2. DOWNLOAD (alt=media) — sẽ không xảy ra vì Drive trống, nhưng handle để an toàn
  await context.route(/googleapis\.com\/drive\/v3\/files\/[^?]+/, (route) => {
    const method = route.request().method()
    if (method === 'OPTIONS') {
      void route.fulfill({ status: 200, headers: corsHeaders, body: '' })
    } else if (method === 'GET') {
      void route.fulfill({
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: { code: 404, message: 'Not Found' } }),
      })
    } else {
      void route.continue()
    }
  })

  // 3. UPLOAD new file (POST) → thành công
  await context.route(/googleapis\.com\/upload\/drive\/v3\/files/, (route) => {
    const method = route.request().method()
    if (method === 'OPTIONS') {
      void route.fulfill({ status: 200, headers: corsHeaders, body: '' })
    } else if (method === 'POST' || method === 'PATCH') {
      void route.fulfill({
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'mock-drive-file-id',
          name: 'studyflow-snapshot.json',
          modifiedTime: new Date().toISOString(),
        }),
      })
    } else {
      void route.continue()
    }
  })
}

/** Inject auth tokens vào localStorage để giả lập đã đăng nhập */
async function injectAuth(page: Page) {
  const idToken = makeFakeIdToken()
  await page.evaluate(
    ({ id, access }: { id: string; access: string }) => {
      localStorage.setItem('auth_id_token', id)
      localStorage.setItem('auth_access_token', access)
    },
    { id: idToken, access: FAKE_ACCESS_TOKEN },
  )
}

/** Goto homepage + inject auth + setup mocks + reload để restore session */
async function setupPage(page: Page) {
  await page.goto('/')
  await setupDriveMocks(page)
  await injectAuth(page)
  await page.goto('/', { waitUntil: 'networkidle' })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Sync Engine — E2E', () => {
  // Block Service Worker cho suite này để Playwright interception (mock Drive API) hoạt động ổn định
  // Nếu SW được allow, nó có thể chặn/cache/pass-through fetch request làm bypass page.route().
  test.use({ serviceWorkers: 'block' })

  // E1: SyncStatus component visible khi đã auth
  test('E1: SyncStatus hiển thị khi có accessToken', async ({ page }) => {
    await setupPage(page)

    const syncStatus = page.getByTestId('sync-status')
    await expect(syncStatus).toBeVisible({ timeout: 5000 })

    const syncButton = page.getByTestId('sync-button')
    await expect(syncButton).toBeVisible()
    await expect(syncButton).toHaveText('Sync ngay')
  })

  // E2: DoD BẮT BUỘC — Độ trễ sync < 3000ms
  test('E2: Độ trễ sync < 3000ms (DoD bắt buộc)', async ({ page }) => {
    await setupPage(page)

    const syncButton = page.getByTestId('sync-button')
    await expect(syncButton).toBeVisible({ timeout: 5000 })

    // Đo thời gian sync
    const startTime = Date.now()

    // Click nút sync
    await syncButton.click()

    // Đợi badge chuyển sang 'Đã sync' hoặc 'Lỗi sync' — tối đa 5s để có buffer
    const syncBadge = page.getByTestId('sync-badge')
    await expect(syncBadge).toContainText(/Đã sync|Lỗi sync/, { timeout: 5000 })

    const elapsed = Date.now() - startTime

    // ASSERT: phải hoàn thành trong 3000ms
    expect(elapsed, `Sync took ${elapsed}ms — expected < 3000ms`).toBeLessThan(3000)

    // ASSERT thêm: phải là 'Đã sync' (thành công thật)
    await expect(syncBadge).toContainText('Đã sync')
  })

  // E3: Trạng thái 'Đang sync' xuất hiện trong khi sync đang chạy
  test('E3: Badge chuyển qua trạng thái "Đang sync" rồi "Đã sync"', async ({ page }) => {
    // Setup với upload delay để observe 'Đang sync'
    await page.goto('/')

    const context = page.context()

    // LIST nhanh
    await context.route(/googleapis\.com\/drive\/v3\/files(\?|$)/, (route) => {
      const method = route.request().method()
      if (method === 'OPTIONS') {
        void route.fulfill({ status: 200, headers: corsHeaders, body: '' })
      } else if (method === 'GET') {
        void route.fulfill({
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ files: [] }),
        })
      } else {
        void route.continue()
      }
    })

    // DOWNLOAD fallback
    await context.route(/googleapis\.com\/drive\/v3\/files\/[^?]+/, (route) => {
      const method = route.request().method()
      if (method === 'OPTIONS') {
        void route.fulfill({ status: 200, headers: corsHeaders, body: '' })
      } else {
        void route.fulfill({ status: 404, headers: corsHeaders, body: '{}' })
      }
    })

    // UPLOAD với delay 600ms để observe 'Đang sync'
    await context.route(/googleapis\.com\/upload\/drive\/v3\/files/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 600))
      void route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-file-e3',
          name: 'studyflow-snapshot.json',
          modifiedTime: new Date().toISOString(),
        }),
      })
    })

    await injectAuth(page)
    await page.reload()

    const syncButton = page.getByTestId('sync-button')
    await expect(syncButton).toBeVisible({ timeout: 5000 })
    await expect(syncButton).toHaveText('Sync ngay')

    // Click sync
    await syncButton.click()

    const syncBadge = page.getByTestId('sync-badge')

    // Badge phải qua 'Đang sync'
    await expect(syncBadge).toContainText('Đang sync', { timeout: 2000 })

    // Và sau đó chuyển sang 'Đã sync'
    await expect(syncBadge).toContainText('Đã sync', { timeout: 5000 })
  })

  // E4: Online event tự động trigger sync (độ trễ < 3s)
  test('E4: Online event tự động trigger sync (độ trễ < 3s)', async ({ page }) => {
    await setupPage(page)

    // Đợi SyncStatus xuất hiện
    await expect(page.getByTestId('sync-status')).toBeVisible({ timeout: 5000 })
    const syncBadge = page.getByTestId('sync-badge')

    // Đợi React chạy useEffect để attach event listener 'online' và Next.js router ổn định
    await page.waitForTimeout(2000)

    // Đo thời gian từ khi online lại đến khi sync hoàn thành
    const startTime = Date.now()

    // Dispatch event online trực tiếp
    await page.evaluate(() => window.dispatchEvent(new Event('app-online')))

    // Đợi sync tự động hoàn thành
    await expect(syncBadge).toContainText(/Đã sync|Lỗi sync/, { timeout: 5000 })

    const elapsed = Date.now() - startTime

    // ASSERT: auto-sync hoàn thành trong 3000ms
    expect(elapsed, `Auto-sync after reconnect took ${elapsed}ms — expected < 3000ms`).toBeLessThan(
      3000,
    )

    // ASSERT: phải là 'Đã sync'
    await expect(syncBadge).toContainText('Đã sync')
  })
})
