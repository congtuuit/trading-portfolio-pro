/**
 * app.js
 * Centralized core application logic.
 */

import {
  getPortfolio,
  savePortfolio,
  getSettings,
  saveSettings,
  getTradeHistory,
  saveTradeHistory,
  getScannerResults,
  saveScannerResults,
  getRawScannerResults,
  saveRawScannerResults,
  clearAllScannerData,
  saveRankedResults,
  getRankedResults,
  getAdviceCache,
  saveAdviceCache,
  clearAdviceCache,
} from "./storage.js";
import { getDivisor, escapeHTML, calculateRR, parseMarkdown } from "./utils.js";
import {
  renderPortfolio,
  bindFormEvents,
  bindCloseEvents,
  bindHistoryEvents,
  bindT0Events,
  populateForm,
  bindSettingsEvents,
  updateSummaryBar,
  renderHistory,
  bindTabEvents,
  bindScannerEvents,
  renderScannerResults,
  toggleModal,
  bindDeepResearchEvents,
  renderDeepResearch,
} from "./ui.js";
import { fetchPricesMap, fetchDeepResearchData } from "./price.js";
import { queryAI, fetchModels, screenPotentialStocks, getDetailedAdvice, analyzeDeepStock } from "./ai.js";
import { prepareDataForAI } from "./scanner_data.js";
import { rankStocks } from "./scorer.js";

const REFRESH_INTERVAL_MS = 30 * 1000;

