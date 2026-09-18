import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config — StudyFlow PWA
 *
 * webServer: dùng `next start` (production) vì:
 * - Service Worker chỉ hoạt động trong production build
 * - Offline tests cần SW để cache app shell
 *
 * Trước khi chạy `npm run test:e2e`, phải có production build:
 *   npm run build && npm run test:e2e
 *
 * Hoặc dùng reuseExistingServer=true nếu server đã chạy sẵn.
 *
 * NOTE: WebKit (exitCode=0xC0000142 / STATUS_DLL_INIT_FAILED) crash trên
 * Windows 25H2 Insider Preview — giới hạn đã biết của Playwright WebKit 2359.
 * webkit + mobile-safari chỉ chạy trên Linux/macOS (CI).
 * Trên Windows: chromium + mobile-chrome (2 projects).
 */

const isWindows = process.platform === 'win32'

export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Cho phép Service Worker
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // WebKit crash trên Windows 25H2 (STATUS_DLL_INIT_FAILED) — chỉ chạy trên Linux/macOS CI
    ...(!isWindows
      ? [
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
          },
        ]
      : []),
    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    // mobile-safari dùng WebKit engine — skip trên Windows cùng lý do
    ...(!isWindows
      ? [
          {
            name: 'mobile-safari',
            use: { ...devices['iPhone 14'] },
          },
        ]
      : []),
  ],
  webServer: {
    // Dùng production server để SW hoạt động
    command: 'npm run start',
    url: 'http://localhost:3000',
    // Reuse nếu đã có server (local dev workflow)
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
