# AI Deep Stock Research - Specifications

## 1. Executive Summary
Tính năng AI Deep Stock Research giúp nhà đầu tư phân tích toàn diện 1 mã cổ phiếu (Thị trường VN) thông qua góc nhìn của AI kết hợp Dữ liệu Kỹ thuật và Dữ liệu Cơ bản. Giải quyết bài toán: Không cần đọc hàng chục trang BCTC và báo cáo phân tích, người dùng chỉ cần gõ mã và nhận đánh giá tổng quan trong 10 giây.

## 2. User Stories
- Là một nhà đầu tư bận rộn, tôi muốn gõ mã "HPG" và nhận ngay đánh giá nên Mua hay Bán dựa trên tình hình hiện tại, để đưa ra quyết định nhanh.
- Là người dùng TPP, tôi muốn hỏi AI "Hôm nay HPG có tin gì xấu mà giảm mạnh vậy?" và AI có thể đọc tin tức mới nhất để trả lời.

## 3. API Contract / Data Sources
- **Giá lịch sử**: TradingView History API (Đã có).
- **Chỉ số vĩ mô & Tin tức**: APIs mở (TCBS/SSI) cho TTCK Việt Nam.
- **AI Core**: Google Gemini / OpenAI (nhận Context JSON và prompt).

## 4. Third-party Integrations
- TCBS API: `https://apipubaws.tcbs.com.vn/tcanalysis/v1/ticker/` (Profile, Chỉ số tài chính).
- TCBS Tin tức: `https://apipubaws.tcbs.com.vn/tcanalysis/v1/ticker/{symbol}/news`

## 5. Tech Stack
- Vanilla JavaScript (ES Modules).
- Chrome Extension Background Worker (Fetch Proxy).
- HTML/CSS (UI Báo cáo).