export async function initApp(root) {
  let portfolio = [];
  let refreshTimer = null;
  let currentPriceMap = {};
  let appSettings = null;
  let chatHistory = [];
  let tradeHistory = [];
  let lastScannedData = [];
  let caughtSignals = [];

  async function updatePricesAndRender() {
    const symbols = portfolio.map((t) => t.symbol);
    if (symbols.length > 0) {
      currentPriceMap = await fetchPricesMap(symbols);
    } else {
      currentPriceMap = {};
    }
    renderPortfolio(portfolio, handleDelete, handleEdit, currentPriceMap, root);
    updateSummaryBar(portfolio, currentPriceMap, root);
    checkProactiveAlerts();
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  async function handleSave(tradeData) {
    const priceData = await fetchPricesMap([tradeData.symbol]);
    if (!priceData || Object.keys(priceData).length === 0) {
      return { success: false, error: "Tên mã giao dịch không tồn tại trên TradingView." };
    }

    tradeData.tpAlerted = false;
    tradeData.slAlerted = false;
    tradeData.t0Alerted = false;

    if (tradeData.id && tradeData.id.startsWith("trade_")) {
      const index = portfolio.findIndex((t) => t.id === tradeData.id);
      if (index >= 0) portfolio[index] = { ...portfolio[index], ...tradeData };
      else portfolio.push(tradeData);
    } else {
      tradeData.id = "trade_" + Date.now();
      portfolio.push(tradeData);
    }

    await savePortfolio(portfolio);
    updatePricesAndRender();
    return { success: true };
  }

  function handleEdit(id) {
    const trade = portfolio.find((t) => t.id === id);
    if (trade) populateForm(trade, root);
  }

  async function handleDelete(id) {
    portfolio = portfolio.filter((t) => t.id !== id);
    await savePortfolio(portfolio);
    updatePricesAndRender();
  }

  async function handleT0(id, newEntry, realizedProfit) {
    const index = portfolio.findIndex((t) => t.id === id);
    if (index >= 0) {
      const trade = portfolio[index];
      const divisor = getDivisor(trade.symbol);
      trade.entryPrice = newEntry;
      trade.tpAlerted = false;
      trade.slAlerted = false;
      trade.t0Alerted = false;
      await savePortfolio(portfolio);

      if (realizedProfit && realizedProfit > 0) {
        const historyRecord = {
          id: "hist_" + Date.now() + Math.random().toString().slice(2, 5),
          date: Date.now(),
          symbol: trade.symbol,
          type: trade.type === "BUY" ? "T0_BUY" : "T0_SELL",
          qtyClosed: 0,
          entryPrice: trade.entryPrice / divisor,
          closePrice: (trade.entryPrice + (trade.type === "BUY" ? realizedProfit : -realizedProfit)) / divisor,
          realizedPnl: realizedProfit
        };

        tradeHistory.push(historyRecord);
        await saveTradeHistory(tradeHistory);
        renderHistory(tradeHistory, root);
      }

      updatePricesAndRender();
    }
  }

  function checkProactiveAlerts() {
    portfolio.forEach(trade => {
      const data = currentPriceMap[trade.symbol];
      if (!data) return;

      const isBuy = trade.type === "BUY";
      const rsi = data.rsi;
      const price = data.close / getDivisor(trade.symbol);

      if (isBuy && rsi > 0 && rsi < 30) {
        console.log(`[Proactive] ${trade.symbol} is Oversold (RSI: ${rsi})`);
      }
      if (isBuy && price <= data.bb_lower / getDivisor(trade.symbol)) {
        console.log(`[Proactive] ${trade.symbol} touching BB Lower`);
      }
    });
  }

  async function handleTakeProfit(closeId, closeQty, closePrice, targetId) {
    const index = portfolio.findIndex((t) => t.id === closeId);
    if (index < 0) return;

    const trade = portfolio[index];
    const isBuy = trade.type === "BUY";
    const divisor = getDivisor(trade.symbol);
    const pnl = (isBuy ? (closePrice * divisor - trade.entryPrice) : (trade.entryPrice - closePrice * divisor)) * closeQty;

    const historyRecord = {
      id: "hist_" + Date.now() + Math.random().toString().slice(2, 5),
      date: Date.now(),
      symbol: trade.symbol,
      type: trade.type,
      qtyClosed: closeQty,
      entryPrice: trade.entryPrice / divisor,
      closePrice: closePrice,
      realizedPnl: pnl
    };
    
    tradeHistory.push(historyRecord);
    await saveTradeHistory(tradeHistory);

    if (targetId) {
      const target = portfolio.find((t) => t.id === targetId);
      if (target) {
        const offset = pnl / parseFloat(target.quantity);
        target.entryPrice = (parseFloat(target.entryPrice) + (target.type === "BUY" ? -offset : offset)).toFixed(4);
      }
    }

    const remainingQty = parseFloat(trade.quantity) - closeQty;
    if (remainingQty <= 0.000001) portfolio.splice(index, 1);
    else portfolio[index].quantity = remainingQty.toFixed(4);

    await savePortfolio(portfolio);
    updatePricesAndRender();
    renderHistory(tradeHistory, root);
  }

  async function handleClearHistory() {
    tradeHistory = [];
    await saveTradeHistory(tradeHistory);
    renderHistory(tradeHistory, root);
  }

  function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(updatePricesAndRender, REFRESH_INTERVAL_MS);
  }

  async function handleScanMarket() {
    const container = root.querySelector("#scanner-raw-results");
    const btnAI = root.querySelector("#btn-ai-analyze");
    const assetTypeSelect = root.querySelector("#sel-asset-type");
    const assetType = assetTypeSelect ? assetTypeSelect.value : "STOCKS";

    container.innerHTML = `
      <div class="loading-wrapper">
        <div class="hourglass"></div>
        <div class="loading-text">Đang quét dữ liệu ${assetType === "CRYPTO" ? "Crypto" : "thị trường"}...</div>
      </div>`;

    const msgType = assetType === "CRYPTO" ? "SCAN_CRYPTO" : "SCAN_STOCKS";

    chrome.runtime.sendMessage({ type: msgType }, (res) => {
      if (res && res.success) {
        lastScannedData = res.data;
        saveRawScannerResults(res.data);

        // Auto-rank all assets with score + grade immediately
        const limitCount = assetType === "CRYPTO" ? 20 : 50;
        const ranked = rankStocks(lastScannedData, appSettings, limitCount);
        lastScannedData = ranked;
        saveRankedResults(ranked); // Persist to storage

        renderScannerResults(ranked, root, Date.now(), "#scanner-raw-results");
        if (ranked.length > 0) btnAI.style.display = "block";
      } else {
        container.innerHTML = `<div class="empty-state">❌ Lỗi: ${res?.error || "Unknown"}</div>`;
      }
    });
  }

  async function handleAIAnalyze() {
    const aiContainer = root.querySelector("#scanner-ai-results");
    const aiSection = root.querySelector("#ai-top-picks");
    const assetTypeSelect = root.querySelector("#sel-asset-type");
    const assetType = assetTypeSelect ? assetTypeSelect.value : "STOCKS";

    aiSection.style.display = "block";
    aiContainer.innerHTML = `
      <div class="loading-wrapper">
        <div class="hourglass"></div>
        <div class="loading-text">${assetType === "CRYPTO" ? "🤖 AI đang phân tích dữ liệu Crypto..." : "🤖 AI đang săn tìm siêu cổ phiếu..."}</div>
      </div>`;

    try {
      const minRR = appSettings.minRR || 0;
      // Pre-rank assets using scorer.js before sending to AI
      const ranked = rankStocks(lastScannedData, appSettings, 25);
      const cleanedData = prepareDataForAI(ranked);
      const aiResults = await screenPotentialStocks(cleanedData, 0, appSettings, assetType);

      const finalResults = aiResults.map(ai => {
        const raw = lastScannedData.find(r => (r.symbol || "").toUpperCase() === ai.s.toUpperCase());
        if (!raw) return null;
        const rr = calculateRR(ai.e, ai.t, ai.sl, "BUY");
        return { ...raw, aiReason: ai.r, aiScore: ai.sc, aiDuration: ai.d, aiEntry: ai.e, aiTarget: ai.t, aiStoploss: ai.sl, aiWinRate: ai.w, aiRR: rr };
      }).filter(Boolean).filter(res => {
        if (minRR > 0 && res.aiRR !== null && res.aiRR < minRR) return false;
        return true;
      }).sort((a, b) => b.aiWinRate - a.aiWinRate);

      const ts = Date.now();
      await saveScannerResults(finalResults, ts);
      renderScannerResults(finalResults, root, ts, "#scanner-ai-results");
    } catch (err) {
      aiContainer.innerHTML = `<div class="empty-state">❌ Lỗi AI: ${err.message}</div>`;
    }
  }

  async function handleAskAdvisor(symbol) {
    const cached = await getAdviceCache(symbol);
    if (cached) return showAdviceModal(symbol, cached);

    let fullData = lastScannedData.find(s => (s.ticker || s.symbol || "").toUpperCase() === symbol.toUpperCase());
    if (!fullData) return alert(`Không tìm thấy dữ liệu cho mã ${symbol}.`);

    const fullSymbol = fullData.ticker || fullData.symbol;
    showAdviceModal(fullSymbol, `
      <div class="loading-wrapper">
        <div class="hourglass"></div>
        <div class="loading-text">⏳ Đang giải mã hành vi giá...</div>
      </div>`);

    try {
      // Lấy dữ liệu cơ bản + kĩ thuật từ Scanner TradingView (không dùng lịch sử)
      const advice = await getDetailedAdvice(fullSymbol, fullData, appSettings, "");
      await saveAdviceCache(fullSymbol, advice);
      showAdviceModal(fullSymbol, advice);
    } catch (err) {
      root.querySelector("#modal-body").innerHTML = `<div class="pnl loss">❌ Lỗi: ${err.message}</div>`;
    }
  }

  function showAdviceModal(symbol, content) {
    root.querySelector("#modal-title").innerHTML = `AI Advisor: <strong>${symbol.split(':')[1] || symbol}</strong>`;
    const body = root.querySelector("#modal-body");
    if (content.includes("empty-state") || content.includes("loading-wrapper")) {
      body.innerHTML = content;
    } else {
      const formatted = parseMarkdown(content);
      body.innerHTML = `<div style="font-size:13px; line-height:1.6;">${formatted}</div>`;
    }
    toggleModal(root, "modal-analysis", true);
  }

  async function handleDeepResearch(symbol) {
    renderDeepResearch({ symbol, summary: "Đang tải dữ liệu và phân tích...", score: 0 }, root);
    try {
      // Fetch TradingView data (Technical & Fundamental)
      const snapshot = await fetchDeepResearchData(symbol);

      if (!snapshot) {
        throw new Error("Không thể lấy dữ liệu từ TradingView.");
      }
      
      // Combine data
      const contextData = {
        symbol: symbol,
        technical_and_fundamental: snapshot || {}
      };
      
      const analysis = await analyzeDeepStock(symbol, contextData, appSettings);
      renderDeepResearch(analysis, root);
    } catch (err) {
      renderDeepResearch({ symbol, error: err.message }, root);
    }
  }

  function initExportImport() {
    root.querySelector("#btn-export")?.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(portfolio));
      const a = document.createElement("a");
      a.href = dataStr; 
      a.download = `portfolio_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); 
      a.click(); 
      a.remove();
    });

    root.querySelector("#btn-import")?.addEventListener("click", () => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = ".json";
      inp.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const data = JSON.parse(ev.target.result);
            if (Array.isArray(data)) {
              portfolio = data;
              await savePortfolio(portfolio);
              updatePricesAndRender();
              alert("Import thành công!");
            }
          } catch (err) { alert("Lỗi đọc file!"); }
        };
        reader.readAsText(e.target.files[0]);
      };
      inp.click();
    });
  }

  portfolio = await getPortfolio();
  appSettings = await getSettings();
  tradeHistory = await getTradeHistory();
  const scannerCache = await getScannerResults();
  const rawCache = await getRawScannerResults();
  const rankedCache = await getRankedResults();

  renderHistory(tradeHistory, root);

  // Khôi phục dữ liệu đã xếp hạng (ưu tiên > raw)
  if (rankedCache.length > 0) {
    lastScannedData = rankedCache;
    renderScannerResults(rankedCache, root, null, "#scanner-raw-results");
    root.querySelector("#btn-ai-analyze").style.display = "block";
  } else if (rawCache.length > 0) {
    // Fallback: nếu chưa có ranked, rank từ raw rồi lưu lại
    const ranked = rankStocks(rawCache, appSettings, 50);
    lastScannedData = ranked;
    saveRankedResults(ranked);
    renderScannerResults(ranked, root, null, "#scanner-raw-results");
    root.querySelector("#btn-ai-analyze").style.display = "block";
  }

  // Khôi phục dữ liệu AI Top Picks
  if (scannerCache.results.length > 0) {
    root.querySelector("#ai-top-picks").style.display = "block";
    renderScannerResults(scannerCache.results, root, scannerCache.timestamp, "#scanner-ai-results");
  }

  setupCoreBindings();
  setupScannerBindings();
  setupManagementBindings();

  updatePricesAndRender();
  startAutoRefresh();

  // ── INTERNAL BINDING HELPERS ──

  function setupCoreBindings() {
    bindFormEvents(handleSave, root);
    bindCloseEvents(handleTakeProfit, root);
    bindHistoryEvents(handleClearHistory, root);
    bindT0Events(handleT0, root);
    bindTabEvents(root);
    bindDeepResearchEvents(handleDeepResearch, root);
    bindSettingsEvents(appSettings, async (s) => {
      appSettings = s;
      await saveSettings(s);
    }, fetchModels, root);
    initExportImport();
  }

  function setupScannerBindings() {
    bindScannerEvents(handleScanMarket, handleAIAnalyze, handleAskAdvisor, root);
    root.querySelector('#btn-clear-scanner')?.addEventListener('click', async () => {
      if (confirm('Xóa kết quả quét?')) {
        await clearAllScannerData();
        root.querySelector("#scanner-raw-results").innerHTML = `<div class="empty-state">Bấm "1. Quét Dữ Liệu" để bắt đầu.</div>`;
        root.querySelector("#scanner-ai-results").innerHTML = "";
        root.querySelector("#ai-top-picks").style.display = "none";
        root.querySelector("#btn-ai-analyze").style.display = "none";
        lastScannedData = [];
      }
    });

    root.querySelector('#btn-clear-ai')?.addEventListener('click', async () => {
      if (confirm('Xóa gợi ý AI?')) {
        await chrome.storage.local.remove(["tpp_scanner_results", "tpp_scanner_time"]);
        root.querySelector("#scanner-ai-results").innerHTML = "";
        root.querySelector("#ai-top-picks").style.display = "none";
      }
    });
  }

  function setupManagementBindings() {
    root.querySelector('#btn-clear-cache')?.addEventListener('click', async () => {
      if (confirm('Xóa bộ nhớ đệm AI?')) { await clearAdviceCache(); alert('Đã xóa cache!'); }
    });
  }
}
