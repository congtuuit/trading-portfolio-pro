/**
 * app.js
 * Centralized core application logic.
 */

import {
  getPortfolio,
  savePortfolio,
  getSettings,
  saveSettings,
  getChatHistory,
  saveChatHistory,
  getTradeHistory,
  saveTradeHistory,
  getScannerResults,
  saveScannerResults,
  getRawScannerResults,
  saveRawScannerResults,
  clearAllScannerData,
  getAdviceCache,
  saveAdviceCache,
  clearAdviceCache,
  getSystemLogs,
  addSystemLog
} from "./storage.js";
import { getDivisor, escapeHTML } from "./utils.js";
import {
  renderPortfolio,
  bindFormEvents,
  bindCloseEvents,
  bindHistoryEvents,
  bindT0Events,
  populateForm,
  bindSettingsEvents,
  bindAIEvents,
  bindAIPortfolio,
  bindAIDCA,
  bindChatEvents,
  appendChatMessage,
  openChatPanel,
  removeTypingIndicator,
  updateSummaryBar,
  renderChatHistory,
  renderHistory,
  bindTabEvents,
  bindScannerEvents,
  renderScannerResults,
  renderSystemLogs,
  toggleModal
} from "./ui.js";
import { fetchPricesMap } from "./price.js";
import { queryAI, fetchModels, screenPotentialStocks, getDetailedAdvice } from "./ai.js";
import { prepareDataForAI } from "./scanner_data.js";
import { fetchSymbolHistory, formatHistoryForAI } from "./history.js";

const REFRESH_INTERVAL_MS = 30 * 1000;

