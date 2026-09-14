# Trading Assistant Upgrade Proposal

## Feature review from codebase and graphify

### Current assistant/advisor logic

The repository already has most building blocks for a stronger trading assistant, but they are currently split across separate flows.

1. **Portfolio tracking**
   - Portfolio positions are stored in `chrome.storage.local` through `storage.js`.
   - `app.js` refreshes prices every 30 seconds, recalculates PnL, renders cards, and supports edit/delete/DCA/partial close.
   - `ui.js` renders each trade card with Entry, Current, SL, TP, PnL, DCA, and Close actions.

2. **Market scanner**
   - `app.js` sends `SCAN_STOCKS` or `SCAN_CRYPTO` to `background.js`.
   - Results are ranked locally with `rankStocks()` from `scorer.js`, then saved as raw/ranked scanner cache.
   - Top-ranked candidates can be sent to AI through `screenPotentialStocks()`.

3. **AI advisor**
   - `ai.js` has `getDetailedAdvice(symbol, fullData, settings, historyText = "")`.
   - It gives qualitative Markdown advice: trend, price action, safety score, win rate, R:R, entry, target, stoploss, and risk.
   - Current limitation: the detailed advisor mainly depends on `lastScannedData`, so it works best after a previous scan.

4. **Deep stock research**
   - `app.js` calls `fetchDeepResearchData(symbol)`, wraps the result, then calls `analyzeDeepStock()`.
   - `ai.js` asks AI for structured JSON with score, summary, technical, fundamental, SWOT, action, and trading plan.
   - This is close to the target-symbol assistant idea, but it is not yet integrated with portfolio strategy, local scoring, risk sizing, staged take-profit, or short/long-term plans.

5. **Chat MCP-like context**
   - `mcp.js` auto-detects symbols or slash commands such as `/analyze`, `/research`, `/dca`, `/price`, `/predict`, and `/scenarios`.
   - It uses `fetchDeepResearchData()` to inject live technical/fundamental context into chat.
   - This makes `fetchDeepResearchData()` a bridge between market data, deep research, and conversational assistant.

---

## Graphify interpretation

Graphify confirms the assistant upgrade direction:

- `app.js App Orchestrator` is the top god node.
- `queryAI()`, `fetchDeepResearchData()`, `screenPotentialStocks()`, `analyzeDeepStock()`, `getDetailedAdvice()`, and `suggestEntryExit()` are core assistant-related nodes.
- `fetchDeepResearchData()` connects **Market Data Service**, **App State Storage**, and **Chat MCP Context**.
- Thin communities include:
  - `Historical Data Engine`
  - `Smart Strategist Plan`
  - `Zone Engine Rules`
  - `Deep Research Spec`

This means the repository already has planned or partial concepts for the requested features, but the implementation is fragmented.

The best upgrade is not to keep adding more logic into `app.js`. Instead, introduce a dedicated assistant/planning layer that consumes the existing modules.

Recommended new core module:

```text
assistant_engine.js
```

Or, if the feature grows:

```text
assistant/
  portfolio_assistant.js
  stock_assistant.js
  plan_engine.js
  assistant_schema.js
```

This avoids making `app.js` and `ui.js` even larger.

---

# Proposed upgrade 1: Portfolio Trading Assistant

## Goal

Create a new assistant based on the user’s current stock list / portfolio that investigates each holding and builds a forward-looking take-profit optimization plan.

This assistant should answer:

- Which positions should be held?
- Which positions should be partially closed?
- Which positions should be prioritized for take profit?
- Which positions are weak and should be reduced?
- Which positions deserve DCA/T0 action?
- What should be the next TP1 / TP2 / TP3 levels?
- How much quantity should be sold at each level?
- Which position has the best risk/reward from current price?
- Which position creates too much sector concentration?
- How should realized profit be used to lower cost basis or rotate capital?

## Current code this should reuse

- Portfolio data from `storage.js`
- Live prices from `price.js`
- PnL from `pnl.js`
- Sector allocation from `utils.js`
- Local scoring from `scorer.js`
- Technical suggestion from `analysis.js`
- AI provider through `ai.js`
- UI card rendering in `ui.js`

