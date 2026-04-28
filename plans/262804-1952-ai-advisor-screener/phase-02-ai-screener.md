# Phase 02: Smart Screener Logic (Bundle)

## Objective
Xây dựng logic "phễu lọc" để tìm ra Top 5-10 mã tiềm năng nhất từ danh sách thô dựa trên mục tiêu lợi nhuận của người dùng.

## Requirements
### Functional
- [ ] Xây dựng logic lọc theo Target Profit (VD: Nếu user muốn 3%/ngày -> tìm mã có ATR/Volatility phù hợp và đang trong trend tăng).
- [ ] Gửi "Bundle data" cho AI để sàng lọc sơ bộ (Screener Mode).
- [ ] Nhận diện các tín hiệu: Breakout, Overbought/Oversold, Volume spike.

## Implementation Steps
1. [ ] Viết hàm `screenPotentialStocks(targetProfit)` trong `ai.js`.
2. [ ] Thiết lập Prompt cho AI ở chế độ "Screener" (ngắn gọn, hiệu quả).
3. [ ] Xử lý kết quả trả về từ AI để lưu vào bộ nhớ tạm.

## Files to Create/Modify
- `ai.js` - Thêm logic Screener (Bundle).
- `utils.js` - Thêm các hàm toán học hỗ trợ tính độ biến động (Volatility).

## Test Criteria
- [ ] AI trả về đúng danh sách các mã tiềm năng.
- [ ] Thời gian phản hồi cho 20 mã không quá 5 giây.
