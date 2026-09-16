# AGENTS.md — Workspace Agent Guidance & Project Brain

> **Project**: Trading Portfolio Pro  
> **Type**: Chrome Extension (Manifest V3)  
> **Tech Stack**: Vanilla ES Modules JavaScript, Shadow DOM, Chrome Storage Local, Google Apps Script Cloud Sync, Telegram Bot API, Gemini/OpenAI API.  
> **Last Updated**: 2026-09-16 (Phase 3 Development)

---

## 1. System Architecture & Component Roles

Trading Portfolio Pro is a production-grade Chrome Extension for portfolio tracking, real-time PnL calculation, market scanning (Vietnam stocks and Crypto), and AI trading assistance.

```
┌─────────────────────────────────────────────────────────────┐
│ UI Contexts: Popup, Chrome Side Panel, Injected Widget     │
│ (popup.html, ui.js, style.css)                              │
└───────────────────────────▲─────────────────────────────────┘
                            │ initApp(root)
┌───────────────────────────▼─────────────────────────────────┐
│ Application Orchestrator (app.js)                           │
│ Manages in-memory state, price refresh loop, event bindings │
└──────┬────────────┬─────────────┬─────────────┬─────────────┘
       │            │             │             │
┌──────▼─────┐ ┌────▼──────┐ ┌────▼───────┐ ┌───▼───────────┐
│ storage.js │ │ price.js  │ │ scorer.js  │ │ sheets_sync.js│
│ Local DB   │ │ Market API│ │ Quant Pine │ │ Cloud Mirror  │
└──────▲─────┘ └────▲──────┘ └────▲───────┘ └───▲───────────┘
       │            │             │             │
┌──────┴────────────┴─────────────┴─────────────┴─────────────┐
│ Service Worker (background.js, type: module)                │
│ CORS Proxy, 10-min monitoring alarm, Telegram push alerts   │
└─────────────────────────────────────────────────────────────┘
```

### Module Responsibilities
- **`app.js`**: Central application coordinator. Initializes state (`portfolio`, `appSettings`, `tradeHistory`, scan caches), starts price loops, triggers auto-push to Google Sheets, binds UI events.
- **`ui.js`**: Renders trade cards, forms, modals, scanner tables, position sizing calculator, and settings. Accepts `root` (`document` or `ShadowRoot`).
- **`storage.js`**: Persistence layer over `chrome.storage.local`. Manages all `tpp_*` storage keys.
- **`sheets_sync.js`**: 2-way cloud synchronization layer between the extension and Google Sheets via Google Apps Script Web App.
- **`background.js`**: MV3 service worker. Handles alarm-based monitoring (`tpp_monitor_alarm`), Telegram alerts, and message handlers for CORS proxying (`FETCH_PRICES`, `FETCH_DEEP_RESEARCH`, `SCAN_STOCKS`, `SCAN_CRYPTO`, `SYNC_SHEETS_*`).
- **`content.js` / `content-loader.js`**: Injects the floating widget as a Shadow DOM host into websites. Enforces TradingView GoPro dialog suppression with `opacity: 0` and pointer-events protection.
- **`scorer.js` & `utils.js`**: Deterministic quantitative scoring engine modeled after Pine Script v5.5 (trend, momentum, volume ratio, R:R, position sizing).
- **`ai.js`**: Hybrid AI layer integrating Google Gemini and OpenAI for screener ranking, detailed advice, deep research, and trading plans.

---

## 2. Critical Business Rules & Invariants

1. **Dual Price Representation**:
   - Vietnamese stock prices are stored as **Full Prices** (e.g. `115000`) in `storage.js`, but displayed as **Divided Prices** (`/ 1000 = 115.0`) in the UI using `getDivisor(symbol)`.
   - Crypto and US tickers use `divisor = 1`.
2. **Deterministic-First AI Architecture**:
   - Never allow the AI to invent technical numbers (Entry, Stop Loss, Target, R:R). Always calculate them deterministically using `scorer.js` and `utils.js` first, then provide them to the AI to construct qualitative strategies.
3. **CORS Isolation**:
   - Content scripts running inside web pages cannot make direct cross-origin calls to TradingView or Google Apps Script. All external network calls from content script contexts must route through `chrome.runtime.sendMessage` to `background.js`.
4. **Google Apps Script Communication**:
   - POST requests to Google Apps Script Web Apps must use `Content-Type: text/plain;charset=utf-8` to prevent CORS preflight redirect failures during 302 redirections.
5. **TradingView Dialog Suppression**:
   - Suppress `[data-dialog-name="gopro"]` using `opacity: 0 !important; pointer-events: none !important;` rather than `display: none` to prevent TradingView's anti-adblock scripts from re-triggering.
6. **Code Modularity (Anti-Bloat Rule)**:
   - `ui.js` is ~1950 lines and `app.js` is ~500 lines. New features (e.g. Smart Stock Assistant, Portfolio Planning) should be placed in dedicated modular files (`assistant_engine.js`, `ui_assistant.js`) rather than inflating existing god-nodes.

---

## 3. Storage Keys (`storage.js`)

Do not alter or delete existing keys without explicit data migration:
- `tpp_portfolio`: Active open trades array.
- `tpp_settings`: Configuration object (`aiProvider`, `apiKey`, `tgToken`, `tgChatId`, `tgEnabled`, `lookbackPeriods`, `accountBalance`, `riskPercent`, `tradingStyle`, `riskLevel`, `sheetsUrl`, `sheetsAutoPush`, `sheetsAutoPull`, `sheetsLastSync`).
- `tpp_trade_history`: Closed trades and T0 realizations.
- `tpp_chat_history`: Last 50 conversational messages.
- `tpp_scanner_results` & `tpp_scanner_time`: Top AI picks cache.
- `tpp_raw_scanner` & `tpp_ranked_results`: Local scan caches.
- `tpp_cache_<symbol>`: 24-hour detailed AI advice cache.
- `tpp_caught_signals`: Captured Pine Script alert JSON payloads.
- `tpp_logs`: Last 100 system logs.

---

## 4. Verification Workflow

Before committing any code modifications:
```bash
# 1. Syntax check all top-level JavaScript files
for file in *.js; do node --check "$file" || exit 1; done

# 2. Verify git status
git status -s
```
Manual extension verification:
- Load unpacked at `chrome://extensions/` with Developer Mode enabled.
- Test in both Extension Popup/Side Panel and the Injected Shadow DOM Widget.
