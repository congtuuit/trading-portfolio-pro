# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Trading Portfolio Pro is a Chrome Extension Manifest V3 app for tracking a trading portfolio, calculating real-time PnL, scanning Vietnam stocks and major crypto pairs through TradingView Scanner APIs, and using Gemini/OpenAI for trading advice. The app is vanilla JavaScript with ES modules, no framework, and no package manifest or build step.

## Common commands

There is no `package.json`, npm script, bundled test runner, or compile step in the current repository.

```powershell
# Syntax-check all top-level JavaScript modules
Get-ChildItem -Path . -Filter *.js | ForEach-Object { node --check $_.FullName }

# Syntax-check a single module after editing it
node --check ui.js
node --check app.js
node --check ai.js
node --check price.js
node --check scorer.js
node --check storage.js
```

Manual extension workflow:

1. Open Chrome/Edge at `chrome://extensions/`.
2. Enable Developer Mode.
3. Click **Load unpacked** and select this repository folder.
4. After edits, click the extension **Reload/Update** button in `chrome://extensions/`.
5. Use DevTools on the extension popup/side panel and the service worker console to inspect runtime errors.

Testing guidance:

- There are currently no automated tests in the repo.
- Use `node --check <file>` as the fast regression check for parser errors.
- For behavior changes, load the unpacked extension and verify the affected flow manually: popup, Chrome side panel, floating widget content script, TradingView scanner, AI calls, or Telegram notifications as applicable.

## Runtime entry points

- `manifest.json` declares MV3 permissions, the `background.js` module service worker, `popup.html` as the side panel, `content-loader.js` as the `<all_urls>` content script, and the files exposed through `web_accessible_resources`.
- `popup.html` contains the static UI shell and loads `popup.js`; `popup.js` calls `initApp(document)`.
- `content-loader.js` dynamically imports `content.js`, rewriting relative ES module imports to extension URLs so the content script can use the same modules.
- `content.js` injects a Shadow DOM floating widget into arbitrary pages, copies `popup.html` body content into the widget, links `style.css`, then calls `initApp(shadow)`. It also observes TradingView pages for alert JSON snippets and hides GoPro dialogs.
- `background.js` is the MV3 service worker. It owns alarm-based portfolio monitoring, Telegram notifications, and message handlers that proxy TradingView requests for content-script contexts.

## High-level architecture

The central pattern is: UI roots call `initApp(root)` from `app.js`; `app.js` owns app state and orchestration; `ui.js` renders/binds DOM under the provided `root`; data modules provide storage, market data, scoring, AI, and calculations.

### Core orchestration

`app.js` is the application orchestrator. It loads persisted portfolio/settings/history/scanner caches from `storage.js`, keeps in-memory state (`portfolio`, `currentPriceMap`, `appSettings`, scan results), and wires callbacks into `ui.js` binding functions. It starts a 30-second price refresh loop for the active UI, recalculates summary data, checks proactive alert conditions, and persists portfolio/history/scanner changes.

Important flows in `app.js`:

- Portfolio save/edit/delete: validate symbol with `fetchPricesMap()`, update `portfolio`, persist via `savePortfolio()`, and re-render.
- T0 / partial close: update entry prices and trade history, optionally offset realized PnL into another open position.
- Scanner: send `SCAN_STOCKS` or `SCAN_CRYPTO` to `background.js`, rank results with `rankStocks()`, persist raw/ranked results, and render both raw and AI-filtered lists.
- AI advisor: pre-rank scan data, compress it with `prepareDataForAI()`, call `screenPotentialStocks()`, filter by configured minimum R:R, cache detailed advice per symbol for 24h, and render modal/deep-research output.

### UI layer

`ui.js` contains renderers and event binding for portfolio cards, forms, tabs, settings, scanner results, history, DCA/T0 modals, side panel button, and deep research output. It expects a `root` parameter (`document` for popup/side panel or `ShadowRoot` for injected widget) and uses `root.querySelector(...)` throughout so the same UI logic works in both contexts.

When changing UI structure, keep `popup.html` element IDs synchronized with `ui.js` bind/render functions. Many flows depend on specific IDs such as `#portfolio-list`, `#btn-scan-market`, `#btn-ai-analyze`, `#modal-analysis`, settings inputs, and history/DCA modal controls.

### Market data and scanner pipeline

`price.js` handles individual symbol lookup and deep research snapshots through TradingView Scanner endpoints. It normalizes user input into TradingView ticker candidates for VN exchanges (`HOSE:`, `HNX:`, `UPCOM:`) and crypto exchanges (`BINANCE:`, `COINBASE:`, etc.). If called from a normal webpage content-script context, it proxies through `chrome.runtime.sendMessage`; if called inside the extension origin/service worker, it fetches TradingView directly.

