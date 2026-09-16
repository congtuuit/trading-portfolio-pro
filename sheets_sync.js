/**
 * sheets_sync.js
 * Cloud synchronization layer between Trading Portfolio Pro and Google Sheets (via Apps Script Web App).
 * Supports Cross-Device synchronization for stocks and crypto portfolios.
 */

/**
 * Validate whether a string is a valid Google Apps Script Web App URL
 * @param {string} url 
 * @returns {boolean}
 */
export function isValidSheetsUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("https://script.google.com/macros/s/") &&
    trimmed.endsWith("/exec")
  );
}

/**
 * Helper to execute fetch directly or proxy via background.js if running in content script
 */
async function executeSyncRequest(type, payload) {
  const isContentScript = typeof window !== "undefined" && window.location.protocol !== "chrome-extension:";
  
  if (isContentScript && typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, ...payload }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(res || { success: false, error: "Không nhận được phản hồi từ background script." });
        }
      });
    });
  }

  // Running inside extension origin / service worker: perform direct fetch
  return directSyncFetch(type, payload);
}

/**
 * Direct fetch implementation for Extension Context
 */
export async function directSyncFetch(type, payload) {
  const { url, portfolio } = payload;
  const cleanUrl = (url || "").trim();

  if (!isValidSheetsUrl(cleanUrl)) {
    return { success: false, error: "URL Google Apps Script không hợp lệ. Phải bắt đầu bằng https://script.google.com/macros/s/ và kết thúc bằng /exec" };
  }

  try {
    if (type === "SYNC_SHEETS_TEST") {
      const pingUrl = cleanUrl + (cleanUrl.includes("?") ? "&" : "?") + "action=ping&_t=" + Date.now();
      const res = await fetch(pingUrl, { method: "GET" });
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return data;
    }

    if (type === "SYNC_SHEETS_PULL") {
      const pullUrl = cleanUrl + (cleanUrl.includes("?") ? "&" : "?") + "action=pull&_t=" + Date.now();
      const res = await fetch(pullUrl, { method: "GET" });
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return data;
    }

    if (type === "SYNC_SHEETS_PUSH") {
      // POST with text/plain body to avoid CORS preflight failures on Apps Script redirects
      const items = Array.isArray(portfolio) ? portfolio : [];
      const res = await fetch(cleanUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({ action: "push", data: items })
      });

      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return data;
    }

    return { success: false, error: "Hành động không được hỗ trợ: " + type };
  } catch (err) {
    console.error("[TPP Sheets Sync] Error:", err);
    return { success: false, error: err.message || "Lỗi kết nối tới Google Apps Script" };
  }
}

/**
 * Test connection to Google Apps Script Web App
 * @param {string} url 
 * @returns {Promise<{success: boolean, message?: string, count?: number, error?: string}>}
 */
export async function testSheetsConnection(url) {
  return executeSyncRequest("SYNC_SHEETS_TEST", { url });
}

/**
 * Pull portfolio items from Google Sheet
 * @param {string} url 
 * @returns {Promise<{success: boolean, data?: Array, count?: number, error?: string}>}
 */
export async function pullPortfolioFromSheet(url) {
  return executeSyncRequest("SYNC_SHEETS_PULL", { url });
}

/**
 * Push portfolio items to Google Sheet
 * @param {string} url 
 * @param {Array} portfolio 
 * @returns {Promise<{success: boolean, count?: number, message?: string, error?: string}>}
 */
export async function pushPortfolioToSheet(url, portfolio) {
  return executeSyncRequest("SYNC_SHEETS_PUSH", { url, portfolio });
}