## Proposed user experience

Add a new section or tab:

```text
Portfolio Assistant
```

Main actions:

1. **Analyze Portfolio**
   - Reads all current holdings.
   - Fetches latest data for all symbols.
   - Calculates PnL, distance to TP/SL, R:R, trend health, and sector concentration.
   - Produces a ranked action list.

2. **Optimize Take Profit**
   - For each position, suggests staged TP plan:
     - TP1: conservative / near resistance
     - TP2: trend continuation target
     - TP3: stretch target
   - Suggests sell quantity percentage:
     - Example: 30% at TP1, 40% at TP2, keep 30% trailing.
   - Suggests trailing stop rule.

3. **Rebalance / Rotate**
   - Finds weak holdings.
   - Finds strong scanner candidates.
   - Suggests whether profit from a closed position should offset another position or rotate into stronger opportunity.

4. **DCA/T0 Advisor**
   - For losing positions, decide:
     - Do not DCA.
     - DCA only near support.
     - T0 bounce opportunity.
     - Cut loss if structure breaks.

## Suggested assistant output

Use structured JSON, not free Markdown, then render clean UI.

Example schema:

```json
{
  "portfolio_score": 76,
  "market_summary": "Portfolio đang nghiêng về xu hướng tích cực nhưng rủi ro tập trung ngành cao.",
  "priority_actions": [
    {
      "symbol": "HOSE:FPT",
      "action": "HOLD_AND_TRAIL",
      "confidence": 82,
      "reason": "Xu hướng trên EMA20/50, RSI chưa quá mua, PnL đang tốt.",
      "risk_level": "medium"
    }
  ],
  "positions": [
    {
      "symbol": "HOSE:FPT",
      "status": "WINNER",
      "current_price": 123000,
      "entry_price": 110000,
      "pnl_percent": 11.8,
      "trend_score": 84,
      "entry_quality_now": "NOT_IDEAL_TO_ADD",
      "take_profit_plan": {
        "tp1": {
          "price": 128000,
          "sell_percent": 30,
          "reason": "Gần kháng cự ngắn hạn"
        },
        "tp2": {
          "price": 135000,
          "sell_percent": 40,
          "reason": "Mục tiêu trend continuation"
        },
        "tp3": {
          "price": 145000,
          "sell_percent": 30,
          "reason": "Stretch target nếu thị trường thuận lợi"
        },
        "trailing_stop": "Đưa SL lên vùng hòa vốn hoặc EMA20 sau khi đạt TP1"
      },
      "next_action": "Chờ TP1, không mua thêm ở vùng hiện tại"
    }
  ],
  "risks": [
    "Tỷ trọng ngành công nghệ cao hơn ngưỡng an toàn"
  ]
}
```

## Local deterministic calculations before AI

Before calling AI, calculate these locally:

1. **Position status**
   - `WINNER`: PnL > 5%
   - `SMALL_WIN`: 0–5%
   - `BREAKEVEN`: around 0%
   - `LOSER`: -3% to -8%
   - `DANGER`: below stoploss or trend broken

2. **Distance metrics**
   - Distance from current price to TP.
   - Distance from current price to SL.
   - Distance from current price to EMA20/EMA50/EMA200.
   - Distance from current price to recent support/resistance if available.

3. **Risk/reward**
   - Reuse `calculateRR()` from `utils.js`.
   - Require minimum R:R threshold from settings.

4. **Position sizing**
   - Reuse `calculatePositionSize()` from `utils.js`.
   - Suggest whether current position is oversized.

5. **Sector risk**
   - Reuse `calculateSectorAllocation()` from `utils.js`.
   - Warn when one sector dominates.

AI should receive this prepared context, not raw unstructured data.

---

# Proposed upgrade 2: Smart Stock Assistant

## Goal

A user enters a target stock code, and the assistant returns:

- Entry quality rating.
- Whether now is a good entry.
- Best entry zone.
- Short-term plan.
- Long-term plan.
- TP/SL plan.
- Probability / confidence.
- Risk/reward.
- “Should buy now, wait, or avoid?”

