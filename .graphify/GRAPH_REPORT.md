# Graph Report - .  (2026-09-14)

## Corpus Check
- Corpus is ~44,745 words - fits in a single context window. You may not need a graph.

## Summary
- 169 nodes · 246 edges · 23 communities detected
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output
- Edge kinds: contains: 117 · imports: 79 · calls: 41 · references: 6 · semantically_similar_to: 2 · implements: 1

## God Nodes (most connected - your core abstractions)
1. `app.js App Orchestrator` - 8 edges
2. `queryAI()` - 6 edges
3. `fmt()` - 6 edges
4. `fetchDeepResearchData()` - 5 edges
5. `screenPotentialStocks()` - 4 edges
6. `safeParseJSON()` - 4 edges
7. `analyzeDeepStock()` - 4 edges
8. `queryAIWithSystem()` - 4 edges
9. `suggestEntryExit()` - 4 edges
10. `fetchPricesMap()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Trading Portfolio Pro Popup` --references--> `TradingView Logo Icon`  [EXTRACTED]
  popup.html → icons/tradingview-logo.png
- `Hybrid Trading System V5.5` --semantically_similar_to--> `Hybrid Trading System V5`  [INFERRED] [semantically similar]
  pipescripts/v5.5/HUONG-DAN-SU-DUNG.md → pipescripts/v5/HUONG-DAN-SU-DUNG.md
- `calculateT0Scenario(trade, priceData)` --references--> `utils.js Calculation Helpers`  [EXTRACTED]
  docs/plans/260408-1755-tpp-v2/phase-01-t0-strategy.md → CLAUDE.md
- `screenPotentialStocks(targetProfit)` --references--> `ai.js AI Integration`  [EXTRACTED]
  docs/plans/260428-1952-ai-advisor-screener/phase-02-ai-screener.md → CLAUDE.md
- `AI Advisor & Smart Screener Specification` --semantically_similar_to--> `AI Advisor & Smart Screener`  [EXTRACTED] [semantically similar]
  docs/specs/ai_advisor_spec.md → docs/plans/260428-1952-ai-advisor-screener/plan.md

## Hyperedges (group relationships)
- **Runtime Entry Points** — CLAUDE_manifest_json, CLAUDE_background_js, CLAUDE_popup_html, CLAUDE_popup_js, CLAUDE_content_loader_js, CLAUDE_content_js [EXTRACTED 1.00]
- **Core Orchestration Architecture** — CLAUDE_app_js, CLAUDE_ui_js, CLAUDE_storage_js, CLAUDE_price_js, CLAUDE_scanner_data_js, CLAUDE_scorer_js, CLAUDE_ai_js [EXTRACTED 1.00]

## Communities

### Community 0 - "UI Rendering Layer"
Cohesion: 0.08
Nodes (15): calculateFibLevels(), suggestEntryExit(), bindFormEvents(), bindHistoryEvents(), bindModalClose(), bindSettingsEvents(), fmt(), fmtDisplay() (+7 more)

### Community 1 - "App State Storage"
Cohesion: 0.10
Nodes (21): clearAdviceCache(), clearAllScannerData(), getRankedResults(), getRawScannerResults(), getScannerResults(), getTradeHistory(), saveRankedResults(), saveRawScannerResults() (+13 more)

### Community 2 - "Market Data Service"
Cohesion: 0.14
Nodes (13): checkPortfolioAndNotify(), notifyTelegram(), fetchDeepResearchData(), fetchPricesMap(), normalizeSymbolCandidates(), prepareDataForAI(), scanCryptoCoins(), scanVietnamStocks() (+5 more)

### Community 3 - "Scoring Utilities"
Cohesion: 0.15
Nodes (14): rankStocks(), calculateConfluenceScore(), calculatePositionSize(), calculateProbability(), calculateRR(), calculateSectorAllocation(), calculateT0Scenario(), detectCandlePattern() (+6 more)

### Community 4 - "Extension Architecture"
Cohesion: 0.14
Nodes (15): ai.js AI Integration, app.js App Orchestrator, background.js Service Worker, content.js Floating Widget, content-loader.js, manifest.json, popup.html UI Shell, popup.js (+7 more)

### Community 5 - "AI Integration"
Cohesion: 0.24
Nodes (12): analyzeDeepStock(), fetchModels(), fixTruncatedJson(), getDetailedAdvice(), queryAI(), queryAIWithSystem(), queryGemini(), queryOpenAI() (+4 more)

### Community 6 - "Widget Entrypoints"
Cohesion: 0.29
Nodes (2): initApp(), adObserver

