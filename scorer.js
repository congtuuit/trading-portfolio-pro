/**
 * scorer.js
 * Professional Stock Scoring Engine — mirrors Pine Script v5.4 indicator logic.
 * Computes a multi-dimensional score (0-100) for each stock using TV scanner data.
 * Enhanced with Anti-Overbought, Mean-Reversion & Sweet Buy Zone detection.
 */

/**
 * Compute a professional trading score for a single stock.
 * @param {Object} s - Raw stock data from scanner (fields: price, rsi, atr, ema20, ema50, ema200, bb_lower, bb_upper, macd, macd_signal, volume, avgVolume10d, high, low, changePercent, close)
 * @param {Object} profile - { tradingStyle: "lướt sóng"|"swing"|"dài hạn", riskLevel: "thấp"|"trung bình"|"cao" }
 * @returns {Object} { score, grade, signals }
 */
export function scoreStock(s, profile = {}) {
  const style = profile.tradingStyle || profile.trading_style || "swing";
  const risk = profile.riskLevel || profile.risk_level || "trung bình";

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

  const isCrypto = s.type === "crypto" || s.subtype === "crypto";
  const signals = [];

  // Key relative distances
  const ema20Dist = ema20 > 0 ? ((price - ema20) / ema20) * 100 : 0;
  const ema50Dist = ema50 > 0 ? ((price - ema50) / ema50) * 100 : 0;
  const ema200Dist = ema200 > 0 ? ((price - ema200) / ema200) * 100 : 0;
  const bbRange = bbUpper - bbLower;
  const bbPct = bbRange > 0 ? ((price - bbLower) / bbRange) * 100 : 50;
  const isMACDBullish = macd > macdSignal;
  const isMACDBearish = macd < macdSignal;
  const isUptrend = price > ema20 && ema20 > ema50;
  const isDowntrend = price < ema20 && ema20 < ema50;
  const priceAboveEma200 = price > ema200;

  // ── 1. TREND QUALITY & STRUCTURE (0-30 pts) ──
  let trendScore = 0;

  if (style === "dài hạn") {
    // Dài hạn: Cần giá trên EMA200, chuỗi MA xếp lớp, giá không bị kéo giãn quá xa EMA50/EMA200
    if (priceAboveEma200) trendScore += 12;
    if (price > ema50) trendScore += 8;
    if (ema50 > ema200) trendScore += 5;
    if (isUptrend) trendScore += 5;

    // Vùng gom an toàn: Giá gần EMA50 hoặc EMA200 (±2.5%)
    const nearSupport = Math.abs(ema50Dist) <= 2.5 || Math.abs(ema200Dist) <= 3.0;
    if (nearSupport && priceAboveEma200) trendScore += 5;

    // Phạt xu hướng giảm sâu dưới EMA200
    if (isDowntrend && !priceAboveEma200) trendScore -= 15;
  } else if (style === "swing") {
    // Swing: Xu hướng tăng lành mạnh + Hỗ trợ EMA20/EMA50
    if (isUptrend) trendScore += 12;
    if (priceAboveEma200) trendScore += 6;
    if (price > ema50) trendScore += 4;
    if (isMACDBullish) trendScore += 4;

    // Vùng mua Swing Vàng (Pullback lành mạnh test EMA20/EMA50): Giá cách EMA20 từ -1% đến +2%
    if (ema20Dist >= -1.0 && ema20Dist <= 2.0 && priceAboveEma200) {
      trendScore += 6;
    }

    if (isDowntrend) trendScore -= (priceAboveEma200 ? 5 : 15);
  } else {
    // Lướt sóng (Scalping)
    if (price > ema20) trendScore += 10;
    if (isMACDBullish) trendScore += 8;
    if (change > 0 && change < 5.0) trendScore += 6;
    if (isUptrend) trendScore += 6;
    if (isDowntrend) trendScore -= 12;
  }
  trendScore = Math.max(0, Math.min(30, trendScore));
  signals.push({ name: "Xu hướng", score: trendScore, max: 30 });

  // ── 2. MOMENTUM & ANTI-OVERBOUGHT (0-25 pts) ──
  let momentumScore = 0;

  // Điểm cơ sở theo RSI
  if (style === "dài hạn") {
    // Dài hạn: Thích vùng tích lũy RSI 40 - 58, cực ghét quá mua
    if (rsi >= 40 && rsi <= 55) momentumScore += 14;
    else if (rsi > 55 && rsi <= 62) momentumScore += 8;
    else if (rsi < 40 && rsi >= 30) momentumScore += 12; // Oversold bargain
    else if (rsi > 68) momentumScore -= 10; // Quá mua

    // Vị thế Bollinger Bands
    if (bbPct >= 15 && bbPct <= 55) momentumScore += 11; // Nửa dưới BB, dư địa tăng lớn
    else if (bbPct > 55 && bbPct <= 75) momentumScore += 6;
    else if (bbPct > 85) momentumScore -= 12; // Chạm cản trên BB -> Phạt nặng!
  } else if (style === "swing") {
    // Swing: RSI 48 - 62 lý tưởng, MACD cắt lên
    if (rsi >= 48 && rsi <= 62) momentumScore += 12;
    else if (rsi >= 35 && rsi < 48) momentumScore += 10; // Pullback sâu
    else if (rsi > 62 && rsi <= 68) momentumScore += 5;
    else if (rsi > 68) momentumScore -= 10; // Quá mua phạt nặng
    else if (rsi < 30) momentumScore += 6;

    if (isMACDBullish) momentumScore += 5;
    if (isMACDBearish) momentumScore -= 6; // MACD Down trừ điểm

    // Vị thế Bollinger Bands
    if (bbPct >= 25 && bbPct <= 70) momentumScore += 8; // Vùng an toàn
    else if (bbPct < 25) momentumScore += 7; // Gần biên dưới
    else if (bbPct > 85) momentumScore -= 10; // Quá sát hoặc vượt biên trên BB -> Phạt
  } else {
    // Lướt sóng: Động lượng mạnh nhưng chưa bị quá đà
    if (rsi >= 52 && rsi <= 68) momentumScore += 12;
    else if (rsi > 68 && rsi <= 75) momentumScore += 4;
    else if (rsi > 75) momentumScore -= 10; // Quá nóng
    else if (rsi >= 42 && rsi < 52) momentumScore += 6;

    if (isMACDBullish) momentumScore += 6;
    if (bbPct >= 45 && bbPct <= 85) momentumScore += 7;
    else if (bbPct > 90) momentumScore -= 8;
  }

  // Phạt bổ sung nếu giá vượt hẳn ra ngoài dải Bollinger Upper (Price > bbUpper)
  if (bbUpper > 0 && price >= bbUpper) {
    momentumScore -= (style === "lướt sóng" ? 6 : 10);
  }

  momentumScore = Math.max(0, Math.min(25, momentumScore));
  signals.push({ name: "Động lượng", score: momentumScore, max: 25 });

  // ── 3. VOLUME CONFIRMATION & CLIMAX DETECTION (0-20 pts) ──
  let volumeScore = 0;
  const volRatio = vol / volAvg;

  if (isCrypto) {
    volumeScore += 8; // Base liquidity for top crypto
    if (volRatio >= 1.2 && volRatio <= 3.0) volumeScore += 8;
    else if (volRatio > 3.0) volumeScore += 4; // Volume quá khủng cần cẩn trọng
    else if (volRatio >= 0.8) volumeScore += 4;
    else if (volRatio < 0.4) volumeScore -= 5;
  } else {
    // Stocks
    if (vol >= 300000) volumeScore += 3;
    if (vol >= 1000000) volumeScore += 3;

    if (volRatio >= 1.1 && volRatio <= 2.5 && change >= 0) {
      volumeScore += 8; // Dòng tiền vào đều đặn, chuẩn xác
    } else if (volRatio > 2.5 && change > 5.0) {
      volumeScore += 4; // Tăng trần vol nổ lớn -> cảnh báo Climax buy
    } else if (volRatio >= 0.7 && volRatio < 1.1) {
      volumeScore += 4; // Tích lũy thanh khoản bình thường
    } else if (volRatio < 0.4) {
      volumeScore -= 5; // Cạn kiệt dòng tiền
    }
  }
  volumeScore = Math.max(0, Math.min(20, volumeScore));
  signals.push({ name: "Thanh khoản", score: volumeScore, max: 20 });

  // ── 4. ENTRY SAFETY & MEAN-REVERSION (0-15 pts) ──
  let safetyScore = 0;
  const atr = s.atr || (price * 0.02);
  const atrPct = (atr / price) * 100;
  const evalAtrPct = isCrypto ? (atrPct / 2.5) : atrPct;

  // Nguy cơ đu đỉnh: Giá kéo giãn quá xa EMA20 (Extension Risk)
  const maxSafeExtension = isCrypto ? 6.0 : 3.5;
  const isOverextended = ema20Dist > maxSafeExtension;

  if (risk === "thấp") {
    if (evalAtrPct < 3.0) safetyScore += 8;
    else if (evalAtrPct < 4.5) safetyScore += 4;
    else safetyScore -= 4;

    // Vùng mua an toàn (không bị treo leo sát cản)
    if (bbPct >= 10 && bbPct <= 65) safetyScore += 7;
    else if (bbPct > 80) safetyScore -= 6;

    if (isOverextended) safetyScore -= 8; // Phạt nặng nếu giá xa MA20
  } else if (risk === "cao") {
    if (evalAtrPct >= 2.5 && evalAtrPct < 7.0) safetyScore += 8;
    if (bbPct >= 20 && bbPct <= 85) safetyScore += 7;
    if (isOverextended) safetyScore -= 3;
  } else {
    // Trung bình
    if (evalAtrPct < 3.2) safetyScore += 7;
    else if (evalAtrPct < 5.0) safetyScore += 4;

    if (bbPct >= 15 && bbPct <= 75) safetyScore += 8;
    else if (bbPct > 85) safetyScore -= 5;

    if (isOverextended) safetyScore -= 6;
  }
  safetyScore = Math.max(0, Math.min(15, safetyScore));
  signals.push({ name: "An toàn", score: safetyScore, max: 15 });

  // ── 5. RELATIVE STRENGTH & UPSIDE POTENTIAL (0-10 pts) ──
  let rsScore = 0;
  // Dư địa tăng đến dải trên Bollinger Bands
  const upsideToBand = bbUpper > price ? ((bbUpper - price) / price) * 100 : 0;

  if (upsideToBand >= 5.0) rsScore += 4; // Còn nhiều dư địa trước khi chạm cản
  else if (upsideToBand >= 2.5) rsScore += 2;
  else rsScore -= 3; // Quá sát cản trên, R:R không còn hấp dẫn

  if (change >= 0.3 && change <= 3.5) rsScore += 3; // Tăng lành mạnh
  else if (change > 5.0) rsScore += 1; // Tăng quá dốc

  if (priceAboveEma200) rsScore += 3;

  rsScore = Math.max(0, Math.min(10, rsScore));
  signals.push({ name: "Sức mạnh", score: rsScore, max: 10 });

  // ── TOTAL ──
  const totalScore = trendScore + momentumScore + volumeScore + safetyScore + rsScore;

  let grade;
  if (totalScore >= 78) grade = "A";
  else if (totalScore >= 64) grade = "B";
  else if (totalScore >= 50) grade = "C";
  else if (totalScore >= 35) grade = "D";
  else grade = "F";

  // ── GRADE LEGEND ──
  const gradeLegend = {
    "A": "Xuất sắc – Vùng mua vàng, hội tụ đủ điều kiện kỹ thuật & tỷ lệ R:R cao",
    "B": "Tốt – Xu hướng tích cực, vùng giá an toàn có thể cân nhắc",
    "C": "Trung bình – Động lượng trung tính hoặc đang tiệm cận vùng cản",
    "D": "Yếu – Quá mua, kéo giãn xa nền hoặc rủi ro điều chỉnh",
    "F": "Rủi ro rất cao – Không khuyến nghị giải ngân mới"
  };

  // ── WIN RATE PROJECTION ──
  const baseWinRate = Math.min(90, Math.max(30, totalScore * 0.7 + 25));
  const riskAdj = risk === "thấp" ? -3 : risk === "cao" ? 3 : 0;
  const projectedWinRate = Math.round(Math.min(92, Math.max(25, baseWinRate + riskAdj)));

  // Projected sessions based on trading style
  let projectedSessions;
  if (style === "lướt sóng") projectedSessions = "1-3 phiên";
  else if (style === "swing") projectedSessions = "5-10 phiên";
  else projectedSessions = "20-50 phiên";

  // ── BREAKOUT & RESISTANCE DISTANCE ──
  const nearestResistance = Math.min(bbUpper || price * 1.05, high * 1.02 || price * 1.05);
  const breakoutPct = ((nearestResistance - price) / price) * 100;
  const breakoutScoreVal = Math.round(breakoutPct * 10) / 10;
  const isNearResistance = breakoutPct < 2.5 || bbPct > 85;
  const isBreakingOut = price > ema20 && breakoutPct < 1.5 && bbPct <= 85;

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
    nearestResistance: Math.round(nearestResistance),
    bbPct: Math.round(bbPct),
    ema20Dist: parseFloat(ema20Dist.toFixed(2)),
    upsideToBand: parseFloat(upsideToBand.toFixed(2))
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
      _breakingOut: scored.isBreakingOut,
      _bbPct: scored.bbPct,
      _ema20Dist: scored.ema20Dist,
      _upsideToBand: scored.upsideToBand
    };
  });

  // Sort by score descending, then by volume descending (tiebreaker)
  ranked.sort((a, b) => b._score - a._score || (b.volume || 0) - (a.volume || 0));

  // Filter out F-grade if there are enough candidates
  const filtered = ranked.filter(s => s._grade !== 'F');
  const final = filtered.length >= 5 ? filtered : ranked;

  return final.slice(0, maxCandidates);
}
