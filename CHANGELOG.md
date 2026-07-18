# Changelog

Tất cả các thay đổi quan trọng đối với dự án **Trading Portfolio Pro** sẽ được ghi lại tại đây.

## [v2.2.0] - 2026-05-31
### 🚀 Added
- **Risk & Reward Engine**: Tự động tính toán tỷ lệ Rủi ro/Lợi nhuận (R:R) từ kết quả AI.
- **Smart Filtering**: Lọc các cổ phiếu có điểm R:R thấp (theo mức chọn: Tắt, 1:1, 1:1.5, 1:2, 1:3).
- **R:R Visual Badges**: Thẻ huy hiệu trực quan trên kết quả AI (Xanh, Vàng, Đỏ).

## [v2.1.0] - 2026-04-29
### 🚀 Added
- **AI Price Action Analysis**: Nâng cấp `ai.js` để hỗ trợ phân tích mẫu hình nến và xu hướng từ dữ liệu OHLCV lịch sử.
- **Auto-History Context**: Tự động lấy 20 phiên nến gần nhất khi người dùng yêu cầu AI phân tích chi tiết mã cổ phiếu (`handleAskAdvisor`).
- **Module `history.js`**: Hỗ trợ lấy dữ liệu nến lịch sử (OHLCV) từ TradingView History API.
- **Background Handler**: Thêm case `FETCH_HISTORY` để xử lý yêu cầu lấy lịch sử cổ phiếu.
- **Settings Slider**: Thêm thanh trượt cấu hình "Số phiên phân tích lịch sử" (10-200 phiên) trong bảng cài đặt.
- **System Overview Docs**: Tài liệu kiến trúc hệ thống mới tại `docs/architecture/system_overview.md`.

### 🔧 Changed
- **Screener Logic**: Cập nhật prompt lọc cổ phiếu tập trung vào tỷ lệ Risk/Reward >= 1:2 và các điểm nổ (Breakout) Price Action.
- **Storage Defaults**: Mặc định số phiên phân tích là 20 phiên.
- **UI Settings**: Cập nhật CSS để bảng Settings có thanh cuộn (`overflow-y: auto`), tránh việc nội dung bị che khuất trên màn hình nhỏ.

### ✅ Improved
- Cập nhật tài liệu tiến độ tại `plan.md` với lộ trình nâng cấp Swing Trading Intelligence.
