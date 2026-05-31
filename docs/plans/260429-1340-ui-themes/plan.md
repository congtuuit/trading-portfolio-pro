# Plan: Modern UI & Theme System Upgrade
Created: 2026-04-29
Status: ✅ Complete

## Overview
Nâng cấp giao diện Trading Portfolio Pro lên tầm cao mới với hệ thống đa giao diện (Multi-theme). Giữ nguyên bản sắc TradingView (Default) và bổ sung 2 phong cách công nghệ cao: Cyber Pulse và Crystal Glass.

## Tech Stack
- Frontend: CSS Variables, Glassmorphism, CSS Animations
- Storage: chrome.storage.local (Lưu tùy chọn theme)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| U1 | ⚙️ Theme Engine Foundation | ✅ Complete | 100% |
| U2 | 💎 Crystal Glass Theme | ✅ Complete | 100% |
| U3 | ⚡ Cyber Pulse Theme | ✅ Complete | 100% |
| U4 | ✨ UI Polish & Typography | ✅ Complete | 100% |

## Checklist Details

### Phase U1: Theme Engine Foundation
- [ ] Refactor `style.css` để sử dụng bộ biến CSS Variables tập trung.
- [ ] Cập nhật `storage.js` để lưu trữ key `theme`.
- [ ] Cập nhật UI Settings: Thêm dropdown chọn Theme.
- [ ] Logic chuyển đổi Theme trong `app.js` (Apply class to root).

### Phase U2: Crystal Glass Theme
- [ ] Thiết kế bộ màu "Transparent Blue".
- [ ] Áp dụng `backdrop-filter: blur()` cho các cards và modal.
- [ ] Tinh chỉnh viền (borders) siêu mỏng và đổ bóng (soft shadows).

### Phase U3: Cyber Pulse Theme
- [ ] Thiết kế bộ màu "Neon Cyberpunk".
- [ ] Thêm hiệu ứng "Glow" (phát sáng) cho các thẻ cổ phiếu và Badge lãi/lỗ.
- [ ] Thêm hiệu ứng đường chạy (Shimmer) cho các phần tử đang loading.

### Phase U4: UI Polish & Typography
- [ ] Nâng cấp Font chữ sang bộ font tech-modern (Outfit/Space Grotesk).
- [ ] Thay thế các icon thô bằng bộ icon SVG mượt mà hơn.
- [ ] Cải thiện các chuyển cảnh (Transitions) giữa các Tab.

## Quick Commands
- Start Theme Setup: `/code phase-u1`
- Check progress: `/next`
- Save context: `/save-brain`
