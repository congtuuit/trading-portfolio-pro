/**
 * utils.js
 * Common utility functions for Trading Portfolio Pro.
 */

/**
 * Determine the divisor for a symbol based on its exchange prefix.
 * Vietnamese (HOSE, HNX, UPCOM) stocks use a price divisor of 1000 on TradingView.
 * @param {string} symbol
 * @returns {number}
 */
export function getDivisor(symbol) {
  if (!symbol) return 1;
  const s = symbol.toUpperCase();
  if (s.startsWith("HOSE:") || s.startsWith("HNX:") || s.startsWith("UPCOM:")) {
    return 1000;
  }
  return 1;
}

/**
 * Sanitize HTML if needed (primitive version)
 * Or use textContent approach in DOM.
 */
export function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Calculate the T0 "Thay nước" scenario result.
 * Based on profit from a mini-trade to lower main entry price.
 * 
 * @param {Object} trade         - Main trade data
 * @param {number} currentPrice - Price at which T0 entry is made
 * @param {number} bouncePct    - Target bounce percentage (e.g. 2 for 2%)
 * @param {number} t0Qty        - Quantity for the mini-trade
 * @returns {Object}            - Resulting newEntry and totalBenefit
 */
export function calculateT0Scenario(trade, currentPrice, bouncePct, t0Qty) {
  const isBuy = trade.type === "BUY";
  const entryPrice = parseFloat(trade.entryPrice);
  const mainQty = parseFloat(trade.quantity);

  // Target exit for the T0 mini-trade
  const targetExit = isBuy 
    ? currentPrice * (1 + bouncePct / 100)
    : currentPrice * (1 - bouncePct / 100);

  // Profit from this mini-trade
  const profitPerUnit = isBuy ? (targetExit - currentPrice) : (currentPrice - targetExit);
  const totalProfit = profitPerUnit * t0Qty;

  // New entry price if this profit is used to lower the main cost
  // New Cost = (Main Entry * Main Qty - Total Profit) / Main Qty
  // New Entry = Main Entry - (Total Profit / Main Qty)
  const entryReduction = totalProfit / mainQty;
  const newEntry = isBuy ? (entryPrice - entryReduction) : (entryPrice + entryReduction);

  return {
    targetExit,
    totalProfit,
    entryReduction,
    newEntry: parseFloat(newEntry.toFixed(4)),
  };
}

/**
 * Calculate Risk:Reward Ratio
 * @param {number} entry
 * @param {number} target
 * @param {number} stoploss
 * @param {string} type - 'BUY' or 'SELL'
 * @returns {number|null} RR ratio (e.g. 2.0 for 1:2.0), or null if invalid
 */
export function calculateRR(entry, target, stoploss, type = 'BUY') {
  if (!entry || !target || !stoploss) return null;
  const risk = type === 'BUY' ? (entry - stoploss) : (stoploss - entry);
  const reward = type === 'BUY' ? (target - entry) : (entry - target);
  if (risk <= 0 || reward <= 0) return null; // Invalid setup
  return Number((reward / risk).toFixed(2));
}

/**
 * Parses basic Markdown into HTML (safe from XSS)
 * @param {string} text
 * @returns {string}
 */
