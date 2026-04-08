# Phase 03: 🤖 Proactive AI & Context Support
Status: ⬜ Pending

## Objective
Nâng cấp AI từ dạng "hỏi-đáp" bị động sang "Giám sát" chủ động, có trí nhớ xuyên suốt context.

## Implementation Steps
1. [ ] Cấu trúc lại `ai.js`: Thêm quản lý `contextWindow` dài hơn.
2. [ ] Thêm tính năng "Proactive Alert": 
   - [ ] Định kỳ check giá và so sánh với chiến thuật T0/Pnl.
   - [ ] AI tự động đưa ra popup gợi ý nếu thấy cơ hội (VD: "SMC đang hồi, vùng này lướt T0 rất tốt").
3. [ ] Tích hợp chat lịch sử bền vững (lưu vào `chrome.storage.local`).
