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
 */
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
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
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
