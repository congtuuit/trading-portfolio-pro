# 📘 Hướng Dẫn Sử Dụng — Hybrid Trading System V5 (3-Layer Confluence)

> **Phiên bản:** V5 — 3-Layer Confluence Engine  
> **Tác giả:** © congtuuit  
> **Nền tảng:** TradingView (Pine Script v5)  
> **Áp dụng:** Stock, Crypto, Forex  

---

## 📑 Mục Lục

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Cài Đặt Nhanh (Quick Start)](#2-cài-đặt-nhanh)
3. [Kiến Trúc 3-Layer](#3-kiến-trúc-3-layer)
4. [Hướng Dẫn Đọc Biểu Đồ](#4-hướng-dẫn-đọc-biểu-đồ)
5. [Chi Tiết Từng Thông Số (Inputs)](#5-chi-tiết-từng-thông-số)
6. [Đọc Hiểu Dashboard](#6-đọc-hiểu-dashboard)
7. [Đọc Hiểu Bảng Xác Suất](#7-đọc-hiểu-bảng-xác-suất)
8. [Đọc Hiểu Tín Hiệu Giao Dịch](#8-đọc-hiểu-tín-hiệu-giao-dịch)
9. [Confluence Score — Cách Tính & Ý Nghĩa](#9-confluence-score)
10. [Quy Trình Giao Dịch Đề Xuất](#10-quy-trình-giao-dịch)
11. [Thiết Lập Gợi Ý Theo Thị Trường](#11-thiết-lập-gợi-ý)
12. [Alerts — Cảnh Báo Tự Động](#12-alerts)
13. [FAQ — Câu Hỏi Thường Gặp](#13-faq)
14. [Changelog V4 → V5](#14-changelog)

---

## 1. Tổng Quan Hệ Thống

### Triết lý thiết kế

```
"Ít tín hiệu nhưng chất lượng cao"
"Không dự đoán — chỉ đánh giá xác suất"
"3 điều kiện đồng thuận mới vào lệnh"
```

Hệ thống xây dựng trên nguyên lý **Smart Money Concept (SMC)** kết hợp **Price Action** cổ điển, chia thành 3 lớp xác nhận:

| Lớp | Vai trò | Câu hỏi trả lời |
|-----|---------|------------------|
| **Layer 1 — Context** | Bối cảnh thị trường | "Xu hướng đang là gì?" |
| **Layer 2 — Zone** | Vùng giá quan trọng | "Tôi đang ở đâu trên biểu đồ?" |
| **Layer 3 — Trigger** | Kích hoạt vào lệnh | "Có tín hiệu đảo chiều tại vùng này không?" |

**Tín hiệu chỉ xuất hiện khi CẢ 3 lớp đồng thuận.**

### Không Repaint

- Tất cả tín hiệu chỉ kích hoạt trên **nến đã đóng** (`barstate.isconfirmed`)
- HTF data sử dụng kỹ thuật `[1] + lookahead_on` — chuẩn TradingView chống repaint
- Pivot-based zones có delay tự nhiên `pivot_right` nến — đây là **delay xác nhận**, không phải repaint

---

## 2. Cài Đặt Nhanh

### Bước 1: Thêm Indicator
1. Mở TradingView → **Pine Editor**
2. Paste toàn bộ code từ file `code-vi.pipe`
3. Nhấn **Add to Chart**

### Bước 2: Thiết lập mặc định khuyến nghị

| Thị trường | Khung thời gian | `min_score` | Ghi chú |
|------------|----------------|-------------|---------|
| **Crypto (BTC, ETH)** | 1H hoặc 4H | 4.0 | Mặc định phù hợp |
| **Forex** | 1H hoặc 4H | 4.5 | Bật session filter |
| **Stock VN** | 1D | 3.5 | Tắt session filter |
| **Stock US** | 1H | 4.0 | Bật session filter |

### Bước 3: Quan sát
- Chờ **nhãn MUA/BÁN** xuất hiện → Đó là tín hiệu
- Đọc **Dashboard** (góc phải trên) để hiểu bối cảnh
- Đọc **Bảng Xác Suất** (góc phải dưới) để đánh giá xác suất

---

## 3. Kiến Trúc 3-Layer

```
╔══════════════════════════════════════════════════════════╗
║                    LAYER 1: CONTEXT                      ║
║  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ ║
║  │ EMA 200  │  │ BOS/ChoCH│  │ HTF EMA  │  │ Session │ ║
║  │ Regime   │  │ Structure│  │ Trend    │  │ Filter  │ ║
║  └──────────┘  └──────────┘  └──────────┘  └─────────┘ ║
║                    max 4.0 điểm                          ║
╠══════════════════════════════════════════════════════════╣
║                    LAYER 2: ZONE                         ║
║         ┌──────────────┐  ┌──────────────┐               ║
║         │ Supply/Demand│  │ Zone Quality │               ║
║         │ Zone Engine  │  │ (Freshness)  │               ║
║         └──────────────┘  └──────────────┘               ║
║                    max 2.0 điểm                          ║
╠══════════════════════════════════════════════════════════╣
║                    LAYER 3: TRIGGER                      ║
║  ┌────────────┐  ┌──────────────┐  ┌──────────┐         ║
║  │ Candlestick│  │RSI Divergence│  │ Volume   │         ║
║  │ Patterns   │  │              │  │ (Bonus)  │         ║
║  └────────────┘  └──────────────┘  └──────────┘         ║
║                    max 4.0 điểm                          ║
╠══════════════════════════════════════════════════════════╣
║              TỔNG CONFLUENCE: 0 – 10 điểm               ║
║     STRONG ≥7  │  MEDIUM 5–6.9  │  WEAK 4–4.9          ║
╚══════════════════════════════════════════════════════════╝
```

---

## 4. Hướng Dẫn Đọc Biểu Đồ

### 4.1 Các thành phần trên chart

| Thành phần | Hình dạng | Ý nghĩa |
|------------|-----------|---------|
| **Hộp xanh lá** (mờ) | Box ngang | Vùng Cầu (Demand Zone) — khu vực giá có lực mua |
| **Hộp đỏ** (mờ) | Box ngang | Vùng Cung (Supply Zone) — khu vực giá có lực bán |
| **Hộp xám** (rất mờ) | Box ngang | Zone đã bị phá vỡ (invalidated) |
| **EMA 200** | Đường xám dày | Đường xu hướng chính |
| **BB Upper/Mid/Lower** | 3 đường (đỏ/xanh dương/xanh lá) | Bollinger Bands — chỉ visual, không lọc tín hiệu |
| **Nền xanh nhạt** | Toàn bộ nền | Cấu trúc thị trường Bullish (BOS↑) |
| **Nền đỏ nhạt** | Toàn bộ nền | Cấu trúc thị trường Bearish (BOS↓) |
| **Đường phân kỳ RSI** | Đường nét đứt màu xanh lá/đỏ | Nối 2 đỉnh hoặc 2 đáy của giá khi có tín hiệu phân kỳ RSI |
| **Nhãn phân kỳ RSI** | Nhãn xanh lá/đỏ trên biểu đồ | Nhãn ghi "Phân Kỳ Tăng RSI" hoặc "Phân Kỳ Giảm RSI" tại nến xác nhận |

### 4.2 Ký hiệu Structure (BOS / ChoCH)

| Ký hiệu | Biểu tượng | Ý nghĩa |
|----------|-----------|---------|
| **BOS↑** | ▲ nhỏ xanh (dưới nến) | Break of Structure Bullish — phá đỉnh cũ → xu hướng tăng tiếp tục |
| **BOS↓** | ▼ nhỏ đỏ (trên nến) | Break of Structure Bearish — phá đáy cũ → xu hướng giảm tiếp tục |
| **ChoCH↑** | ◆ xanh lá lớn (dưới nến) | Change of Character Bullish — **đảo chiều** từ giảm sang tăng |
| **ChoCH↓** | ◆ cam lớn (trên nến) | Change of Character Bearish — **đảo chiều** từ tăng sang giảm |

> 💡 **Mẹo:** ChoCH quan trọng hơn BOS rất nhiều. ChoCH cho biết thị trường **đã thay đổi cấu trúc** — đây là thời điểm cần đặc biệt chú ý.

### 4.3 Tín hiệu mua / bán

Khi đủ điều kiện, nhãn sẽ xuất hiện trực tiếp trên chart:

```
┌─────────────────────┐
│ MUA STRONG ⭐⭐⭐     │  ← Mức tin cậy
│ Engulfing            │  ← Mô hình nến trigger
│ Units: 0.45          │  ← Khối lượng đề xuất
│ Entry: 65,432.10     │  ← Giá vào lệnh
│ Score: 7.5/10        │  ← Điểm confluence
└─────────────────────┘
```

Kèm theo 3 đường ngang:
- 🔴 **SL** (Stop Loss) — đường đỏ nét đứt
- 🟠 **TP1** (Take Profit 1) — đường cam nét đứt
- 🟢 **TP2** (Take Profit 2) — đường xanh nét đứt

---

## 5. Chi Tiết Từng Thông Số

### 🔷 Layer 1: Bối Cảnh Thị Trường

| Thông số | Mặc định | Giải thích | Khi nào điều chỉnh |
|----------|----------|------------|---------------------|
| **Chu kỳ EMA Xu hướng** | `200` | EMA xác định xu hướng lớn. Giá > EMA = Bull, < EMA = Bear | Giữ 200 cho hầu hết. Crypto volatile có thể thử 100 |
| **Pivot Structure (Trái)** | `10` | Số nến bên trái để xác nhận swing high/low cho BOS/ChoCH | Tăng = ít BOS nhưng chính xác hơn. Giảm = nhiều BOS nhưng dễ nhiễu |
| **Pivot Structure (Phải)** | `3` | Số nến bên phải cần để xác nhận pivot | Tăng = delay nhiều hơn nhưng chắc chắn hơn |

#### Giải thích EMA 200

```
Giá            EMA 200
  ↓               ↓
  ●───────────────────── Giá TRÊN EMA → BULL (xu hướng tăng)
                  ●───── EMA 200
  ●───────────────────── Giá DƯỚI EMA → BEAR (xu hướng giảm)
```

#### Giải thích BOS / ChoCH

```
                    HH (Higher High)
                   / \
                  /   \
    HH           /     \
   / \          /       \
  /   \        /         \
 /     \  HL  /           \   ← Cấu trúc BULL: HH + HL
/       \/   /             \
         HL                 \
                             \  ← Giá phá HL cuối cùng
                              \/
                               LL (Lower Low)
                               
    Đây là ChoCH↓ — từ Bull sang Bear
```

### 📡 Multi-Timeframe

| Thông số | Mặc định | Giải thích |
|----------|----------|------------|
| **Bật Lọc HTF** | `true` | Yêu cầu khung lớn cùng chiều mới cộng điểm confluence |
| **Chế độ HTF** | `Auto` | Tự động chọn: 5m→1H, 15m→4H, 1H→1D, 1D→1W |
| **Khung Lớn Tùy Chỉnh** | `1D` | Chỉ dùng khi chọn "Custom" |
| **Chu kỳ EMA Khung Lớn** | `200` | EMA trên khung lớn — giữ nguyên 200 |

**Bảng Auto HTF:**

| Chart của bạn | HTF tự động |
|---------------|-------------|
| 1m, 3m, 5m | 1H |
| 15m, 30m | 4H |
| 1H, 2H, 4H | 1D |
| Intraday > 4H | 1W |
| 1D | 1W |
| 1W | 1M |

### 🕐 Bộ Lọc Phiên

| Thông số | Mặc định | Giải thích |
|----------|----------|------------|
| **Chỉ GD Trong Phiên** | `true` | Lọc tín hiệu ngoài giờ giao dịch chính |
| **London** | `0800-1600 UTC` | Phiên London — thanh khoản cao châu Âu |
| **New York** | `1300-2100 UTC` | Phiên New York — thanh khoản cao nhất thế giới |

> ⚠️ **Lưu ý:** Bộ lọc phiên **chỉ áp dụng trên chart intraday** (< 1D). Trên chart 1D trở lên, session filter tự động bỏ qua.

### 🧱 Layer 2: Vùng Cung/Cầu

| Thông số | Mặc định | Giải thích | Khi nào điều chỉnh |
|----------|----------|------------|---------------------|
| **Pivot Zone (Trái)** | `20` | Số nến trái xác nhận đỉnh/đáy để tạo zone | Tăng = zone chính xác hơn, ít zone. Giảm = nhiều zone nhưng yếu hơn |
| **Pivot Zone (Phải)** | `5` | Số nến phải xác nhận | Giữ 5 cho đa số. Tăng = delay nhiều |
| **Chu kỳ ATR** | `14` | Đo biến động trung bình — cơ sở cho rất nhiều tính toán | Giữ 14 (chuẩn quốc tế) |
| **Hệ số ATR Vùng Cản** | `0.5` | Độ rộng zone = ATR × 0.5 | Tăng = zone rộng hơn (dễ chạm). Giảm = zone hẹp (khó chạm) |
| **Số Vùng Cản Tối Đa** | `12` | Giới hạn zone trên chart | Tăng nếu chart dài hạn |
| **Khoảng cách Min** | `0.4` | Khoảng cách tối thiểu giữa 2 zone cùng loại (ATR) | Tăng nếu thấy zone chồng chéo |
| **FVG/Imbalance** | `false` | Chỉ tạo zone có nến mạnh ngay sau pivot | Bật khi muốn ít zone nhưng chất lượng cao hơn |
| **Chạm Lần Đầu** | `true` | Chỉ giao dịch khi zone còn "trinh" | **Giữ true** — zone chạm nhiều lần = yếu |
| **Xoá Hộp bị thủng** | `false` | Xoá hoàn toàn box khi zone bị phá | Bật nếu muốn chart sạch |

#### Giải thích Zone

```
Supply Zone (Hộp đỏ)                     ← Vùng có lực BÁN
════════════════════════════════════════
 ▼ Giá đã bật xuống mạnh từ đây          ← Pivot High xác nhận
════════════════════════════════════════


        Giá hiện tại ●


════════════════════════════════════════
 ▲ Giá đã bật lên mạnh từ đây           ← Pivot Low xác nhận
════════════════════════════════════════
Demand Zone (Hộp xanh)                   ← Vùng có lực MUA
```

**Zone Strength Decay (suy giảm sức mạnh):**

| Số lần chạm | Strength decay | Ý nghĩa |
|-------------|----------------|---------|
| Lần 1 | -0.15 | Vẫn mạnh |
| Lần 2 | -0.15 | Trung bình |
| Lần 3+ | -0.25 mỗi lần | Yếu — sắp bị phá |

### 🎯 Layer 3: Kích Hoạt

| Thông số | Mặc định | Giải thích |
|----------|----------|------------|
| **Chu kỳ RSI** | `14` | RSI dùng để phát hiện Divergence (phân kỳ) |
| **RSI Pivot (Trái/Phải)** | `5/5` | Pivot trên RSI để so sánh 2 đáy/đỉnh liên tiếp |
| **Volume Surge** | `false` | Bonus 0.5 điểm nếu volume đột biến. **Không bắt buộc** |
| **MA Volume** | `20` | MA trung bình volume 20 phiên |
| **Volume / TB** | `1.5` | Volume phải ≥ 1.5× trung bình mới tính là "đột biến" |

#### RSI Divergence — Giải thích

```
BULLISH DIVERGENCE (Phân kỳ tăng):

Giá:     Đáy 1 ───────── Đáy 2 (thấp hơn Đáy 1)
             ↘                ↘
RSI:     Đáy 1 ───────── Đáy 2 (CAO hơn Đáy 1)  ← Lực bán yếu đi!
             ↗                ↗

→ Giá tạo đáy mới nhưng RSI không → Sắp đảo chiều TĂNG


BEARISH DIVERGENCE (Phân kỳ giảm):

Giá:     Đỉnh 1 ──────── Đỉnh 2 (cao hơn Đỉnh 1)
              ↗                 ↗
RSI:     Đỉnh 1 ──────── Đỉnh 2 (THẤP hơn Đỉnh 1) ← Lực mua yếu đi!
              ↘                 ↘

→ Giá tạo đỉnh mới nhưng RSI không → Sắp đảo chiều GIẢM
```

#### Mô hình nến nhận diện

| Mô hình | Loại | Hình dạng | Ý nghĩa |
|---------|------|-----------|---------|
| **Hammer** 🔨 | Bullish | Râu dưới ≥ 2× thân, râu trên ≤ 0.5× thân | Lực mua bắt đáy mạnh |
| **Shooting Star** ⭐ | Bearish | Râu trên ≥ 2× thân, râu dưới ≤ 0.5× thân | Lực bán ở đỉnh mạnh |
| **Bullish Engulfing** 🟢 | Bullish | Nến xanh "nuốt" nến đỏ trước | Lực mua áp đảo hoàn toàn |
| **Bearish Engulfing** 🔴 | Bearish | Nến đỏ "nuốt" nến xanh trước | Lực bán áp đảo hoàn toàn |
| **Morning Star** 🌅 | Bullish | 3 nến: đỏ lớn → nhỏ → xanh lớn | Đảo chiều tăng rõ ràng |
| **Evening Star** 🌇 | Bearish | 3 nến: xanh lớn → nhỏ → đỏ lớn | Đảo chiều giảm rõ ràng |

```
Hammer:          Engulfing:       Morning Star:
                 
    │               ┃              │
    │            ┌──┃──┐           │
    ├──┐         │  ┃  │      ┌───┤
    │  │    ┌──┐ │  ┃  │   ┌┐ │   │
    ├──┘    │  │ │  ┃  │   └┘ │   │
    │       │  │ └──┃──┘      └───┤
    │       └──┘    ┃              │
    │                              │
    │                              
    │            Nến đỏ  Nến xanh
    │            bị nuốt   nuốt
```

### ⭐ Confluence

| Thông số | Mặc định | Giải thích |
|----------|----------|------------|
| **Điểm tối thiểu** | `4.0` | Chỉ tạo tín hiệu khi score ≥ 4.0 |

**Gợi ý:**
- `3.0` = Nhiều tín hiệu, chấp nhận rủi ro cao hơn
- `4.0` = Cân bằng (khuyến nghị)
- `5.0` = Ít tín hiệu, chất lượng cao
- `6.0+` = Rất ít tín hiệu, chỉ "kim cương"

### 🛡 Quản Trị Rủi Ro

| Thông số | Mặc định | Giải thích |
|----------|----------|------------|
| **Hiện SL/TP** | `true` | Vẽ đường SL, TP1, TP2 trên chart |
| **SL = ATR × ?** | `1.5` | Stop Loss = giá hiện tại ± (ATR × 1.5) |
| **R:R cho TP1** | `1.5` | Take Profit 1 = khoảng SL × 1.5 |
| **R:R cho TP2** | `3.0` | Take Profit 2 = khoảng SL × 3.0 |
| **Vốn ($)** | `10,000` | Tổng vốn tài khoản |
| **Rủi ro / Lệnh (%)** | `1.0%` | Rủi ro tối đa 1% vốn mỗi lệnh |
| **Forex (Lot)?** | `false` | Bật nếu giao dịch Forex → tính ra Lot thay vì Units |

#### Công thức Position Sizing

```
Rủi ro ($) = Vốn × (Rủi ro% / 100)
           = 10,000 × 0.01 = $100

Khoảng SL = ATR × Hệ số SL
          = 500 × 1.5 = 750 (pip/point)

Position Size = Rủi ro ($) / Khoảng SL
              = 100 / 750 = 0.133 units

Forex:  Lot = Rủi ro ($) / (Khoảng SL × 100,000)
```

### 🎨 Hiển Thị

| Thông số | Mặc định | Giải thích |
|----------|----------|------------|
| **Hiện BOS/ChoCH** | `true` | Ký hiệu ▲▼◆ trên chart |
| **Hiện Bollinger Bands** | `true` | 3 đường BB (chỉ visual) |
| **Hiện EMA 200** | `true` | Đường EMA xám dày |
| **Hiện Nhãn Tín Hiệu** | `true` | Label MUA/BÁN |
| **Nền màu Xu Hướng** | `true` | Tô nền xanh/đỏ theo market structure |
| **Hiện Bảng Điều Khiển** | `true` | Toggle bật/tắt toàn bộ Dashboard chính |
| **Hiện Cột Giải Thích** | `true` | Thêm cột "Ý Nghĩa" để giải thích các dòng trên Dashboard |
| **Hiện Đường/Nhãn Phân Kỳ RSI** | `true` | Vẽ đường nét đứt và nhãn phân kỳ RSI trực tiếp trên chart |
| **Hiện Bảng Dự Báo Xác Suất** | `true` | Toggle ẩn/hiện bảng xác suất ở góc dưới bên phải |
| **Hiện Dòng [Tên Mục]** | `true` | Các switch cấu hình ẩn/hiện riêng lẻ từng dòng trên Dashboard (Phiên Giao Dịch, Xu Hướng Khung Lớn, Mức Giá vs EMA, Cấu Trúc SMC, Chỉ Báo RSI, RSI Phân Kỳ, Bollinger Bands, Khối Lượng, Vùng Cản, Lịch Sử Thắng) |

### 📊 Thống Kê

| Thông số | Mặc định | Giải thích |
|----------|----------|------------|
| **Số nến đánh giá** | `5` | Sau bao nhiêu nến thì đánh giá lệnh thắng/thua |
| **Mẫu tối thiểu** | `5` | Cần ít nhất 5 lệnh để hiện win-rate |

---

## 6. Đọc Hiểu Dashboard

> 💡 **Mẹo tùy chỉnh giao diện:** Bạn có thể ẩn/hiện từng dòng trên Dashboard và ẩn/hiện Bảng Xác Suất bằng các nút gạt tương ứng trong phần **Cài đặt chỉ báo (Settings) -> Giao Diện**. Dashboard sẽ tự động co giãn kích thước một cách linh hoạt, không để lại khoảng trống.

Dashboard nằm ở **góc phải trên** chart. Đọc từ trên xuống:

```
┌──────────────────┬───────────────────┐
│ Phiên            │ London+NY ✓       │ ← [1]
├──────────────────┼───────────────────┤
│ Xu Hướng Vĩ Mô  │ ▲ TĂNG (D)       │ ← [2]
├──────────────────┼───────────────────┤
│ EMA 200          │ ▲ BULL            │ ← [3]
├──────────────────┼───────────────────┤
│ Cấu Trúc (BOS)  │ ▲ Bullish         │ ← [4]
├──────────────────┼───────────────────┤
│ RSI              │ 45.3              │ ← [5]
├──────────────────┼───────────────────┤
│ RSI Divergence   │ Không có          │ ← [6]
├──────────────────┼───────────────────┤
│ Bollinger        │ 52%               │ ← [7]
├──────────────────┼───────────────────┤
│ Volume           │ 1.23x             │ ← [8]
├──────────────────┼───────────────────┤
│ Zones Hoạt Động  │ 8                 │ ← [9]
├──────────────────┼───────────────────┤
│ Win-Rate         │ 62% (8/13)        │ ← [10]
└──────────────────┴───────────────────┘
```

### Chi tiết từng dòng

#### [1] Phiên giao dịch
| Giá trị | Màu nền | Ý nghĩa |
|---------|---------|---------|
| `London+NY ✓` | 🟢 Xanh | Đang trong overlap → thanh khoản cao nhất |
| `London ✓` | 🟢 Xanh | Phiên London |
| `New York ✓` | 🟢 Xanh | Phiên New York |
| `Ngoài Phiên ✗` | ⬜ Xám | Ngoài giờ giao dịch chính |
| `N/A (Khung Lớn)` | ⬜ Xám | Chart 1D+ không áp dụng session |

#### [2] Xu Hướng Vĩ Mô (HTF)
- `▲ TĂNG (D)` → Giá trên EMA 200 của chart ngày → **Thuận trend tăng**
- `▼ GIẢM (W)` → Giá dưới EMA 200 tuần → **Thuận trend giảm**
- `—` → Dữ liệu chưa đủ

#### [3] EMA Regime (khung hiện tại)
- `▲ BULL` → Giá hiện tại > EMA 200
- `▼ BEAR` → Giá hiện tại < EMA 200
- `— SIDEWAY` → Giá = EMA (rất hiếm)

#### [4] Cấu Trúc (BOS)
- `▲ Bullish` 🟢 → Market structure tăng → Higher Highs + Higher Lows
- `▼ Bearish` 🔴 → Market structure giảm → Lower Highs + Lower Lows
- `— Undefined` ⬜ → Chưa xác định

> 💡 **Mẹo đọc kết hợp [2]+[3]+[4]:**
> - Cả 3 cùng xanh → **Xu hướng tăng mạnh** → Ưu tiên MUA
> - Cả 3 cùng đỏ → **Xu hướng giảm mạnh** → Ưu tiên BÁN
> - Lẫn lộn → **Cẩn thận** — thị trường đang chuyển pha

#### [5] RSI
| Giá trị | Màu | Ý nghĩa |
|---------|-----|---------|
| `Quá Bán 24.5` | 🟢 | RSI ≤ 30 → Khả năng bật lên |
| `Quá Mua 78.2` | 🔴 | RSI ≥ 70 → Khả năng điều chỉnh |
| `45.3` | ⬜ | Vùng trung tính |

#### [6] RSI Divergence
| Giá trị | Ý nghĩa | Tầm quan trọng |
|---------|---------|----------------|
| `▲ Phân Kỳ Tăng` | Giá đáy mới thấp hơn + RSI đáy cao hơn | ⭐⭐⭐ Rất quan trọng — sắp đảo chiều tăng |
| `▼ Phân Kỳ Giảm` | Giá đỉnh mới cao hơn + RSI đỉnh thấp hơn | ⭐⭐⭐ Rất quan trọng — sắp đảo chiều giảm |
| `Không có` | Không phát hiện phân kỳ | Bình thường |

#### [7] Bollinger
| Giá trị | Ý nghĩa |
|---------|---------|
| `Đáy (15%)` 🟢 | Giá gần BB dưới → potential bounce |
| `Đỉnh (85%)` 🔴 | Giá gần BB trên → potential drop |
| `52%` ⬜ | Giá ở giữa BB → trung tính |
| `⚡ SQUEEZE` 🟡 | BB siết chặt → **Breakout mạnh sắp xảy ra** |

> ⚡ **BB Squeeze** là tín hiệu cảnh báo quan trọng! Khi BB siết chặt, giá sắp bùng nổ theo 1 hướng. Kết hợp với BOS/ChoCH để biết hướng.

#### [8] Volume
| Giá trị | Ý nghĩa |
|---------|---------|
| `2.31x 🔥` 🟢 | Volume gấp 2.31 lần trung bình → Dòng tiền mạnh |
| `0.87x` ⬜ | Volume bình thường |

#### [9] Zones Hoạt Động
- Số vùng Supply/Demand đang còn hiệu lực trên chart

#### [10] Win-Rate
| Giá trị | Màu | Ý nghĩa |
|---------|-----|---------|
| `62% (8/13)` | 🟢 Xanh lá | Win-rate ≥ 60% — Hệ thống hoạt động tốt |
| `52% (5/10)` | 🟡 Vàng | Win-rate 45-59% — Trung bình |
| `35% (3/9)` | 🔴 Đỏ | Win-rate < 45% — Cần điều chỉnh thông số |
| `Đang đo...` | ⬜ Xám | Chưa đủ mẫu tối thiểu |

---

## 7. Đọc Hiểu Bảng Xác Suất

Bảng xác suất nằm ở **góc phải dưới** chart:

```
┌──────────────┬──────────────┐
│ 📊 XÁC SUẤT  │ 5 nến tới    │
├──────────────┼──────────────┤
│ Kịch bản     │ ▲ TĂNG       │ ← Kịch bản xác suất cao nhất
├──────────────┼──────────────┤
│ Xác suất Tăng│ 68%          │ ← Xác suất tiếp tục/đảo chiều tăng
├──────────────┼──────────────┤
│ Xác suất Giảm│ 32%          │ ← Xác suất ngược lại
├──────────────┼──────────────┤
│ Độ mạnh      │ MEDIUM       │ ← Mức tin cậy
└──────────────┴──────────────┘
```

### Cách tính xác suất

Bắt đầu từ **50% (trung tính)**, cộng/trừ theo từng yếu tố:

| Yếu tố | Cộng (bull) | Trừ (bear) |
|--------|-------------|------------|
| EMA Regime | +5% nếu uptrend | -5% nếu downtrend |
| Market Structure | +8% nếu bullish | -8% nếu bearish |
| HTF Trend | +5% nếu HTF bull | -5% nếu HTF bear |
| RSI Divergence | +6% nếu bull div | -6% nếu bear div |
| ChoCH | +7% nếu ChoCH bull | -7% nếu ChoCH bear |
| BB Position | +4% nếu ≤ 15% | -4% nếu ≥ 85% |
| RSI Extreme | +3% nếu RSI ≤ 25 | -3% nếu RSI ≥ 75 |
| Win-rate lịch sử | Điều chỉnh nhẹ | Điều chỉnh nhẹ |

**Kết quả kẹp trong khoảng 12% – 88%** (không bao giờ đưa ra xác suất tuyệt đối).

### Cách đọc

| Xác suất Tăng | Độ mạnh | Hành động gợi ý |
|--------------|---------|-----------------|
| `70-88%` | STRONG | Ưu tiên MUA mạnh — chờ pullback về zone |
| `55-69%` | MEDIUM | Thiên hướng MUA — cần trigger xác nhận |
| `45-55%` | WEAK | Sideway — chờ rõ hướng |
| `31-44%` | MEDIUM | Thiên hướng BÁN — cần trigger xác nhận |
| `12-30%` | STRONG | Ưu tiên BÁN mạnh — chờ pullback lên zone |

> ⚠️ **QUAN TRỌNG:** Đây là **đánh giá xác suất**, KHÔNG phải dự đoán. Xác suất 70% tăng vẫn có 30% giảm. Luôn đặt Stop Loss.

---

## 8. Đọc Hiểu Tín Hiệu Giao Dịch

### Tín hiệu MUA

Xuất hiện khi **tất cả** điều kiện sau đồng thời thỏa:

1. ✅ Giá chạm **Demand Zone** (hộp xanh)
2. ✅ Zone còn "trinh" (chạm lần đầu nếu bật `first_touch_only`)
3. ✅ Xuất hiện **mô hình nến đảo chiều tăng** (Hammer / Engulfing / Morning Star)
4. ✅ Confluence Score ≥ `min_score`

### Tín hiệu BÁN

Tương tự nhưng ngược lại:

1. ✅ Giá chạm **Supply Zone** (hộp đỏ)
2. ✅ Zone còn "trinh"
3. ✅ Xuất hiện **mô hình nến đảo chiều giảm** (Shooting Star / Engulfing / Evening Star)
4. ✅ Confluence Score ≥ `min_score`

### Đọc nhãn tín hiệu

```
MUA STRONG ⭐⭐⭐        ← Score 7.0+: rất tin cậy
MUA MEDIUM ⭐⭐          ← Score 5.0-6.9: tin cậy trung bình
MUA WEAK ⭐              ← Score 4.0-4.9: thận trọng

Engulfing                ← Tên mô hình nến trigger
Units: 0.45              ← Khối lượng tính theo risk management
Entry: 65,432.10         ← Giá vào lệnh (= close nến tín hiệu)
Score: 7.5/10            ← Điểm confluence chi tiết
```

### SL / TP trên chart

```
                          TP2 ─────────────── (xanh, xa nhất)
                          
                          TP1 ─────────────── (cam, gần)
                          
●─── Entry ──────────────────────────────────
                          
                          SL ──────────────── (đỏ, dưới entry)
```

**Quy tắc quản lý vị thế gợi ý:**
- Khi giá đạt **TP1** → Chốt 50% vị thế, dời SL về Entry (hòa vốn)
- Khi giá đạt **TP2** → Chốt phần còn lại
- Khi giá chạm **SL** → Cắt lỗ toàn bộ — **không gỡ SL**

---

## 9. Confluence Score

### Bảng tính chi tiết

#### Cho tín hiệu MUA (tại Demand Zone)

| Layer | Yếu tố | Điều kiện | Điểm |
|-------|--------|-----------|------|
| **1 — Context** | EMA Regime | Giá > EMA 200 | +1.0 |
| | Market Structure | BOS Bullish | +1.5 |
| | | Undefined | +0.5 |
| | | BOS Bearish | +0.0 |
| | HTF Alignment | HTF bullish | +1.0 |
| | Session | Trong phiên | +0.5 |
| **2 — Zone** | Freshness | Chạm ≤ 1 lần | +1.0 |
| | | Chạm 2 lần | +0.5 |
| | | Chạm 3+ lần | +0.0 |
| | Strength | Score ≥ 1.0 | +1.0 |
| | | Score < 1.0 | +score |
| **3 — Trigger** | Candlestick Pattern | Có pattern bullish | +2.0 |
| | RSI Divergence | Bullish divergence | +1.5 |
| | Volume Surge | Volume > 1.5× MA (khi bật) | +0.5 |
| | **TỔNG TỐI ĐA** | | **10.0** |

### Ví dụ thực tế

```
Scenario: BTC/USDT 4H — Giá pullback về Demand Zone

Layer 1:
  ✅ Giá > EMA 200                        → +1.0
  ✅ Market Structure = Bullish (BOS↑)     → +1.5  
  ✅ HTF (Daily) = Bullish                 → +1.0
  ✅ Trong phiên NY                        → +0.5
                                    Subtotal: 4.0

Layer 2:
  ✅ Zone chạm lần đầu                    → +1.0
  ✅ Zone strength = 1.25 (có volume)      → +1.0
                                    Subtotal: 2.0

Layer 3:
  ✅ Bullish Engulfing tại zone            → +2.0
  ❌ Không có RSI Divergence               → +0.0
  ❌ Volume bình thường                    → +0.0
                                    Subtotal: 2.0

TỔNG: 8.0/10 → STRONG ⭐⭐⭐ → VÀO LỆNH MUA
```

---

## 10. Quy Trình Giao Dịch

### Bước 1: Đọc bối cảnh (30 giây)

Nhìn **Dashboard** góc phải trên:
- [2] HTF + [3] EMA + [4] BOS cùng hướng? → Xác định bias (thiên hướng)
- [5] RSI có ở vùng cực? → Cẩn thận nếu quá mua/bán
- [6] Có Divergence? → Chuẩn bị đảo chiều

### Bước 2: Xác định vùng giá (10 giây)

- Giá đang gần **hộp xanh** (Demand)? → Tìm cơ hội MUA
- Giá đang gần **hộp đỏ** (Supply)? → Tìm cơ hội BÁN
- Giá ở giữa? → **Chờ** — không vào lệnh khi giá lơ lửng

### Bước 3: Chờ trigger (tín hiệu tự động)

- Khi tín hiệu xuất hiện → Đọc nhãn MUA/BÁN
- Score ≥ 7 → Vào full vị thế
- Score 5-6.9 → Vào nửa vị thế
- Score 4-4.9 → Cân nhắc kỹ hoặc bỏ qua

### Bước 4: Quản lý lệnh

```
Vào lệnh → Đặt SL (theo đường đỏ)
         → Đặt TP1 (theo đường cam)
         → Đặt TP2 (theo đường xanh)
         
Khi chạm TP1 → Chốt 50%, dời SL về Entry
Khi chạm TP2 → Chốt hết
Khi chạm SL  → Chấp nhận lỗ, KHÔNG gỡ SL
```

### Bước 5: Đánh giá

- Theo dõi **Win-Rate** trên Dashboard
- Win-rate > 55% → Hệ thống phù hợp asset/timeframe này
- Win-rate < 40% → Cần điều chỉnh `min_score` hoặc đổi timeframe

---

## 11. Thiết Lập Gợi Ý

### 🪙 Crypto (BTC, ETH, SOL...)

```
Khung thời gian: 4H (chính) + 1D (HTF tự động)
min_score: 4.0
EMA: 200
Session Filter: TẮT (crypto 24/7)
Volume Filter: TẮT (volume crypto không ổn định)
FVG/Imbalance: TẮT
SL ATR: 1.5
R:R TP1: 1.5 | TP2: 3.0
```

### 💱 Forex (EUR/USD, GBP/USD...)

```
Khung thời gian: 1H (chính) + 4H (HTF tự động)
min_score: 4.5
EMA: 200
Session Filter: BẬT (London + NY)
Volume Filter: TẮT (volume Forex không chính xác)
FVG/Imbalance: BẬT
Forex (Lot): BẬT
SL ATR: 1.5
R:R TP1: 1.5 | TP2: 2.5
```

### 📈 Chứng khoán Việt Nam

```
Khung thời gian: 1D
min_score: 3.5
EMA: 200
Session Filter: TẮT (không cần cho daily)
Volume Filter: BẬT (volume stock có ý nghĩa)
FVG/Imbalance: TẮT
SL ATR: 2.0 (stock ít volatile hơn crypto)
R:R TP1: 1.5 | TP2: 3.0
```

### 📊 Chứng khoán Mỹ (SPY, AAPL...)

```
Khung thời gian: 1H (intraday) hoặc 1D (swing)
min_score: 4.0
EMA: 200
Session Filter: BẬT cho 1H, TẮT cho 1D
Volume Filter: BẬT
FVG/Imbalance: TẮT
SL ATR: 1.5
R:R TP1: 1.5 | TP2: 3.0
```

---

## 12. Alerts

Hệ thống có **5 loại cảnh báo** có thể thiết lập trên TradingView:

| Alert | Khi nào kích hoạt | Mức độ |
|-------|-------------------|--------|
| **MUA tại Demand** | Tín hiệu BUY đầy đủ xuất hiện | ⭐⭐⭐ Quan trọng nhất |
| **BÁN tại Supply** | Tín hiệu SELL đầy đủ xuất hiện | ⭐⭐⭐ Quan trọng nhất |
| **ChoCH Bullish** | Đảo chiều cấu trúc sang tăng | ⭐⭐ Cảnh báo sớm |
| **ChoCH Bearish** | Đảo chiều cấu trúc sang giảm | ⭐⭐ Cảnh báo sớm |
| **BB Squeeze** | Bollinger siết → sắp breakout | ⭐ Thông tin |

### Cách thiết lập Alert trên TradingView

1. Click chuột phải vào chart → **Add Alert**
2. Chọn **Condition**: "Hybrid Trading System V5"
3. Chọn alert cần thiết (VD: "MUA tại Demand")
4. Chọn **Once Per Bar Close** (khuyến nghị)
5. Thiết lập thông báo (Push, Email, Webhook...)

### JSON Alert (cho Bot/Webhook)

Khi tín hiệu MUA/BÁN kích hoạt, hệ thống cũng gửi alert JSON:

```json
{
  "action": "BUY",
  "symbol": "BTCUSDT",
  "price": 65432.10,
  "sl": 64682.10,
  "tp1": 66182.10,
  "tp2": 67682.10,
  "size": 0.45,
  "score": 7.5
}
```

Có thể dùng Webhook để kết nối với bot tự động (3Commas, Alertatron, etc.)

---

## 13. FAQ

### ❓ "Tại sao indicator ít tín hiệu?"

**Đó là thiết kế có chủ đích.** V5 yêu cầu:
- Giá phải ở trong zone + có candlestick pattern + đủ score

Nếu muốn nhiều tín hiệu hơn:
- Giảm `min_score` xuống 3.0-3.5
- Giảm `Pivot Zone (Trái)` xuống 10-15 (tạo nhiều zone hơn)

### ❓ "Bollinger Bands không lọc tín hiệu à?"

**Đúng.** Trong V5, BB chỉ là **visual reference** — giúp bạn nhìn vị trí giá so với biến động. BB **không** chặn tín hiệu MUA/BÁN. Lý do: BB filter mâu thuẫn với EMA regime (xem phân tích V4).

### ❓ "Indicator có repaint không?"

**Không.** Tất cả logic chạy trên `barstate.isconfirmed`. Tuy nhiên:
- **Pivot zones** xuất hiện trễ `pivot_right` nến → Đây là delay xác nhận, không phải repaint
- **Dashboard + Bảng xác suất** cập nhật real-time trên nến cuối (`barstate.islast`) — đây là bình thường

### ❓ "Win-rate bao nhiêu là tốt?"

| Win-rate | Đánh giá | Hành động |
|----------|----------|-----------|
| > 60% | Tốt | Tiếp tục sử dụng |
| 50-60% | Trung bình | Cân nhắc tăng `min_score` |
| 40-49% | Yếu | Kiểm tra lại timeframe và asset |
| < 40% | Kém | Đổi thiết lập hoặc thị trường |

> Với R:R 1:1.5 trở lên, win-rate > 45% đã có lợi nhuận dương (expectancy > 0).

### ❓ "BOS và ChoCH khác nhau thế nào?"

- **BOS (Break of Structure):** Phá vỡ swing gần nhất **theo cùng hướng** → Xu hướng tiếp tục
- **ChoCH (Change of Character):** Phá vỡ swing gần nhất **ngược hướng** → Xu hướng đảo chiều

```
BOS↑: Đang tăng → phá đỉnh cũ → TIẾP TỤC tăng
ChoCH↑: Đang GIẢM → bất ngờ phá đỉnh cũ → ĐẢO CHIỀU sang tăng
```

### ❓ "Tại sao xác suất không bao giờ vượt 88%?"

**Có chủ đích.** Không có phương pháp nào dự đoán thị trường chính xác > 88%. Kẹp 12-88% để:
- Tránh "overconfidence" — quá tự tin
- Nhắc nhở luôn **đặt Stop Loss**
- Tư duy xác suất thay vì "chắc chắn"

### ❓ "Có nên kết hợp với indicator khác?"

**Không khuyến khích.** V5 đã tích hợp đủ:
- Trend (EMA + BOS) 
- Momentum (RSI Divergence)
- Volatility (BB + ATR)
- Zone (Supply/Demand)
- Pattern (6 mô hình nến)

Thêm indicator sẽ **trùng lặp thông tin** và gây confusion.

### ❓ "Nến Doji có được nhận diện không?"

**Không.** V5 chỉ nhận diện 6 mô hình nến có **xác suất đảo chiều cao nhất** theo thống kê. Doji đơn lẻ có tỷ lệ thành công thấp. Doji nằm trong Morning Star / Evening Star đã được bao phủ.

---

## 14. Changelog V4 → V5

### ❌ Đã xoá
| Thành phần | Lý do |
|------------|-------|
| MACD Divergence | Logic sai — chỉ dùng 1 điểm, không so sánh 2 pivot |
| RSI threshold filter (≤30/≥70) | Trùng lặp BB, mâu thuẫn EMA |
| BB filter (MUA/BÁN) | Mâu thuẫn: close > EMA200 AND close ≤ BB lower gần như không xảy ra |
| Trend Streak Engine | Quá đơn giản, 3 nến sideway vẫn trigger |
| Future Prediction Line | Đường thẳng tuyến tính không có cơ sở khoa học |
| Biến `vol_ok_global` | Dead code |

### ✅ Thêm mới
| Thành phần | Giá trị |
|------------|---------|
| BOS (Break of Structure) | Xác nhận xu hướng theo SMC |
| ChoCH (Change of Character) | Phát hiện đảo chiều cấu trúc |
| RSI Divergence (chính xác) | So sánh 2 pivot RSI vs 2 pivot giá |
| 6 Candlestick Patterns | Hammer, Shooting Star, Engulfing, Morning/Evening Star |
| Probability Panel | Xác suất 12-88%, cường độ Weak/Medium/Strong |
| BB Squeeze Detection | Phát hiện Bollinger siết → sắp breakout |

### 🔧 Sửa lỗi
| Lỗi | Fix |
|-----|-----|
| Win-Rate lookahead bias | Per-bar SL check qua mảng `wr_sl_hit` |
| Trigger overfitting (8+ AND) | Chỉ 3 điều kiện cứng + weighted score |
| Confluence binary (0-6) | Weighted score 0-10 chia 3 layer |

### 📉 Giảm inputs
- V4: 25+ thông số → V5: ~20 thông số (gom nhóm logic hơn)
- Loại bỏ các toggle chồng chéo (BB filter, RSI filter, wick ratio riêng...)

### 🚀 Bản Nâng Cấp V5.1
| Thành phần | Chi tiết nâng cấp |
|------------|------------------|
| **Vẽ Phân Kỳ RSI** | Vẽ đường phân kỳ (dashed line) và nhãn trực quan trên chart giúp dễ dàng nhận biết momentum đảo chiều |
| **Dashboard động** | Cho phép bật/tắt hiển thị từng dòng riêng lẻ trên Dashboard. Bảng điều khiển tự động co giãn kích thước |
| **Bảng xác suất độc lập** | Thêm toggle `show_prob_table` để ẩn/hiện bảng xác suất độc lập với Dashboard |
| **Dọn dẹp code & Tối ưu** | Loại bỏ 14+ dòng code chết chứa các biến khai báo thừa, tối ưu hóa tính toán `bb_pct` chỉ 1 lần chung |

---

## ⚠️ Disclaimer — Miễn Trừ Trách Nhiệm

> **Công cụ này KHÔNG phải lời khuyên tài chính.** Mọi quyết định giao dịch là trách nhiệm của bạn. Không có hệ thống nào đạt 100% chính xác. Luôn:
> - Đặt **Stop Loss** cho mọi lệnh
> - Rủi ro tối đa **1-2% vốn** mỗi lệnh
> - **Backtest** trước khi dùng tiền thật
> - Kết hợp phân tích cơ bản nếu giao dịch dài hạn

---

*Tài liệu cập nhật: V5 — 3-Layer Confluence Engine*  
*© congtuuit*
