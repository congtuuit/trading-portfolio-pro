/**
 * scanner_data.js
 * Logic to scan the whole Vietnam market for potential stocks.
 */

/**
 * Scan Vietnam market for potential "fast surfing" stocks.
 * Filters: High volume, positive momentum, not extremely overbought.
 */
export async function scanVietnamStocks() {
  console.log("scanVietnamStocks");

  const url = "https://scanner.tradingview.com/vietnam/scan";

  const body = {
    filter: [
      { left: "type", operation: "equal", right: "stock" },
      { left: "typespecs", operation: "has", right: ["common"] },
      { left: "volume", operation: "greater", right: 100000 },
      { left: "change", operation: "greater", right: 0.5 },
      { left: "active_symbol", operation: "equal", right: true }
    ],
    options: { lang: "en" },
    markets: ["vietnam"],
    symbols: { query: { types: ["stock"] }, tickers: [] },
    columns: [
      "name",
      "close",
      "change",
      "change_abs",
      "volume",
      "average_volume_10d_calc",
      "RSI",
      "ATR",
      "EMA20",
      "MACD.macd",
      "MACD.signal",
      "high",
      "low",
      "description",
      "type",
      "subtype",
      "update_mode",
      "pricescale",
      "minmov",
      "fractional",
      "minmove2"
    ],
    sort: { sortBy: "volume", sortOrder: "desc" },
    range: [0, 50]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.error("[SCAN ERROR]", res.status);
      return [];
    }

    const json = await res.json();
    if (!json?.data) return [];

    return json.data.map(item => {
      const d = item.d || [];

      const tickerFull = item.s;          // HOSE:NVL
      const [exchange, symbol] = tickerFull.split(":");

      return {
        // ===== IDENTIFY =====
        ticker: tickerFull,
        symbol,
        exchange,

        // ===== BASIC =====
        name: d[0],
        price: d[1],
        changePercent: d[2],
        changeValue: d[3],

        // ===== LIQUIDITY =====
        volume: d[4],
        avgVolume10d: d[5],
        relativeVolume: d[5] ? d[4] / d[5] : null,

        // ===== TECHNICAL =====
        rsi: d[6],
        atr: d[7],
        ema20: d[8],
        macd: d[9],
        macdSignal: d[10],

        // ===== PRICE RANGE =====
        high: d[11],
        low: d[12],

        // ===== META =====
        description: d[13],
        type: d[14],
        subtype: d[15],

        // ===== EXTRA (useful later) =====
        priceScale: d[17],
        minMove: d[18],

        // ===== CUSTOM SIGNALS (bonus) =====
        isUptrend: d[1] > d[8], // price > EMA20
        isMACDBullish: d[9] > d[10],
        isRSIHot: d[6] > 70
      };
    });

  } catch (err) {
    console.error("[SCAN FAILED]", err);
    return [];
  }
}

/**
 * Clean up scanner data to minimize tokens for AI.
 */
export function prepareDataForAI(rawStocks) {
  return rawStocks.map(s => ({
    s: s.symbol || "UNK",
    p: s.price || 0,
    c: (s.changePercent || 0).toFixed(2),
    v: ((s.volume || 0) / 1000000).toFixed(1) + "M",
    rsi: Math.round(s.rsi || 0),
    atr: (s.atr || 0).toFixed(2),
    m: (s.macd || 0) > (s.macdSignal || 0) ? "UP" : "DOWN"
  }));
}
