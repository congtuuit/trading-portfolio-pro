/**
 * pnl.js
 * PnL calculation module.
 */

/**
 * Calculate PnL for a single trade.
 *
 * @param {Object} trade
 * @param {string}  trade.type       - "BUY" | "SELL"
 * @param {number}  trade.quantity
 * @param {number}  trade.entryPrice
 * @param {number}  currentPrice
 * @returns {{ pnl: number, pct: number }}
 */
export function calculatePnL(trade, currentPrice) {
  const { type, quantity, entryPrice } = trade;
  const qty = parseFloat(quantity) || 1;
  const entry = parseFloat(entryPrice);
  const current = parseFloat(currentPrice);

  let pnl = 0;
  if (type === 'BUY') {
    pnl = (current - entry) * qty;
  } else {
    pnl = (entry - current) * qty;
  }

  const pct = entry !== 0 ? (pnl / (entry * qty)) * 100 : 0;

  return {
    pnl: parseFloat(pnl.toFixed(2)),
    pct: parseFloat(pct.toFixed(2)),
  };
}

/**
 * Calculate total portfolio PnL.
 *
 * @param {Array}    portfolio  - array of trade objects
 * @param {Function} priceMap   - symbol → currentPrice
 * @returns {number}
 */
export function calculateTotalPnL(portfolio, priceMap) {
  return portfolio.reduce((sum, trade) => {
    const current = priceMap(trade.symbol);
    const { pnl } = calculatePnL(trade, current);
    return sum + pnl;
  }, 0);
}