### Community 7 - "Chat MCP Context"
Cohesion: 0.53
Nodes (5): extractSymbols(), getLiveStockContext(), IGNORED_WORDS, normalizeSymbol(), parseSlashCommand()

### Community 8 - "UI Refactor Script"
Cohesion: 0.40
Nodes (4): code, fs, funcDefs, funcReplacements

### Community 9 - "Advisor Specification"
Cohesion: 0.67
Nodes (3): AI Advisor & Smart Screener Specification, Professional AI Advisor Engine, AI Advisor & Smart Screener

### Community 10 - "PnL Calculations"
Cohesion: 0.67
Nodes (1): calculatePnL()

### Community 11 - "Historical Handler Plan"
Cohesion: 1.00
Nodes (2): FETCH_HISTORY Background Handler, history.js Module

### Community 12 - "T0 Strategy Math"
Cohesion: 1.00
Nodes (2): utils.js Calculation Helpers, calculateT0Scenario(trade, priceData)

### Community 13 - "Pine Script Systems"
Cohesion: 1.00
Nodes (2): Hybrid Trading System V5, Hybrid Trading System V5.5

### Community 14 - "Popup Branding"
Cohesion: 1.00
Nodes (2): Trading Portfolio Pro Popup, TradingView Logo Icon

### Community 15 - "Deep Research Spec"
Cohesion: 1.00
Nodes (1): AI Deep Stock Research

### Community 16 - "System Overview Docs"
Cohesion: 1.00
Nodes (1): System Overview Documentation

### Community 17 - "Technical Analysis"
Cohesion: 1.00
Nodes (1): analysis.js Technical Analysis

### Community 18 - "PnL Module"
Cohesion: 1.00
Nodes (1): pnl.js PnL Calculations

### Community 21 - "UI Theme Upgrade"
Cohesion: 1.00
Nodes (1): Modern UI & Theme System Upgrade

### Community 22 - "Smart Strategist Plan"
Cohesion: 1.00
Nodes (1): Trading Portfolio Pro v2.0 Smart Strategist Plan

### Community 23 - "Zone Engine Rules"
Cohesion: 1.00
Nodes (1): Zone Engine V3 Rule-based Trading System

### Community 24 - "Historical Data Engine"
Cohesion: 1.00
Nodes (1): history.js Historical Data Engine

## Knowledge Gaps
- **33 isolated node(s):** `adObserver`, `IGNORED_WORDS`, `fs`, `code`, `funcDefs` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Widget Entrypoints`** (2 nodes): `initApp()`, `adObserver`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PnL Calculations`** (1 nodes): `calculatePnL()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Historical Handler Plan`** (2 nodes): `FETCH_HISTORY Background Handler`, `history.js Module`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `T0 Strategy Math`** (2 nodes): `utils.js Calculation Helpers`, `calculateT0Scenario(trade, priceData)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pine Script Systems`** (2 nodes): `Hybrid Trading System V5`, `Hybrid Trading System V5.5`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Popup Branding`** (2 nodes): `Trading Portfolio Pro Popup`, `TradingView Logo Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Deep Research Spec`** (1 nodes): `AI Deep Stock Research`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `System Overview Docs`** (1 nodes): `System Overview Documentation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Technical Analysis`** (1 nodes): `analysis.js Technical Analysis`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PnL Module`** (1 nodes): `pnl.js PnL Calculations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `UI Theme Upgrade`** (1 nodes): `Modern UI & Theme System Upgrade`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Smart Strategist Plan`** (1 nodes): `Trading Portfolio Pro v2.0 Smart Strategist Plan`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Zone Engine Rules`** (1 nodes): `Zone Engine V3 Rule-based Trading System`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Historical Data Engine`** (1 nodes): `history.js Historical Data Engine`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fetchDeepResearchData()` connect `Market Data Service` to `App State Storage`, `Chat MCP Context`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `initApp()` connect `Widget Entrypoints` to `App State Storage`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `getDivisor()` connect `Scoring Utilities` to `App State Storage`, `Market Data Service`, `UI Rendering Layer`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `adObserver`, `IGNORED_WORDS`, `fs` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Rendering Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.08235294117647059 - nodes in this community are weakly interconnected._
- **Should `App State Storage` be split into smaller, more focused modules?**
  _Cohesion score 0.09788359788359788 - nodes in this community are weakly interconnected._
- **Should `Market Data Service` be split into smaller, more focused modules?**
  _Cohesion score 0.13725490196078433 - nodes in this community are weakly interconnected._