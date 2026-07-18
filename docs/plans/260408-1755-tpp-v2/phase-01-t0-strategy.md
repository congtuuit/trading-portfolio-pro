# Phase 01: 🌊 T0 Strategy Engine
Status: ⬜ Pending
Dependencies: None

## Objective
Xây dựng logic tính toán chiến lược "Thay nước" (T0 trading) để hạ giá vốn cho các vị thế đang thua lỗ mà không tăng thêm tổng lượng hàng nắm giữ.

## Requirements
### Functional
- [ ] Tính toán vùng "Hồi kỹ thuật" dựa trên Fibonacci hoặc ATR.
- [ ] Xác định khối lượng cần lướt để đạt được mức hạ giá vốn mong muốn.
- [ ] Hiển thị hướng dẫn lướt ngay trên card của mã đang lỗ.
- [ ] Thêm nút "Execute T0" để tự động cập nhật giá vốn sau khi lướt thành công (logic cấn trừ).

### Non-Functional
- [ ] Độ chính xác của phép tính toán học (Double check divisor logic).
- [ ] Hiệu năng: Tính toán cực nhanh để không làm lag UI.

## Implementation Steps
1. [ ] Cập nhật `utils.js`: Thêm hàm `calculateT0Scenario(trade, priceData)`.
2. [ ] Sửa `ui.js`: Thêm phần hiển thị "Chiến lược Thay nước" trong modal DCA hoặc trên card.
3. [ ] Thêm logic xử lý sự kiện khi user xác nhận đã lướt T0 (tương tự logic rollover hiện tại).

## Files to Create/Modify
- `utils.js` - Thêm logic tính toán.
- `ui.js` - Hiển thị giao diện lướt.
- `popup.js` - Xử lý lưu trữ kết quả lướt.

## Test Criteria
- [ ] Nhập một mã lỗ 10%, kiểm tra kết quả tính toán vùng lướt có hợp lý không.
- [ ] Thực hiện lướt thành công, kiểm tra giá vốn có hạ đúng như tính toán không.
