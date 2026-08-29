# Tài liệu Đánh giá Thiết kế Giao diện (UI/UX Design Audit & Spec)

Tài liệu này tổng hợp toàn bộ thông số thiết kế, cấu trúc giao diện và các thành phần UI của extension **Trading Portfolio Pro** nhằm chuẩn bị cho buổi đánh giá thiết kế (Design Review) cùng Team Design.

---

## 1. Hệ thống Màu sắc & Chủ đề (Themes System)

Ứng dụng hiện hỗ trợ 3 chủ đề giao diện được định nghĩa qua biến CSS (`var`) trong `style.css`:

### A. Mặc định (TradingView Dark Style)
*   **Màu nền chính (Primary BG):** `#131722` (Tối sâu)
*   **Màu thẻ & Nền phụ (Secondary/Card BG):** `#1e222d`
*   **Màu đường viền (Border):** `#2a2e39`
*   **Màu chữ chính:** `#d1d4dc`

### B. Cyber Pulse (Neon Glow)
*   **Màu nền chính:** `#050505` (Đen huyền ảo)
*   **Màu thẻ & Nền phụ:** `#0d1117`
*   **Màu viền tập trung (Border Focus):** `#58a6ff` (Xanh Neon)
*   **Hiệu ứng phát sáng (Glow):** Text bóng đổ Neon cho các chỉ số PnL Lãi/Lỗ.

### C. Crystal Glass (Kính mờ - Frosted Glass)
*   **Nền Gradient:** `radial-gradient(circle at top left, #1e293b, #0f172a)`
*   **Màu thẻ (Card BG):** Kính mờ với hiệu ứng làm nhòe nền `backdrop-filter: blur(20px)`.
*   **Độ tương phản:** Chữ màu trắng kèm bóng đổ để đọc rõ trên nền kính.

---

## 2. Bố cục & Phân mảnh AI (Layout Architecture)

### Cấu trúc chính (550px x 650px - 800px)
1.  **Header:** Chứa Logo, nút **AI Đánh giá toàn bộ danh mục** (🤖), các nút cấu hình nhanh (**Cài đặt**, **Nhập/Xuất**, **Lịch sử**) và **Tổng PnL**.
2.  **Thanh Tabs Điều hướng:** 4 Tab chính:
    *   💼 **Danh Mục:** Quản lý các vị thế đang nắm giữ.
    *   🧠 **Advisor (Săn Cổ Phiếu):** Quét tín hiệu thị trường và nhận gợi ý từ AI.
    *   🔍 **Nghiên cứu:** Phân tích cổ phiếu chuyên sâu kỹ thuật & cơ bản.
    *   📜 **Nhật ký:** Lưu vết các hoạt động hệ thống.
3.  **Trợ lý AI nổi (Floating Chat):** Nút tròn ở góc dưới bên phải mở slide-over panel chat trực tiếp với AI.

### Nhận xét về sự phân mảnh AI (Ý kiến người dùng):
*   Nút AI đánh giá nằm ở Header.
*   Nút Hỏi AI DCA nằm trong modal DCA khi xem vị thế.
*   Nút Ask AI cho từng mã khi nhập nằm trong card Add Trade.
*   Tab Advisor hiển thị kết quả AI top picks từ Screener.
*   Tab Nghiên cứu thực hiện phân tích SWOT và Trading Plan.
*   *Câu hỏi đặt ra cho Team Design:* Có nên gom các luồng phân tích này về một màn hình trung tâm hay giữ nguyên cấu trúc phân bổ để tiện thao tác nhanh?

---

## 3. Hệ thống Nhãn Hover (Tooltip Spec)

Hệ thống sử dụng cơ chế CSS Tooltip thuần túy để tối ưu tốc độ phản hồi:
*   **HTML Attribute:** `data-tooltip="[Nội dung nhãn]"`
*   **Hướng tooltip:**
    *   Mặc định: Hiển thị phía trên đối tượng (`bottom: 125%`).
    *   Xuống dưới: `data-tooltip-dir="down"` hiển thị phía dưới đối tượng (`top: 125%`) dùng cho các nút sát mép trên popup để không bị cắt mất chữ.
*   **CSS Style:** Nền tối `#131722` mờ với viền mỏng và hiệu ứng thu phóng nhẹ khi hover (`transform: scale(0.9) -> scale(1)` trong `0.12s`).

---

## 4. Các vấn đề cần Team Design cho ý kiến đóng góp

1.  **Hệ thống Icon ở Header:** Các biểu tượng ⚙️, ⬆️, ⬇️, 📋 có quá đơn giản và khó hiểu không? Có cần chuyển sang hệ thống biểu tượng SVG hiện đại đồng bộ hơn không?
2.  **Mật độ thông tin (Information Density):** Bố cục của thẻ vị thế (Trade Card) hiện tại chứa khá nhiều thông tin (Entry, Current, SL, TP, PnL %, Note, 5 nút hành động). Team Design có đề xuất cách gom nhóm hoặc ẩn bớt các nút ít dùng không?
3.  **Nhận diện luồng AI:** Cách phối hợp Gradient (`linear-gradient(135deg, #1A73E8, #8E24AA)`) trên các nút liên quan đến AI đã đủ nổi bật và đồng bộ chưa?
