/**
 * content.js
 * Persistent Floating Widget for Trading Portfolio Pro.
 * Injected into all websites as an ES Module.
 */

import { initApp } from "./app.js";

let isPanelOpen = false;

// ── Widget Structure Injection ──

async function injectWidget() {
  const host = document.createElement("div");
  host.id = "tpp-widget-host";
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // 1. Inject Styles
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("style.css");
  shadow.appendChild(link);
  
  const style = document.createElement("style");
  style.textContent = `
    :host {
      --bg-primary: #131722;
      --bg-secondary: #1e222d;
      --bg-card: #1e222d;
      --bg-input: #2a2e39;
      --text-primary: #d1d4dc;
      --text-muted: #787b86;
      --accent-blue: #4c9ce2;
      --border: #2a2e39;
      --profit: #26a69a;
      --loss: #ef5350;
    }

    #tpp-floating-trigger {
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 48px;
      height: 48px;
      border-radius: 24px;
      background: linear-gradient(135deg, #1A73E8, #8E24AA);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,0,0,0.4);
      z-index: 2147483647;
      transition: transform 0.2s, opacity 0.3s;
      border: 2px solid rgba(255,255,255,0.1);
      user-select: none;
    }
    #tpp-floating-trigger:hover { transform: scale(1.05); }
    #tpp-floating-trigger:active { transform: scale(0.95); }

    #tpp-side-panel {
      position: fixed;
      top: 0;
      left: -550px;
      width: 550px; /* Match popup width */
      height: 100vh;
      background: var(--bg-primary) !important;
      border-right: 1px solid var(--border);
      box-shadow: 5px 0 25px rgba(0,0,0,0.6);
      z-index: 2147483646;
      transition: left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      overflow-y: auto;
      color: var(--text-primary);
      font-family: 'Inter', system-ui, sans-serif;
    }
    #tpp-side-panel.open {
      left: 0;
    }
    
    #tpp-side-panel.open .tpp-panel-close-btn {
      display: block;
    }

    .tpp-panel-close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: var(--text-primary);
      font-size: 20px;
      cursor: pointer;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    .tpp-panel-close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    /* Constraint popup's root structure container styles */
    .container {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      position: relative;
    }
  `;
  shadow.appendChild(style);

  // 2. Fetch popup HTML
  try {
    const htmlUrl = chrome.runtime.getURL("popup.html");
    const response = await fetch(htmlUrl);
    const htmlText = await response.text();
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    
    // 3. Inject Widget Structure
    const widgetHtml = `
      <button id="tpp-floating-trigger" title="Trading Portfolio Pro">🤖</button>
      <div id="tpp-side-panel">
        <button class="tpp-panel-close-btn" id="tpp-close-panel">&times;</button>
        <div id="tpp-popup-content" class="container">
          <!-- Popup UI gets injected here -->
        </div>
      </div>
    `;
    const container = document.createElement("div");
    container.innerHTML = widgetHtml;
    shadow.appendChild(container);
    
    const popupContent = shadow.querySelector("#tpp-popup-content");
    // Move all body children of popup.html into the side panel
    Array.from(doc.body.children).forEach(child => {
      // Exclude SCRIPT tags and the popup-specific floating chat button
      if (child.tagName !== "SCRIPT" && child.id !== "btn-floating-chat") {
        popupContent.appendChild(child);
      }
    });

  } catch (err) {
    console.error("[TPP Widget] Failed to fetch popup.html", err);
    return;
  }

  // 4. Bind Interactions
  const trigger = shadow.querySelector("#tpp-floating-trigger");
  const panel = shadow.querySelector("#tpp-side-panel");
  const closeBtn = shadow.querySelector("#tpp-close-panel");

  trigger.addEventListener("click", () => {
    isPanelOpen = !isPanelOpen;
    panel.classList.toggle("open", isPanelOpen);
  });

  closeBtn.addEventListener("click", () => {
    isPanelOpen = false;
    panel.classList.remove("open");
  });

  // 5. Initialize Core Application with ShadowRoot
  await initApp(shadow);
}

// Start MutationObserver for ad blocking and inject widget
function hideAdsDetectDialog(node) {
  let el = null;
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (node.getAttribute('data-dialog-name') === 'gopro') el = node;
    else el = node.querySelector('[data-dialog-name="gopro"]');
  }
  if (el && el.style.display !== "none") el.style.display = "none";
}

// ── TV Alert Signal Catcher (Phase 1) ──
function parseTradingViewAlert(node) {
  // Tìm kiếm nội dung văn bản có thể chứa JSON từ Pine Script
  // Các class thông dụng của TradingView cho popup alerts:
  // .tv-alert-notification-dialog__message, .toast-content, hoặc đơn giản là textContent
  if (node.nodeType === Node.ELEMENT_NODE) {
    // Thường text cảnh báo nằm trong nội dung thẻ
    const text = node.textContent || "";
    if (text.includes('{"action"') && text.includes('}')) {
      try {
        // Bóc tách đoạn JSON
        const match = text.match(/\{.*?\}/);
        if (match) {
          const signalData = JSON.parse(match[0]);
          if (signalData.action && signalData.price) {
            console.log("[TPP] Nhận được tín hiệu mới:", signalData);
            // Gửi dữ liệu tín hiệu đến Widget App (app.js) thông qua Event
            const event = new CustomEvent('tpp-new-signal', { detail: signalData });
            document.dispatchEvent(event);
            
            // Tùy chọn: Gửi vào background script để báo Notification
            if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
              chrome.runtime.sendMessage({ type: "NEW_SIGNAL", payload: signalData }).catch(()=>console.log("No background receiver"));
            }
          }
        }
      } catch (e) {
        console.error("[TPP] Lỗi phân giải JSON Alert:", e);
      }
    }
  }
}

const adObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach(node => {
        hideAdsDetectDialog(node);
        parseTradingViewAlert(node);
      });
    }
  }
});

adObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });

// Check and hide gopro dialog every 2 seconds as fallback
setInterval(() => {
  const goproDialogs = document.querySelectorAll('div[data-dialog-name="gopro"]');
  goproDialogs.forEach(el => {
    if (el.style.display !== "none") {
      el.style.display = "none";
    }
  });
}, 2000);

injectWidget();