export function parseMarkdown(text) {
  if (!text) return "";
  let html = escapeHTML(text);

  // Headers
  html = html.replace(/^###[ \t]+(.*?)$/gm, '<h4 style="margin: 8px 0 4px; color: #fff;">$1</h4>');
  html = html.replace(/^##[ \t]+(.*?)$/gm, '<h3 style="margin: 10px 0 6px; color: #fff;">$1</h3>');
  html = html.replace(/^#[ \t]+(.*?)$/gm, '<h2 style="margin: 12px 0 8px; color: #fff;">$1</h2>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Bullet Lists
  html = html.replace(/^[-\*][ \t]+(.*?)$/gm, '<li style="margin-left: 14px; margin-bottom: 2px; list-style-type: disc;">$1</li>');

  // Line breaks
  html = html.replace(/\n/g, '<br/>');

  return html;
}

/**
 * Calculate Position Sizing based on risk percentage of account balance (Pine Script logic).
 * @param {number} entry - Entry price
 * @param {number} stoploss - Stop loss price
 * @param {number} accountBalance - Total account balance (default 100,000,000 VND or 5000 USDT)
 * @param {number} riskPercent - Risk % per trade (e.g. 2 for 2%)
 * @param {boolean} isCrypto - Asset type
 * @returns {Object} { units, riskAmount, totalInvestment, percentOfPortfolio }
 */
export function calculatePositionSize(entry, stoploss, accountBalance = 100000000, riskPercent = 2.0, isCrypto = false) {
  const e = parseFloat(entry) || 0;
  const sl = parseFloat(stoploss) || 0;
  const bal = parseFloat(accountBalance) || 100000000;
  const riskPct = parseFloat(riskPercent) || 2.0;

  if (e <= 0 || sl <= 0 || e === sl) {
    return { units: 0, riskAmount: 0, totalInvestment: 0, percentOfPortfolio: 0 };
  }

  const riskAmount = bal * (riskPct / 100.0);
  const dist = Math.abs(e - sl);
  let rawUnits = riskAmount / dist;

  let units = rawUnits;
  if (!isCrypto) {
    // VN Stocks are traded in lots of 100
    units = Math.max(100, Math.floor(rawUnits / 100) * 100);
  } else {
    units = parseFloat(rawUnits.toFixed(4));
  }

  const totalInvestment = units * e;
  const percentOfPortfolio = parseFloat(((totalInvestment / bal) * 100).toFixed(1));

  return {
    units,
    riskAmount: Math.round(riskAmount),
    totalInvestment: Math.round(totalInvestment),
    percentOfPortfolio
  };
}

/**
 * Detect Candlestick Patterns from OHLCV snapshot data.
 * @param {Object} s - Stock data with price, changePercent, high, low, atr
 * @returns {Object} { pattern, isBullish, icon, label }
 */
export function detectCandlePattern(s) {
  const close = s.price || s.close || 0;
  const change = s.changePercent || 0;
  const open = s.open || (change !== 0 ? close / (1 + change / 100) : close);
  const high = s.high || Math.max(open, close);
  const low = s.low || Math.min(open, close);

  const bodySize = Math.abs(close - open);
  const isBull = close >= open;
  const upperWick = high - Math.max(open, close);
  const lowerWick = Math.min(open, close) - low;
  const totalRange = high - low;

  if (totalRange === 0) return { pattern: "Normal", isBullish: true, icon: "🕯️", label: "Nến Thường" };

  // Hammer / Pinbar rút chân
  if (lowerWick >= bodySize * 2.0 && upperWick <= bodySize * 0.5 && lowerWick > totalRange * 0.5) {
    return { pattern: "Hammer", isBullish: true, icon: "🔨", label: "Pinbar Rút Chân" };
  }

  // Shooting Star
  if (upperWick >= bodySize * 2.0 && lowerWick <= bodySize * 0.5 && upperWick > totalRange * 0.5) {
    return { pattern: "ShootingStar", isBullish: false, icon: "☄️", label: "Bắn Sao (Áp Lực Bán)" };
  }

  // Marubozu / Lực đẩy mạnh
  if (bodySize >= totalRange * 0.8 && change > 2.5) {
    return { pattern: "BullishMarubozu", isBullish: true, icon: "🚀", label: "Lực Đẩy Mạnh" };
  }

  // Bullish Engulfing / Tăng tốt
  if (isBull && change >= 1.5 && bodySize > totalRange * 0.6) {
    return { pattern: "BullishCandle", isBullish: true, icon: "🟢", label: "Nến Tăng Đẹp" };
  }

  // Doji
  if (bodySize <= totalRange * 0.1) {
    return { pattern: "Doji", isBullish: true, icon: "⚖️", label: "Lưỡng Lự Doji" };
  }

  return { pattern: isBull ? "Bull" : "Bear", isBullish: isBull, icon: isBull ? "📈" : "📉", label: isBull ? "Tăng Nhẹ" : "Điều Chỉnh" };
}

/**
 * Probability Assessment Matrix (mirrors Pine Script V5.5).
 * @param {Object} s - Stock data
 * @param {Object} profile - User profile
 * @returns {Object} { bullProb, bearProb, direction, strength, dirColor, badgeText }
 */
export function calculateProbability(s, profile = {}) {
  const price = s.price || s.close || 0;
  const rsi = s.rsi || 50;
  const ema20 = s.ema20 || price;
  const ema50 = s.ema50 || price;
  const ema200 = s.ema200 || price;
  const bbLower = s.bb_lower || 0;
  const bbUpper = s.bb_upper || 0;
  const macd = s.macd || 0;
  const macdSignal = s.macdSignal || s.macd_signal || 0;

  const isUptrend = price > ema20 && ema20 > ema50;
  const priceAboveEma200 = price > ema200;
  const isMACDBullish = macd > macdSignal;
  const bbRange = bbUpper - bbLower;
  const bbPct = bbRange > 0 ? ((price - bbLower) / bbRange) * 100 : 50;

  let bullProb = 50.0;

  if (isUptrend) bullProb += 8.0;
  else if (price < ema20 && ema20 < ema50) bullProb -= 8.0;

  if (priceAboveEma200) bullProb += 6.0;
  else bullProb -= 6.0;

  if (isMACDBullish) bullProb += 7.0;
  else bullProb -= 7.0;

  if (rsi <= 35) bullProb += 8.0; // Oversold
  else if (rsi >= 48 && rsi <= 62) bullProb += 6.0; // Healthy momentum
  else if (rsi >= 70) bullProb -= 10.0; // Overbought

  if (bbPct <= 25) bullProb += 6.0; // Bottom BB
  else if (bbPct >= 85) bullProb -= 8.0; // Top BB

  // Clamping
  bullProb = Math.min(88.0, Math.max(15.0, Math.round(bullProb)));
  const bearProb = 100 - bullProb;

  let strength = "TRUNG BÌNH ⭐⭐";
  if (Math.abs(bullProb - 50) >= 18) strength = "MẠNH ⭐⭐⭐";
  else if (Math.abs(bullProb - 50) <= 8) strength = "YẾU ⭐";

  const direction = bullProb >= 55 ? "ƯU TIÊN TĂNG" : bullProb <= 45 ? "ƯU TIÊN GIẢM" : "ĐI NGANG";
  const dirColor = bullProb >= 55 ? "#10b981" : bullProb <= 45 ? "#ef4444" : "#94a3b8";

  return {
    bullProb,
    bearProb,
    direction,
    strength,
    dirColor,
    badgeText: `${bullProb >= 55 ? "🟢" : "🔴"} Tăng ${bullProb}% | Giảm ${bearProb}% (${strength})`
  };
}

/**
 * 3-Layer Confluence Score (0 - 10 points) mirroring Pine Script V5.5.
 * @param {Object} s - Stock data
 * @param {Object} profile - User profile
 * @returns {number} Confluence score (0.0 - 10.0)
 */
export function calculateConfluenceScore(s, profile = {}) {
  const price = s.price || s.close || 0;
  const rsi = s.rsi || 50;
  const ema20 = s.ema20 || price;
  const ema50 = s.ema50 || price;
  const ema200 = s.ema200 || price;
  const bbLower = s.bb_lower || 0;
  const bbUpper = s.bb_upper || 0;
  const macd = s.macd || 0;
  const macdSignal = s.macdSignal || s.macd_signal || 0;
  const volRatio = s.avgVolume10d > 0 ? (s.volume / s.avgVolume10d) : 1;

  let score = 0.0;

  // Layer 1: Context (0 - 3 pts)
  if (price > ema200) score += 1.0;
  if (price > ema20 && ema20 > ema50) score += 1.5;
  else if (price > ema50) score += 0.5;

  // Layer 2: Zone & Support (0 - 3 pts)
  const bbRange = bbUpper - bbLower;
  const bbPct = bbRange > 0 ? ((price - bbLower) / bbRange) * 100 : 50;
  if (bbPct >= 20 && bbPct <= 65) score += 1.5; // Safe accumulation zone
  else if (bbPct < 20) score += 1.0;

  const ema20Dist = ema20 > 0 ? Math.abs((price - ema20) / ema20) * 100 : 0;
  if (ema20Dist <= 1.5) score += 1.5; // Retest EMA20

  // Layer 3: Trigger & Momentum (0 - 4 pts)
  if (macd > macdSignal) score += 1.5;
  if (rsi >= 45 && rsi <= 62) score += 1.5;
  else if (rsi < 40) score += 1.0;

  if (volRatio >= 1.2 && (s.changePercent || 0) >= 0) score += 1.0;

  return Number(Math.min(10.0, Math.max(1.0, score)).toFixed(1));
}