This directly matches the requested smart assistant feature.

## Current gap

The repository already has parts:

- `mcp.js` parses `/analyze`, `/research`, `/predict`, `/scenarios`.
- `mcp.js` fetches live stock context.
- `app.js` handles deep research by symbol.
- `ai.js` returns structured deep research JSON.
- `ai.js` returns detailed free-text advice.

But there is no single unified “input stock code → rating + entry/TP plan” feature with a strict output contract.

## Proposed UI

Add a card in the Advisor or Research tab:

```text
Smart Stock Assistant

[ Enter symbol: FPT        ] [Analyze]

Result:
- Entry Rating: 82/100
- Decision: WAIT_FOR_PULLBACK
- Current Price: 123.0
- Good Entry Zone: 118.0–120.5
- Stoploss: 115.0
- Short-term TP: 128.0 / 132.0
- Long-term TP: 138.0 / 145.0
- R:R: 2.4
- Confidence: 78%
```

Recommended decisions:

```text
BUY_NOW
WAIT_FOR_PULLBACK
HOLD_IF_OWNED
TAKE_PROFIT_PARTIAL
AVOID
CUT_LOSS
WATCH_ONLY
```

## Proposed structured output

Add a new function in `ai.js`, for example:

```js
export async function analyzeSmartEntry(symbol, contextData, settings) { ... }
```

Expected JSON:

```json
{
  "symbol": "HOSE:FPT",
  "entry_rating": 82,
  "decision": "WAIT_FOR_PULLBACK",
  "confidence": 78,
  "summary": "Cổ phiếu khỏe nhưng vùng hiện tại không còn tối ưu để mua đuổi.",
  "current_price": 123000,
  "good_entry_zone": {
    "from": 118000,
    "to": 120500,
    "reason": "Vùng retest EMA20 và hỗ trợ gần"
  },
  "stoploss": {
    "price": 115000,
    "reason": "Thủng hỗ trợ gần và EMA50"
  },
  "short_term_plan": {
    "horizon": "1-4 weeks",
    "tp1": 128000,
    "tp2": 132000,
    "condition": "Giữ trên EMA20, volume không suy yếu"
  },
  "long_term_plan": {
    "horizon": "2-6 months",
    "tp1": 138000,
    "tp2": 145000,
    "condition": "Xu hướng EMA50/200 tiếp tục tăng"
  },
  "risk_reward": {
    "rr_to_tp1": 1.6,
    "rr_to_tp2": 2.4,
    "is_acceptable": true
  },
  "technical_factors": {
    "trend": "UPTREND",
    "momentum": "HEALTHY",
    "rsi_state": "NEUTRAL",
    "volume_state": "CONFIRMING",
    "ema_structure": "BULLISH"
  },
  "warnings": [
    "Không mua đuổi nếu giá tăng nóng vượt xa EMA20"
  ]
}
```

## Important design decision

Use a **hybrid scoring model**:

1. Local deterministic score from `scorer.js` and `utils.js`.
2. AI explanation and plan generation from `ai.js`.

Do not let AI invent all numbers. The system should calculate important numeric levels locally first where possible, then ask AI to explain and adjust.

---

# Proposed internal architecture

## New module: `assistant_engine.js`

This module should combine market data, portfolio data, scoring, and AI-ready context.

Suggested responsibilities:

```text
assistant_engine.js
- buildStockSnapshot(symbol, settings)
- buildPortfolioAssistantContext(portfolio, priceMap, settings)
- scoreEntryQuality(snapshot, settings)
- buildTakeProfitPlan(trade, snapshot, settings)
- buildSmartStockPlan(symbol, settings)
- normalizeAssistantPlan(aiJson, fallbackData)
```

Why this is useful:

- Keeps `app.js` from becoming bigger.
- Makes assistant logic reusable by popup, side panel, and content widget.
- Separates deterministic calculations from AI prompts.
- Easier to test later.

## New AI functions in `ai.js`

Add:

