# 📈 Trading Portfolio Pro

> **Chrome Extension** giúp nhà đầu tư chứng khoán theo dõi danh mục, tính PnL thời gian thực và nhận tư vấn AI — ngay trên trình duyệt, không cần đăng nhập.

---

## ✨ Tính năng nổi bật

| Tính năng | Mô tả |
|-----------|-------|
| 📊 **Theo dõi danh mục thời gian thực** | Giá cập nhật tự động mỗi 30 giây từ TradingView |
| 💰 **Tính PnL tự động** | Lãi/lỗ tạm tính theo giá thị trường hiện tại |
| 🤖 **Trợ lý AI tích hợp** | Hỏi AI về bất kỳ mã nào — phân tích kỹ thuật, DCA, quản trị rủi ro |
| 🧮 **Công cụ DCA thông minh** | Tính giá trung bình mới khi mua thêm, kịch bản hòa vốn |
| 💼 **Chốt vị thế & cấn trừ** | Ghi nhận lịch sử giao dịch, cấn trừ lãi/lỗ vào giá vốn |
| 🌊 **Chiến thuật T0 (Thay nước)** | Tính toán lợi nhuận lướt T0, hạ giá vốn tự động |
| 🔔 **Cảnh báo thông minh** | Thông báo khi chạm SL/TP hoặc biến động lớn |
| 📱 **Thông báo Telegram** | Gửi cảnh báo tự động qua Telegram Bot |
| 🎯 **Widget nổi trên mọi website** | Popup nhỏ hiện ở góc màn hình, dùng được ngay trên TradingView |
| 📋 **Lịch sử giao dịch** | Ghi lại toàn bộ lệnh đã chốt, tổng kết win/loss |
| 🔄 **Import / Export JSON** | Backup và khôi phục dữ liệu dễ dàng |

---

## 🚀 Hướng dẫn cài đặt

> Hiện tại extension chưa có trên Chrome Web Store — cài thủ công theo các bước sau:

### Bước 1 — Tải mã nguồn

```bash
git clone https://github.com/congtuuit/trading-portfolio-pro.git
```

Hoặc tải file `.zip` → giải nén ra một thư mục.

### Bước 2 — Bật Developer Mode trong Chrome

1. Mở Chrome → điều hướng đến: `chrome://extensions/`
2. Bật toggle **"Developer mode"** ở góc trên phải

### Bước 3 — Load extension

1. Bấm **"Load unpacked"**
2. Chọn thư mục vừa clone/giải nén
3. Extension **Trading Portfolio Pro** xuất hiện trong danh sách ✅

### Bước 4 — Ghim extension

Bấm icon 🧩 (Extensions) trên toolbar → Ghim **Trading Portfolio Pro** để dễ truy cập.

---

## ⚙️ Cấu hình ban đầu

### Cấu hình AI (bắt buộc để dùng tính năng AI)

