/**
 * content.js
 * Injected automatically into tradingview.com pages.
 * Uses MutationObserver for instant ad blocking.
 */

function hideAdsDetectDialog(node) {
  // If the node itself is the modal or contains the modal
  let el = null;
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.getAttribute('data-dialog-name') === 'gopro') {
      el = node;
    } else {
      el = node.querySelector('[data-dialog-name="gopro"]');
    }
  }

  if (el && el.style.display !== "none") {
    el.style.display = "none";
    el.style.opacity = "0";
    console.log("[TPP] TradingView Pro popup instantly blocked via Observer.");
  }
}

function startAdBlocker() {
  console.log("[TPP] startAdBlocker (MutationObserver) initialized.");
  
  // 1. Initial check in case it's already there
  const existing = document.querySelector('[data-dialog-name="gopro"]');
  if (existing) hideAdsDetectDialog(existing);

  // 2. Set up the observer to watch for DOM changes
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => {
          hideAdsDetectDialog(node);
        });
      }
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
}

startAdBlocker();
