/**
 * history.js
 * Module độc lập để fetch dữ liệu OHLCV lịch sử từ TradingView.
 * Không phụ thuộc vào bất kỳ module nào khác trong dự án.
 */

/**
 * Fetch dữ liệu OHLCV lịch sử cho một mã cổ phiếu.
 * @param {string} symbol - Mã cổ phiếu dạng "HOSE:VCB"
 * @param {number} periods - Số phiên cần lấy (default: 20)
 * @param {string} resolution - Khung thời gian: "D" (ngày), "60" (1H), "15" (15 phút)
 * @returns {Promise<Array<{time, open, high, low, close, volume}>>}
 */
export async function fetchSymbolHistory(symbol, periods = 20, resolution = "D") {
  // Bypass CORS nếu đang chạy trong Content Script
  if (typeof window !== "undefined" && window.location.protocol !== "chrome-extension:") {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "FETCH_HISTORY", symbol, periods, resolution },
        (res) => {
          if (chrome.runtime.lastError) {
            console.error("[TPP] History proxy error:", chrome.runtime.lastError);
            resolve([]);
          } else if (res && res.success) {
            resolve(res.data);
          } else {
            resolve([]);
          }
        }
      );
    });
  }

  return fetchHistoryDirect(symbol, periods, resolution);
}

/**
 * Gọi trực tiếp TradingView History API (dùng trong background script).
 * @param {string} symbol
 * @param {number} periods
 * @param {string} resolution
 * @returns {Promise<Array>}
 */
export async function fetchHistoryDirect(symbol, periods = 20, resolution = "D") {
  try {
    const to = Math.floor(Date.now() / 1000);

    const url = new URL("https://history.tradingview.com/history");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("resolution", resolution);
    url.searchParams.set("countback", String(periods));
    url.searchParams.set("to", String(to));

    const response = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error("[TPP] History API error:", response.status);
      return [];
    }

    const json = await response.json();

    // TradingView trả về: { s: "ok", t: [], o: [], h: [], l: [], c: [], v: [] }
    if (json.s !== "ok" || !Array.isArray(json.t)) {
      console.warn("[TPP] History API returned no data for", symbol);
      return [];
    }

    // Chuyển đổi sang định dạng OHLCV dễ dùng
    return json.t.map((time, i) => ({
      time,
      open: json.o[i] || 0,
      high: json.h[i] || 0,
      low: json.l[i] || 0,
      close: json.c[i] || 0,
      volume: json.v[i] || 0,
    }));
  } catch (err) {
    console.error("[TPP] fetchHistoryDirect failed:", err);
    return [];
  }
}

/**
 * Tóm tắt dữ liệu OHLCV thành đoạn text để đưa vào AI Prompt.
 * @param {Array} history - Mảng OHLCV từ fetchSymbolHistory
 * @param {string} symbol - Tên mã cổ phiếu (để hiển thị)
 * @returns {string}
 */
export function formatHistoryForAI(history, symbol) {
  if (!history || history.length === 0) return "";

  const lines = history.map((bar, i) => {
    const date = new Date(bar.time * 1000).toLocaleDateString("vi-VN");
    return `  Phiên ${i + 1} (${date}): O=${bar.open} H=${bar.high} L=${bar.low} C=${bar.close} Vol=${bar.volume}`;
  });

  return `\nDữ liệu ${history.length} phiên gần nhất của ${symbol}:\n${lines.join("\n")}`;
}