`scanner_data.js` scans broader universes:

- `scanVietnamStocks()` posts to `https://scanner.tradingview.com/vietnam/scan` and returns normalized VN stock records.
- `scanCryptoCoins()` posts to `https://scanner.tradingview.com/crypto/scan` for a fixed top-crypto ticker list.
- `prepareDataForAI()` compresses scanner records into a compact schema with Bollinger position, EMA distance, MACD direction, volume ratio, score, and grade fields to reduce AI prompt size.

`scorer.js` implements the local pre-AI scoring engine. It mirrors the project’s Pine Script v5.5 style of confluence scoring: trend, momentum/anti-overbought, volume, entry safety, relative strength, projected win rate, breakout distance, candle pattern, and probability. Scanner results are ranked locally before being sent to AI.

### Calculations and data model notes

- `utils.js` holds shared calculation helpers: price divisor, HTML escaping, T0 scenario math, R:R, markdown-to-HTML formatting, position sizing, candle pattern, probability, confluence score, and sector allocation.
- `getDivisor(symbol)` is important: Vietnamese stock prices from TradingView use full values and display calculations often divide `HOSE:`, `HNX:`, and `UPCOM:` symbols by `1000`; crypto and global assets use divisor `1`.
- `pnl.js` calculates trade-level and aggregate PnL.
- `analysis.js` provides Fibonacci levels and basic entry/exit suggestions from scanner snapshots.

### Persistence

`storage.js` is the only persistence abstraction. It stores all app data in `chrome.storage.local`, including:

- `tpp_portfolio`
- `tpp_settings`
- `tpp_chat_history`
- `tpp_trade_history`
- `tpp_scanner_results` / `tpp_scanner_time`
- `tpp_raw_scanner`
- `tpp_ranked_results`
- `tpp_cache_<symbol>` for 24-hour AI advice cache
- `tpp_logs`
- `tpp_caught_signals`

Preserve these key names unless intentionally migrating existing users’ stored data.

### AI integration

`ai.js` supports Gemini and OpenAI. `queryAI()` chooses the provider from settings, uses configured API key/model, logs prompts/responses through `addSystemLog()`, and throws localized errors for missing configuration. Higher-level functions build Vietnamese trading prompts for:

- AI screener selection (`screenPotentialStocks()`), with strict JSON output expectations and fallback parsing for malformed AI responses.
- Detailed symbol advice (`getDetailedAdvice()`).
- Deep stock research (`analyzeDeepStock()`).
- Dynamic model discovery (`fetchModels()`).

The README documents Gemini/OpenAI setup. `popup.html` currently shows default model guidance in the settings modal; ensure that defaults in UI text and `ai.js` stay aligned when changing provider behavior.

### Background service worker and external integrations

`background.js` handles:

- `FETCH_PRICES` and `FETCH_DEEP_RESEARCH` message proxying to TradingView.
- `SCAN_STOCKS` and `SCAN_CRYPTO` scanner requests.
- A `tpp_monitor_alarm` Chrome alarm every 10 minutes when Telegram notifications are enabled.
- TP/SL and T0-opportunity checks that send Telegram messages through `telegram.js` and update alert flags on portfolio trades.
- Side panel behavior setup via `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` on install/startup.

`telegram.js` wraps Telegram Bot API `sendMessage` with HTML parse mode.

## Documentation and related specs

- `README.md` contains user-facing install/setup/use instructions and a concise architecture summary.
- `docs/specs/ai_advisor_spec.md` describes the two-step Smart Screener + AI Advisor funnel and output expectations.
- `docs/specs/ai_deep_research_spec.md` describes the intended deep research feature and planned TCBS data sources.
- `docs/architecture/system_overview.md` is useful background, but parts are stale compared with the current tree (for example, it references `history.js`, which is not present in the current top-level files). Verify architecture docs against code before relying on them.

## Repo-specific cautions

- The same `initApp(root)` path is used by both the extension UI and injected Shadow DOM widget; avoid assuming `document` unless the function explicitly defaults to it.
- Content-script network calls may need to route through `background.js` because TradingView/API requests can fail under webpage CORS constraints.
- `content.js` currently sends a `NEW_SIGNAL` message when it detects TradingView alert JSON, but `background.js` does not currently handle `NEW_SIGNAL`.
- Keep `manifest.json` `web_accessible_resources` in sync whenever adding modules/assets used by `content.js` or dynamically loaded UI.
- Avoid including `.claude/worktrees/` copies in repository-wide searches or docs; they are generated worktree snapshots and duplicate source files.
