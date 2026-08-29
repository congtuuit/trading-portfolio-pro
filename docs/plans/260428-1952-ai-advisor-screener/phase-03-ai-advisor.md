# Phase 03: Professional AI Advisor Engine

## Objective
Tích hợp bộ Prompt Advisor chuyên sâu để phân tích chi tiết từng mã cổ phiếu, đưa ra kế hoạch giao dịch cụ thể.

## Requirements
### Functional
- [ ] Tích hợp Prompt mẫu của User vào hệ thống.
- [ ] Xử lý các biến: `trading_style`, `risk_level`, `FULL_DATA_JSON`.
- [ ] Định dạng kết quả trả về theo 6 mục tiêu chuẩn: Tóm tắt, Phù hợp?, Cơ hội, Rủi ro, Kế hoạch hành động, Độ tự tin.

## Implementation Steps
1. [ ] Cập nhật `ai.js`: Thêm hàm `getDetailedAdvice(symbol, fullData)`.
2. [ ] Thiết kế logic "Advisor Mode" với cấu trúc Prompt nghiêm ngặt.
3. [ ] Xử lý fallback khi AI không trả về đúng định dạng hoặc dữ liệu bị lỗi.

## Files to Create/Modify
- `ai.js` - Thêm logic Advisor (Individual).

## Test Criteria
- [ ] AI trả về đúng 6 mục như yêu cầu.
- [ ] Nội dung tư vấn bám sát dữ liệu (không nói chung chung).
- [ ] Kế hoạch Entry/SL/TP có logic (không phi thực tế).
