# Khung Báo Cáo Tổng Kết Đề Tài Đồ Án Liên Ngành

## Đề tài: Nghiên cứu và Phát triển Ứng dụng Quản lý Học tập Đa nền tảng dựa trên Kiến trúc Local-First và Progressive Web App (PWA)

---

### MỤC LỤC TỔNG QUAN BÁO CÁO

#### LỜI MỞ ĐẦU & DANH MỤC TỪ VIẾT TẮT

- PWA: Progressive Web App
- LWW: Last-Write-Wins
- CRDT: Conflict-free Replicated Data Type
- AST: Abstract Syntax Tree
- TDD: Test-Driven Development

---

### CHƯƠNG 1: TỔNG QUAN VỀ ĐỀ TÀI & CƠ SỞ LÝ THUYẾT

1.1. Tính cấp thiết của đề tài và nhu cầu số hóa quản lý học tập cá nhân.  
1.2. Hạn chế của các giải pháp Cloud-First hiện nay đối với sinh viên.  
1.3. Tổng quan về kiến trúc phần mềm Local-First (7 nguyên tắc cốt lõi).  
1.4. Công nghệ Progressive Web App (PWA) và tiêu chuẩn Service Worker W3C.  
1.5. Giới thiệu các công nghệ nền tảng: Next.js 16, React 19, TypeScript, Dexie.js (IndexedDB).

---

### CHƯƠNG 2: PHÂN TÍCH YÊU CẦU & THIẾT KẾ KIẾN TRÚC HỆ THỐNG

_(Bám theo 6 nội dung nghiên cứu chính trong Thuyết minh đề tài)_

2.1. **Nội dung 1: Nền tảng PWA & Khả năng vận hành ngoại tuyến**

- Cấu hình Web App Manifest, App Shell, Icon đa kích thước.
- Thiết kế Service Worker caching (Serwist): Precache, NetworkFirst, Navigation fallback `/offline`.

2.2. **Nội dung 2: Lớp cơ sở dữ liệu cục bộ trên trình duyệt**

- Thiết kế mô hình dữ liệu quan hệ trên IndexedDB (7 bảng thực thể).
- Cơ chế kiểm định runtime an toàn kiểu dữ liệu với Zod.
- Đánh chỉ mục hiệu năng cao và xử lý multi-entry index cho thẻ ghi chú (`*tags`).

2.3. **Nội dung 3: Cơ chế đồng bộ đám mây cá nhân & Giải quyết xung đột**

- Tích hợp Google Identity Services (OAuth 2.0).
- Thiết kế Snapshot đơn file `studyflow-snapshot.json` trên Google Drive `appDataFolder`.
- Thuật toán giải quyết xung đột Last-Write-Wins (LWW) theo `modifiedTime`.
- Chiến lược thử lại Exponential Backoff kết hợp ngẫu nhiên hóa Jitter.
- Cơ chế sao lưu và khôi phục độc lập ngoại tuyến (Offline JSON Backup & Restore).

2.4. **Nội dung 4: Phân hệ quản lý tiến độ học tập & Dự báo GPA**

- Thuật toán tính điểm trung bình môn theo trọng số (100%).
- Bảng quy đổi điểm chuẩn Bộ GD&ĐT Việt Nam (Hệ 10 sang Hệ 4 và Điểm chữ).
- Tính GPA học kỳ, CPA tích lũy và trực quan hóa biểu đồ tiến độ tín chỉ.

2.5. **Nội dung 5: Phân hệ soạn thảo ghi chú & Tìm kiếm ngoại tuyến**

- Trình soạn thảo văn bản phong phú TipTap Rich-Text.
- Bộ chuyển đổi tuần tự hóa hai chiều TipTap AST ↔ Markdown text.
- Động cơ tìm kiếm mờ ngoại tuyến Fuse.js với phân bổ trọng số đa trường.

2.6. **Nội dung 6: Quản lý thời khóa biểu & Mô hình bảo mật không máy chủ**

- Quản lý tiết học trong tuần và thuật toán phát hiện xung đột lịch học tức thì.
- Cơ chế cô lập phân vùng dữ liệu người dùng (Namespace Isolation) theo email.
- Mô hình bảo mật Zero-Backend, tối thiểu hóa quyền hạn Google Drive (`drive.appdata`).
- Lưu trữ token trong `sessionStorage`, phòng chống XSS và Content-Security-Policy (CSP).

---

### CHƯƠNG 3: TRIỂN KHAI THỰC HIỆN & KẾT QUẢ ĐẠT ĐƯỢC

3.1. Quá trình phát triển theo phương pháp TDD qua 10 giai đoạn.  
3.2. Giao diện người dùng và trải nghiệm tương tác trên Desktop, Android, iOS.  
3.3. Thiết kế trạng thái giao diện toàn diện: Empty states, Loading skeletons, Error alerts.  
3.4. Đóng gói sản phẩm và quy trình triển khai lên hạ tầng tĩnh (Vercel / Netlify).

---

### CHƯƠNG 4: THỬ NGHIỆM, ĐÁNH GIÁ CHẤT LƯỢNG & ĐỘ ỔN ĐỊNH

4.1. Kết quả kiểm thử tự động toàn diện:

- **347** Unit & Integration tests (Vitest) pass 100% trên 28 test suites.
- **74** End-to-End tests (Playwright đa động cơ trình duyệt & viewport di động) pass 100%.
  4.2. Kết quả kiểm thử tải ngâm (Soak Testing) 10 chu kỳ bật/tắt mạng: Xác nhận 100% toàn vẹn dữ liệu.
  4.3. Kiểm thử hiệu năng với tập dữ liệu lớn:
- Tìm kiếm Fuse.js trên 500 ghi chú: 14ms (ngưỡng DoD < 1000ms).
- Tính toán GPA trên 200 môn học: < 5ms (ngưỡng DoD < 500ms).
  4.4. Đo lường độ trễ đồng bộ thực tế: ~1.2s - 1.8s (ngưỡng DoD < 3000ms).
  4.5. Kiểm thử khả năng chịu lỗi mạng (503 Service Unavailable) và round-trip sao lưu 7 bảng thực thể.
  4.6. Kiểm toán Khả năng Tiếp cận (WCAG 2.1 AA) với `@axe-core/playwright` (0 vi phạm).
  4.7. Kiểm định tiêu chuẩn chất lượng Google Lighthouse CI (PWA 100, Best Practices 100).

---

### CHƯƠNG 5: KẾT LUẬN & HƯỚNG PHÁT TRIỂN

5.1. Tổng kết các sản phẩm đạt được theo hợp đồng thuyết minh đề tài (Mục 5).  
5.2. Đánh giá tính ứng dụng thực tiễn của sản phẩm trong giáo dục đại học.  
5.3. Các hạn chế còn tồn tại và hướng nghiên cứu mở rộng trong tương lai.

---

### TÀI LIỆU THAM KHẢO & PHỤ LỤC

- Phụ lục A: Hướng dẫn cài đặt và cấu hình mã nguồn.
- Phụ lục B: Kịch bản kiểm thử mẫu (Test Cases & Demo Script).
- Phụ lục C: Biên bản nghiệm thu Test Gate 10 giai đoạn.
