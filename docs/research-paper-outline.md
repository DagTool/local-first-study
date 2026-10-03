# Khung Bài Báo Khoa Học (Research Paper Outline)

## Tiêu đề bài báo

**A Local-First Progressive Web Application Architecture for Resilient, Zero-Backend Personal Learning Management**  
_(Kiến trúc Ứng dụng Web Cấp tiến hướng Cục bộ cho Hệ thống Quản lý Học tập Cá nhân Bền vững, Không Máy chủ Trung gian)_

---

### Tác giả & Đơn vị công tác

- **Tác giả chính**: Ryan Dang
- **Đơn vị**: Khoa Công nghệ Thông tin / Kỹ thuật Phần mềm
- **Email liên hệ**: student@university.edu

---

### Tóm tắt (Abstract)

- **Bối cảnh**: Ứng dụng EdTech Cloud-First thường xuyên gặp trục trặc khi mạng yếu, rủi ro bảo mật dữ liệu học tập cá nhân, chi phí hạ tầng máy chủ đắt đỏ.
- **Giải pháp đề xuất**: Kiến trúc PWA Local-First không máy chủ trung gian (Zero-Backend). Sử dụng IndexedDB làm single source of truth, đồng bộ snapshot tự động lên Google Drive `appDataFolder` qua thuật toán Last-Write-Wins (LWW).
- **Kết quả thực nghiệm**: 347 unit/integration tests (100% pass trên 28 test suites), 74 E2E tests qua nhiều nền tảng (Chromium & Mobile Chrome, 0 flaky), 10 vòng soak testing bật/tắt mạng không mất dữ liệu, độ trễ đồng bộ đo được < 3s, chuẩn tiếp cận WCAG 2.1 AA (0 lỗi axe-core), Lighthouse PWA đạt 100 điểm tuyệt đối.

---

### 1. Giới thiệu & Đặt vấn đề (Introduction)

- 1.1. Thực trạng ứng dụng quản lý học tập trong môi trường đại học.
- 1.2. Thách thức của kiến trúc Cloud-First: "Spinners of death", mất dữ liệu khi mất kết nối đột ngột, nguy cơ rò rỉ dữ liệu điểm số và ghi chú.
- 1.3. Mục tiêu và đóng góp chính của bài báo.

---

### 2. Cơ sở lý thuyết & Nghiên cứu liên quan (Related Work)

- 2.1. 7 nguyên tắc của Local-First Software (Kleppmann et al., Ink & Switch 2019).
- 2.2. So sánh các mô hình đồng bộ và giải quyết xung đột:
  - CRDTs (Yjs, Automerge) vs. Snapshot-based LWW.
  - Phân tích ưu nhược điểm đối với dữ liệu quan hệ có ràng buộc khóa ngoại (học kỳ, môn học, điểm thành phần).
- 2.3. Tiêu chuẩn PWA và Service Worker Caching Strategies trong bài toán ngoại tuyến.

---

### 3. Thiết kế Kiến trúc Hệ thống (System Architecture)

- 3.1. Mô hình 4 tầng không máy chủ (Zero-Backend 4-Tier Architecture):
  - Presentation (Next.js App Router, React 19)
  - Business Services (GPA Engine, Offline Search Engine, TipTap Serializer)
  - Local Storage & Namespace Isolation (Dexie.js, IndexedDB, Zod)
  - Personal Cloud Storage (Google Drive `appDataFolder`)
- 3.2. Quy trình đồng bộ Snapshot & Thuật toán Last-Write-Wins (LWW).
- 3.3. Thuật toán Exponential Backoff kết hợp Jitter ngẫu nhiên phục hồi sau sự cố mạng.
- 3.4. Mô hình bảo mật, CSP headers và cô lập phân vùng dữ liệu người dùng theo email.
- 3.5. Kiến trúc Sao lưu Ngoại tuyến Độc lập (Self-Sovereign JSON Backup/Restore).

---

### 4. Đánh giá Thực nghiệm (Experimental Evaluation)

- 4.1. Môi trường kiểm thử và phương pháp luận TDD:
  - Vitest + fake-indexeddb + MSW: 347 unit & integration tests.
  - Playwright E2E cross-browser & mobile viewport simulation: 74 tests (0 flaky).
- 4.2. Kết quả kiểm thử tải ngâm (Soak Testing 10 chu kỳ bật/tắt mạng):
  - Tỷ lệ toàn vẹn dữ liệu: 100% (Checksum & số lượng bản ghi so khớp).
  - Tỷ lệ xung đột sai lệch: 0%.
- 4.3. Đánh giá hiệu năng với tập dữ liệu lớn:
  - Tìm kiếm toàn văn Fuse.js trên 500 ghi chú: 14ms (DoD: < 1000ms).
  - Tính toán GPA trên 200 môn học: < 5ms (DoD: < 500ms).
- 4.4. Đo lường độ trễ đồng bộ (Sync Latency):
  - Thời gian đồng bộ trung bình đo được: ~1.2s - 1.8s (đạt yêu cầu DoD < 3000ms).
- 4.5. Khả năng chịu lỗi & Khôi phục (Resilience & Portability):
  - Chịu lỗi khi Google Drive 503 Unavailable: hoạt động cục bộ không gián đoạn, tự đồng bộ khi có mạng.
  - Round-trip sao lưu/khôi phục: khôi phục nguyên vẹn 100% dữ liệu cả 7 bảng thực thể.
- 4.6. Kiểm định Khả năng Tiếp cận (WCAG 2.1 AA) & Điểm số chuẩn hóa Google Lighthouse:
  - Quét tự động axe-core: 0 lỗi critical/serious.
  - Google Lighthouse CI: PWA 100/100, Best Practices 100/100, Accessibility 96/100.

---

### 5. Thảo luận & So sánh (Discussion)

- 5.1. Ưu điểm kinh tế: Chi phí hạ tầng server bằng 0$ (Zero-Backend).
- 5.2. Quyền riêng tư và tuân thủ GDPR/quyền sở hữu dữ liệu cá nhân.
- 5.3. Giới hạn của mô hình Snapshot LWW: Thích hợp cho người dùng cá nhân đa thiết bị; chưa hỗ trợ đồng chỉnh sửa thời gian thực đồng thời trên 2 máy trong cùng một giây.

---

### 6. Kết luận & Hướng phát triển (Conclusion & Future Work)

- 6.1. Tổng kết đóng góp của nghiên cứu.
- 6.2. Hướng phát triển:
  - Đồng bộ ngang hàng P2P qua WebRTC trong mạng LAN lớp học khi không có Internet.
  - Mã hóa đầu cuối phía client (E2EE với Web Crypto API) trước khi lưu trữ snapshot.

---

### Tài liệu tham khảo chính (Key References)

1. Kleppmann, M., Wiggins, A., van Hardenberg, P., & McGranaghan, M. (2019). _Local-first software: you own your data, in spite of the cloud_. Onward! 2019.
2. W3C. (2021). _Service Workers Nightly_. W3C Working Draft.
3. Google Developers. (2024). _Google Drive API: Storing Application Data_.
4. Dexie.js Documentation. _IndexedDB API Wrapper for Web Browsers_.
