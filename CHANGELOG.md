# Changelog — StudyFlow PWA

Tất cả các thay đổi quan trọng và cột mốc hoàn thành qua 10 giai đoạn phát triển của dự án StudyFlow.

Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/), và tuân thủ [Semantic Versioning](https://semver.org/).

---

## [1.0.0] - 2026-10-02 (Nghiệm thu hoàn tất toàn diện)

### Giai đoạn 10: Nghiệm thu cuối cùng & Đóng gói hoàn thiện (Final Acceptance & Hardening)

- **Kiểm toán Bảo mật (Security Audit)**:
  - Hỗ trợ lưu trữ token linh hoạt trong `sessionStorage` (ưu tiên in-memory session an toàn) kết hợp `localStorage` offline persistence.
  - Hàm `signOut()` xóa sạch toàn bộ credentials trong cả hai bộ nhớ.
  - Bổ sung Content-Security-Policy (CSP) headers trong `next.config.ts`.
  - Kiểm tra sanitization đầu vào TipTap & Markdown chống tấn công XSS.
  - Xác nhận scope Google Drive tuân thủ nguyên tắc tối thiểu quyền hạn (Least Privilege): chỉ xin `https://www.googleapis.com/auth/drive.appdata`.
- **Kiểm toán Hiệu năng (Performance Audit)**:
  - Viết bộ kiểm thử hiệu năng dữ liệu lớn (`performance.test.ts`): tìm kiếm toàn văn Fuse.js trên 500 ghi chú hoàn thành trong **14ms** (ngưỡng DoD: < 1000ms), tính toán điểm GPA trên 200 môn học hoàn tất trong **< 5ms** (ngưỡng DoD: < 500ms).
- **Kiểm toán Khả năng Tiếp cận (Accessibility Audit — WCAG 2.1 AA)**:
  - Tối ưu màu sắc nút bấm `#1d4ed8` (xanh đậm) và `#b91c1c` (đỏ đậm) đạt tỷ lệ tương phản $\ge 4.5:1$ chuẩn WCAG AA.
  - Bổ sung đầy đủ thuộc tính `aria-label` cho các action buttons.
  - Đảm bảo điều hướng hoàn toàn bằng bàn phím (tab order hợp lý, kích hoạt bằng Enter/Space).
  - Tích hợp `@axe-core/playwright` và viết bộ E2E `a11y.spec.ts` (8/8 tests pass) xác nhận 0 vi phạm nghiêm trọng (critical/serious) trên HomePage, /offline, /notes, /gpa.
- **Hoàn thiện Trạng thái Giao diện (UX States & Polish)**:
  - Trạng thái rỗng (Empty state): `data-testid="notes-empty-state"` (khi chưa có ghi chú hoặc tìm kiếm không khớp), `data-testid="gpa-empty-state"` (khi chưa có học kỳ), `data-testid="courses-empty-state"` (khi học kỳ chưa có hoặc bị xóa hết môn học).
  - Trạng thái đang tải (Loading / Skeleton): `data-testid="notes-loading-skeleton"`, `data-testid="gpa-loading-skeleton"`.
  - Trạng thái lỗi (Error state): `data-testid="sync-badge"` hiển thị "Lỗi sync" và `data-testid="sync-error"` hiển thị chi tiết khi sync thất bại, `notes-error-state` khi nạp DB thất bại.
  - Viết bộ test E2E `ux.spec.ts` (10/10 tests pass trên Chromium và Mobile Chrome) xác nhận đúng mọi trạng thái giao diện.
- **Sao lưu & Khôi phục (Backup & Restore)**:
  - Xây dựng module `src/lib/sync/backup.ts` (`exportBackup`, `importBackup`) hỗ trợ xuất/nhập toàn bộ 7 bảng dữ liệu ra file JSON.
  - UI Component `BackupControls.tsx` trên trang chủ cho phép người dùng trực tiếp tải về file sao lưu và khôi phục từ tệp có sẵn.
  - Kiểm thử round-trip bảo toàn 100% dữ liệu cả 7 bảng và kiểm thử khả năng chịu lỗi khi Google Drive 503 Service Unavailable trong `backup.test.ts` và `backup.spec.ts`.
- **Tổng kết Test Gate Toàn dự án**:
  - **347 / 347** Unit & Integration tests (Vitest) pass 100% (28 test suites, 0 flaky qua 3 lần chạy liên tiếp).
  - **74 / 74** E2E tests (Playwright) pass 100% (10 spec files trên Chromium Desktop và Mobile Chrome Android).
- **Bộ Sản phẩm & Tài liệu Bàn giao**:
  - `ARCHITECTURE.md`: Kiến trúc 4 tầng, 7 nguyên tắc Local-First, sơ đồ Mermaid, luồng dữ liệu cục bộ, luồng đồng bộ LWW, mô hình bảo mật.
  - `README.md`: Hướng dẫn cài đặt, cấu hình Google OAuth Client ID, tính năng sao lưu, hệ thống kiểm thử, hướng dẫn deploy tĩnh (Vercel / Netlify).
  - `docs/research-paper-outline.md`: Khung bài báo khoa học chuẩn IEEE/ACM với đầy đủ kết quả thực nghiệm.
  - `docs/final-report-outline.md`: Khung báo cáo tổng kết đề tài bám sát 6 nội dung thuyết minh.
  - `docs/demo-script.md`: Kịch bản trình diễn bảo vệ đề tài 5 phân cảnh (5-7 phút).

### Giai đoạn 9: Tài liệu hóa & Đóng gói

- Hoàn thiện `ARCHITECTURE.md` với đầy đủ 7 nguyên tắc Local-First, sơ đồ 4 tầng kiến trúc, sơ đồ tuần tự Mermaid, ma trận giải quyết xung đột LWW.
- Cập nhật `README.md` với hướng dẫn cài đặt, cấu hình biến môi trường, tài liệu kiểm thử và hướng dẫn deploy hosting tĩnh.
- Soạn thảo `RESEARCH_REPORT.md` bao gồm Khung bài báo khoa học chuẩn IEEE/ACM và Báo cáo tổng kết đồ án liên ngành theo mục 5 thuyết minh.

### Giai đoạn 8: Kiểm thử Đa nền tảng & Độ ổn định

- Viết bộ soak tests cấp unit/integration (`syncEngine.soak.test.ts`): 10 vòng sync liên tiếp, 5 vòng xen kẽ ghi chú + sync, giải quyết xung đột LWW.
- Viết bộ E2E đa nền tảng (`stability.spec.ts`): 5 vòng bật/tắt mạng trực tiếp, cô lập dữ liệu theo email người dùng (ISO-1, ISO-2), kiểm tra viewport iPhone SE và iPad.
- Cải thiện timeout handling cho Service Worker trong E2E tests.

### Giai đoạn 7: Mô-đun Ghi chú Cá nhân

- Tích hợp trình soạn thảo TipTap rich-text editor (StarterKit, TaskList, TaskItem, Placeholder, toolbar).
- Bộ tuần tự hóa hai chiều `noteSerializer.ts` giữa TipTap JSON và Markdown chuẩn.
- Động cơ tìm kiếm mờ ngoại tuyến Fuse.js (`noteSearch.ts`) với trọng số đa trường (tiêu đề, thẻ nhãn, nội dung).
- Giao diện `NotesPage.tsx` đầy đủ tính năng CRUD, ghim (pin), lưu trữ (archive), quản lý thẻ nhãn (TagManager).

### Giai đoạn 6: Theo dõi Tiến độ Học tập & Dự báo GPA

- Động cơ tính GPA `gpaCalculator.ts` quy đổi chuẩn Bộ GD&ĐT Việt Nam (Thang 10 sang Thang 4 và Điểm chữ A+, A, B+, B, C+, C, D+, D, F).
- Trực quan hóa tiến độ tín chỉ tích lũy theo từng học kỳ qua Chart.js (`CreditChart.tsx`).
- Giao diện `GPAPage.tsx` quản lý học kỳ, môn học, đầu điểm thành phần và cảnh báo tổng trọng số 100%.

### Giai đoạn 5: Quản lý Thời khóa biểu & Xung đột Lịch học

- Triển khai `ScheduleSlotRepository` và schema lịch học tuần (Thứ 2 đến Chủ nhật).
- Thuật toán `hasScheduleOverlap` phát hiện tức thì trùng lặp lịch học.

### Giai đoạn 4: Quản lý Phiên & Cô lập Dữ liệu (Multi-tenancy)

- Hàm `deriveUserKey` chuẩn hóa email người dùng.
- Cơ chế namespace hóa cơ sở dữ liệu IndexedDB `getNamespacedDB` cô lập vật lý dữ liệu giữa các tài khoản khác nhau trên cùng thiết bị.

### Giai đoạn 3: Xác thực & Đồng bộ Đám mây Cá nhân

- Tích hợp Google Identity Services (OAuth 2.0).
- Xây dựng `driveClient.ts` đọc/ghi file `studyflow-snapshot.json` trong `appDataFolder`.
- Thuật toán giải quyết xung đột Last-Write-Wins (LWW) trong `conflictResolver.ts`.
- Bộ điều phối `SyncEngine` hỗ trợ retry với Exponential Backoff và Jitter ngẫu nhiên.

### Giai đoạn 2: Lớp Dữ liệu Cục bộ (IndexedDB/Dexie)

- Xây dựng `StudyFlowDB` extends `Dexie` với 7 bảng thực thể.
- Đầy đủ Zod runtime validation schemas cho toàn bộ entities.
- Xây dựng abstract `BaseRepository` và các repositories nghiệp vụ.

### Giai đoạn 1: PWA Nền tảng

- Cấu hình Web App Manifest (`manifest.webmanifest`) chuẩn W3C: standalone display, maskable icons.
- Triển khai Service Worker với `Serwist`: precache app shell, chiến lược NetworkFirst, trang dự phòng ngoại tuyến `/offline`.
- Kiểm định Lighthouse CI PWA score ≥ 95%.

### Giai đoạn 0: Khởi tạo Dự án & Toolchain

- Khởi tạo Next.js 16 App Router, React 19, TypeScript strict mode.
- Cấu hình ESLint, Prettier, Vitest, Playwright, Husky pre-commit hooks.
