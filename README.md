# StudyFlow — PWA Quản lý Ghi chú & Học tập (Local-First Architecture)

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.5-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.8-blue?logo=react)](https://react.dev/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-5.x_Strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Dexie.js](https://img.shields.io/badge/IndexedDB-Dexie.js_v4-orange)](https://dexie.org/)
[![PWA Ready](https://img.shields.io/badge/PWA-Serwist-green?logo=pwa)](https://serwist.pages.dev/)
[![Vitest](https://img.shields.io/badge/Unit_Tests-347%2F347_Pass-brightgreen?logo=vitest)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/E2E_Tests-74%2F74_Pass-success?logo=playwright)](https://playwright.dev/)
[![Accessibility](https://img.shields.io/badge/a11y-WCAG_2.1_AA-blue)](https://www.w3.org/WAI/WCAG21/quickref/)

> **StudyFlow** là ứng dụng Progressive Web App (PWA) hỗ trợ sinh viên quản lý tiến độ học tập, thời khóa biểu, tính toán GPA và ghi chép học tập cá nhân theo triết lý **Local-First Software**. Ứng dụng hoạt động 100% khi mất mạng hoàn toàn và tự động đồng bộ hóa đám mây cá nhân qua **Google Drive Application Data Folder**.

---

## 🌟 Tính Năng Nổi Bật

- **🚀 Phản hồi tức thì (Zero-Latency)**: Đọc/ghi 100% vào IndexedDB cục bộ trên thiết bị, UI phản hồi tức thì dưới 16ms mà không cần chờ mạng.
- **📴 Ngoại tuyến hoàn toàn (Offline-First)**: Mất mạng vẫn ghi chú, tính điểm, tạo thời khóa biểu và tìm kiếm bình thường.
- **🔄 Đồng bộ Đám mây Cá nhân (Personal Cloud Sync)**: Lưu trữ snapshot an toàn trên Google Drive (`appDataFolder`) của chính sinh viên; tự động đồng bộ nền khi có mạng với thuật toán giải quyết xung đột Last-Write-Wins (LWW).
- **💾 Sao lưu & Khôi phục Cục bộ (Offline Backup / Restore)**: Xuất và nhập toàn bộ 7 bảng dữ liệu thành một tệp JSON di động, khôi phục nguyên vẹn 100% qua IndexedDB Transaction.
- **🔒 Bảo mật & Quyền riêng tư (Zero-Backend)**: Không sử dụng máy chủ trung gian của bên thứ ba. Dữ liệu chỉ nằm trên máy sinh viên và Google Drive của sinh viên. Scope Google Drive tối thiểu quyền hạn (`drive.appdata`), token lưu an toàn trong `sessionStorage`.
- **♿ Khả năng Tiếp cận Toàn diện (WCAG 2.1 AA)**: Độ tương phản cao, chuỗi tab order chuẩn hóa bằng bàn phím, kiểm định tự động bằng `@axe-core/playwright`.
- **📝 Trình soạn thảo Ghi chú TipTap Rich-Text**: Hỗ trợ định dạng đầy đủ, tiêu đề, checklist việc cần làm, khối mã nguồn và tự động serialize hai chiều với chuẩn Markdown.
- **🔍 Tìm kiếm Ngoại tuyến Fuse.js**: Tìm kiếm mờ (fuzzy search) toàn văn trên toàn bộ ghi chú và thẻ nhãn ngay trong bộ nhớ client (< 15ms cho 500 ghi chú).
- **📊 Quản lý Tiến độ Học tập & GPA**: Tính toán tự động điểm hệ 10, quy đổi hệ 4 và điểm chữ; cảnh báo trọng số điểm; vẽ biểu đồ tín chỉ tích lũy trực quan bằng Chart.js.
- **📅 Quản lý Thời khóa biểu & Cảnh báo Trùng lịch**: Lên lịch học trong tuần kèm thuật toán tự động phát hiện và cảnh báo xung đột tiết học.
- **📱 Hỗ trợ Đa nền tảng (PWA)**: Có thể cài đặt trực tiếp lên màn hình chính (A2HS) của Windows, macOS, Android và iOS với trải nghiệm như Native App.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Tầng công nghệ           | Công nghệ / Thư viện chính                                                                |
| :----------------------- | :---------------------------------------------------------------------------------------- |
| **Framework & Core**     | Next.js 16.3.5 (App Router), React 19.2.8, TypeScript 5 (Strict Mode)                     |
| **Cơ sở dữ liệu Cục bộ** | Dexie.js v4 (IndexedDB ORM), Zod v4 (Runtime Schema Validation)                           |
| **PWA & Caching**        | Serwist v9 (`@serwist/next`), Service Worker Precache, Web App Manifest                   |
| **Đồng bộ Đám mây**      | Google Identity Services (OAuth 2.0), Google Drive REST API v3 (`appDataFolder`)          |
| **Ghi chú & Tìm kiếm**   | TipTap v3 (StarterKit, TaskList, TaskItem), Fuse.js v7 (Offline Fuzzy Search)             |
| **Biểu đồ & Trực quan**  | Chart.js v4                                                                               |
| **Kiểm thử (Testing)**   | Vitest v3, Playwright v1.63, Testing Library, MSW v2 (Mock Service Worker), Lighthouse CI |
| **Code Quality & CI**    | ESLint v9, Prettier v3, Husky v9, lint-staged                                             |

---

## 📋 Yêu Cầu Môi Trường (Prerequisites)

- **Node.js**: Phiên bản `v20.x` hoặc `v22.x` trở lên (Khuyến nghị dùng LTS)
- **npm**: Phiên bản `10.x` trở lên (đi kèm Node.js)
- **Trình duyệt**: Google Chrome, Microsoft Edge, Mozilla Firefox hoặc Apple Safari hỗ trợ IndexedDB & Service Worker.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Getting Started)

### 1. Clone mã nguồn

```bash
git clone https://github.com/your-username/local_first.git
cd local_first
```

### 2. Cài đặt các gói phụ thuộc

```bash
npm install
```

### 3. Cấu hình Biến môi trường & Google OAuth 2.0

Tạo file `.env.local` ở thư mục gốc dự án (tham khảo `.env.example`):

```env
# Google OAuth 2.0 Client ID (tạo từ Google Cloud Console)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

#### Các bước tạo Google OAuth 2.0 Client ID:

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/) và tạo một Project mới (ví dụ: `studyflow-pwa`).
2. Vào **APIs & Services** > **OAuth consent screen**:
   - Chọn User Type: **External** (cho phép bất kỳ tài khoản Google nào đăng nhập).
   - Điền App Name (`StudyFlow`), User support email, Developer contact email.
   - Thêm Scopes: `.../auth/drive.appdata` (chỉ đọc/ghi tệp do chính ứng dụng tạo ra trong Google Drive).
3. Vào **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**:
   - Application type: **Web application**.
   - Name: `StudyFlow Client`.
   - **Authorized JavaScript origins**:
     - Phát triển local: `http://localhost:3000`
     - Production: `https://your-app.vercel.app` (domain Vercel hoặc Netlify thực tế).
4. Sao chép Client ID và dán vào biến `NEXT_PUBLIC_GOOGLE_CLIENT_ID` trong `.env.local`.

> **Ghi chú khi thử nghiệm**: Trong chế độ kiểm thử tự động, hệ thống sử dụng MSW (Mock Service Worker) và Mock Auth Token nên toàn bộ test suite chạy offline 100% độc lập, không bắt buộc phải có Google Client ID thực.

### 4. Chạy môi trường phát triển (Development Mode)

```bash
npm run dev
```

Mở trình duyệt truy cập: [http://localhost:3000](http://localhost:3000)

### 5. Đóng gói & Chạy môi trường Production (Production Mode)

> **Lưu ý quan trọng**: Để kích hoạt và trải nghiệm đầy đủ Service Worker PWA (offline caching), ứng dụng cần được build ở chế độ production:

```bash
npm run build
npm run start
```

### 6. Tính năng Sao lưu & Khôi phục Cục bộ (Local Backup & Restore)

- Tại màn hình chính, khối **"💾 Sao lưu & Khôi phục Dữ liệu Cục bộ"** cho phép:
  - **📥 Xuất sao lưu (JSON)**: Tải tệp `.json` chứa toàn bộ 7 bảng dữ liệu (`users`, `semesters`, `courses`, `gradeComponents`, `scheduleSlots`, `notes`, `tags`).
  - **📤 Khôi phục sao lưu (JSON)**: Chọn tệp sao lưu để khôi phục nguyên vẹn 100% dữ liệu vào IndexedDB của người dùng.

---

## 🧪 Hệ Thống Kiểm Thử (Testing & Quality Assurance)

Dự án áp dụng phương pháp phát triển hướng kiểm thử **Test-Driven Development (TDD)** với tỷ lệ bao phủ toàn diện.

### 1. Kiểm tra Kiểu dữ liệu & Linting

```bash
npm run typecheck       # Kiểm tra kiểu TypeScript strict (0 lỗi)
npm run lint            # Kiểm tra quy chuẩn mã nguồn ESLint (0 cảnh báo)
```

### 2. Chạy Kiểm thử Cấp độ Unit & Integration (Vitest)

Bao gồm **347 tests** trên **28 test files** (schemas, repositories, auth namespace, sync engine, soak tests, gpa, notes, schedule, backup roundtrip, security audit):

```bash
npm run test            # Chạy toàn bộ 347 tests
npm run test:watch      # Chạy chế độ watch tự động khi sửa code
npm run test:coverage   # Báo cáo độ bao phủ mã nguồn (coverage)
```

### 3. Chạy Kiểm thử Đầu cuối E2E (Playwright)

Bao gồm **74 tests** trên **10 spec files** (Chromium desktop, Mobile Chrome Android, kiểm thử ngoại tuyến SW, đo độ trễ đồng bộ < 3s, kiểm thử tải ngâm soak tests, kiểm toán accessibility axe-core WCAG AA, UX states):

```bash
npm run test:e2e        # Chạy kiểm thử E2E không đầu (headless)
npm run test:e2e:ui     # Mở giao diện trực quan Playwright UI Runner
```

### 4. Kiểm định Tiêu chuẩn PWA với Lighthouse CI

```bash
npm run test:lighthouse # Kiểm định chuẩn PWA, Service Worker, Manifest, Điểm số PWA ≥ 95%
```

---

## 🌐 Hướng Dẫn Triển Khai Hosting Tĩnh (Deployment)

Vì hệ thống tuân thủ kiến trúc **Zero-Backend (Client-Only)**, ứng dụng có thể deploy dễ dàng lên mọi nền tảng hosting tĩnh hiện đại mà không tốn chi phí vận hành máy chủ:

### Cách 1: Triển khai lên Vercel (Khuyến nghị)

1. Cài đặt Vercel CLI: `npm install -g vercel`
2. Đăng nhập và triển khai:
   ```bash
   vercel
   ```
3. Trong bảng điều khiển Vercel Project Settings:
   - Thêm biến môi trường: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - Framework Preset: `Next.js`
   - Build Command: `next build --webpack`

### Cách 2: Triển khai lên Netlify

1. Tạo file cấu hình `netlify.toml` ở thư mục gốc:
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```
2. Kết nối kho mã nguồn Git với Netlify Dashboard và cấu hình biến môi trường `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

---

## 📁 Cấu Trúc Thư Mục Dự Án (Project Structure)

```
local_first/
├── .husky/                   # Git pre-commit hooks (lint + typecheck + test)
├── public/                   # Tài nguyên tĩnh, icons PWA (192, 512, maskable)
│   ├── icons/
│   └── manifest.webmanifest  # Web App Manifest
├── src/
│   ├── app/                  # Next.js 16 App Router pages
│   │   ├── gpa/              # Trang Quản lý GPA & Tiến độ học tập
│   │   ├── notes/            # Trang Quản lý Ghi chú & Tìm kiếm
│   │   ├── offline/          # Trang dự phòng Offline Fallback
│   │   ├── layout.tsx        # Root layout, PWA meta, ServiceWorkerRegistrar
│   │   └── page.tsx          # Dashboard trang chủ & widget tổng hợp
│   ├── components/           # UI Components (GPAPage, NotesPage, TipTapEditor, ...)
│   ├── features/             # Feature logic & custom hooks (gpa, notes, sync)
│   ├── lib/                  # Thư viện lõi & dịch vụ nghiệp vụ
│   │   ├── auth/             # Quản lý token, userKey derivation, store
│   │   ├── db/               # Dexie schema, repositories, Zod validation
│   │   ├── gpa/              # Thuật toán tính GPA, quy đổi thang điểm
│   │   ├── notes/            # TipTap serializer, Fuse.js search engine
│   │   ├── schedule/         # Thuật toán phát hiện trùng lịch học
│   │   └── sync/             # SyncEngine, DriveClient, LWW ConflictResolver
│   ├── tests/                # Bộ kiểm thử toàn diện (Unit, Integration, E2E)
│   │   ├── auth/             # Test cô lập namespace, auth state
│   │   ├── db/               # Test CRUD 7 repositories
│   │   ├── e2e/              # Playwright E2E specs (offline, gpa, notes, sync, stability)
│   │   ├── gpa/              # Test tính điểm & quy đổi
│   │   ├── mocks/            # MSW handlers mô phỏng Google Drive API
│   │   ├── notes/            # Test serializer markdown & tìm kiếm Fuse.js
│   │   └── sync/             # Test sync engine, soak tests 10 vòng
│   └── sw.ts                 # Serwist Service Worker định nghĩa bộ nhớ đệm
├── ARCHITECTURE.md           # Tài liệu kiến trúc hệ thống chi tiết
├── PROGRESS.md               # Nhật ký tiến độ và biên bản nghiệm thu Test Gate
├── README.md                 # Hướng dẫn dự án
└── tsconfig.json             # Cấu hình TypeScript Strict
```

---

## 📜 Tài Liệu Liên Quan

- 🏛️ [Tài liệu Kiến trúc Kỹ thuật Chi tiết](file:///d:/do_an_lien_nganh/local_first/ARCHITECTURE.md)
- 📈 [Nhật ký Tiến độ Thực hiện các Giai đoạn (PROGRESS.md)](file:///d:/do_an_lien_nganh/local_first/PROGRESS.md)
- 📝 [Báo cáo Tổng kết Đề tài & Khung Bài báo Khoa học](file:///d:/do_an_lien_nganh/local_first/RESEARCH_REPORT.md)

---

## 📄 Bản Quyền & Giấy Phép (License)

Dự án được phát triển phục vụ mục đích học tập và nghiên cứu trong khuôn khổ **Đồ án Liên ngành**.
Mã nguồn mở phát hành theo giấy phép [MIT License](LICENSE).