```text
analyzePortfolioAssistant(context, settings)
analyzeSmartStockAssistant(symbol, context, settings)
```

Keep them strict JSON, similar to `analyzeDeepStock()`, but stronger.

Recommended improvement: create a shared helper:

```text
queryStructuredAI(prompt, schemaDescription, settings)
```

This can centralize:

- JSON-only instruction.
- `safeParseJSON()`.
- `fixTruncatedJson()`.
- fallback error handling.
- provider quirks.

## New storage keys in `storage.js`

Add:

```text
tpp_portfolio_assistant_cache
tpp_smart_stock_cache_<symbol>
tpp_assistant_plans
tpp_assistant_plan_history
```

Suggested data:

```json
{
  "createdAt": 1790000000000,
  "symbol": "HOSE:FPT",
  "type": "SMART_STOCK_PLAN",
  "input": {
    "riskLevel": "trung bình",
    "tradingStyle": "swing"
  },
  "plan": {},
  "status": "ACTIVE"
}
```

This enables:

- Reopening old analysis.
- Comparing old plan vs actual movement.
- Future “plan tracking” notifications.
- Reducing repeated AI cost.

## New UI rendering

Add render/bind functions:

```text
bindPortfolioAssistantEvents(onAnalyzePortfolio, onOptimizeTP, root)
bindSmartStockAssistantEvents(onAnalyzeSymbol, root)
renderPortfolioAssistant(result, root)
renderSmartStockAssistant(result, root)
renderAssistantPlanCard(plan, root)
```

Given `ui.js` is already large and graphify showed low cohesion for the UI layer, a cleaner option is:

```text
ui_assistant.js
```

Then `ui.js` can stay focused on existing portfolio/scanner rendering.

## New app orchestration

Add handlers in `app.js`:

```text
handleAnalyzePortfolioAssistant()
handleOptimizeTakeProfit()
handleAnalyzeSmartStock(symbol)
handleSaveAssistantPlan(plan)
handleApplyPlanToTrade(plan, tradeId)
```

Important: applying AI-generated TP/SL to real portfolio data should require user confirmation.

---

# Feature gap list to upgrade

## High priority

1. **Arbitrary symbol advisor**
   - Current advisor depends heavily on scanner data.
   - Upgrade it so the user can input any symbol.
   - If symbol is not in scanner cache, fetch via `fetchDeepResearchData()`.

2. **Structured JSON for all assistant outputs**
   - `analyzeDeepStock()` already does this.
   - `getDetailedAdvice()` still returns Markdown.
   - The new assistant should use JSON so UI can render rating cards, TP levels, warnings, and actions reliably.

3. **Portfolio-level take-profit optimizer**
   - Current portfolio has TP/SL fields per trade, but no assistant planning layer.
   - Add staged TP planning and trailing stop recommendation.

4. **Plan tracking**
   - Save generated plans.
   - Compare current price against plan levels.
   - Notify when:
     - TP1/TP2/TP3 is near.
     - SL is near.
     - entry zone is reached.
     - plan is invalidated.

5. **Use local scoring before AI**
   - The existing `scorer.js` is valuable.
   - Assistant should expose the local score in the UI, not hide it inside AI prompt flow.

## Medium priority

6. **Unify Deep Research and Chat MCP**
   - Both rely on `fetchDeepResearchData()`.
   - Create one `buildStockContext()` function so deep research, chat, advisor, and smart assistant use the same data format.

7. **Improve history support**
   - Docs mention `history.js`, but current top-level implementation is missing/stale.
   - Short-term/long-term planning will be much better with OHLCV history.
   - Add `history.js` or remove stale docs if not planned.

8. **Fix `NEW_SIGNAL` handling**
   - `content.js` sends `NEW_SIGNAL`, but `background.js` does not handle it.
   - This is relevant because TradingView alerts could become assistant signals:
     - “Signal detected for FPT.”
     - “Update plan?”
     - “TP zone triggered?”
     - “Breakout confirmed?”

9. **Provider default alignment**
   - UI says one Gemini default, `ai.js` uses another.
   - Align model defaults to avoid confusing users.

