/**
 * popup.js
 * Application entry point.
 * Initialises storage, wires events, and starts the auto-refresh loop.
 */

import {
  getPortfolio,
  savePortfolio,
  getSettings,
  saveSettings,
} from "./storage.js";
import { getDivisor } from "./utils.js";
import {
  renderPortfolio,
  bindFormEvents,
  bindRolloverEvents,
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
} from "./ui.js";
import { fetchPricesMap } from "./price.js";
import { queryAI, fetchModels } from "./ai.js";

const REFRESH_INTERVAL_MS = 5000;

let portfolio = [];
let refreshTimer = null;
let currentPriceMap = {};
let appSettings = null;
let chatHistory = [];

async function updatePricesAndRender() {
  const symbols = portfolio.map((t) => t.symbol);
  if (symbols.length > 0) {
    currentPriceMap = await fetchPricesMap(symbols);
  } else {
    currentPriceMap = {};
  }
  renderPortfolio(portfolio, handleDelete, handleEdit, currentPriceMap);
  updateSummaryBar(portfolio, currentPriceMap);
  checkProactiveAlerts();
}

/** Update the Total PnL indicator in the header */
function updateSummaryBar() {
  let totalPnl = 0;
  portfolio.forEach((trade) => {
    const priceData = currentPriceMap[trade.symbol] || {
      close: trade.entryPrice,
    };
    const currentPrice = priceData.close / getDivisor(trade.symbol);
    let pnl = 0;
    if (trade.type === "BUY") {
      pnl = (currentPrice - trade.entryPrice) * trade.quantity;
    } else {
      pnl = (trade.entryPrice - currentPrice) * trade.quantity;
    }
    totalPnl += pnl;
  });

  const pnlEl = document.getElementById("total-pnl");
  if (!pnlEl) return;
  const pnlFmt =
    (totalPnl >= 0 ? "+" : "") +
    totalPnl.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  pnlEl.textContent = `Total PnL: ${pnlFmt}`;
  pnlEl.className = `total-pnl ${totalPnl >= 0 ? "profit" : "loss"}`;
}

/** Generate a unique ID for each trade */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Add or update a trade */
async function handleSave(tradeData) {
  // Validate ticker via TV API first
  const priceData = await fetchPricesMap([tradeData.symbol]);
  if (!priceData || Object.keys(priceData).length === 0) {
    return {
      success: false,
      error: "Tên mã giao dịch không tồn tại trên TradingView.",
    };
  }

  // Check if we are editing an existing trade
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

  // Update UI immediately
  renderPortfolio(portfolio, handleDelete, handleEdit, currentPriceMap);
  updatePricesAndRender();
  return { success: true };
}

/** Pre-fill form for edit */
function handleEdit(id) {
  const trade = portfolio.find((t) => t.id === id);
  if (trade) populateForm(trade);
}

/** Delete a trade by id */
async function handleDelete(id) {
  portfolio = portfolio.filter((t) => t.id !== id);
  await savePortfolio(portfolio);
  renderPortfolio(portfolio, handleDelete, handleEdit, currentPriceMap);
  updatePricesAndRender();
}

/** T0 Strategy: Lower entry price by profit from mini-trade */
async function handleT0(id, newEntry) {
  const index = portfolio.findIndex((t) => t.id === id);
  if (index >= 0) {
    portfolio[index].entryPrice = newEntry;
    await savePortfolio(portfolio);
    renderPortfolio(portfolio, handleDelete, handleEdit, currentPriceMap);
    updatePricesAndRender();
  }
}

/** Check for critical stock conditions and alert user */
function checkProactiveAlerts() {
  portfolio.forEach(trade => {
    const data = currentPriceMap[trade.symbol];
    if (!data) return;

    const isBuy = trade.type === "BUY";
    const rsi = data.rsi;
    const price = data.close / getDivisor(trade.symbol);
    
    // Condition 1: RSI Oversold
    if (isBuy && rsi > 0 && rsi < 30) {
      console.log(`[Proactive] ${trade.symbol} is Oversold (RSI: ${rsi})`);
      // Could show a notification or UI highlight
    }
    
    // Condition 2: Touching BB Lower
    if (isBuy && price <= data.bb_lower / getDivisor(trade.symbol)) {
      console.log(`[Proactive] ${trade.symbol} touching BB Lower`);
    }
  });
}

/** Chốt lời và cấn trừ vị thế */
async function handleRollover(closeId, targetId, realizedPnl) {
  if (targetId) {
    const target = portfolio.find((t) => t.id === targetId);
    if (target) {
      const isBuy = target.type === "BUY";
      const offset = realizedPnl / parseFloat(target.quantity);

      // For BUY: positive PnL lowers entry price. For SELL: positive PnL raises entry price (better).
      if (isBuy) {
        target.entryPrice = (parseFloat(target.entryPrice) - offset).toFixed(4);
      } else {
        target.entryPrice = (parseFloat(target.entryPrice) + offset).toFixed(4);
      }
    }
  }

  // Remove the closed trade
  portfolio = portfolio.filter((t) => t.id !== closeId);

  await savePortfolio(portfolio);
  renderPortfolio(portfolio, handleDelete, handleEdit, currentPriceMap);
  updatePricesAndRender();
}

/** Refresh PnL display without reloading from storage */
function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    updatePricesAndRender();
  }, REFRESH_INTERVAL_MS);
}

