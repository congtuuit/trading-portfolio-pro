/**
 * background.js (Service Worker MV3)
 * Handles periodic portfolio monitoring and Telegram notifications.
 */

import { 
  getPortfolio, 
  getSettings, 
  addSystemLog 
} from "./storage.js";
import { fetchPricesMap } from "./price.js";
import { getDivisor } from "./utils.js";
import { sendTelegramMessage } from "./telegram.js";
import { suggestEntryExit } from "./analysis.js";
import { scanVietnamStocks } from "./scanner_data.js";
import { fetchHistoryDirect } from "./history.js";

const MONITOR_ALARM = "tpp_monitor_alarm";
const MONITOR_INTERVAL_MINS = 10;

// Initialize alarm on install or startup
chrome.runtime.onInstalled.addListener(() => {
  setupAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  setupAlarm();
});

// Watch for settings changes to re-setup alarm if needed
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.tpp_settings) {
    setupAlarm();
  }
});

async function setupAlarm() {
  const settings = await getSettings();
  const interval = MONITOR_INTERVAL_MINS;

  chrome.alarms.clear(MONITOR_ALARM);
  if (settings.tgEnabled) {
    chrome.alarms.create(MONITOR_ALARM, { periodInMinutes: interval });
    console.log(`[TPP] Alarm setup: ${interval} mins`);
  } else {
    console.log(`[TPP] Alarm disabled (Telegram not enabled)`);
  }
}

// Alarm listener
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === MONITOR_ALARM) {
    checkPortfolioAndNotify();
  }
});

async function checkPortfolioAndNotify() {
  console.log("[TPP] Running background check...");
  const settings = await getSettings();
  if (!settings.tgEnabled || !settings.tgToken || !settings.tgChatId) return;

  const portfolio = await getPortfolio();
  if (portfolio.length === 0) return;

  const symbols = portfolio.map(t => t.symbol);
  const priceMap = await fetchPricesMap(symbols);

  for (const trade of portfolio) {
    const data = priceMap[trade.symbol];
    if (!data) continue;

    const divisor = getDivisor(trade.symbol);
    const price = data.close / divisor; // Divided price for display
    const isBuy = trade.type === "BUY";

    // Internal targets (Stored as full prices)
    const tp = trade.takeProfit;
    const sl = trade.stopLoss;

    // Condition 1: TP/SL Hit (Compare full prices)
    if (tp && (isBuy ? data.close >= tp : data.close <= tp)) {
      await notifyTelegram(settings, `🎯 <b>TARGET REACHED!</b>\n\n${trade.symbol} đã chạm vùng Chốt Lời tại <b>${price}</b>.\nHãy xem xét chốt vị thế để bảo vệ lợi nhuận.`);
    }
    else if (sl && (isBuy ? data.close <= sl : data.close >= sl)) {
      await notifyTelegram(settings, `⚠️ <b>STOP LOSS HIT!</b>\n\n${trade.symbol} đã chạm vùng Cắt Lỗ tại <b>${price}</b>.\nAnh nên rà soát lại kỷ luật giao dịch.`);
    }

    // Condition 2: T0 Opportunity (RSI Oversold + Price <= BB Lower)
    // Both sides of comparison are full prices: data.close vs data.bb_lower
    if (isBuy && data.rsi > 0 && data.rsi < 30 && data.close <= data.bb_lower) {
      await notifyTelegram(settings, `🌊 <b>THAY NƯỚC T0!</b>\n\n${trade.symbol} đang ở vùng <b>QUÁ BÁN</b> (RSI: ${Math.round(data.rsi)}).\nGiá đã chạm dải BB Lower (${price}). Đây là cơ hội tốt để lướt T0 hạ giá vốn!`);
    }
  }
}

async function notifyTelegram(settings, message) {
  try {
    // Only notify once per symbol per alarm to avoid spam (simple deduplication in a real app would be better)
    await sendTelegramMessage(settings.tgToken, settings.tgChatId, message);
  } catch (err) {
    console.error("[TPP] Telegram notify failed:", err);
  }
}

// ── Message Listener for Price Fetching (CORS Proxy) ──
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[TPP] Message received:", message.type);

  switch (message.type) {
    case "FETCH_PRICES":
      addSystemLog('API', 'FETCH_PRICES Request', message.symbols);
      fetchPricesMap(message.symbols)
        .then(data => {
          addSystemLog('API', 'FETCH_PRICES Response', data);
          sendResponse({ success: true, data });
        })
        .catch(err => {
          addSystemLog('ERROR', 'FETCH_PRICES Failed', err.message);
          sendResponse({ success: false, error: err.message });
        });
      return true;

    case "SCAN_STOCKS":
      console.log("[TPP] Starting scanVietnamStocks...");
      addSystemLog('API', 'SCAN_STOCKS Request', 'Scanning Vietnam market...');
      try {
        scanVietnamStocks()
          .then(data => {
            console.log("[TPP] Scan success, count:", data ? data.length : 0);
            addSystemLog('API', 'SCAN_STOCKS Response', data);
            sendResponse({ success: true, data: data || [] });
          })
          .catch(err => {
            console.error("[TPP] Scan error (Promise):", err);
            addSystemLog('ERROR', 'SCAN_STOCKS Failed (Promise)', err.message);
            sendResponse({ success: false, error: err.message });
          });
      } catch (err) {
        console.error("[TPP] Scan error (Sync):", err);
        addSystemLog('ERROR', 'SCAN_STOCKS Failed (Sync)', err.message);
        sendResponse({ success: false, error: err.message });
      }
      return true;

    case "FETCH_HISTORY":
      addSystemLog('API', 'FETCH_HISTORY Request', { symbol: message.symbol, periods: message.periods });
      fetchHistoryDirect(message.symbol, message.periods || 20, message.resolution || 'D')
        .then(data => {
          sendResponse({ success: true, data });
        })
        .catch(err => {
          addSystemLog('ERROR', 'FETCH_HISTORY Failed', err.message);
          sendResponse({ success: false, error: err.message });
        });
      return true;

    default:
      // Phản hồi mặc định cho các message lạ để tránh treo Port
      sendResponse({ success: false, error: "Unknown message type" });
      return false;
  }
});