export async function initApp(root) {
  let portfolio = [];
  let refreshTimer = null;
  let currentPriceMap = {};
  let appSettings = null;
  let chatHistory = [];
  let tradeHistory = [];
  let lastScannedData = [];

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

  async function handleT0(id, newEntry) {
    const index = portfolio.findIndex((t) => t.id === id);
    if (index >= 0) {
      portfolio[index].entryPrice = newEntry;
      await savePortfolio(portfolio);
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

  async function sendToChat(prompt) {
    openChatPanel(root);
    appendChatMessage("user", prompt, false, root);
    appendChatMessage("system-typing", "", false, root);
    chatHistory.push({ role: "user", text: prompt });

    try {
      const res = await queryAI(chatHistory, appSettings);
      chatHistory.push({ role: "assistant", text: res });
      removeTypingIndicator(root);
      appendChatMessage("assistant", res.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'), true, root);
    } catch (err) {
      removeTypingIndicator(root);
      chatHistory.pop();
      appendChatMessage("assistant", `❌ Lỗi: ${err.message}`, true, root);
    }
  }

  async function handleScanMarket() {
    const container = root.querySelector("#scanner-raw-results");
    const btnAI = root.querySelector("#btn-ai-analyze");
    container.innerHTML = `
      <div class="loading-wrapper">
        <div class="hourglass"></div>
        <div class="loading-text">Đang quét dữ liệu thị trường...</div>
      </div>`;

    chrome.runtime.sendMessage({ type: "SCAN_STOCKS" }, (res) => {
      if (res && res.success) {
        lastScannedData = res.data;
        saveRawScannerResults(res.data);
        renderScannerResults(res.data, root, Date.now(), "#scanner-raw-results");
        if (res.data.length > 0) btnAI.style.display = "block";
      } else {
        container.innerHTML = `<div class="empty-state">❌ Lỗi: ${res?.error || "Unknown"}</div>`;
      }
    });
  }

  async function handleAIAnalyze(targetProfit) {
    const aiContainer = root.querySelector("#scanner-ai-results");
    const aiSection = root.querySelector("#ai-top-picks");
    aiSection.style.display = "block";
    aiContainer.innerHTML = `
      <div class="loading-wrapper">
        <div class="hourglass"></div>
        <div class="loading-text">🤖 AI đang săn tìm siêu cổ phiếu...</div>
      </div>`;
    
    try {
      const cleanedData = prepareDataForAI(lastScannedData);
      const aiResults = await screenPotentialStocks(cleanedData, targetProfit, appSettings);
      
      const finalResults = aiResults.map(ai => {
        const raw = lastScannedData.find(r => (r.ticker || "").includes(ai.s.toUpperCase()));
        return raw ? { ...raw, aiReason: ai.r, aiScore: ai.sc, aiDuration: ai.d, aiEntry: ai.e, aiTarget: ai.t, aiStoploss: ai.sl, aiWinRate: ai.w } : null;
      }).filter(Boolean).sort((a, b) => b.aiWinRate - a.aiWinRate);

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

    let fullData = lastScannedData.find(s => (s.ticker || s.symbol || "").includes(symbol));
    if (!fullData) return alert(`Không tìm thấy dữ liệu cho mã ${symbol}.`);

    const fullSymbol = fullData.ticker || fullData.symbol;
    showAdviceModal(fullSymbol, `
      <div class="loading-wrapper">
        <div class="hourglass"></div>
        <div class="loading-text">⏳ Đang giải mã hành vi giá...</div>
      </div>`);

    try {
      // Fetch 20 phiên lịch sử (hoặc theo cấu hình settings.lookbackPeriods)
      const lookback = appSettings.lookbackPeriods || 20;
      const history = await fetchSymbolHistory(fullSymbol, lookback);
      const historyText = formatHistoryForAI(history, symbol);

      const advice = await getDetailedAdvice(fullSymbol, fullData, appSettings, historyText);
      await saveAdviceCache(fullSymbol, advice);
      showAdviceModal(fullSymbol, advice);
    } catch (err) {
      root.querySelector("#modal-body").innerHTML = `<div class="pnl loss">❌ Lỗi: ${err.message}</div>`;
    }
  }

  function showAdviceModal(symbol, content) {
    root.querySelector("#modal-title").innerHTML = `AI Advisor: <strong>${symbol.split(':')[1] || symbol}</strong>`;
    const body = root.querySelector("#modal-body");
    if (content.includes("empty-state")) {
      body.innerHTML = content;
    } else {
      const formatted = escapeHTML(content).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
      body.innerHTML = `<div style="font-size:13px; line-height:1.6;">${formatted}</div>`;
    }
    toggleModal(root, "modal-analysis", true);
  }

  function handleViewRaw(symbol, rawData) {
    root.querySelector("#modal-title").innerHTML = `Raw: <strong>${symbol}</strong>`;
    root.querySelector("#modal-body").innerHTML = `<pre style="background:rgba(0,0,0,0.2); padding:10px; border-radius:6px; font-size:11px; overflow:auto; max-height:350px;">${JSON.stringify(rawData, null, 2)}</pre>`;
    toggleModal(root, "modal-analysis", true);
  }

  function initExportImport() {
    root.querySelector("#btn-export")?.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(portfolio));
      const a = document.createElement("a");
      a.href = dataStr; a.download = `portfolio_${new Date().toISOString().slice(0, 10)}.json`;
      root.appendChild(a); a.click(); a.remove();
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
  chatHistory = await getChatHistory();
  tradeHistory = await getTradeHistory();
  const scannerCache = await getScannerResults();
  const rawCache = await getRawScannerResults();

  renderChatHistory(chatHistory, root);
  renderHistory(tradeHistory, root);

  // Khôi phục dữ liệu Quét Gốc
  if (rawCache.length > 0) {
    lastScannedData = rawCache;
    renderScannerResults(rawCache, root, null, "#scanner-raw-results");
    root.querySelector("#btn-ai-analyze").style.display = "block";
  }

  // Khôi phục dữ liệu AI Top Picks
  if (scannerCache.results.length > 0) {
    root.querySelector("#ai-top-picks").style.display = "block";
    renderScannerResults(scannerCache.results, root, scannerCache.timestamp, "#scanner-ai-results");
  }

  bindFormEvents(handleSave, root);
  bindCloseEvents(handleTakeProfit, root);
  bindHistoryEvents(handleClearHistory, root);
  bindT0Events(handleT0, root);
  bindTabEvents(root);
  bindScannerEvents(handleScanMarket, handleAIAnalyze, handleAskAdvisor, handleViewRaw, root);

  // Tab Nhật ký logic
  const logTabBtn = root.querySelector('.tab-btn[data-target="section-logs"]');
  if (logTabBtn) {
    logTabBtn.addEventListener('click', async () => {
      const logs = await getSystemLogs();
      renderSystemLogs(logs, root);
    });
  }

  setupCoreBindings();
  setupAIBindings();
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
    bindSettingsEvents(appSettings, async (s) => { appSettings = s; await saveSettings(s); }, fetchModels, root);
    initExportImport();
  }

  function setupAIBindings() {
    bindChatEvents(async (t) => {
      chatHistory.push({ role: "user", text: t }); await saveChatHistory(chatHistory);
      const res = await queryAI(chatHistory, appSettings);
      chatHistory.push({ role: "assistant", text: res }); await saveChatHistory(chatHistory);
      return res;
    }, async () => { chatHistory = []; await saveChatHistory(chatHistory); }, root);

    bindAIEvents((sym, data, type) => {
      sendToChat(`Trading: Mã ${sym}, Vị thế ${type}. Giá:${data.close}, RSI:${Math.round(data.rsi)}. Có nên vào không? (3 câu)`);
    }, root);

    bindAIPortfolio(() => {
      if (portfolio.length === 0) return alert("Danh mục trống.");
      let ctx = "Danh mục:\nMã | Lệnh | Qty | Entry | PnL%\n";
      portfolio.forEach((t) => {
        const pData = currentPriceMap[t.symbol] || { close: t.entryPrice };
        const pct = (t.type === "BUY" ? (pData.close - t.entryPrice) : (t.entryPrice - pData.close)) / t.entryPrice * 100;
        ctx += `- ${t.symbol} | ${t.type} | ${t.quantity} | ${t.entryPrice} | ${pct.toFixed(2)}%\n`;
      });
      sendToChat(ctx + "\nNhận xét sức khỏe danh mục và lời khuyên ngắn.");
    }, root);

    bindAIDCA((trade, currentPrice) => {
      const d = currentPriceMap[trade.symbol] || {};
      const pct = (trade.type === "BUY" ? (currentPrice - trade.entryPrice) : (trade.entryPrice - currentPrice)) / trade.entryPrice * 100;
      sendToChat(`DCA ${trade.symbol} (${trade.type}): Lỗ ${pct.toFixed(2)}%. Giá: ${currentPrice}, RSI: ${Math.round(d.rsi)}. Có nên DCA không?`);
      toggleModal(root, "modal-dca", false);
    }, root);

    root.querySelector('#btn-clear-cache')?.addEventListener('click', async () => {
      if (confirm('Xóa bộ nhớ đệm AI?')) { await clearAdviceCache(); alert('Đã xóa cache!'); }
    });
  }

  function setupScannerBindings() {
    bindScannerEvents(handleScanMarket, handleAIAnalyze, handleAskAdvisor, handleViewRaw, root);
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
    root.querySelector('.tab-btn[data-target="section-logs"]')?.addEventListener('click', async () => {
      renderSystemLogs(await getSystemLogs(), root);
    });
    root.querySelector('#btn-clear-logs')?.addEventListener('click', async () => {
      if (confirm('Xóa nhật ký?')) { await chrome.storage.local.remove('tpp_logs'); renderSystemLogs([], root); }
    });
  }
}
