/**
 * price.js
 * Price engine abstraction using TradingView Scanner API.
 */

/**
 * Fetch real prices from TradingView Vietnam Scanner.
 * @param {string[]} symbols - Array of format "HOSE:HCM", "HNX:SHS" etc.
 * @returns {Promise<Object>} Map of symbol -> { close, change, change_abs }
 */
export async function fetchPricesMap(symbols) {
  if (!symbols || symbols.length === 0) return {};

  const uniqueSymbols = [...new Set(symbols)];

  // ── CORS Bypass Logic: If in Content Script, proxy via background ──
  if (typeof window !== "undefined" && window.location.protocol !== "chrome-extension:") {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "FETCH_PRICES", symbols: uniqueSymbols }, (res) => {
        if (chrome.runtime.lastError) {
          console.error("[TPP] Proxy Fetch Error:", chrome.runtime.lastError);
          resolve({});
        } else if (res && res.success) {
          resolve(res.data);
        } else {
          resolve({});
        }
      });
    });
  }

  console.log("fetch ", uniqueSymbols);

  try {
    const response = await fetch(
      "https://scanner.tradingview.com/global/scan",
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({
          symbols: {
            tickers: uniqueSymbols,
            query: { types: [] },
          },
          columns: [
          "close", 
          "change", 
          "change_abs", 
          "RSI", 
          "EMA200", 
          "BB.lower", 
          "BB.upper", 
          "ATR", 
          "high",
          "low",
          "volume", 
          "average_volume_10d_calc"
        ],
      }),
    });

    if (!response.ok) {
      console.error("[TPP] Scanner API Error:", response.status);
      return {};
    }

    const json = await response.json();
    const result = {};

    if (json.data && Array.isArray(json.data)) {
      json.data.forEach((item) => {
        const sym = item.s;
        const [close, change, change_abs, rsi, ema200, bb_lower, bb_upper, atr, high, low, vol, vol_avg] = item.d;
        result[sym] = {
          close: close || 0,
          change: change || 0,
          change_abs: change_abs || 0,
          rsi: rsi || 0,
          ema200: ema200 || 0,
          bb_lower: bb_lower || 0,
          bb_upper: bb_upper || 0,
          atr: atr || 0,
          high: high || 0,
          low: low || 0,
          vol: vol || 0,
          vol_avg: vol_avg || 0
        };
      });
    }

    return result;
  } catch (err) {
    console.error("[TPP] Fetch prices failed:", err);
    return {};
  }
}
