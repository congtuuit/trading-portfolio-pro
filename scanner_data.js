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
      { left: "change", operation: "greater", right: -2.5 },
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
      "EMA50",
      "EMA200",
      "BB.lower",
      "BB.upper",
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
    range: [0, 150]
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
        ema50: d[9],
        ema200: d[10],
        bb_lower: d[11],
        bb_upper: d[12],
        macd: d[13],
        macdSignal: d[14],

        // ===== PRICE RANGE =====
        high: d[15],
        low: d[16],

        // ===== META =====
        description: d[17],
        type: d[18],
        subtype: d[19],

        // ===== EXTRA (useful later) =====
        priceScale: d[21],
        minMove: d[22],

        // ===== CUSTOM SIGNALS (bonus) =====
        isUptrend: d[1] > d[8], // price > EMA20
        isMACDBullish: d[13] > d[14],
        isRSIHot: d[6] > 70
      };
    });

  } catch (err) {
    console.error("[SCAN FAILED]", err);
    return [];
  }
}

/**
 * Scan top 30 crypto coins on Binance for potential trades.
 */
export async function scanCryptoCoins() {
  console.log("scanCryptoCoins");

  const url = "https://scanner.tradingview.com/crypto/scan";

  const body = {
    filter: [],
    options: { lang: "en" },
    markets: ["crypto"],
    symbols: {
      query: { types: [] },
      tickers: [
        "BINANCE:BTCUSDT",
        "BINANCE:ETHUSDT",
        "BINANCE:SOLUSDT",
        "BINANCE:XRPUSDT",
        "BINANCE:BNBUSDT",
        "BINANCE:DOGEUSDT",
        "BINANCE:ADAUSDT",
        "BINANCE:TRXUSDT",
        "BINANCE:SHIBUSDT",
        "BINANCE:AVAXUSDT",
        "BINANCE:DOTUSDT",
        "BINANCE:LINKUSDT",
        "BINANCE:NEARUSDT",
        "BINANCE:LTCUSDT",
        "BINANCE:BCHUSDT",
        "BINANCE:UNIUSDT",
        "BINANCE:PEPEUSDT",
        "BINANCE:SUIUSDT",
        "BINANCE:APTUSDT",
        "BINANCE:FETUSDT",
        "BINANCE:OPUSDT",
        "BINANCE:ARBUSDT",
        "BINANCE:RENDERUSDT",
        "BINANCE:WIFUSDT",
        "BINANCE:IMXUSDT",
        "BINANCE:GRTUSDT",
        "BINANCE:FILUSDT",
        "BINANCE:ICPUSDT",
        "BINANCE:AAVEUSDT",
        "BINANCE:TIAUSDT"
      ]
    },
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
      "EMA50",
      "EMA200",
      "BB.lower",
      "BB.upper",
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
    ]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.error("[SCAN CRYPTO ERROR]", res.status);
      return [];
    }

    const json = await res.json();
    if (!json?.data) return [];

    return json.data.map(item => {
      const d = item.d || [];

      const tickerFull = item.s;          // BINANCE:BTCUSDT
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
        ema50: d[9],
        ema200: d[10],
        bb_lower: d[11],
        bb_upper: d[12],
        macd: d[13],
        macdSignal: d[14],

        // ===== PRICE RANGE =====
        high: d[15],
        low: d[16],

        // ===== META =====
        description: d[17],
        type: d[18],
        subtype: d[19],

        // ===== EXTRA =====
        priceScale: d[21],
        minMove: d[22],

        // ===== CUSTOM SIGNALS =====
        isUptrend: d[1] > d[8],
        isMACDBullish: d[13] > d[14],
        isRSIHot: d[6] > 70
      };
    });

  } catch (err) {
    console.error("[SCAN CRYPTO FAILED]", err);
    return [];
  }
}

/**
 * Clean up scanner data to minimize tokens for AI while providing crucial anti-overbought signals.
 */
export function prepareDataForAI(rawStocks) {
  return rawStocks.map(s => {
    const p = s.price || 0;
    const bl = s.bb_lower ? Math.round(s.bb_lower) : 0;
    const bu = s.bb_upper ? Math.round(s.bb_upper) : 0;
    const bbRange = bu - bl;
    const bbp = bbRange > 0 ? Math.round(((p - bl) / bbRange) * 100) : 50;
    const ed20 = s.ema20 ? parseFloat((((p - s.ema20) / s.ema20) * 100).toFixed(1)) : 0;
    const up = bu > p ? parseFloat((((bu - p) / p) * 100).toFixed(1)) : 0;

    return {
      s: s.symbol || s.s || s.name || "UNK",
      p: p,
      c: (s.changePercent || 0).toFixed(2),
      v: ((s.volume || 0) / 1000000).toFixed(1) + "M",
      rsi: Math.round(s.rsi || 0),
      atr: (s.atr || 0).toFixed(2),
      e20: s.ema20 ? Math.round(s.ema20) : 0,
      e50: s.ema50 ? Math.round(s.ema50) : 0,
      e200: s.ema200 ? Math.round(s.ema200) : 0,
      bl: bl,
      bu: bu,
      bbp: bbp,      // % vị trí trong Bollinger Bands (0-100)
      ed20: ed20,    // % khoảng cách từ giá tới EMA20 (VD: +1.2)
      up: up,        // % dư địa tăng tới cản dải trên BB (VD: +6.5)
      m: (s.macd || 0) > (s.macdSignal || 0) ? "UP" : "DOWN",
      vr: s.avgVolume10d > 0 ? (s.volume / s.avgVolume10d).toFixed(1) : "0.0",
      hi: s.high ? Math.round(s.high) : 0,
      lo: s.low ? Math.round(s.low) : 0,
      sc: s._score || 0,
      g: s._grade || "N/A"
    };
  });
}

