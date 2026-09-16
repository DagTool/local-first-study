# PROGRESS.md — PWA Quản lý Ghi chú & Học tập

> Cập nhật tự động sau mỗi giai đoạn pass Test Gate.

## Giả định ghi nhận

- Next.js **16.3.5** (thay vì 14+ như kế hoạch ban đầu — version mới nhất lúc scaffold)
- Serwist sẽ được cài ở Giai đoạn 6 (sau khi UI cơ bản ổn định)
- `@types/node` nâng lên `^22` để tương thích `vitest@5`
- Playwright test chạy 4 projects: Chromium, WebKit, Pixel 7 (mobile Chrome), iPhone 14 (mobile Safari)
- Husky pre-commit: `lint` + `typecheck` + `test` (unit/integration) — không chạy e2e trên pre-commit
- Google Client ID: cấu hình qua `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, dùng MSW mock trong dev/test
- `metadata.themeColor` deprecated từ Next.js 14 → dùng `export const viewport: Viewport` thay thế
- `manifest` trong metadata sẽ thêm ở Giai đoạn 6 khi có file `/public/manifest.json` thực

---

## Giai đoạn 0 — Scaffold & Toolchain

**Status:** ✅ Hoàn thành

### Checklist

- [x] Init Next.js 16 App Router + TypeScript strict
- [x] Cập nhật `layout.tsx` — title "StudyFlow — Quản lý Ghi chú & Học tập"
- [x] Fix breaking change Next.js 16: `themeColor` chuyển sang `export const viewport: Viewport`
- [x] Cập nhật `page.tsx` — homepage tối giản với `<h1>StudyFlow</h1>`
- [x] Cấu hình Prettier (`.prettierrc`, `.prettierignore`)
- [x] Cập nhật ESLint config (`eslint.config.mjs`)
- [x] Cấu hình Vitest (`vitest.config.ts`)
- [x] Tạo test setup (`src/tests/setup.ts`)
- [x] Viết smoke unit test (`src/tests/smoke.test.ts`)
- [x] Viết E2E smoke test (`src/tests/e2e/smoke.spec.ts`)
- [x] Cấu hình Playwright (`playwright.config.ts`) — 4 projects: Chromium, WebKit, Pixel 7, iPhone 14
- [x] Tạo cấu trúc thư mục: `src/lib`, `src/features`, `src/components`, `src/types`, `src/tests`
- [x] Cập nhật `package.json` — scripts: `typecheck`, `lint`, `test`, `test:e2e`
- [x] Cài Playwright browsers (Chromium Headless Shell v1243, WebKit v2359, Winldd v1007)
- [x] Cài Husky + lint-staged
- [x] Cấu hình Husky pre-commit hook (`npx lint-staged` + `typecheck` + `test`)
- [x] Git commit `feat(scaffold): khởi tạo dự án Phase 0`

### Test Gate

| Lệnh                | Kết quả                                                    |
| ------------------- | ---------------------------------------------------------- |
| `npm run typecheck` | ✅ Pass (0 lỗi)                                            |
| `npm run lint`      | ✅ Pass (0 warnings)                                       |
| `npm run test`      | ✅ Pass (2/2 tests — smoke.test.ts)                        |
| `npm run test:e2e`  | ✅ Pass (8/8 tests — Chromium, WebKit, Pixel 7, iPhone 14) |

---

## Giai đoạn 1 — Database Layer (Dexie.js)

**Status:** ⏸️ Chờ Giai đoạn 0 pass

---

## Giai đoạn 2 — Google Auth & Drive Service

**Status:** ⏸️ Chờ Giai đoạn 1 pass

---

## Giai đoạn 3 — Note Management

**Status:** ⏸️ Chờ Giai đoạn 2 pass

---

## Giai đoạn 4 — Learning Progress Tracking

**Status:** ⏸️ Chờ Giai đoạn 3 pass

---

## Giai đoạn 5 — Sync Engine (Google Drive)

**Status:** ⏸️ Chờ Giai đoạn 4 pass

---

## Giai đoạn 6 — PWA & Offline Polish

**Status:** ⏸️ Chờ Giai đoạn 5 pass

---

## Giai đoạn 7 — UI/UX Polish & Accessibility

**Status:** ⏸️ Chờ Giai đoạn 6 pass
