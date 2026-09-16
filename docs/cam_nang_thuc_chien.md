# 🏆 CẨM NANG HƯỚNG DẪN SỬ DỤNG THỰC CHIẾN: TRADING PORTFOLIO PRO (TPP)

> **Dành cho Trader Chứng Khoán VN & Crypto chuyên nghiệp**  
> **Phiên bản**: V5.5 Pro Hybrid System  
> **Kiến trúc**: Chrome Extension MV3, Quant Pine Script, Google Gemini/OpenAI, Google Sheets Cloud Sync, Telegram Bot

---

## 🌟 1. TỔNG QUAN HỆ THỐNG & TRIẾT LÝ THỰC CHIẾN

Trading Portfolio Pro không phải là một công cụ ghi chép thông thường hay một con bot "bịa số". Hệ thống hoạt động theo triết lý **Deterministic-First AI (Định lượng đi trước, AI theo sau)**:

1. **Quant Engine (Pine Script v5.5)**: Thu thập dữ liệu nến, đường xu hướng (EMA20/50/200), dải Bollinger Bands, chỉ báo RSI, MACD, ATR và tính toán điểm số kỹ thuật (0-100), xác suất Tăng/Giảm, vùng tích lũy (Sweet Buy Zone) một cách chính xác tuyệt đối.
2. **AI Thẩm định & Lập kế hoạch**: LLM (Google Gemini / OpenAI) tiếp nhận số liệu đã tính toán và thẩm định rủi ro, xúc tác tăng giá, xây dựng kịch bản chia vốn theo phong cách cá nhân của bạn.
3. **Quản trị rủi ro tự động (Automated Risk Sentinel)**: Tự động tính kích thước vị thế (Position Sizing) theo % rủi ro tài khoản, giám sát giá 24/7 và gửi cảnh báo Stop Loss / Take Profit về Telegram.
4. **Cloud Mirror**: Đồng bộ 2 chiều dữ liệu danh mục với Google Sheets cá nhân, không sợ mất dữ liệu khi đổi máy tính hoặc trình duyệt.

---

## 🧭 2. QUY TRÌNH 1 NGÀY GIAO DỊCH THỰC CHIẾN

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🌅 08:30 - 09:00: QUÉT THỊ TRƯỜNG (Tab 🧠 Advisor)                          │
│ Quét toàn bộ cổ phiếu VN/Crypto ➔ Lọc Top Picks đạt Sweet Buy Zone          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 📊 09:15 - 11:30: LẬP KẾ HOẠCH & VÀO LỆNH (Tab 🤖 Trợ Lý + TradingView)    │
│ Tự nhận diện Chart ➔ Xem Điểm/Xác suất/R:R ➔ Copy Pine Box ➔ Điền Form 1-Click│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ ⚡ 13:00 - 14:30: THEO DÕI & HẠ GIÁ VỐN T0 (Tab 💼 Danh Mục)                │
│ Real-time PnL ➔ Lướt T0 trừ trực tiếp giá vốn ➔ Cảnh báo Telegram tự động   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 🌙 15:00 - TỐI: ĐỒNG BỘ CLOUD & TỔNG KẾT (Google Sheets Sync)               │
│ Auto-Sync dữ liệu lên Google Sheets ➔ An tâm dữ liệu đa thiết bị            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ 3. THIẾT LẬP BAN ĐẦU (1 LẦN DUY NHẤT)

Bấm vào biểu tượng **Bánh răng (⚙️)** ở thanh công cụ phía trên để cài đặt:

### 3.1. Cấu hình AI (Google Gemini / OpenAI)
- **AI Provider**: Chọn `Gemini` (Khuyến nghị: Miễn phí, tốc độ phản hồi cực nhanh) hoặc `OpenAI`.
- **API Key**: 
  - Lấy Key Gemini miễn phí tại: [Google AI Studio](https://aistudio.google.com/app/apikey).
  - Hoặc lấy Key OpenAI tại: [OpenAI Platform](https://platform.openai.com/api-keys).

### 3.2. Cấu hình Quản trị vốn & Phong cách
- **Phong cách giao dịch**: `Swing` (Trung hạn - nắm giữ vài tuần) hoặc `Lướt sóng` (Ngắn hạn).
- **Khẩu vị rủi ro**: `Trung bình` (Khuyến nghị).
- **Vốn tài khoản**: Nhập tổng NAV của bạn (Ví dụ: `100,000,000` = 100 triệu VNĐ, hoặc `5000` USDT).
- **Rủi ro mỗi lệnh (% NAV)**: Khuyến nghị đặt `1.5%` - `2.0%` (Không bao giờ đặt cược quá 2% tài khoản cho 1 thương vụ).

### 3.3. Cấu hình Cảnh báo Telegram Bot (Rất quan trọng)
1. Mở Telegram, tìm `@BotFather` và gõ `/newbot` để tạo bot và lấy **Bot Token**.
2. Tìm `@userinfobot` để lấy **Chat ID** của bạn.
3. Điền Token và Chat ID vào ô cài đặt, tích chọn **Bật thông báo Telegram**.
4. *Lợi ích:* Hệ thống sẽ chạy nền và bắn tin nhắn cảnh báo khi giá chạm Stop Loss, Take Profit hoặc RSI quá bán.

### 3.4. Đồng bộ Google Sheets Cloud Mirror
1. Bấm **"📋 Hướng Dẫn & Lấy Mã Google Apps Script"** trong mục cài đặt.
2. Tạo Google Sheet mới tại [sheets.new](https://sheets.new).
3. Vào **Tiện ích mở rộng** &rarr; **Apps Script**, dán đoạn code và **Triển khai dưới dạng Web App (Quyền truy cập: Bất kỳ ai)**.
4. Dán link Web App (có đuôi `/exec`) vào ô Google Sheet URL.
5. Tích chọn **Tự động đồng bộ lên Sheet** và **Tự động kéo khi khởi động**.

---

## 🧠 4. HƯỚNG DẪN SỬ DỤNG CHI TIẾT TỪNG TÍNH NĂNG

### 4.1. Tab 🧠 Advisor — Bộ lọc Siêu Cổ Phiếu Đầu Ngày
- **Bước 1**: Chọn thị trường: `VN Stocks (HOSE/HNX)` hoặc `Top 50 Crypto`.
- **Bước 2**: Bấm nút **`1. Quét Dữ Liệu`**: Hệ thống quét toàn bộ thị trường, hiển thị bảng xếp hạng Top 50 theo điểm số định lượng Pine Script (Grade A, B, C, Confluence, Pattern nến).
- **Bước 3**: Bấm nút **`2. AI Phân Tích`**: AI sẽ thẩm định và lọc ra Top 3-5 mã tốt nhất đạt tiêu chí **Sweet Buy Zone** (Vùng mua an toàn, không bị quá mua).

### 4.2. Tab 🤖 Trợ Lý (Smart Assistant) — Lập Kế Hoạch 1-Click
- Khi đang mở bất kỳ biểu đồ nào trên TradingView (hoặc nhập mã cổ phiếu/crypto bất kỳ):
  1. Bấm nút **`🎯 Lấy mã từ Chart`** (hoặc chọn nhanh từ thanh **Gợi ý**).
  2. Bấm **`Phân Tích`**.
- **Đọc hiểu Bảng Kế Hoạch Vào Lệnh:**
  - **Khuyến nghị (Verdict)**: `VÙNG MUA AN TOÀN (PULLBACK)`, `MUA NGAY (BREAKOUT)`, hoặc `QUÁ MUA - CHỜ PULLBACK`.
  - **Thanh Xác Suất**: Dự báo % xác suất phe Mua (Bull) áp đảo phe Bán (Bear).
  - **Lưới 4 Ô Staged Targets**:
    - **Vùng Mua (Entry Zone)**: Vùng giá retest hỗ trợ an toàn.
    - **Cắt Lỗ (Stop Loss)**: Dưới hỗ trợ cứng hoặc $1.8 \times ATR$.
    - **Chốt Lời 1 (TP1 - 40%)**: Kháng cự ngắn hạn, bảo toàn vốn.
    - **Chốt Lời 2 (TP2 - 60%)**: Mở rộng sóng tăng tối đa.
    - **Tỷ lệ R:R**: Đảm bảo tối thiểu 1:2.0.
  - **Kích thước vị thế (Position Sizing)**: Số lượng cổ phiếu/coin cụ thể nên mua dựa trên tài khoản của bạn để rủi ro không vượt quá 2% NAV.
- **Hành động 1-Click:**
  - Bấm **`📋 Copy Pine Script`**: Sao chép code Pine Script v5 để dán vào Pine Editor trên TradingView ➔ Vẽ ngay Hộp vùng mua, Đường TP1, TP2, SL trực tiếp lên đồ thị.
  - Bấm **`➕ Điền Form Thêm Vị Thế`**: Tự động chuyển sang Tab Danh Mục và điền sẵn toàn bộ dữ liệu vào Form, bạn chỉ cần bấm *Lưu*.

### 4.3. Tab 💼 Danh Mục & Tuyệt Chiêu Lướt T0 Hạ Giá Vốn
- **Theo dõi Realtime**: Tự động cập nhật giá và PnL mỗi 30 giây.
- **Lướt T0 Hạ Giá Vốn (Chiêu thực chiến cho thị trường VN)**:
  - Khi đang có sẵn hàng (ví dụ: 2,000 cp HPG giá 28.0), sáng mua nhúng 1,000 cp giá 26.5, chiều bán 1,000 cp giá 27.5.
  - Tại thẻ HPG, bấm nút **`T0`** &rarr; Nhập Khối lượng = `1000`, Giá bán = `27.5` &rarr; Bấm **Thực hiện T0**.
  - **Kết quả:** Tiền lãi lướt sóng sẽ được **khấu trừ trực tiếp vào giá vốn** ban đầu của bạn (kéo giá vốn từ 28.0 xuống 27.5), biến vị thế kẹp hàng thành vị thế an toàn!
- **Chốt lời từng phần**: Khi giá đạt TP1, bấm nút **`Chốt`**, chọn đóng 40% khối lượng để bỏ túi tiền lời và dời Stop Loss về hòa vốn. Khi đạt TP2, chốt nốt 60% còn lại.

### 4.4. Tab 🔍 Nghiên cứu Chuyên Sâu (Deep Research)
- Nhập mã cổ phiếu bất kỳ để xem phân tích toàn diện: Xu hướng MA20/50/200, Chỉ báo dao động (RSI, Stoch, MACD), Dòng tiền khối ngoại, Mức định giá P/E, P/B và khuyến nghị chiến lược chi tiết theo từng khung thời gian.

---

## 🛡️ 5. BẢNG NGUYÊN TẮC THỰC CHIẾN BẤT BẠI

| Nguyên tắc | Tính năng hỗ trợ trên TPP | Lợi ích thực tế |
| :--- | :--- | :--- |
| **Không FOMO Đu Đỉnh** | Bộ lọc Anti-Overbought ($\%B > 85\%$, EMA20 Ext $>3.5\%$) | Tránh mua phải đỉnh ngắn hạn khi cổ phiếu vừa tăng nóng. |
| **Tuân thủ R:R $\ge 1:2$** | Auto R:R Calculator & Staged Levels | Đảm bảo tiềm năng lợi nhuận luôn gấp đôi rủi ro. |
| **Không All-in / Quản trị vốn** | Position Sizing Engine (Lô 100 cp / % Vốn) | Giới hạn rủi ro mỗi thương vụ tối đa 1.5 - 2% NAV. |
| **Kỷ luật không cảm xúc** | Pine Script Level Exporter & Telegram Push | Đặt kịch bản rõ ràng, nhận thông báo đẩy khi chạm mốc. |
| **Hạ giá vốn linh hoạt** | Công cụ Lướt T0 thông minh | Khấu trừ lợi nhuận lướt sóng trực tiếp vào giá vốn vị thế kẹp. |
| **An toàn dữ liệu** | Google Sheets 2-Way Sync | Không bao giờ lo mất dữ liệu danh mục khi đổi máy. |
