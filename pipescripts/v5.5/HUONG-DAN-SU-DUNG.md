# 📘 Hướng Dẫn Sử Dụng — Hybrid Trading System V5.5 (3-Layer Confluence + SMC Engine)

> **Phiên bản:** V5.5 — 3-Layer Confluence + SMC FVG + Liquidity Sweeps + ADX Regime  
> **Tác giả:** © congtuuit  
> **Nền tảng:** TradingView (Pine Script v5)  
> **Áp dụng:** Stock (Chứng khoán VN/US), Crypto, Forex  

---

## 📑 Điểm Mới Nổi Bật Trong Bản V5.5

1. **⚡ Fair Value Gap (FVG / Imbalance Engine):** Tự động phát hiện và vẽ các vùng mất cân bằng cung cầu chưa được lấp (*Unmitigated FVG*). Khi giá quay lại test FVG, hệ thống tự động cộng điểm Confluence.
2. **🦈 Quét Thanh Khoản (Liquidity Sweeps / Judas Swing):** Nhận diện râu nến quét qua đỉnh/đáy trước đó để săn thanh khoản (*Stop Hunt*) rồi rút chân đóng nến quay trở lại vùng cấu trúc.
3. **🌊 Bộ Lọc Chế Độ Thị Trường (ADX Regime Filter):** Tích hợp ADX (14) để phân loại thị trường:
   - $ADX \ge 20$: Thị trường có xu hướng mạnh (Trending Regime) $\rightarrow$ Tín hiệu hoạt động tối đa hiệu quả.
   - $ADX < 20$: Thị trường đi ngang / biến động nhiễu (Choppy Regime) $\rightarrow$ Cảnh báo và lọc bỏ các tín hiệu phá vỡ giả.
4. **🛡 Quản Trị Rủi Ro & Position Sizing Thông Minh:** Tự động tính toán khối lượng cổ phiếu / Lots giao dịch theo % Rủi ro trên Tổng Vốn.
5. **🤖 Webhook Alerts Chuẩn Hóa JSON:** Xuất tín hiệu có payload JSON chi tiết (ticker, price, time, action) tương thích trực tiếp với Webhook Bot Telegram / Discord.

---

## 🏗 Kiến Trúc 3 Lớp Đồng Thuận (3-Layer Confluence)

```
       ┌────────────────────────────────────────┐
       │   Lớp 1: Bối Cảnh Thị Trường (Context) │
       │   • EMA200 + Khung Lớn HTF             │
       │   • Cấu trúc SMC (BOS, ChoCH)          │
       │   • Bộ lọc Xu hướng ADX                │
       └──────────────────┬─────────────────────┘
                          │ (Đạt điều kiện)
                          ▼
       ┌────────────────────────────────────────┐
       │   Lớp 2: Vùng Giá Quan Trọng (Zones)   │
       │   • Vùng Cung / Cầu (Supply/Demand)    │
       │   • Fair Value Gap (FVG Imbalance)     │
       │   • Kháng cự / Hỗ trợ ngang & Trendline│
       └──────────────────┬─────────────────────┘
                          │ (Đạt điều kiện)
                          ▼
       ┌────────────────────────────────────────┐
       │   Lớp 3: Tín Hiệu Kích Hoạt (Trigger)  │
       │   • Nến Price Action (Hammer, Engulf)  │
       │   • Quét thanh khoản (Liquidity Sweep) │
       │   • Phân kỳ RSI (RSI Divergence)       │
       │   • Bollinger Bands & Volume Đột biến  │
       └──────────────────┬─────────────────────┘
                          │
                          ▼
        ⭐ ĐIỂM ĐỒNG THUẬN (CONFLUENCE SCORE ≥ 4.5/10)
                 ──► KÍCH HOẠT TÍN HIỆU ◄──
```

---

## 🎯 Bảng Tính Điểm Confluence V5.5 (0 - 10 Điểm)

| Tiêu Chí | Trọng Số | Ý Nghĩa |
|----------|----------|---------|
| **Xu hướng EMA200** | +1.0đ | Giá nằm trên/dưới đường xu hướng chính |
| **Cấu trúc SMC (BOS / ChoCH)** | +1.5đ | Phá vỡ cấu trúc đỉnh/đáy xác nhận hướng đi |
| **Khung lớn HTF** | +1.0đ | Đồng thuận với xu hướng Daily / Weekly |
| **Bộ lọc ADX** | +0.5đ | Xu hướng có lực mạnh ($ADX \ge 20$) |
| **Phiên giao dịch (Session)** | +0.5đ | Nằm trong giờ thanh khoản cao |
| **Vùng chạm lần đầu (1st Touch)** | +1.0đ | Vùng mới tạo có độ tươi mới cao nhất |
| **Mô hình Nến Price Action** | +1.5đ | Hammer / Engulfing / Morning Star |
| **Phân kỳ RSI (RSI Divergence)** | +1.5đ | Động lượng suy yếu, báo hiệu đảo chiều |
| **Fair Value Gap (FVG)** | +1.0đ | Giá phản ứng tại vùng mất cân bằng |
| **Liquidity Sweep (Quét râu)** | +1.0đ | Dấu chân cá mập quét thanh khoản |
| **Volume Đột biến** | +0.5đ | Khối lượng tăng $> 1.5\times$ trung bình |

---

## 💻 Cài Đặt Vào TradingView

1. Mở TradingView $\rightarrow$ Mở biểu đồ bất kỳ.
2. Mở tab **Pine Editor** ở thanh công cụ dưới đáy màn hình.
3. Tạo file mới, dán toàn bộ nội dung từ [`code-vi.pipe`](./code-vi.pipe) vào.
4. Bấm **Lưu (Save)** $\rightarrow$ Đặt tên: `Hybrid Trading System V5.5`.
5. Bấm **Thêm vào biểu đồ (Add to chart)**.
