/**
 * content.js
 * Persistent Floating Widget for Trading Portfolio Pro.
 * Injected into all websites as an ES Module.
 */

import { getPortfolio, getSettings, getChatHistory, saveChatHistory } from "./storage.js";
import { fetchPricesMap } from "./price.js";
import { queryAI } from "./ai.js";
import { getDivisor, escapeHTML } from "./utils.js";
import {
  renderPortfolio,
  renderChatHistory,
  bindChatEvents,
  openChatPanel,
  closeChatPanel
} from "./ui.js";

let portfolio = [];
let appSettings = {};
let chatHistory = [];
let currentPriceMap = {};
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
      left: -400px;
      width: 380px;
      height: 100vh;
      background: var(--bg-primary) !important;
      border-right: 1px solid var(--border);
      box-shadow: 5px 0 25px rgba(0,0,0,0.6);
      z-index: 2147483646;
      transition: left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: var(--text-primary);
      font-family: 'Inter', system-ui, sans-serif;
    }
    #tpp-side-panel.open {
      left: 0;
    }

    /* Panel Content Layout */
    .panel-header {
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .panel-body {
      flex: 1;
      overflow-y: auto;
      background: var(--bg-primary);
      padding: 10px;
      padding-bottom: 100px;
    }
    
    .panel-chat-container {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 65%;
      background: var(--bg-card);
      border-top: 2px solid var(--border);
      display: none;
      flex-direction: column;
      transform: translateY(100%);
      transition: transform 0.3s ease;
      z-index: 10;
    }
    .panel-chat-container.open {
      display: flex;
      transform: translateY(0);
    }
    
    /* Ensure styles from link are applied to standard tags */
    .list-title { color: var(--text-muted); font-size: 11px; text-transform: uppercase; margin-bottom: 8px; }
  `;
  shadow.appendChild(style);

  // 2. Inject HTML
  const widgetHtml = `
    <button id="tpp-floating-trigger" title="Trading Portfolio Pro">🤖</button>
    
    <div id="tpp-side-panel">
      <header class="panel-header header">
        <div style="display:flex;align-items:center;gap:8px;">
           <img src="${chrome.runtime.getURL("icons/tradingview-logo.png")}" style="width:20px;height:20px;">
           <h1 style="font-size:14px;margin:0;">Trading Portfolio Pro</h1>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span id="total-pnl" class="total-pnl">Total PnL: 0.00</span>
          <button id="tpp-close-panel" style="background:transparent;border:none;color:var(--text-muted);font-size:24px;cursor:pointer;">&times;</button>
        </div>
      </header>

      <div class="panel-body">
        <section class="list-section">
          <div class="list-title">📋 Portfolio Summary</div>
          <div id="portfolio-list"></div>
        </section>
      </div>

      <!-- Floating Chat Panel (Embedded) -->
      <div id="panel-chat" class="panel-chat-container">
         <div style="padding:10px 16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
           <strong>🤖 Assistant</strong>
           <div style="display:flex; gap:8px;">
             <button id="btn-chat-clear" class="btn" style="font-size:10px;">🗑️ Clear</button>
             <button id="btn-chat-close" style="background:transparent;border:none;color:var(--text-muted);">&times;</button>
           </div>
         </div>
         <div id="chat-messages" style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px;"></div>
         <form id="chat-form" style="padding:12px; border-top:1px solid var(--border); display:flex; gap:6px;">
           <input id="inp-chat" placeholder="Hỏi AI..." style="flex:1; border-radius:15px; padding:6px 12px;">
           <button type="submit" id="btn-chat-send" class="btn" style="border-radius:50%; width:32px; height:32px; padding:0;">🚀</button>
         </form>
      </div>

      <button id="btn-floating-chat" class="btn" style="position:absolute; bottom:20px; right:20px; border-radius:50%; width:44px; height:44px; background:var(--accent-blue); color:white; font-size:20px; box-shadow:0 4px 10px rgba(0,0,0,0.3); z-index:5;">💬</button>
    </div>

    <!-- Modals (Simplified inside panel) -->
    <div id="modal-analysis" class="modal-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:100; align-items:center; justify-content:center; padding:10px;">
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:8px; width:100%; max-height:80%; overflow-y:auto;">
        <div style="padding:10px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between;">
          <h3 id="modal-title" style="margin:0; font-size:12px;">Analysis</h3>
          <button id="btn-close-modal" style="background:transparent; border:none; color:var(--text-muted);">&times;</button>
        </div>
        <div id="modal-body" style="padding:10px; font-size:12px;"></div>
      </div>
    </div>

    <!-- DCA Modal -->
    <div id="modal-dca" class="modal-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:110; align-items:center; justify-content:center; padding:10px;">
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:8px; width:100%; max-height:90%; overflow-y:auto;">
        <div style="padding:10px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <h3 id="dca-title" style="margin:0; font-size:12px; color:var(--text-primary);">🧮 Gỡ Lỗ (DCA)</h3>
          <button id="btn-close-dca" style="background:transparent; border:none; color:var(--text-muted); font-size:16px;">&times;</button>
        </div>
        <div style="padding:10px; font-size:12px; line-height:1.5;">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px; padding-bottom:8px; border-bottom:1px solid var(--border);">
            <div>
              <div style="color:var(--text-muted);font-size:10px;">Hiện tại</div>
              <strong id="dca-qty">--</strong> @ <strong id="dca-entry">--</strong>
            </div>
            <div style="text-align:right;">
              <div style="color:var(--text-muted);font-size:10px;">Thị trường</div>
              <strong id="dca-current">--</strong>
            </div>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label for="inp-dca-qty">Thêm khối lượng (Units):</label>
            <input type="number" id="inp-dca-qty" step="any" min="0" placeholder="VD: 100" style="padding:6px;" />
          </div>
          <div id="dca-result" style="margin-top:10px; padding:8px; background:rgba(255, 152, 0, 0.1); border:1px solid rgba(255, 152, 0, 0.3); border-radius:6px;">
            Hãy nhập số lượng mua/bán thêm để xem kịch bản hòa vốn.
          </div>
          <div id="t0-action-area" style="display:none; margin-top:10px; padding:8px; border:1px solid var(--profit); border-radius:6px; background:rgba(38,166,154,0.1);">
             <div id="t0-details" style="font-size:11px; margin-bottom:8px;"></div>
             <button id="btn-confirm-t0" class="btn" style="background:var(--profit); color:white; width:100%; padding:6px;">Xác nhận Lướt T0</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Close Modal -->
    <div id="modal-close" class="modal-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:120; align-items:center; justify-content:center; padding:10px;">
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:8px; width:100%;">
        <div style="padding:10px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0; font-size:12px; color:var(--text-primary);">💰 Chốt Vị Thế</h3>
          <button id="btn-close-modal-close" style="background:transparent; border:none; color:var(--text-muted); font-size:16px;">&times;</button>
        </div>
        <div style="padding:10px; font-size:12px;">
          <div style="margin-bottom:10px; padding:10px; border-radius:6px; background:rgba(38,166,154,0.1); border:1px solid rgba(38,166,154,0.3);">
            Lệnh: <strong id="close-sym"></strong><br/>
            Lợi nhuận: <strong id="close-pnl"></strong>
          </div>
          <div class="field" style="margin-bottom:0;">
            <label for="sel-merge-target">Cấn trừ phần Lỗ/Lãi vào mã gốc:</label>
            <select id="sel-merge-target" class="full-width" style="padding:6px;"></select>
          </div>
          <div style="margin-top:16px;">
            <button id="btn-confirm-close" class="btn" style="background:var(--profit); width:100%; color:white; padding:8px;">Xác nhận Chốt</button>
          </div>
        </div>
      </div>
    </div>
  `;
  const container = document.createElement("div");
  container.innerHTML = widgetHtml;
  shadow.appendChild(container);

  // 3. Bind Interactions
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

  // Modal Closers
  const modalAnalysis = shadow.querySelector("#modal-analysis");
  const btnCloseAnalysis = shadow.querySelector("#btn-close-modal");
  if (btnCloseAnalysis) {
    btnCloseAnalysis.addEventListener("click", () => modalAnalysis.style.display = "none");
    modalAnalysis.addEventListener("click", (e) => { if (e.target === modalAnalysis) modalAnalysis.style.display = "none"; });
  }

  const modalDca = shadow.querySelector("#modal-dca");
  const btnCloseDca = shadow.querySelector("#btn-close-dca");
  if (btnCloseDca) {
    btnCloseDca.addEventListener("click", () => modalDca.style.display = "none");
    modalDca.addEventListener("click", (e) => { if (e.target === modalDca) modalDca.style.display = "none"; });
  }

  const modalClose = shadow.querySelector("#modal-close");
  const btnCloseModalClose = shadow.querySelector("#btn-close-modal-close");
  if (btnCloseModalClose) {
    btnCloseModalClose.addEventListener("click", () => modalClose.style.display = "none");
    modalClose.addEventListener("click", (e) => { if (e.target === modalClose) modalClose.style.display = "none"; });
  }

  // 4. Initialize Data & Shared UI
  await initWidget(shadow);

  // 5. Sync Data when storage changes
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === "local") {
      if (changes.tpp_portfolio) {
        portfolio = changes.tpp_portfolio.newValue || [];
        await updatePrices(shadow);
      }
      if (changes.tpp_settings) {
        appSettings = changes.tpp_settings.newValue || {};
      }
      if (changes.tpp_chat_history) {
        chatHistory = changes.tpp_chat_history.newValue || [];
        renderChatHistory(chatHistory, shadow);
      }
    }
  });
}

async function initWidget(root) {
  try {
    portfolio = await getPortfolio();
    appSettings = await getSettings();
    chatHistory = await getChatHistory();

    // Load prices initially
    await updatePrices(root);

    // Bind Chat
    bindChatEvents(
      async (text) => {
        chatHistory.push({ role: "user", text: text });
        await saveChatHistory(chatHistory);
        const responseText = await queryAI(chatHistory, appSettings);
        chatHistory.push({ role: "assistant", text: responseText });
        await saveChatHistory(chatHistory);
        return responseText;
      },
      async () => {
        chatHistory = [];
        await saveChatHistory(chatHistory);
      },
      root
    );
    
    renderChatHistory(chatHistory, root);

    // Auto-refresh loop
    setInterval(() => updatePrices(root), 30000); // 30s
  } catch (err) {
    console.error("[TPP Widget] Initialization failed:", err);
  }
}

async function updatePrices(root) {
  if (portfolio.length === 0) {
    renderPortfolio([], null, null, {}, root);
    return;
  }
  
  try {
    const symbols = [...new Set(portfolio.map(t => t.symbol))];
    currentPriceMap = await fetchPricesMap(symbols);
    renderPortfolio(portfolio, () => {}, () => {}, currentPriceMap, root);
  } catch (err) {
    console.error("[TPP Widget] Price update failed:", err);
  }
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

const adObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach(hideAdsDetectDialog);
    }
  }
});

adObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
injectWidget();
