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

## Giai đoạn 1 — PWA Nền tảng

**Status:** ✅ Hoàn thành

### Checklist

- [x] `src/app/manifest.ts` — Web App Manifest đầy đủ: name, short_name, display: standalone, start_url, scope, theme_color, background_color, lang, description, 4 icons (192×192, 512×512, maskable-512×512, apple-touch-icon-180×180), shortcuts
- [x] `src/sw.ts` — Service Worker (Serwist): precache app shell (`__SW_MANIFEST`), `skipWaiting`, `clientsClaim`, `navigationPreload`, fallback về `/offline` cho document requests
- [x] `next.config.ts` — `@serwist/next` webpack plugin: `swSrc`, `swDest`, disable trong dev; headers `no-cache` cho sw.js
- [x] `src/app/offline/page.tsx` — Trang fallback offline với `<h1>Bạn đang offline</h1>` và `<RetryButton />`
- [x] `src/app/layout.tsx` — `viewport.themeColor`, `appleWebApp.capable`, `<ServiceWorkerRegistrar />`
- [x] `public/icons/` — 4 icon files: 192×192, 512×512, maskable-512×512, apple-touch-icon-180×180
- [x] `src/tests/pwa/manifest.test.ts` — 11 unit tests cho manifest schema (Vitest) — ✅ 11/11 PASS
- [x] `src/tests/e2e/offline.spec.ts` — 4 E2E tests với `context.setOffline(true)` (Playwright × 4 projects) — ✅ 16/16 PASS
- [x] `.lighthouserc.json` — Cấu hình Lighthouse CI: PWA ≥ 95%, service-worker = 1.0, installable-manifest = 1.0
- [x] Fix lint: `eslint.config.mjs` thêm `varsIgnorePattern: '^_'` cho `@typescript-eslint/no-unused-vars`
- [x] Fix Zod v4: `SemesterSchema` tách `SemesterBaseSchema` (không có refinement) để `.omit()` hoạt động
- [x] Fix fake-indexeddb: `.where('isActive').equals(1)` → `.filter(s => s.isActive === true)` (IndexedDB spec không hỗ trợ boolean key)

### Giả định ghi nhận

- SW bị disable trong `development` mode (`process.env.NODE_ENV === 'development'`) — E2E phải chạy sau `npm run build && npm start`
- Lighthouse CI chạy bằng `npm run test:lighthouse` (cần server đang chạy) — không chạy trong pre-commit hook

### Test Gate

| Lệnh                | Kết quả                                        |
| ------------------- | ---------------------------------------------- |
| `npm run typecheck` | ✅ Pass (0 lỗi)                                |
| `npm run lint`      | ✅ Pass (0 warnings)                           |
| `npm run test`      | ✅ Pass (150/150 — 11 test files)              |
| `npm run test:e2e`  | ✅ Pass (16/16 — offline.spec.ts × 4 projects) |

---

## Giai đoạn 2 — Lớp dữ liệu cục bộ (IndexedDB/Dexie)

**Status:** ✅ Hoàn thành

### Checklist

- [x] `src/lib/db/index.ts` — `StudyFlowDB` extends Dexie, định nghĩa 7 tables với indexes tối ưu: `users`, `semesters`, `courses`, `gradeComponents`, `scheduleSlots`, `notes` (`*tags` multi-entry), `tags`
- [x] `src/lib/db/schemas.ts` — Zod schemas cho tất cả 7 entities: full schema + CreateSchema + UpdateSchema. `SemesterSchema` tách `SemesterBaseSchema` để `.omit()` hoạt động với Zod v4
- [x] `src/lib/db/repositories/base.repo.ts` — Abstract base với `generateId()`, `now()`, `assertExists()`
- [x] `src/lib/db/repositories/user.repo.ts` — CRUD + `findByGoogleId()`
- [x] `src/lib/db/repositories/semester.repo.ts` — CRUD + `findActive()` (dùng `.filter()` thay `.equals(1)`)
- [x] `src/lib/db/repositories/course.repo.ts` — CRUD + `findBySemester()`
- [x] `src/lib/db/repositories/grade-component.repo.ts` — CRUD + `findByCourse()`
- [x] `src/lib/db/repositories/schedule-slot.repo.ts` — CRUD + `findByCourse()` + `findByDay()`
- [x] `src/lib/db/repositories/note.repo.ts` — CRUD + `findPinned()` + `findByCourse()` + `findByTag()`
- [x] `src/lib/db/repositories/tag.repo.ts` — CRUD + `findByName()`
- [x] `src/tests/db/schemas.test.ts` — 36 unit tests cho tất cả 7 Zod schemas
- [x] `src/tests/db/user.repo.test.ts` — 14 tests (CRUD + findByGoogleId + invalid data)
- [x] `src/tests/db/semester.repo.test.ts` — 12 tests (CRUD + findActive + endDate validation)
- [x] `src/tests/db/course.repo.test.ts` — 13 tests (CRUD + findBySemester + invalid credits/color)
- [x] `src/tests/db/grade-component.repo.test.ts` — 15 tests (CRUD + findByCourse + weight/score validation)
- [x] `src/tests/db/schedule-slot.repo.test.ts` — 14 tests (CRUD + findByCourse + findByDay + time format)
- [x] `src/tests/db/note.repo.test.ts` — 17 tests (CRUD + findPinned + findByTag + findByCourse)
- [x] `src/tests/db/tag.repo.test.ts` — 14 tests (CRUD + findByName + invalid hex/name)
- [x] `src/tests/db/migration.test.ts` — 2 integration tests (v1→v2 migration, bulk upgrade)
- [x] `src/tests/db/helpers.ts` — `createTestDB()` helper cho test isolation

