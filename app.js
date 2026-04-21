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
  saveTradeHistory
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
  renderHistory
} from "./ui.js";
import { fetchPricesMap } from "./price.js";
import { queryAI, fetchModels } from "./ai.js";

const REFRESH_INTERVAL_MS = 30 * 1000;

export async function initApp(root) {
  let portfolio = [];
  let refreshTimer = null;
  let currentPriceMap = {};
  let appSettings = null;
  let chatHistory = [];
  let tradeHistory = [];

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
      return {
        success: false,
        error: "Tên mã giao dịch không tồn tại trên TradingView.",
      };
    }

    if (tradeData.id && tradeData.id.startsWith("trade_")) {
      const index = portfolio.findIndex((t) => t.id === tradeData.id);
      if (index >= 0) {
        portfolio[index] = { ...portfolio[index], ...tradeData };
      } else {
        portfolio.push(tradeData);
      }
    } else {
      tradeData.id = "trade_" + Date.now();
      portfolio.push(tradeData);
    }

    await savePortfolio(portfolio);

    renderPortfolio(portfolio, handleDelete, handleEdit, currentPriceMap, root);
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
    renderPortfolio(portfolio, handleDelete, handleEdit, currentPriceMap, root);
    updatePricesAndRender();
  }

  async function handleT0(id, newEntry) {
    const index = portfolio.findIndex((t) => t.id === id);
    if (index >= 0) {
      portfolio[index].entryPrice = newEntry;
      await savePortfolio(portfolio);
      renderPortfolio(portfolio, handleDelete, handleEdit, currentPriceMap, root);
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
    
    const exitFullPrice = closePrice * divisor;
    const entryFullPrice = parseFloat(trade.entryPrice);
    
    let pnl = 0;
    if (isBuy) {
      pnl = (exitFullPrice - entryFullPrice) * closeQty;
    } else {
      pnl = (entryFullPrice - exitFullPrice) * closeQty;
    }
    
    const historyRecord = {
      id: "hist_" + Date.now().toString() + Math.random().toString().slice(2,5),
      date: Date.now(),
      symbol: trade.symbol,
      type: trade.type,
      qtyClosed: closeQty,
      entryPrice: parseFloat(trade.entryPrice) / divisor,
      closePrice: closePrice,
      realizedPnl: pnl
    };
    tradeHistory.push(historyRecord);
    await saveTradeHistory(tradeHistory);
    
    if (targetId) {
      const target = portfolio.find((t) => t.id === targetId);
      if (target) {
        const targetIsBuy = target.type === "BUY";
        const offset = pnl / parseFloat(target.quantity);
        if (targetIsBuy) {
          target.entryPrice = (parseFloat(target.entryPrice) - offset).toFixed(4);
        } else {
          target.entryPrice = (parseFloat(target.entryPrice) + offset).toFixed(4);
        }
      }
    }

    const remainingQty = parseFloat(trade.quantity) - closeQty;
    if (remainingQty <= 0.000001) {
      portfolio.splice(index, 1);
    } else {
      portfolio[index].quantity = remainingQty.toFixed(4);
    }

    await savePortfolio(portfolio);
    
    renderPortfolio(portfolio, handleDelete, handleEdit, currentPriceMap, root);
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
    refreshTimer = setInterval(() => {
      updatePricesAndRender();
    }, REFRESH_INTERVAL_MS);
  }

  async function sendToChat(prompt) {
    openChatPanel(root);
    appendChatMessage("user", prompt, false, root);
    appendChatMessage("system-typing", "", false, root);

    chatHistory.push({ role: "user", text: prompt });

    try {
      const responseText = await queryAI(chatHistory, appSettings);
      chatHistory.push({ role: "assistant", text: responseText });
      removeTypingIndicator(root);
      const escapedResp = escapeHTML(responseText);
      const formattedResp = escapedResp.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      appendChatMessage("assistant", formattedResp, true, root);
    } catch (err) {
      removeTypingIndicator(root);
      chatHistory.pop();
      appendChatMessage("assistant", `❌ Lỗi: ${err.message}`, true, root);
    }
  }

  function initExportImport() {
    const btnExport = root.querySelector("#btn-export");
    const btnImport = root.querySelector("#btn-import");

    if (btnExport) {
      btnExport.addEventListener("click", () => {
        const dataStr =
          "data:text/json;charset=utf-8," +
          encodeURIComponent(JSON.stringify(portfolio));
        const anchor = document.createElement("a");
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute(
          "download",
          `tpp_portfolio_${new Date().toISOString().slice(0, 10)}.json`,
        );
        root.appendChild ? root.appendChild(anchor) : document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      });
    }

    if (btnImport) {
      btnImport.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const importedData = JSON.parse(event.target.result);
              if (Array.isArray(importedData)) {
                const isValid = importedData.every(t =>
                  t.symbol && t.type && t.entryPrice && t.quantity
                );

                if (!isValid) {
                  alert("Dữ liệu không đúng cấu trúc (Thiếu Mã, Loại lệnh, Giá hoặc Số lượng).");
                  return;
                }

                portfolio = importedData;
                await savePortfolio(portfolio);
                renderPortfolio(
                  portfolio,
                  handleDelete,
                  handleEdit,
                  currentPriceMap,
                  root
                );
                updatePricesAndRender();
                alert("Import successful!");
              } else {
                alert("Invalid format: expected JSON array of trades.");
              }
            } catch (err) {
              alert("Error parsing JSON file!");
            }
          };
          reader.readAsText(file);
        };
        input.click();
      });
    }
  }

  portfolio = await getPortfolio();
  appSettings = await getSettings();
  chatHistory = await getChatHistory();
  tradeHistory = await getTradeHistory();

  renderChatHistory(chatHistory, root);
  renderHistory(tradeHistory, root);
  
  bindFormEvents(handleSave, root);
  bindCloseEvents(handleTakeProfit, root);
  bindHistoryEvents(handleClearHistory, root);
  bindT0Events(handleT0, root);

  bindSettingsEvents(
    appSettings,
    async (newSettings) => {
      appSettings = newSettings;
      await saveSettings(newSettings);
    },
    fetchModels,
    root
  );

  bindAIEvents((sym, data, tradeType) => {
    const prompt = `Bạn là chuyên gia giao dịch chứng khoán/crypto phái sinh nhạy bén.\nMã: ${sym}\nVị thế định mua: ${tradeType.toUpperCase()}\nDữ liệu On-chain/Kỹ thuật lúc này:\n- Giá Close: ${data.close}\n- EMA 200: ${data.ema200 ? data.ema200 : "N/A"}\n- RSI 14: ${data.rsi ? Math.round(data.rsi) : "N/A"}\n- BB Lower: ${data.bb_lower || "N/A"} | BB Upper: ${data.bb_upper || "N/A"}\n- Khối lượng: ${data.vol}\n- ATR: ${data.atr}\nDựa vào dữ liệu, đánh giá cực kỳ ngắn gọn (3-4 câu) xem có nên xuống lệnh ${tradeType} chỗ này không?`;
    sendToChat(prompt);
  }, root);

  bindAIPortfolio(() => {
    if (portfolio.length === 0) {
      alert("Danh mục trống, không có dữ liệu để phân tích.");
      return;
    }
    let ctx = "Đây là danh mục đầu tư hiện hành của tôi:\nMã | Lệnh | Số lượng | Giá Vốn | Trạng thái PnL%\n";
    portfolio.forEach((t) => {
      const pData = currentPriceMap[t.symbol] || { close: t.entryPrice };
      const cPrice = pData.close;
      const isBuy = t.type === "BUY";
      const pct = isBuy ? ((cPrice - t.entryPrice) / t.entryPrice) * 100 : ((t.entryPrice - cPrice) / t.entryPrice) * 100;
      ctx += `- ${t.symbol} | ${t.type} | ${t.quantity} | Entry: ${t.entryPrice} | Lãi/Lỗ: ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%\n`;
    });
    ctx += "\nHãy đóng vai trò Giám đốc Quản trị Rủi ro. Nhìn vào danh mục trên, đưa ra nhận định THẬT NGẮN GỌN về sức khỏe danh mục và lời khuyên cắt lỗ/gồng lãi phù hợp.";
    sendToChat(ctx);
  }, root);

  bindAIDCA((trade, currentPrice) => {
    const data = currentPriceMap[trade.symbol] || {};
    const pnlPct = trade.type === "BUY" ? ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100 : ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;
    const prompt = `Tôi đang gồng lỗ mã ${trade.symbol} (${trade.type}). Mức âm hiện hành: ${pnlPct.toFixed(2)}%.\nGiá hiện hành: ${currentPrice}.\nThông số kỹ thuật: RSI=${data.rsi ? Math.round(data.rsi) : "N/A"}, Trend EMA200=${data.ema200 || "N/A"}, BB Lower=${data.bb_lower || "N/A"}.\nCó thể DCA bắt đáy tại đây không? Phân tích 3 câu.`;
    sendToChat(prompt);
    const dcaModal = root.querySelector("#modal-dca");
    if(dcaModal) dcaModal.style.display = "none";
  }, root);

  bindChatEvents(
    async (text) => {
      chatHistory.push({ role: "user", text: text });
      await saveChatHistory(chatHistory);
      const responseText = await queryAI(chatHistory, appSettings);
      chatHistory.push({ role: "assistant", text: responseText });
      await saveChatHistory(chatHistory);
      return responseText;
    },
    async () => {
      chatHistory = [];
      await saveChatHistory(chatHistory);
    },
    root
  );

  initExportImport();
  renderPortfolio(portfolio, handleDelete, handleEdit, currentPriceMap, root);
  updatePricesAndRender();
  startAutoRefresh();
}
