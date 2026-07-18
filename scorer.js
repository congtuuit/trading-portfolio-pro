/**
 * scorer.js
 * Professional Stock Scoring Engine — mirrors Pine Script v5.4 indicator logic.
 * Computes a multi-dimensional score (0-100) for each stock using TV scanner data.
 */

/**
 * Compute a professional trading score for a single stock.
 * @param {Object} s - Raw stock data from scanner (fields: price, rsi, atr, ema20, ema50, ema200, bb_lower, bb_upper, macd, macd_signal, volume, avgVolume10d, high, low, changePercent, close)
 * @param {Object} profile - { tradingStyle: "lướt sóng"|"swing"|"dài hạn", riskLevel: "thấp"|"trung bình"|"cao" }
 * @returns {Object} { score, grade, signals }
 */
export function scoreStock(s, profile = {}) {
  const style = profile.tradingStyle || "swing";
  const risk = profile.riskLevel || "trung bình";

  const price = s.price || s.close || 0;
  const rsi = s.rsi || 50;
  const ema20 = s.ema20 || price;
  const ema50 = s.ema50 || price;
  const ema200 = s.ema200 || price;
  const bbLower = s.bb_lower || 0;
  const bbUpper = s.bb_upper || 0;
  const macd = s.macd || 0;
  const macdSignal = s.macdSignal || s.macd_signal || 0;
  const vol = s.volume || 0;
  const volAvg = s.avgVolume10d || 1;
  const high = s.high || price;
  const low = s.low || price;
  const change = s.changePercent || 0;

  const signals = [];

  // ── 1. TREND (0-30 pts) ──
  let trendScore = 0;
  const isUptrend = price > ema20 && ema20 > ema50;
  const isDowntrend = price < ema20 && ema20 < ema50;
  const emaGap = ((price - ema200) / ema200) * 100;
  const priceAboveEma200 = price > ema200;

  // Support proximity — price within 2% of EMA50 or EMA200
  const nearEma50 = Math.abs(price - ema50) / ema50 <= 0.02;
  const nearEma200 = Math.abs(price - ema200) / ema200 <= 0.02;

  if (style === "dài hạn") {
    if (price > ema200 && ema200 > ema50 * 0.97) trendScore += 15;
    if (price > ema50) trendScore += 10;
    if (emaGap > 0 && emaGap < 30) trendScore += 5;
    if (isUptrend) trendScore += 15;
    if (isDowntrend) trendScore -= (priceAboveEma200 ? 5 : 20);
    if (nearEma200 && priceAboveEma200) trendScore += 5;
  } else if (style === "swing") {
    if (isUptrend) trendScore += 18;
    if (price > ema50) trendScore += 7;
    if (macd > macdSignal) trendScore += 5;
    if (!isDowntrend) trendScore += 5;
    // Pullback penalty: lighter if still above EMA200 (support)
    if (isDowntrend) trendScore -= (priceAboveEma200 ? 5 : 15);
    // Bonus: sitting near major support (EMA50 or EMA200)
    if (nearEma50 || nearEma200) trendScore += 5;
  } else {
    // Scalping
    if (change > 1) trendScore += 10;
    if (price > ema20) trendScore += 10;
    if (macd > macdSignal) trendScore += 10;
    if (change > 0 && price > ema20) trendScore += 5;
  }
  trendScore = Math.max(0, Math.min(30, trendScore));
  signals.push({ name: "Xu hướng", score: trendScore, max: 30 });

  // ── 2. MOMENTUM (0-25 pts) ──
  let momentumScore = 0;
  const bbPct = (bbUpper - bbLower) > 0 ? ((price - bbLower) / (bbUpper - bbLower)) * 100 : 50;

  if (style === "dài hạn") {
    // Long-term: reward accumulation zone broadly
    if (rsi <= 40) momentumScore += 15;
    else if (rsi <= 65) momentumScore += 10;
    else if (rsi >= 75) momentumScore -= 10;

    if (bbPct < 25) momentumScore += 5;
    else if (bbPct < 60) momentumScore += 3;
  } else if (style === "swing") {
    // Swing: reward BOTH oversold bargains AND healthy trend
    if (rsi <= 35) momentumScore += 15;        // Oversold = prime buy
    else if (rsi <= 65) momentumScore += 15;    // Healthy trend
    else if (rsi < 75) momentumScore += 5;      // Strong but extended
    else momentumScore -= 10;                   // Overbought penalty

    // Bollinger band position
    if (bbPct < 25) momentumScore += 8;         // Near lower band = buy zone
    else if (bbPct <= 75) momentumScore += 5;   // Middle range = healthy
    else if (bbPct > 90) momentumScore -= 5;    // Overextended
  } else {
    // Scalping
    if (rsi > 50 && rsi < 75) momentumScore += 15;
    else if (rsi >= 40 && rsi <= 50) momentumScore += 5;
    else if (rsi >= 75) momentumScore -= 5;

    if (bbPct > 50 && bbPct < 90) momentumScore += 5;
  }
  momentumScore = Math.max(0, Math.min(25, momentumScore));
  signals.push({ name: "Động lượng", score: momentumScore, max: 25 });

  // ── 3. VOLUME CONFIRMATION (0-20 pts) ──
  let volumeScore = 0;
  const volRatio = vol / volAvg;
  const isCrypto = s.type === "crypto" || s.subtype === "crypto";

  if (isCrypto) {
    // For crypto, we don't look at absolute coin count since prices differ by orders of magnitude.
    // Instead, we only care about relative volume (volRatio) to check for a volume surge.
    volumeScore += 8; // base points for large cap crypto liquidity
    if (volRatio > 1.5) volumeScore += 6;
    if (volRatio > 2.0) volumeScore += 3;
    if (volRatio > 1.0 && change > 0) volumeScore += 3;
    if (volRatio < 0.3) volumeScore -= 5;
  } else {
    // Stocks
    if (vol >= 500000) volumeScore += 5;
    if (vol >= 1000000) volumeScore += 3;
    if (volRatio > 1.5) volumeScore += 6;
    if (volRatio > 2.0) volumeScore += 3;
    if (volRatio > 1.0 && change > 0) volumeScore += 3;
    if (volRatio < 0.3) volumeScore -= 5;
  }
  volumeScore = Math.max(0, Math.min(20, volumeScore));
  signals.push({ name: "Thanh khoản", score: volumeScore, max: 20 });

  // ── 4. VOLATILITY & ENTRY SAFETY (0-15 pts) ──
  let safetyScore = 0;
  const atr = s.atr || (price * 0.02);
  const atrPct = (atr / price) * 100;

  // Crypto volatility is typically 2.5x higher than stocks. We scale it down to keep safety score ranges aligned.
  const evalAtrPct = isCrypto ? (atrPct / 2.5) : atrPct;

  if (risk === "thấp") {
    if (evalAtrPct < 3) safetyScore += 10;
    else if (evalAtrPct < 5) safetyScore += 4;
    else safetyScore -= 5;

    if (bbPct > 10 && bbPct < 60) safetyScore += 5;
  } else if (risk === "cao") {
    if (evalAtrPct >= 3 && evalAtrPct < 8) safetyScore += 7;
    if (evalAtrPct >= 2) safetyScore += 3;
    if (bbPct > 30 && bbPct < 80) safetyScore += 5;
  } else {
    // Trung bình — reward low volatility properly
    if (evalAtrPct < 3) safetyScore += 9;
    else if (evalAtrPct < 5) safetyScore += 6;
    else safetyScore -= 3;

    if (bbPct > 10 && bbPct < 70) safetyScore += 6;
  }
  safetyScore = Math.max(0, Math.min(15, safetyScore));
  signals.push({ name: "An toàn", score: safetyScore, max: 15 });

  // ── 5. RELATIVE STRENGTH (0-10 pts) ──
  let rsScore = 0;
  if (change > 2) rsScore += 4;
  if (change > 0) rsScore += 2;
  if (priceAboveEma200) rsScore += 3;
  if (price > high * 0.95) rsScore += 1;
  rsScore = Math.max(0, Math.min(10, rsScore));
  signals.push({ name: "Sức mạnh", score: rsScore, max: 10 });

  // ── TOTAL ──
  const totalScore = trendScore + momentumScore + volumeScore + safetyScore + rsScore;

  let grade;
  if (totalScore >= 80) grade = "A";
  else if (totalScore >= 65) grade = "B";
  else if (totalScore >= 50) grade = "C";
  else if (totalScore >= 35) grade = "D";
  else grade = "F";

  // ── GRADE LEGEND ──
  const gradeLegend = {
    "A": "Xuất sắc – Hội tụ đủ điều kiện kỹ thuật, ưu tiên vào lệnh",
    "B": "Tốt – Đáp ứng hầu hết tiêu chí, có thể cân nhắc",
    "C": "Trung bình – Còn thiếu một số yếu tố, cần chờ xác nhận thêm",
    "D": "Yếu – Rủi ro cao, chỉ giao dịch nếu có tin tức hỗ trợ",
    "F": "Rủi ro rất cao – Không khuyến nghị giao dịch"
  };

  // ── WIN RATE PROJECTION ──
  // Based on score + profile: higher score + lower risk = higher projected win rate
  const baseWinRate = Math.min(90, Math.max(30, totalScore * 0.7 + 25));
  const riskAdj = risk === "thấp" ? -5 : risk === "cao" ? 5 : 0;
  const projectedWinRate = Math.round(Math.min(92, Math.max(25, baseWinRate + riskAdj)));

  // Projected sessions based on trading style
  let projectedSessions;
  if (style === "lướt sóng") projectedSessions = "1-3 phiên";
  else if (style === "swing") projectedSessions = "5-10 phiên";
  else projectedSessions = "20-50 phiên";

  // ── BREAKOUT DISTANCE ──
  // Calculate distance to nearest resistance (BB upper or recent high)
  const nearestResistance = Math.min(bbUpper || price * 1.05, high * 1.02 || price * 1.05);
  const breakoutPct = ((nearestResistance - price) / price) * 100;
  const breakoutScoreVal = Math.round(breakoutPct * 10) / 10;
  const isNearResistance = breakoutPct < 3;
  const isBreakingOut = price > ema20 && breakoutPct < 1.5;

  return {
    score: totalScore,
    grade,
    gradeLabel: gradeLegend[grade],
    signals,
    breakdown: { trendScore, momentumScore, volumeScore, safetyScore, rsScore },
    winRate: projectedWinRate,
    sessions: projectedSessions,
    breakoutDistance: breakoutScoreVal,
    isNearResistance,
    isBreakingOut,
    nearestResistance: Math.round(nearestResistance)
  };
}

/**
 * Pre-rank and filter stocks by professional score, return only top candidates.
 * @param {Array} stocks - Raw stock array
 * @param {Object} profile - User profile
 * @param {number} maxCandidates - Max results to return (default 20)
 * @returns {Array} Sorted & ranked stocks with .scoreStock attached
 */
export function rankStocks(stocks, profile = {}, maxCandidates = 20) {
  const ranked = stocks.map(s => {
    const scored = scoreStock(s, profile);
    return {
      ...s,
      _scoreData: scored,
      _score: scored.score,
      _grade: scored.grade,
      _gradeLabel: scored.gradeLabel,
      _winRate: scored.winRate,
      _sessions: scored.sessions,
      _breakoutDist: scored.breakoutDistance,
      _nearResistance: scored.isNearResistance,
      _breakingOut: scored.isBreakingOut
    };
  });

  // Sort by score descending, then by volume descending (tiebreaker)
  ranked.sort((a, b) => b._score - a._score || (b.volume || 0) - (a.volume || 0));

  // Filter out F-grade if there are enough candidates
  const filtered = ranked.filter(s => s._grade !== 'F');
  const final = filtered.length >= 5 ? filtered : ranked;

  return final.slice(0, maxCandidates);
}
