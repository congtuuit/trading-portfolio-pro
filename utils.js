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