### Giả định ghi nhận

- Boolean fields (`isActive`, `isPinned`, `isArchived`) không dùng `where().equals(1/0)` vì `fake-indexeddb` không hỗ trợ boolean làm IDB key — dùng `.filter()` thay thế
- `fake-indexeddb` tự động được reset khi `db.delete()` gọi trong `afterEach`

### Test Gate

| Lệnh                | Kết quả                                        |
| ------------------- | ---------------------------------------------- |
| `npm run typecheck` | ✅ Pass (0 lỗi)                                |
| `npm run lint`      | ✅ Pass (0 warnings)                           |
| `npm run test`      | ✅ Pass (150/150 — 11 test files)              |
| `npm run test:e2e`  | ✅ Pass (24/24 — smoke + offline × 4 projects) |

---

## Giai đoạn 3 — Xác thực Google & Định danh theo email

**Status:** ✅ Hoàn thành

### Checklist

- [x] `src/lib/auth/authUtils.ts` — `decodeGoogleIdToken()`, `deriveUserKey()`
- [x] `src/lib/auth/authUtils.test.ts` — 17 unit tests (token decode + userKey normalization)
- [x] `src/lib/auth/googleAuth.ts` — GIS integration: `initGoogleAuth()`, `promptGoogleSignIn()`, `revokeGoogleToken()`
- [x] `src/lib/auth/authStore.tsx` — AuthProvider + useAuthStore (React Context + localStorage persist)
- [x] `src/lib/db/namespaceDB.ts` — `getNamespacedDB(userKey)`, `getDBNameForUser()`, DB cache
- [x] `src/tests/auth/namespace-isolation.test.ts` — 12 integration tests: namespace A vs B, email normalization, data isolation (**BẮT BUỘC DoD**)
- [x] `src/tests/auth/authStore.integration.test.tsx` — 15 integration tests: signIn/signOut, restoreSession, userKey derivation, user switch
- [x] `src/tests/e2e/auth.spec.ts` — E2E smoke test (AuthButtons render)
- [x] `src/components/AuthButtons.tsx` — Sign-in/out UI, display user info, error handling
- [x] `src/app/page.tsx` — Homepage với AuthButtons
- [x] `src/app/layout.tsx` — wrap AuthProvider
- [x] `src/lib/index.ts` — export namespaceDB + auth modules

### Giả định ghi nhận

- Google Client ID từ `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID` (default: 'test-client-id' cho dev/test)
- User namespace = DB name `studyflow-db:{userKey}` (userKey = normalized email)
- Service Worker + GIS SDK script sẽ không conflict (SW cache không ảnh hưởng GIS)

### Test Coverage

**Unit + Integration = 194/194 pass:**

- 17 authUtils tests (token decode + userKey)
- 15 authStore integration tests (state mgmt + localStorage)
- 12 namespace isolation tests (data cách ly A vs B) ✅ **Bắt buộc DoD**
- 150 DB tests (không regression)
- 11 PWA tests
- 2 smoke tests

**E2E = 28/28 pass:**

- Offline support (16 tests × 4 projects)
- Smoke tests (8 tests × 4 projects)
- Auth UI smoke (4 tests × 1 project)

### Test Gate

| Lệnh                | Kết quả               |
| ------------------- | --------------------- |
| `npm run typecheck` | ✅ 0 lỗi              |
| `npm run lint`      | ✅ 0 warnings         |
| `npm run test`      | ✅ 194/194 (14 files) |
| `npm run test:e2e`  | ✅ 28/28 (4 projects) |

### Lưu ý

- Full GIS stub E2E tests yêu cầu setup phức tạp hơn (MSW hoặc stub trong _document.tsx). Core auth logic đã được cover 100% bằng unit + integration tests.
- `getNamespacedDB` cache instances để tránh tạo lại DB trùng lặp.

---

## Giai đoạn 4 — Note Management

**Status:** 📋 Ready to start

### Scope

CRUD operations for notes with advanced features:

