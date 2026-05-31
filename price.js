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
          "EMA20",
          "EMA50",
          "EMA200",
          "BB.lower",
          "BB.upper",
          "ATR",
          "high",
          "low",
          "volume",
          "average_volume_10d_calc",
          "MACD.macd",
          "MACD.signal"
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
        const [close, change, change_abs, rsi, ema20, ema50, ema200, bb_lower, bb_upper, atr, high, low, vol, vol_avg, macd, macd_signal] = item.d;
        result[sym] = {
          close: close || 0,
          change: change || 0,
          change_abs: change_abs || 0,
          rsi: rsi || 0,
          ema20: ema20 || 0,
          ema50: ema50 || 0,
          ema200: ema200 || 0,
          bb_lower: bb_lower || 0,
          bb_upper: bb_upper || 0,
          atr: atr || 0,
          high: high || 0,
          low: low || 0,
          vol: vol || 0,
          vol_avg: vol_avg || 0,
          macd: macd || 0,
          macd_signal: macd_signal || 0
        };
      });
    }

    return result;
  } catch (err) {
    console.error("[TPP] Fetch prices failed:", err);
    return {};
  }
}

/**
 * Fetch extensive fundamental and technical data for AI Deep Research from TradingView.
 */
export async function fetchDeepResearchData(symbol) {
  if (typeof window !== "undefined" && window.location.protocol !== "chrome-extension:") {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "FETCH_DEEP_RESEARCH", symbol }, (res) => {
        resolve(res?.success ? res.data : null);
      });
    });
  }

  try {
    const response = await fetch(
      "https://scanner.tradingview.com/global/scan",
      {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          symbols: { tickers: [symbol], query: { types: [] } },
          columns: [
            "close", "change", "RSI", "EMA20", "EMA50", "EMA200", 
            "MACD.macd", "MACD.signal", "volume", 
            "price_earnings_ttm", "price_book_fq", "return_on_equity", 
            "sector", "industry", "market_cap_basic", "total_revenue_fq",
            "debt_to_equity_fq"
          ]
        }),
      }
    );

    if (!response.ok) return null;
    const json = await response.json();
    if (!json.data || json.data.length === 0) return null;

    const d = json.data[0].d;
    return {
      close: d[0],
      change: d[1],
      rsi: d[2],
      ema20: d[3],
      ema50: d[4],
      ema200: d[5],
      macd: d[6],
      macd_signal: d[7],
      volume: d[8],
      pe: d[9],
      pb: d[10],
      roe: d[11],
      sector: d[12],
      industry: d[13],
      market_cap: d[14],
      revenue: d[15],
      debt_equity: d[16]
    };
  } catch (err) {
    console.error("[TPP] Deep Research Fetch Failed:", err);
    return null;
  }
}
