/**
 * Normalize and generate candidate ticker formats for TradingView Scanner API.
 * Supports raw symbols (ETHUSD, ETH, BTC, VHM) as well as exchange-prefixed symbols.
 * @param {string} input 
 * @returns {string[]} Array of candidate tickers
 */
export function normalizeSymbolCandidates(input) {
  if (!input) return [];
  const sym = input.trim().toUpperCase();
  if (!sym) return [];

  const candidates = [sym];

  if (sym.includes(":")) {
    const [exchange, ticker] = sym.split(":");
    if (exchange === "BINANCE" && ticker.endsWith("USD") && !ticker.endsWith("USDT")) {
      candidates.push(`BINANCE:${ticker}T`);
    }
    if (exchange === "COINBASE" && ticker.endsWith("USDT")) {
      candidates.push(`COINBASE:${ticker.slice(0, -1)}`);
    }
    return [...new Set(candidates)];
  }

  const cryptos = [
    "BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "AVAX", "LINK", 
    "SUI", "NEAR", "APT", "DOT", "MATIC", "PEPE", "SHIB", "LTC", "BCH", 
    "UNI", "ATOM", "ETC", "FIL", "TRX", "TON"
  ];

  let base = sym;
  let isCryptoLike = false;

  for (const c of cryptos) {
    if (sym === c || sym.startsWith(c)) {
      base = c;
      isCryptoLike = true;
      break;
    }
  }

  if (sym.endsWith("USDT") || sym.endsWith("USD") || sym.endsWith("BUSD") || isCryptoLike) {
    candidates.push(`BINANCE:${base}USDT`);
    candidates.push(`BINANCE:${sym}`);
    candidates.push(`COINBASE:${base}USD`);
    candidates.push(`COINBASE:${sym}`);
    candidates.push(`BINANCE:${base}USD`);
    candidates.push(`OKX:${base}USDT`);
    candidates.push(`BYBIT:${base}USDT`);
  } else {
    candidates.push(`HOSE:${sym}`);
    candidates.push(`HNX:${sym}`);
    candidates.push(`UPCOM:${sym}`);
    candidates.push(`BINANCE:${sym}USDT`);
    candidates.push(`COINBASE:${sym}USD`);
  }

  return [...new Set(candidates)];
}

/**
 * Fetch real prices from TradingView Vietnam & Global Scanner.
 * @param {string[]} symbols - Array of format "HOSE:HCM", "ETHUSD", "BINANCE:ETHUSDT" etc.
 * @returns {Promise<Object>} Map of symbol -> { symbol, close, change, change_abs, ... }
 */
export async function fetchPricesMap(symbols) {
  if (!symbols || symbols.length === 0) return {};

  const cleanSymbols = [...new Set(symbols.filter(Boolean))];

  // ── CORS Bypass Logic: If in Content Script, proxy via background ──
  if (typeof window !== "undefined" && window.location.protocol !== "chrome-extension:") {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "FETCH_PRICES", symbols: cleanSymbols }, (res) => {
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

  const inputMap = {};
  const allCandidates = [];

  cleanSymbols.forEach(sym => {
    const cands = normalizeSymbolCandidates(sym);
    cands.forEach(c => {
      if (!inputMap[c]) inputMap[c] = sym;
      allCandidates.push(c);
    });
  });

  const uniqueTickers = [...new Set(allCandidates)];

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
            tickers: uniqueTickers,
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
      }
    );

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
        const priceData = {
          symbol: sym,
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

        result[sym] = priceData;

        // Also map to the original input ticker so lookups with input symbol succeed!
        const orig = inputMap[sym];
        if (orig && !result[orig]) {
          result[orig] = priceData;
        }
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

  const candidates = normalizeSymbolCandidates(symbol);

  try {
    const response = await fetch(
      "https://scanner.tradingview.com/global/scan",
      {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          symbols: { tickers: candidates, query: { types: [] } },
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

    const matched = json.data[0];
    const d = matched.d;
    return {
      symbol: matched.s,
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

