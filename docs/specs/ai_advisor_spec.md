# Specification: AI Advisor & Smart Screener

## 1. Executive Summary
Hệ thống hỗ trợ nhà đầu tư lướt sóng tại thị trường Việt Nam bằng cách kết hợp bộ lọc kỹ thuật tự động và trí tuệ nhân tạo (AI). Mục tiêu là tìm ra các cổ phiếu có khả năng sinh lời ngắn hạn (2-5%/ngày) dựa trên dữ liệu thời gian thực.

## 2. User Profile (Cá nhân hóa)
Người dùng có thể thiết lập:
- **Trading Style:** Lướt sóng (Surfing) / Swing / Dài hạn.
- **Risk Level:** Thấp / Trung bình / Cao.
- **Target Profit:** Mức lợi nhuận mong muốn mỗi ngày (mặc định 2-3%).

## 3. Logic "Phễu 2 Bước"

### Bước 1: Smart Screener (Bundle)
- **Input:** Danh sách 20-50 mã tiềm năng (VN30 + Top Vol).
- **Process:** AI hoặc Logic nội bộ lọc ra Top 5 mã có độ biến động và xu hướng phù hợp nhất.
- **Criteria:** 
    - Volatility > X% (để đảm bảo có sóng lướt).
    - Price > EMA20 (Trend tăng).
    - RSI chưa quá mua (> 70).

### Bước 2: AI Advisor (Individual)
Sử dụng Prompt chuyên sâu:
```text
Bạn là một AI advisor chuyên tư vấn giao dịch cổ phiếu Việt Nam.
Hồ sơ nhà đầu tư: Style: {{trading_style}}, Risk: {{risk_level}}
Dữ liệu: {{FULL_DATA_JSON}}
Nhiệm vụ: Đánh giá, lập kế hoạch Entry/SL/TP.
```

## 4. Output Structure (Chuẩn Advisor)
1. Tóm tắt nhanh.
2. Phù hợp với user? (Lý do).
3. Cơ hội.
4. Rủi ro.
5. Kế hoạch: Entry, Stoploss, Target.
6. Mức độ tự tin.

## 5. Technical Requirements
- API TradingView: Sử dụng endpoint scanner của TV.
- AI Model: Gemini 1.5 Pro hoặc Flash (Ưu tiên Flash cho Screener, Pro cho Advisor).
- Offline Mode: Lưu kết quả phân tích gần nhất vào Chrome Storage để xem lại không tốn API.