1. Bấm icon extension → bấm **⚙️** ở góc trên
2. Chọn **Nhà cung cấp AI**: Google Gemini hoặc OpenAI
3. Nhập **API Key**:
   - Gemini: lấy tại [Google AI Studio](https://aistudio.google.com/app/apikey) (miễn phí)
4. Bấm 🔄 **Fetch** để tải danh sách model → chọn model phù hợp
5. Bấm **Lưu Cấu Hình**

### Cấu hình Telegram (tùy chọn)

1. Tạo bot tại [@BotFather](https://t.me/BotFather) → lấy **Bot Token**
2. Lấy **Chat ID** từ [@userinfobot](https://t.me/userinfobot)
3. Nhập vào Settings → bật **"Bật thông báo Telegram"** → Lưu

---

## 📖 Hướng dẫn sử dụng

### Thêm vị thế mới

1. Bấm **➕ New Position**
2. Nhập mã (ví dụ: `HOSE:HCM`, `NASDAQ:AAPL`)
3. Bấm **Khám (Analyze)** để tự động điền giá, SL, TP theo ATR
4. Điền số lượng → **Add Position**

### Hỏi AI phân tích

- Bấm 🤖 ở góc dưới phải để mở **Trading Assistant**
- Hoặc bấm **Hỏi AI Cứu Viện 🤖** trong cửa sổ DCA để nhận gợi ý DCA cụ thể

### Chốt lệnh & hạ giá vốn

1. Bấm **💰 Chốt** trên card vị thế
2. Nhập khối lượng & giá chốt
3. Chọn mã muốn **cấn trừ lãi/lỗ** vào để hạ giá vốn
4. Xác nhận → lịch sử được ghi tự động

### Lướt T0 (Thay nước)

1. Mở **🧮 DCA** → nhập số lượng mua thêm
2. Xem kịch bản T0 tự động theo các mức +2%, +3%, +5%, +7%
3. Bấm **Xác nhận đã lướt T0** → giá vốn mã gốc hạ tự động

---

## 🏗️ Kiến trúc kỹ thuật

```
trading-portfolio-pro/
├── manifest.json       # Chrome Extension Manifest v3
├── popup.html          # Giao diện chính
├── app.js              # Logic tập trung (orchestrator)
├── ui.js               # Render & DOM event bindings
├── price.js            # TradingView Scanner API (giá thời gian thực)
├── ai.js               # Tích hợp Gemini & OpenAI API
├── storage.js          # Chrome Storage wrapper
├── pnl.js              # Tính toán PnL
├── analysis.js         # Phân tích kỹ thuật (Fibonacci, S/R)
├── utils.js            # Helpers (getDivisor, escapeHTML...)
├── background.js       # Service Worker (CORS proxy, alarms)
├── content.js          # Floating widget (Shadow DOM)
└── style.css           # Dark theme CSS
```

**Công nghệ:**
- **Chrome Extension Manifest v3** — Service Worker, Shadow DOM
- **Vanilla JS (ES Modules)** — Không framework, không dependency
- **TradingView Scanner API** — Dữ liệu giá + chỉ báo kỹ thuật (RSI, EMA, MACD, BB, ATR)
- **Google Gemini / OpenAI** — AI tư vấn giao dịch

---

## 🔒 Quyền truy cập

Extension yêu cầu các quyền sau:

| Quyền | Lý do |
|-------|-------|
| `storage` | Lưu danh mục & cài đặt vào Chrome local storage |
| `tabs` | Mở TradingView chart khi bấm "📈 View" |
| `alarms` | Cập nhật giá định kỳ (30 giây) |
| `notifications` | Cảnh báo SL/TP trên desktop |
| `*.tradingview.com` | Lấy dữ liệu giá từ Scanner API |
| `api.telegram.org` | Gửi thông báo qua Telegram Bot |

> ⚠️ **Không có máy chủ trung gian.** Mọi dữ liệu lưu trữ cục bộ trên máy bạn. API Key không bao giờ được gửi đến bên thứ ba ngoài Google/OpenAI.

---

## 🗺️ Roadmap

- [ ] Hỗ trợ thêm sàn giao dịch phái sinh (Futures)
- [ ] Cảnh báo tùy chỉnh theo % thay đổi
- [ ] Biểu đồ PnL theo thời gian
- [ ] Export báo cáo ra Excel/PDF

---

## 🤝 Đóng góp

Pull request và issue luôn được chào đón!

```bash
# Clone & tải về
git clone https://github.com/congtuuit/trading-portfolio-pro.git

# Sửa code → load lại extension trong chrome://extensions/
# Bấm 🔄 "Update" để reload
```

---

## 📄 License

MIT License — Sử dụng tự do cho mục đích cá nhân và thương mại.

---

<div align="center">
  Made with ❤️ for Vietnamese traders &nbsp;|&nbsp; Powered by TradingView + AI
</div>
