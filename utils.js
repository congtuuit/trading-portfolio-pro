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
