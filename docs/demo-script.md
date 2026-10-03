# Kịch Bản Trình Diễn Báo Cáo Đề Tài (Demo Script)

> **Mục đích**: Kịch bản thao tác từng bước phục vụ buổi báo cáo nghiệm thu / bảo vệ đồ án liên ngành. Thời lượng dự kiến: 5 – 7 phút. Minh họa đầy đủ các đặc tính cốt lõi của kiến trúc **Local-First PWA**.

---

## 🎬 Tóm Tắt Các Phân Cảnh Trình Diễn

| Phân cảnh  | Mục tiêu minh họa                            | Thao tác chính                                   | Thời lượng |
| :--------: | :------------------------------------------- | :----------------------------------------------- | :--------: |
| **Cảnh 1** | Khởi động & Cài đặt PWA                      | Mở ứng dụng, kiểm tra cài đặt Standalone         |  45 giây   |
| **Cảnh 2** | Quản lý GPA & Phân tích điểm                 | Thêm học kỳ, môn học, tính GPA tức thì           |  1.5 phút  |
| **Cảnh 3** | Ghi chú TipTap & Tìm kiếm ngoại tuyến        | Soạn thảo rich-text, checklist, tìm kiếm Fuse.js |  1.5 phút  |
| **Cảnh 4** | **Trọng tâm: Ngoại tuyến & Đồng bộ Đám mây** | Ngắt Wi-Fi hoàn toàn, sửa dữ liệu, bật lại Wi-Fi |   2 phút   |
| **Cảnh 5** | Bảo mật & Cô lập người dùng                  | Chuyển tài khoản, xác nhận data isolation        |   1 phút   |

---

## 📝 Chi Tiết Kịch Bản Thao Tác Từng Bước

### Phân Cảnh 1: Khởi động Ứng dụng & Trải nghiệm PWA (00:00 - 00:45)

1. Mở trình duyệt truy cập ứng dụng StudyFlow.
2. Chỉ ra biểu tượng cài đặt PWA trên thanh địa chỉ trình duyệt ("Install StudyFlow").
3. Nhấn Install để cài đặt thành ứng dụng độc lập trên Desktop / Mobile.
4. Mở cửa sổ standalone: Ứng dụng hiển thị không có thanh địa chỉ trình duyệt, giao diện mượt mà như native app.

### Phân Cảnh 2: Quản lý Tiến độ Học tập & Dự báo GPA (00:45 - 02:15)

1. Điều hướng sang trang **GPA & Tiến độ** (`/gpa`).
2. Nhấn nút **"+ Thêm học kỳ"**:
   - Nhập tên: _"Học kỳ 1 — 2026-2027"_.
   - Nhập ngày bắt đầu: `2026-09-01`, kết thúc: `2027-01-15`.
   - Chọn làm học kỳ hiện tại (`isActive: true`).
3. Trong học kỳ vừa tạo, nhấn **"+ Môn học"**:
   - Thêm môn _"Kiến trúc Phần mềm"_ (3 tín chỉ).
   - Thêm các đầu điểm thành phần:
     - Điểm chuyên cần: Trọng số 10%, Điểm 9.0
     - Bài tập lớn / Đồ án: Trọng số 30%, Điểm 8.5
     - Thi cuối kỳ: Trọng số 60%, Điểm 8.0
4. Quan sát phản hồi UI tức thì (< 16ms):
   - Điểm tổng kết hệ 10: `8.25`
   - Điểm quy đổi hệ 4: `3.5` (Loại B+)
   - Biểu đồ tín chỉ tích lũy (Chart.js) cập nhật số tín chỉ tức thì.
5. Thử sửa điểm thi cuối kỳ lên `9.0` → GPA tự động nhảy lên `4.0` (Loại A) ngay lập tức không có độ trễ mạng.

### Phân Cảnh 3: Ghi chú TipTap & Tìm kiếm Ngoại tuyến (02:15 - 03:45)

1. Điều hướng sang trang **Ghi chú** (`/notes`).
2. Nhấn **"+ Ghi chú mới"**:
   - Tiêu đề: _"Tổng hợp kiến thức Local-First & PWA"_.
   - Nội dung: Dùng toolbar TipTap để định dạng tiêu đề H1, H2, chữ đậm, nghiêng.
   - Thêm một Checklist công việc (Task List):
     - [x] Đọc bài báo Kleppmann 2019
     - [ ] Thiết kế cơ sở dữ liệu IndexedDB Dexie
     - [ ] Kiểm thử tải ngâm Soak test
   - Gắn thẻ (Tag): _"Kiến trúc"_, _"Đồ án"_.
3. Nhấn **"Lưu ghi chú"** → Ghi chú xuất hiện ngay trên danh sách.
4. Trình diễn **Tìm kiếm Ngoại tuyến (Fuse.js)**:
   - Gõ từ khóa _"Kleppmann"_ hoặc gõ không dấu _"kien truc"_ vào ô tìm kiếm.
   - Danh sách lọc ngay lập tức sau 10ms, làm nổi bật kết quả chính xác.

### Phân Cảnh 4: Trọng tâm — Vận hành Ngoại tuyến & Đồng bộ Tự động (03:45 - 05:45)

1. **Mô phỏng ngắt kết nối mạng**:
   - Bật chế độ máy bay (Airplane Mode) trên máy tính hoặc mở DevTools → Network → Chọn **Offline**.
   - Quan sát trạng thái: Ứng dụng **hoàn toàn không bị đơ**, không hiển thị lỗi kết nối mạng.
2. **Thao tác khi hoàn toàn mất mạng**:
   - Thêm một ghi chú mới: _"Ghi chú tạo lúc mất mạng trên xe buýt"_.
   - Tích chọn hoàn thành công việc trong TaskList.
   - Chuyển trang qua lại giữa Trang chủ, GPA, Ghi chú → Mọi dữ liệu vẫn hiển thị đầy đủ (nhờ Service Worker và IndexedDB).
3. **Phục hồi kết nối mạng & Đồng bộ nền**:
   - Tắt chế độ máy bay / Bật lại mạng Internet (`Online`).
   - Quan sát góc trên màn hình:
     - Huy hiệu đồng bộ tự động chuyển sang màu xanh dương: _"Đang sync..."_.
     - Sau 1 giây, chuyển sang màu xanh lục: _"Đã sync"_.
   - Mở Google Drive cá nhân → Kiểm tra file `studyflow-snapshot.json` trong `appDataFolder` đã được cập nhật dấu thời gian mới nhất.

### Phân Cảnh 5: Bảo mật & Cô lập Dữ liệu Người dùng (05:45 - 06:30)

1. Đăng xuất tài khoản hiện tại.
2. Đăng nhập bằng một tài khoản sinh viên khác (ví dụ: `student-b@university.edu`).
3. Kiểm tra trang Ghi chú và GPA: **Trống hoàn toàn** (dữ liệu của tài khoản A được cô lập tuyệt đối, không có rủi ro nhìn thấy dữ liệu của nhau).
4. Đăng nhập lại tài khoản A: Toàn bộ dữ liệu của A hiển thị lại đầy đủ và nguyên vẹn.

---

## 🎯 Thông Điệp Chốt Báo Cáo

> _"StudyFlow chứng minh rằng với kiến trúc Local-First và PWA, chúng ta có thể mang lại trải nghiệm phần mềm giáo dục nhanh hơn, tin cậy hơn khi ngoại tuyến, và hoàn toàn tôn trọng quyền riêng tư dữ liệu của sinh viên mà không tốn bất kỳ chi phí duy trì máy chủ backend nào."_