/** Programmatically send a prompt to the Chat Panel */
async function sendToChat(prompt) {
  openChatPanel();
  appendChatMessage("user", prompt);
  appendChatMessage("system-typing", "");
  
  chatHistory.push({ role: "user", text: prompt });
  
  try {
    const responseText = await queryAI(chatHistory, appSettings);
    chatHistory.push({ role: "assistant", text: responseText });
    removeTypingIndicator();
    const formattedResp = responseText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    appendChatMessage("assistant", formattedResp, true);
  } catch (err) {
    removeTypingIndicator();
    chatHistory.pop(); // Remove the user prompt if failed so they can try again
    appendChatMessage("assistant", `❌ Lỗi: ${err.message}`, true);
  }
}

/** Handle Import/Export JSON */
function initExportImport() {
  const btnExport = document.getElementById("btn-export");
  const btnImport = document.getElementById("btn-import");

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
      document.body.appendChild(anchor);
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
              // Basic validation of fields
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

/** Boot the application */
async function init() {
  console.log("init trading portfolio pro");
  portfolio = await getPortfolio();
  appSettings = await getSettings();

  bindFormEvents(handleSave);
  bindRolloverEvents(handleRollover);
  bindT0Events(handleT0);

  bindSettingsEvents(
    appSettings,
    async (newSettings) => {
      appSettings = newSettings;
      await saveSettings(newSettings);
    },
    fetchModels,
  );

  bindAIEvents((sym, data, tradeType) => {
    const prompt = `Bạn là chuyên gia giao dịch chứng khoán/crypto phái sinh nhạy bén.\nMã: ${sym}\nVị thế định mua: ${tradeType.toUpperCase()}\nDữ liệu On-chain/Kỹ thuật lúc này:\n- Giá Close: ${data.close}\n- EMA 200 (Đường xu hướng): ${data.ema200 ? data.ema200 : "N/A"}\n- RSI 14: ${data.rsi ? Math.round(data.rsi) : "N/A"} (Lưu ý: <30 là bán tháo, >70 là hưng phấn)\n- Bollinger Bands: Dải dưới ${data.bb_lower ? data.bb_lower : "N/A"} | Dải trên ${data.bb_upper ? data.bb_upper : "N/A"}\n- Khối lượng lúc này: ${data.vol} (Trung bình 10 phiên là: ${data.vol_avg})\n- ATR: ${data.atr}\n\nDựa rạch ròi vào dữ liệu, đánh giá cực kỳ ngắn gọn (chỉ 3-4 câu) xem tôi có nên xuống tay thả lệnh ${tradeType} chỗ này hay không?`;
    sendToChat(prompt);
  });

  bindAIPortfolio(() => {
    if (portfolio.length === 0) {
      alert("Danh mục trống, không có dữ liệu để phân tích.");
      return;
    }
    let ctx = "Đây là danh mục đầu tư hiện hành của tôi:\nMã | Lệnh | Số lượng | Giá Vốn | Trạng thái PnL%\n";
    portfolio.forEach((t) => {
      const pData = currentPriceMap[t.symbol] || { close: t.entryPrice };
      const cPrice = pData.close / (t.symbol.match(/HOSE|HNX|UPCOM/) ? 1000 : 1);
      const isBuy = t.type === "BUY";
      const pct = isBuy ? ((cPrice - t.entryPrice) / t.entryPrice) * 100 : ((t.entryPrice - cPrice) / t.entryPrice) * 100;
      ctx += `- ${t.symbol} | ${t.type} | ${t.quantity} | Entry: ${t.entryPrice} | Lãi/Lỗ: ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%\n`;
    });
    ctx += "\nHãy đóng vai trò Giám đốc Quản trị Rủi ro. Nhìn vào danh mục trên, đưa ra nhận định THẬT NGẮN GỌN về sức khỏe danh mục và lời khuyên cắt lỗ/gồng lãi phù hợp.";
    sendToChat(ctx);
  });

  bindAIDCA((trade, currentPrice) => {
    const data = currentPriceMap[trade.symbol] || {};
    const pnlPct = trade.type === "BUY" ? ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100 : ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;
    const prompt = `Tôi đang gồng lỗ mã ${trade.symbol} (${trade.type}). Mức âm hiện hành: ${pnlPct.toFixed(2)}%.\nGiá hiện hành: ${currentPrice}.\nThông số kỹ thuật hiện tại: RSI=${data.rsi ? Math.round(data.rsi) : "N/A"}, Trend EMA200=${data.ema200 || "N/A"}, BB Lower=${data.bb_lower || "N/A"}.\n\nCó thể DCA bắt đáy (hoặc cưa chân bàn) tại đây không? Phân tích 3 câu.`;
    sendToChat(prompt);
    document.getElementById("modal-dca").style.display = "none";
  });

  bindChatEvents(
    async (text) => {
      chatHistory.push({ role: "user", text: text });
      const responseText = await queryAI(chatHistory, appSettings);
      chatHistory.push({ role: "assistant", text: responseText });
      return responseText;
    },
    () => {
      chatHistory = [];
    }
  );

  initExportImport();
  renderPortfolio(portfolio, handleDelete, handleEdit, currentPriceMap);
  updatePricesAndRender();
  startAutoRefresh();
}

document.addEventListener("DOMContentLoaded", init);
