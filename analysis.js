/**
 * analysis.js
 * Technical analysis logic for Entry/Exit optimization.
 */

/**
 * Calculate Fibonacci levels between a high and low value.
 */
export function calculateFibLevels(high, low) {
  const diff = high - low;
  return {
    0: high,
    0.236: high - 0.236 * diff,
    0.382: high - 0.382 * diff,
    0.5: high - 0.5 * diff,
    0.618: high - 0.618 * diff,
    0.786: high - 0.786 * diff,
    1: low
  };
}

/**
 * Suggest optimal entry/exit based on current indicators.
 */
export function suggestEntryExit(data, tradeType = "BUY") {
  const { close, high, low, rsi, ema200, bb_lower, bb_upper, atr } = data;
  const fibs = calculateFibLevels(high, low);
  
  let suggestion = {
    entry: null,
    exit: null,
    reason: ""
  };
  
  const isUptrend = close > ema200;
  
  if (tradeType === "BUY") {
    // Best entry is typically near 0.618 fib or BB lower
    suggestion.entry = Math.max(fibs[0.618], bb_lower);
    // Exit at BB upper or Resistance (high)
    suggestion.exit = Math.max(bb_upper, high);
    suggestion.reason = isUptrend 
      ? "Xu hướng tăng: Ưu tiên mua tại hỗ trợ Fib 0.618 hoặc dải dưới Bollinger."
      : "Xu hướng giảm: Cẩn trọng, chỉ nên mua thăm dò tại vùng giá chiết khấu sâu.";
  } else {
    // Best entry for SELL (short) is near 0.382 fib or BB upper
    suggestion.entry = Math.min(fibs[0.382], bb_upper);
    suggestion.exit = Math.min(bb_lower, low);
    suggestion.reason = !isUptrend
      ? "Xu hướng giảm: Ưu tiên bán tại kháng cự Fib 0.382 hoặc dải trên Bollinger."
      : "Xu hướng tăng: Cẩn trọng khi bán khống, nên chốt lời từng phần.";
  }
  
  return suggestion;
}
