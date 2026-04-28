/**
 * storage.js
 * Chrome storage abstraction layer.
 * Uses chrome.storage.local for persistence.
 */

const STORAGE_KEY = "tpp_portfolio";

/**
 * Load the portfolio array from chrome.storage.local.
 * @returns {Promise<Array>}
 */
export async function getPortfolio() {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

/**
 * Save a portfolio array to chrome.storage.local.
 * @param {Array} portfolio
 * @returns {Promise<void>}
 */
export async function savePortfolio(portfolio) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: portfolio }, resolve);
  });
}

const SETTINGS_KEY = "tpp_settings";

export async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SETTINGS_KEY], (result) => {
      resolve(result[SETTINGS_KEY] || { 
        aiProvider: 'gemini', 
        apiKey: '',
        tgToken: '',
        tgChatId: '',
        tgEnabled: false
      });
    });
  });
}

export async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, resolve);
  });
}

const CHAT_HISTORY_KEY = "tpp_chat_history";

/**
 * Load chat history from storage.
 * @returns {Promise<Array>}
 */
export async function getChatHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get([CHAT_HISTORY_KEY], (result) => {
      resolve(result[CHAT_HISTORY_KEY] || []);
    });
  });
}

/**
 * Save chat history to storage, limiting to the last 50 messages.
 * @param {Array} history
 * @returns {Promise<void>}
 */
export async function saveChatHistory(history) {
  const limitedHistory = history.slice(-50);
  return new Promise((resolve) => {
    chrome.storage.local.set({ [CHAT_HISTORY_KEY]: limitedHistory }, resolve);
  });
}

const TRADE_HISTORY_KEY = "tpp_trade_history";

/**
 * Load trade history from storage.
 * @returns {Promise<Array>}
 */
export async function getTradeHistory() {
  return new Promise((resolve) => {
    chrome.storage.local.get([TRADE_HISTORY_KEY], (result) => {
      resolve(result[TRADE_HISTORY_KEY] || []);
    });
  });
}

/**
 * Save trade history to storage.
 * @param {Array} history
 * @returns {Promise<void>}
 */
export async function saveTradeHistory(history) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [TRADE_HISTORY_KEY]: history }, resolve);
  });
}

// ── Scanner Results Persistence ──
export async function saveScannerResults(results, timestamp) {
  await chrome.storage.local.set({ 
    tpp_scanner_results: results,
    tpp_scanner_time: timestamp 
  });
}

export async function getScannerResults() {
  const data = await chrome.storage.local.get(["tpp_scanner_results", "tpp_scanner_time"]);
  return {
    results: data.tpp_scanner_results || [],
    timestamp: data.tpp_scanner_time || null
  };
}

export async function saveRawScannerResults(results) {
  await chrome.storage.local.set({ tpp_raw_scanner: results });
}

export async function getRawScannerResults() {
  const data = await chrome.storage.local.get("tpp_raw_scanner");
  return data.tpp_raw_scanner || [];
}

export async function clearAllScannerData() {
  await chrome.storage.local.remove([
    "tpp_scanner_results", 
    "tpp_scanner_time", 
    "tpp_raw_scanner"
  ]);
}

// ── AI Advice Cache (24h) ──
export async function saveAdviceCache(symbol, advice) {
  const cacheKey = `tpp_cache_${symbol}`;
  await chrome.storage.local.set({ 
    [cacheKey]: {
      advice,
      timestamp: Date.now()
    }
  });
}

export async function getAdviceCache(symbol) {
  const cacheKey = `tpp_cache_${symbol}`;
  const data = await chrome.storage.local.get(cacheKey);
  const cache = data[cacheKey];
  
  if (cache && (Date.now() - cache.timestamp < 24 * 60 * 60 * 1000)) {
    return cache.advice;
  }
  return null;
}

export async function clearAdviceCache() {
  const all = await chrome.storage.local.get(null);
  const keysToRemove = Object.keys(all).filter(k => k.startsWith("tpp_cache_"));
  await chrome.storage.local.remove(keysToRemove);
}

// ── System Logs ──
export async function addSystemLog(type, title, detail) {
  const data = await chrome.storage.local.get("tpp_logs");
  const logs = data.tpp_logs || [];
  const newLog = {
    time: new Date().toISOString(),
    type,   // 'API' | 'AI_PROMPT' | 'AI_RES' | 'ERROR'
    title,
    detail: typeof detail === 'object' ? JSON.stringify(detail, null, 2) : detail
  };
  
  logs.unshift(newLog);
  // Giới hạn 100 logs gần nhất
  await chrome.storage.local.set({ tpp_logs: logs.slice(0, 100) });
}

export async function getSystemLogs() {
  const data = await chrome.storage.local.get("tpp_logs");
  return data.tpp_logs || [];
}