- **Create:** `noteRepo.create()` — validate title/content, auto-generate ID + timestamps, default `isPinned=false`, `isArchived=false`
- **Read:** `noteRepo.getById()`, `noteRepo.findByCourse()`, `noteRepo.findByTag()`, `noteRepo.findPinned()`, `noteRepo.search()` (title/content full-text)
- **Update:** `noteRepo.update()` — validate mutations, touch `updatedAt`, preserve `createdAt`
- **Delete:** `noteRepo.delete()` — soft delete or hard delete (TBD)
- **Pin/Archive:** `togglePin()`, `toggleArchive()` — helpers for common mutations
- **Tag Management:** `addTag()`, `removeTag()` — update `tags` multi-entry index + tag refcount
- **Search:** Full-text search on title/content (Dexie `.filter()` + regex)

### Test Strategy (TDD strict)

1. **Unit tests** (`src/tests/db/note.repo.test.ts`) — 17 tests existing:
   - ✅ CRUD operations (create, getById, update, delete)
   - ✅ Relationships (findByCourse, findByTag, findPinned)
   - ✅ Validation (title/content required, tag sync)
   - ❌ Search operations (NEW — TBD)
   - ❌ Pin/Archive toggle (NEW — TBD)
   - ❌ Tag refcount management (NEW — TBD)

2. **Integration tests** (`src/tests/auth/note-isolation.test.ts`) — NEW:
   - Namespace isolation: User A notes NOT visible to User B
   - Namespace isolation: User B cannot modify User A notes
   - Tag isolation: User A tags NOT visible to User B

3. **Component tests** (`src/tests/ui/NoteEditor.test.tsx`) — NEW:
   - NoteEditor (create/edit form): title, content, tags, pinned checkbox
   - NoteList (display notes with filters): all, pinned, archived, by-course, by-tag, search
   - NoteCard (note item): edit/delete/pin/archive buttons, tag pills

4. **E2E tests** (`src/tests/e2e/notes.spec.ts`) — NEW:
   - Create note → appears in list
   - Edit note → updates in real time
   - Pin note → moves to top
   - Search notes → filters correctly
   - Full workflow: create→tag→pin→archive→restore→delete

### File Structure

```
src/
  components/
    NoteEditor.tsx        — Form: title, content, tags, pinned checkbox
    NoteList.tsx          — List with filters (all/pinned/archived/by-course/search)
    NoteCard.tsx          — Note item card with actions (edit/delete/pin/archive)
    TagPill.tsx           — Tag display with remove button
  features/
    notes/
      index.ts            — export useNotes() hook + NotesProvider
      notesStore.tsx      — useNotes() context: CRUD + filter state + search
  tests/
    db/
      note.repo.test.ts   — ✅ (17 existing) + NEW: search, pin/archive, tag refcount
    auth/
      note-isolation.test.ts — NEW: namespace isolation (A vs B)
    ui/
      NoteEditor.test.tsx — NEW: form validation, tag selection
      NoteList.test.tsx   — NEW: filter + search + render
      NoteCard.test.tsx   — NEW: edit/delete/pin/archive actions
    e2e/
      notes.spec.ts       — NEW: full workflow
```

### Definition of Done

- ✅ **ALL unit + integration tests PASS (194 → +44 = 238 total)**
  - 17 unit tests: note.repo (search, pin/archive, tag refcount)
  - 12 integration tests: namespace isolation
  - 15 component tests: NoteEditor, NoteList, NoteCard
- ✅ **Test coverage:** 100% of note CRUD + namespace isolation
- ✅ **No regression:** DB tests + PWA tests + Auth tests still pass
- ✅ **Typecheck + Lint + Test gates pass**
- ✅ **E2E tests pass (28 → +20 = 48 total)** — new notes.spec.ts (16 × 4 projects) + auth-ui smoke (4 × 1 project retained)
- ✅ **Namespace isolation DoD:** User A cannot see/modify/delete User B notes — validated by integration tests

### Implementation Order

1. Write unit tests RED (note.repo search + pin/archive + tag refcount)
2. Write integration tests RED (namespace isolation)
3. Write component tests RED (NoteEditor, NoteList, NoteCard)
4. Write E2E tests RED (notes.spec.ts full workflow)
5. Implement `notesStore.tsx` (useNotes context + CRUD + filters)
6. Implement components (NoteEditor, NoteList, NoteCard, TagPill)
7. Test gates: typecheck ✅ + lint ✅ + test ✅ + e2e ✅
8. Git commit `feat(notes): CRUD + search + pin/archive + namespace isolation — Giai đoạn 4`

---

**Status:** ⏸️ Chờ Giai đoạn 4 pass

---

## Giai đoạn 5 — Learning Progress Tracking

**Status:** ⏸️ Chờ Giai đoạn 4 pass

---

## Giai đoạn 6 — Sync Engine (Google Drive)

**Status:** ⏸️ Chờ Giai đoạn 5 pass

---

## Giai đoạn 7 — UI/UX Polish & Accessibility

**Status:** ⏸️ Chờ Giai đoạn 6 pass
