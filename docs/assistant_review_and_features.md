# Trading Assistant Plan Review & Brainstormed Features

> **Target Project**: Trading Portfolio Pro (Chrome Extension MV3)  
> **Source Reference**: [file.md](file:///Users/tuvan/Documents/trading-portfolio-pro/file.md)  
> **Status**: Approved for Phase 3 Upgrades  

---

## 1. Executive Review of `file.md` Proposal

### Strengths Identified
1. **Hybrid Quantitative + AI Reasoning Model**:
   - The proposal separates deterministic calculations (indicators, support/resistance, R:R calculation, position sizing in `scorer.js` & `utils.js`) from qualitative AI reasoning in `ai.js`. AI does not guess technical numbers; it interprets pre-calculated metrics.
2. **Modular Decoupling (`assistant_engine.js` & `ui_assistant.js`)**:
   - `ui.js` is already ~1950 lines and `app.js` is ~500 lines. Creating dedicated assistant orchestration and rendering modules avoids creating unmaintainable god-nodes and minimizes regression risks.
3. **Strict JSON Schema Contracts**:
   - Moving away from unstructured Markdown in favor of structured JSON payloads ensures that the UI can render interactive progress bars, rating badges, staged targets, and 1-click action triggers.

### Critical Gaps & Real-World Considerations
1. **TradingView Page Synergy**:
   - Because the extension is injected directly into `tradingview.com` via `content.js`, it should interact seamlessly with the live chart instead of forcing the user to type tickers manually.
2. **Market Microstructure (Vietnam Stock Market & Crypto)**:
   - **Vietnam (VSE/HOSE/HNX)**: Must consider the T+2.5 settlement cycle (unsettled shares cannot be partially closed immediately), statutory price limits (+/-7% HOSE, +/-10% HNX, +/-15% UPCOM), and foreign investor net flows.
   - **Crypto**: 24/7 trading, higher volatility, tighter trailing stops, and funding rate awareness.
3. **Cloud Sync Integration**:
   - Newly added Google Sheets cloud sync (`sheets_sync.js`) can store generated plans and post-mortem journal entries so they remain accessible across machines and browsers.

---

## 2. Brainstormed Killer Features (Recommended Upgrades)

### 🚀 Feature 1: Zero-Click Active Chart Symbol Auto-Detection
- **Concept**: When browsing any chart on `tradingview.com/chart/...`, `content.js` automatically detects the active ticker from the URL or the DOM (e.g., chart header).
- **Behavior**:
  - The floating widget trigger (`🤖`) displays an instant badge with the rating (e.g., `FPT: 82/100 | WAIT_PULLBACK`).
  - Opening the Smart Stock Assistant tab automatically pre-fills and analyzes the active chart symbol with zero typing needed.

### 🎯 Feature 2: 1-Click "Apply Staged Plan to Position"
- **Concept**: Bridge the gap between AI analysis and active portfolio management.
- **Behavior**:
  - When Portfolio Assistant produces a staged plan (TP1: 30% at 128k, TP2: 40% at 135k, Trailing Stop at 118k), display an **"⚡ Áp Dụng Vào Vị Thế"** button.
  - Clicking this button updates the trade's `takeProfit` / `stopLoss` parameters in `chrome.storage.local`, updates the Google Sheet via `sheets_sync.js`, and configures the background monitor to trigger Telegram alerts when targets are reached.

### 🛡️ Feature 3: Portfolio Health Index & Risk Sentinel
- **Concept**: Real-time evaluation of portfolio fragility and capital allocation.
- **Metrics Calculated**:
  - **Concentration Risk**: Herfindahl-Hirschman Index (HHI) detecting if any single stock or sector exceeds 35-40% allocation.
  - **Win/Loss Engine Health**: Ratio of trend-aligned positions vs decaying positions.
  - **Margin / Liquidity Buffer**: Suggested cash cushion based on current market regime.
  - **Rebalancing Advice**: Proactive suggestions to trim weak/broken structural holdings to fund T0 averaging on high-conviction winners.

### 📈 Feature 4: 1-Click Pine Script Box / Chart Level Exporter
- **Concept**: Visually plot the AI's Entry Zone, TP1, TP2, and Stop Loss directly onto the user's TradingView chart.
- **Behavior**:
  - In the Smart Stock Assistant card, provide a **"📋 Copy Pine Script Levels"** button.
  - Generates ready-to-paste Pine Script code with `box.new` and `line.new` (Green for TP, Red for SL, Amber for Entry Zone).
  - Users paste it into the TradingView Pine Editor to instantly see visual zone boxes overlaid on their candlesticks.

### 🔔 Feature 5: Real-time Alert Webhook & Telegram Signal Bridge
- **Concept**: Connect the alert catcher in `content.js` with `background.js` and `telegram.js`.
- **Behavior**:
  - `content.js` intercepts Pine Script alert JSON payloads (`NEW_SIGNAL`).
  - `background.js` listens to `NEW_SIGNAL`, queries `assistant_engine.js` for quick validation, and pushes an instant alert to Telegram:
    `"⚡ Tín hiệu BUY FPT tại 120.0 từ Pine Script! Rating: 84/100 (Hợp lệ)."`

### 📓 Feature 6: AI Post-Mortem Trading Journal
- **Concept**: Automated trade review upon position closure.
- **Behavior**:
  - When closing a trade via `handleTakeProfit`, prompt an automated AI review:
    - Realized PnL vs Target R:R.
    - Discipline check: Did the trader exit early (panic sell) or hold according to plan?
  - Logs the evaluation into `tradeHistory` and syncs to a `Journal` tab in the user's Google Sheet.

---

## 3. Enhanced Assistant Engine Specification (`assistant_engine.js`)

```javascript
/**
 * assistant_engine.js
 * Core engine combining market snapshots, deterministic scoring,
 * and structured AI prompt preparation.
 */

export async function buildSmartStockPlan(symbol, settings) {
  // 1. Fetch live snapshot (price, indicators, technicals)
  const snapshot = await fetchDeepResearchData(symbol);
  if (!snapshot) throw new Error("Không tìm thấy dữ liệu cho mã " + symbol);

  // 2. Deterministic scoring via scorer.js & utils.js
  const technicalRating = computeLocalScore(snapshot, settings);
  const zones = calculateKeyZones(snapshot); // Support, resistance, EMA pivots

  // 3. Construct structured prompt with context constraints
  const plan = await queryStructuredAI({
    symbol,
    snapshot,
    technicalRating,
    zones,
    settings
  });

  return plan;
}

export async function buildPortfolioPlan(portfolio, priceMap, settings) {
  // 1. Calculate health score and sector allocations locally
  const sectorAlloc = calculateSectorAllocation(portfolio);
  const positionMetrics = portfolio.map(trade => analyzePositionLocally(trade, priceMap[trade.symbol]));

  // 2. Ask AI to formulate staged take-profit and capital rotation strategy
  return await queryPortfolioAI({
    portfolio: positionMetrics,
    sectorAlloc,
    settings
  });
}
```

---

## 4. Refined Implementation Roadmap

| Phase | Milestone | Deliverables |
| :--- | :--- | :--- |
| **Phase 1** | **Smart Stock Assistant MVP** | - New module `assistant_engine.js`<br>- Ticker search + TradingView active symbol detection<br>- Local scoring + Structured AI plan<br>- Interactive UI card in popup & widget (Entry Zone, TP1/TP2, SL, R:R) |
| **Phase 2** | **Portfolio Assistant & Staged TP** | - Portfolio health score & sector concentration meter<br>- Staged TP recommendations (TP1 30%, TP2 40%, Trailing SL)<br>- 1-click "Áp dụng vào vị thế" & Cloud sync |
| **Phase 3** | **Chart Integration & Signal Bridge** | - Copy Pine Script levels button for direct chart overlay<br>- Connect `NEW_SIGNAL` in `background.js` for Telegram push<br>- Auto-trading journal on position closure |
