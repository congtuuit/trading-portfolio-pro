# Plan: Trading Portfolio Pro v2.0 - The Smart Strategist
Created: 2026-04-08
Status: 🟡 In Progress

## Overview
Nâng cấp ứng dụng Trading Portfolio Pro lên phiên bản v2.0 với các tính năng quản trị rủi ro thông minh (Thay nước T0), bộ phân tích điểm vào/ra tối ưu và trợ lý AI chủ động.

## Tech Stack
- Frontend: HTML/CSS/Javascript (Vanilla)
- Extension API: Chrome Extension Manifest v3
- Storage: Chrome Local Storage
- AI: Google Gemini / OpenAI API

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | 🌊 T0 Strategy Engine | ⬜ Pending | 0% |
| 02 | 🎯 Smart Entry/Exit Analyzer | ⬜ Pending | 0% |
| 03 | 🤖 Proactive AI & Context Support | ⬜ Pending | 0% |
| 04 | 📊 Dashboard & UI Polish | ⬜ Pending | 0% |
| 05 | ✅ Integration & Final Testing | ⬜ Pending | 0% |

## 🆙 Swing Trading Intelligence Upgrade (v2.1)

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| S1 | 📦 Data & Settings Foundation | ✅ Complete | 100% |
| S2 | 🧠 AI Price Action Prompt | ✅ Complete | 100% |
| S3 | ⚖️ Risk & Reward Engine | 🟡 In Progress | 0% |
| S4 | 📈 Multi-timeframe & Mini Chart | ⬜ Pending | 0% |

### S1 - Checklist:
- [x] Tạo `history.js` (module độc lập, fetch OHLCV lịch sử)
- [x] `background.js`: Thêm handler `FETCH_HISTORY`
- [x] `storage.js`: Thêm default `lookbackPeriods: 20`
- [x] `popup.html`: Thêm Slider cấu hình (10-200 phiên)

### S2 - Checklist:
- [x] Nâng cấp `ai.js` hỗ trợ tham số `historyText`
- [x] Thiết kế Prompt chuyên sâu về Price Action & Patterns
- [x] Tích hợp luồng fetch history vào `handleAskAdvisor` trong `app.js`

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
