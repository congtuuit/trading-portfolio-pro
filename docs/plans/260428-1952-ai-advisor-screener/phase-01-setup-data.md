# Phase 01: Setup & Data Scaffolding

## Objective
Thiết lập cấu trúc dữ liệu cần thiết để lấy danh sách cổ phiếu và các chỉ số kỹ thuật từ TradingView API phục vụ cho việc sàng lọc.

## Requirements
### Functional
- [ ] Xác định danh sách Symbol cần quét (VD: VN30, HNX30 hoặc Top 50 thanh khoản).
- [ ] Xây dựng hàm `fetchScannerData()` để lấy các chỉ số: Price, Volume, RSI, MACD, Change%, Volatility từ TradingView.
- [ ] Chuẩn bị cấu trúc JSON đầu vào cho AI (Clean & Optimized để tiết kiệm Token).

## Implementation Steps
1. [ ] Cập nhật `price.js` hoặc tạo `scanner_data.js`: Thêm logic gọi API TradingView Scanner.
2. [ ] Test việc lấy dữ liệu của 10 mã cùng lúc.
3. [ ] Map dữ liệu thô sang định dạng JSON mà AI Advisor yêu cầu.

## Files to Create/Modify
- `scanner_data.js` (Mới) - Xử lý việc fetch dữ liệu hàng loạt.
- `price.js` - Cập nhật nếu cần thêm endpoint.

## Test Criteria
- [ ] API trả về đúng dữ liệu của danh sách mã yêu cầu.
- [ ] Dữ liệu không bị thiếu các chỉ số kỹ thuật quan trọng (RSI, Volatility).