10. **Modularize UI**
   - Graphify showed the UI layer has low cohesion.
   - New assistant UI should go into a separate module to avoid making `ui.js` harder to maintain.

---

# Recommended implementation phases

## Phase 1 — Smart Stock Assistant MVP

Best first implementation because it is focused and directly matches the target-symbol request.

Deliver:

- Symbol input.
- Fetch `fetchDeepResearchData(symbol)`.
- Local score/rating.
- AI JSON plan.
- Render:
  - Entry rating.
  - Buy/wait/avoid decision.
  - Entry zone.
  - Stoploss.
  - Short-term TP.
  - Long-term TP.
  - R:R.
  - Warnings.

Files likely touched:

- `popup.html`
- `app.js`
- `ai.js`
- `ui.js` or new `ui_assistant.js`
- `storage.js`
- maybe `utils.js`

## Phase 2 — Portfolio Trading Assistant

Deliver:

- Analyze all current positions.
- Rank positions by:
  - profit-protection priority
  - risk priority
  - add/hold/reduce decision
  - TP optimization opportunity
- Generate staged TP plans.
- Save plan cache.
- Show “Apply TP/SL to position” button with confirmation.

Files likely touched:

- `app.js`
- `ai.js`
- `storage.js`
- `ui.js` or `ui_assistant.js`
- `pnl.js`
- `utils.js`

## Phase 3 — Plan Tracking and Notifications

Deliver:

- Background monitoring of assistant plans.
- Telegram alerts when entry/TP/SL zones are reached.
- `NEW_SIGNAL` integration from content script.
- Plan invalidation alerts.

Files likely touched:

- `background.js`
- `content.js`
- `storage.js`
- `telegram.js`
- `assistant_engine.js`

## Phase 4 — Historical Data Engine

Deliver:

- Real OHLCV history.
- Better support/resistance.
- ATR-based stoploss.
- Swing high/low detection.
- Backtest-like confidence scoring.
- Short-term vs long-term scenario generation.

Files likely touched:

- new `history.js`
- `price.js`
- `analysis.js`
- `scorer.js`
- `ai.js`

---

# Recommended final product behavior

## Trading Assistant: portfolio-level

Example user output:

```text
Portfolio Assistant Score: 74/100

Priority:
1. FPT — Hold, trail stop, prepare TP1.
2. HPG — Wait, not enough confirmation to add.
3. VND — Reduce risk, trend weakening.

Best take-profit action:
- FPT: Sell 30% near 128,000, move SL to 118,000.
- Keep 40% for 135,000.
- Let final 30% run with EMA20 trailing stop.

Risk:
- Portfolio is concentrated in Banking/Finance.
- Do not add more finance stocks unless one current position is reduced.
```

## Smart Stock Assistant: target-symbol-level

Example user output:

```text
Smart Entry Rating: 82/100

Decision: WAIT_FOR_PULLBACK

Current price is strong but not the best entry. Better entry zone is 118,000–120,500 near EMA20/support.

Plan:
- Entry: 118,000–120,500
- Stoploss: 115,000
- Short-term TP1: 128,000
- Short-term TP2: 132,000
- Long-term TP1: 138,000
- Long-term TP2: 145,000
- R:R to TP2: 2.4

Invalidation:
Avoid buying if price breaks below 115,000 with high volume.
```

---

# Recommendation

Implement in this order:

1. **Smart Stock Assistant MVP**
   - Fastest value.
   - Uses the existing `fetchDeepResearchData()` and `analyzeDeepStock()` path.
   - Requires less portfolio mutation risk.

2. **Portfolio Trading Assistant**
   - Builds on the same structured plan schema.
   - Adds staged take-profit optimization for current holdings.

3. **Plan tracking + Telegram**
   - Turns recommendations into actionable alerts.

4. **Historical data engine**
   - Makes short-term/long-term targets more reliable.

The most important architectural upgrade is to add a dedicated assistant/planning module instead of expanding `app.js` and `ui.js`. This keeps the current extension stable while adding the new “trading assistant” and “smart assistant” features cleanly.
