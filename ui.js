/**
 * ui.js
 * Rendering and DOM event binding.
 */

import { fetchPricesMap } from "./price.js";
import { calculatePnL } from "./pnl.js";
import { getDivisor, escapeHTML, calculateT0Scenario } from "./utils.js";
import { suggestEntryExit, calculateFibLevels } from "./analysis.js";

/** Format a number to 2 decimal places with thousands separators */
function fmt(n) {
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
/** Format a number to 2 decimal places with sign */
function fmtSigned(n) {
  return (n >= 0 ? "+" : "") + fmt(n);
}

/** Generate Confluence Analysis HTML from TV Scanner data */
function getAnalysisHTML(sym, data, tradeType) {
  if (!data || data.close === 0) return "<span>Chưa có dữ liệu</span>";

  let score = 0;
  let reasons = [];

  const isUptrend = data.close > data.ema200;
  const isDowntrend = data.close < data.ema200;
  const rsiBuy = data.rsi <= 30;
  const rsiSell = data.rsi >= 70;
  const volSurge = data.vol >= (data.vol_avg || data.vol) * 1.5;
  const bbBuy = data.close <= data.bb_lower;
  const bbSell = data.close >= data.bb_upper;

  if (tradeType === "BUY") {
    if (isUptrend) { score++; reasons.push("✅ Giá > EMA 200 (Trend Tăng)"); }
    else { reasons.push("❌ Giá < EMA 200 (Trend Giảm)"); }
    if (rsiBuy) { score++; reasons.push("✅ RSI ≤ 30 (Oversold)"); }
    else { reasons.push(`➖ RSI = ${Math.round(data.rsi)}`); }
    if (volSurge) { score++; reasons.push("✅ Volume đột phá"); }
    else { reasons.push("➖ Volume bình thường"); }
    if (bbBuy) { score++; reasons.push("✅ Chạm BB Lower"); }
  } else {
    if (isDowntrend) { score++; reasons.push("✅ Giá < EMA 200 (Trend Giảm)"); }
    else { reasons.push("❌ Giá > EMA 200 (Trend Tăng)"); }
    if (rsiSell) { score++; reasons.push("✅ RSI ≥ 70 (Overbought)"); }
    else { reasons.push(`➖ RSI = ${Math.round(data.rsi)}`); }
    if (volSurge) { score++; reasons.push("✅ Volume đột phá"); }
    else { reasons.push("➖ Volume bình thường"); }
    if (bbSell) { score++; reasons.push("✅ Chạm BB Upper"); }
  }

  const stars = "⭐".repeat(score) + "☆".repeat(4 - score);
  const scoreColor = score >= 3 ? "var(--profit)" : score == 2 ? "orange" : "var(--loss)";
  
  // Smart Analysis Integration
  const divisor = getDivisor(sym);
  const scaledData = {
    ...data,
    close: data.close / divisor,
    high: data.high / divisor,
    low: data.low / divisor,
    bb_lower: data.bb_lower / divisor,
    bb_upper: data.bb_upper / divisor
  };
  
  const suggestion = suggestEntryExit(scaledData, tradeType);
  const fibs = calculateFibLevels(scaledData.high, scaledData.low);

  return `
    <div style="border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-bottom: 8px;">
      <strong style="color:${scoreColor}; font-size:12px;">🏆 Confluence Score: ${score}/4 ${stars}</strong><br/>
      <div style="margin-top:4px; line-height: 1.4; font-size:11px;">${reasons.join("<br/>")}</div>
    </div>

    <div style="background: rgba(255, 193, 7, 0.05); border: 1px solid rgba(255, 193, 7, 0.2); border-radius: 6px; padding: 10px; margin-bottom: 8px;">
      <strong style="color: #ffc107; font-size: 11px;">🎯 Smart Suggestions</strong>
      <div style="margin-top: 5px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span>Vùng mua tối ưu:</span> <strong style="color:var(--profit);">${fmt(suggestion.entry)}</strong>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span>Vùng bán tối ưu:</span> <strong style="color:var(--loss);">${fmt(suggestion.exit)}</strong>
        </div>
        <p style="font-size:10px; color:var(--text-muted); margin-top:6px; font-style:italic;">${suggestion.reason}</p>
      </div>
    </div>

    <div style="font-size: 11px;">
      <strong style="color:var(--text-primary);">📊 Fibonacci Levels (Intraday)</strong>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 4px;">
        <div style="color:var(--text-muted);">Fib 0.236: <strong>${fmt(fibs[0.236])}</strong></div>
        <div style="color:var(--text-muted);">Fib 0.382: <strong>${fmt(fibs[0.382])}</strong></div>
        <div style="color:var(--text-muted);">Fib 0.500: <strong>${fmt(fibs[0.5])}</strong></div>
        <div style="color:var(--text-muted);">Fib 0.618: <strong>${fmt(fibs[0.618])}</strong></div>
      </div>
    </div>
  `;
}

let currentEditId = null;
let currentDCATrade = null;
let currentDCAPrice = null;
let currentCloseTradeId = null;
let currentRealizedPnl = 0;
let handleRollover = null;
let handleTakeProfit = null; // New handler for partial close
let handleT0 = null;
let handleClearHistory = null;
let lastAnalyzedSym = null;
let lastAnalyzedData = null;

export function bindCloseEvents(cb) {
  handleTakeProfit = cb;
}

export function bindHistoryEvents(cbClear, root = document) {
  handleClearHistory = cbClear;
  
  const btnHistory = root.querySelector("#btn-history");
  const modalHistory = root.querySelector("#modal-history");
  const btnCloseHistory = root.querySelector("#btn-close-modal-history");
  const btnClearHistory = root.querySelector("#btn-clear-history");
  
  if (btnHistory && modalHistory) {
    btnHistory.addEventListener("click", () => {
      modalHistory.style.display = "flex";
    });
    btnCloseHistory.addEventListener("click", () => modalHistory.style.display = "none");
    modalHistory.addEventListener("click", (e) => {
      if (e.target === modalHistory) modalHistory.style.display = "none";
    });
  }
  
  if (btnClearHistory) {
    btnClearHistory.addEventListener("click", async () => {
      if (confirm("Xác nhận xóa hệ thống lịch sử chốt lệnh? Hành động này không thể hoàn tác.")) {
        if (handleClearHistory) await handleClearHistory();
      }
    });
  }
}

export function bindT0Events(cb) {
  handleT0 = cb;
}

export function bindAIEvents(onAskAI, root = document) {
  const btnAskAI = root.querySelector("#btn-ask-ai");
  if (btnAskAI) {
    btnAskAI.addEventListener("click", () => {
      if (!lastAnalyzedSym || !lastAnalyzedData) return;
      onAskAI(lastAnalyzedSym, lastAnalyzedData, root.querySelector("#inp-type").value);
    });
  }
}

export function bindAIDCA(onAskDCA, root = document) {
  const btnAIDCA = root.querySelector("#btn-ai-dca");
  if (btnAIDCA) {
    btnAIDCA.addEventListener("click", () => {
      if (!currentDCATrade || !currentDCAPrice) return;
      onAskDCA(currentDCATrade, currentDCAPrice);
    });
  }
}

export function bindAIPortfolio(onAskPortfolio, root = document) {
  const btnAIPortfolio = root.querySelector("#btn-ai-portfolio");
  if (btnAIPortfolio) {
    btnAIPortfolio.addEventListener("click", () => {
      onAskPortfolio();
    });
  }
}

export function openChatPanel(root = document) {
  root.querySelector("#panel-chat").classList.add("open");
  const msgContainer = root.querySelector("#chat-messages");
  msgContainer.scrollTop = msgContainer.scrollHeight;
}

export function closeChatPanel(root = document) {
  root.querySelector("#panel-chat").classList.remove("open");
}

/* ── PHASE 04: AI ADVISOR UI LOGIC ── */

export function bindTabEvents(root = document) {
  const tabs = root.querySelectorAll(".tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.target;
      
      // Update Tab buttons
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      // Update Tab content
      root.querySelectorAll(".tab-content").forEach(content => {
        content.classList.remove("active");
      });
      root.querySelector(`#${target}`).classList.add("active");
    });
  });
}

export function bindScannerEvents(onScan, onAIAnalyze, onAskAdvisor, onViewRaw, root = document) {
  const btnScan = root.querySelector("#btn-scan-market");
  const inpTarget = root.querySelector("#inp-target-profit");
  
  if (btnScan) {
    btnScan.addEventListener("click", async () => {
      btnScan.disabled = true;
      try {
        await onScan();
      } finally {
        btnScan.disabled = false;
      }
    });
  }

  const btnAI = root.querySelector("#btn-ai-analyze");
  if (btnAI) {
    btnAI.addEventListener("click", async () => {
      const targetProfit = parseFloat(inpTarget.value) || 3;
      btnAI.disabled = true;
      const originalText = btnAI.textContent;
      btnAI.textContent = "⏳ Đang lọc AI...";
      try {
        await onAIAnalyze(targetProfit);
      } finally {
        btnAI.disabled = false;
        btnAI.textContent = originalText;
      }
    });
  }

  // Event delegation cho toàn bộ vùng Advisor content
  const advisorContent = root.querySelector("#advisor-content");
  if (advisorContent) {
    advisorContent.addEventListener("click", (e) => {
      const card = e.target.closest(".scanner-card");
      if (!card) return;

      const symbol = card.dataset.symbol;

      // Nếu bấm vào nút Raw
      if (e.target.closest(".btn-view-raw")) {
        e.stopPropagation();
        const rawData = JSON.parse(card.dataset.raw || "{}");
        onViewRaw(symbol, rawData);
        return;
      }

      // Mặc định là xem tư vấn AI
      onAskAdvisor(symbol);
    });
  }
}

export function renderScannerResults(results, root = document, timestamp = null, containerId = "#scanner-raw-results") {
  const container = root.querySelector(containerId);
  if (!container) return;

  if (!results || results.length === 0) {
    container.innerHTML = `<div class="empty-state">Không tìm thấy mã nào phù hợp.</div>`;
    return;
  }

  let html = "";
  if (timestamp) {
    const date = new Date(timestamp);
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${date.getDate()}/${date.getMonth() + 1}`;
    html += `<div style="font-size:10px; color:var(--text-muted); margin-bottom:8px; text-align:right; padding-right:4px;">🕒 Cập nhật lần cuối: ${timeStr}</div>`;
  }

  html += results.map(res => `
    <div class="scanner-card" data-symbol="${res.ticker}" data-raw='${JSON.stringify(res).replace(/'/g, "&apos;")}'>
      <div class="scanner-main">
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="scanner-ticker">${res.symbol}</span>
          <a href="https://vn.tradingview.com/chart/?symbol=${res.ticker}" target="_blank" title="Xem biểu đồ TradingView" style="text-decoration:none; font-size:12px; line-height:1; cursor:pointer;">📈</a>
          <span class="scanner-name">${res.description || res.name}</span>
        </div>
        <div class="scanner-price-info">
          <div class="scanner-price">${fmt(res.price)}</div>
          <div class="scanner-change ${res.changePercent >= 0 ? 'profit' : 'loss'}">
            ${fmtSigned(res.changePercent)}%
          </div>
        </div>
      </div>
      <div class="ai-reason">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span>🤖 <strong>AI:</strong></span>
          ${res.aiScore ? `<span style="background:${res.aiScore >= 8 ? 'var(--profit)' : 'var(--warning, #f1c40f)'}; color:white; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:bold;">An toàn: ${res.aiScore}/10</span>` : ''}
        </div>
        <div style="font-size:11px; margin-bottom:8px; line-height:1.4; color:var(--text-primary); opacity:0.9;">
          ${res.aiReason}
        </div>
        
        <!-- Bảng kế hoạch rút gọn -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; border:1px dashed rgba(255,255,255,0.1);">
          <div style="font-size:10px;">🎯 Target: <strong style="color:var(--profit);">${res.aiTarget || 'N/A'}</strong></div>
          <div style="font-size:10px;">📥 Entry: <strong style="color:var(--text-primary);">${res.aiEntry || 'N/A'}</strong></div>
          <div style="font-size:10px;">⏳ Giữ: <strong style="color:var(--warning, #f1c40f);">${res.aiDuration || 0} phiên</strong></div>
          <div style="font-size:10px;">🔥 Winrate: <strong style="color:#00e676;">${res.aiWinRate || 0}%</strong></div>
        </div>
      </div>
      <div class="scanner-stats">
        <div style="display:flex; gap:12px;">
          <span>RSI: <span class="stat-val">${Math.round(res.rsi)}</span></span>
          <span>Vol: <span class="stat-val">${(res.volume / 1000000).toFixed(1)}M</span></span>
        </div>
        <button class="btn-view-raw" style="background:var(--bg-input); border:1px solid var(--border); color:var(--text-muted); font-size:10px; padding:2px 6px; border-radius:4px;">Raw 📄</button>
      </div>
    </div>
  `).join("");

  container.innerHTML = html;
}

export function renderSystemLogs(logs, root = document) {
  const container = root.querySelector("#log-list");
  if (!container) return;

  if (!logs || logs.length === 0) {
    container.innerHTML = `<div class="empty-state">Chưa có hoạt động nào được ghi lại.</div>`;
    return;
  }

  container.innerHTML = logs.map(log => {
    const time = new Date(log.time).toLocaleTimeString();
    let typeColor = "var(--text-muted)";
    if (log.type === 'ERROR') typeColor = "var(--loss)";
    if (log.type === 'AI_RES') typeColor = "var(--profit)";
    if (log.type === 'AI_PROMPT') typeColor = "var(--accent-blue)";

    return `
      <div class="log-item" style="background:var(--bg-card); border:1px solid var(--border); border-radius:6px; padding:10px; font-size:11px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="color:${typeColor}; font-weight:bold;">[${log.type}] ${log.title}</span>
          <span style="color:var(--text-muted);">${time}</span>
        </div>
        <details>
          <summary style="cursor:pointer; color:var(--accent-blue);">Xem chi tiết</summary>
          <div class="log-detail" style="margin-top:8px; padding:8px; background:rgba(0,0,0,0.2); border-radius:4px; font-size:11px; white-space:pre-wrap; word-break:break-all; max-height:400px; overflow-y:auto;">${log.detail}</div>
        </details>
      </div>
    `;
  }).join("");
}

export function appendChatMessage(role, text, isHtml = false, root = document) {
  const container = root.querySelector("#chat-messages");
  const div = document.createElement("div");
  div.className = `chat-msg ${role === 'user' ? 'user-msg' : 'ai-msg'}`;
  
  if (role === 'system-typing') {
    div.classList.add("ai-msg");
    div.id = "chat-typing";
    div.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
  } else {
    if (isHtml) div.innerHTML = text;
    else div.textContent = text;
  }
  
  if (container) {
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
  return div;
}

export function removeTypingIndicator(root = document) {
  const typing = root.querySelector("#chat-typing");
  if (typing) typing.remove();
}

/**
 * Render entire chat history from an array.
 * @param {Array} history - [{role, text}]
 */
export function renderChatHistory(history, root = document) {
  const container = root.querySelector("#chat-messages");
  // Keep the welcome message if history is empty, otherwise clear and render
  if (history && history.length > 0 && container) {
    container.innerHTML = "";
    history.forEach(msg => {
      let formattedText = msg.text;
      let isHtml = false;
      
      if (msg.role === "assistant") {
        const escaped = escapeHTML(msg.text);
        formattedText = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        isHtml = true;
      }
      
      appendChatMessage(msg.role, formattedText, isHtml, root);
    });
  }
}

export function bindChatEvents(onSendChat, onClearChat, root = document) {
  const btnFloating = root.querySelector("#btn-floating-chat");
  const btnClose = root.querySelector("#btn-chat-close");
  const btnClear = root.querySelector("#btn-chat-clear");
  const chatForm = root.querySelector("#chat-form");
  const inpChat = root.querySelector("#inp-chat");
  const btnSend = root.querySelector("#btn-chat-send");
  
  if (btnFloating) btnFloating.addEventListener("click", () => openChatPanel(root));
  if (btnClose) btnClose.addEventListener("click", () => closeChatPanel(root));
  
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (confirm("Xóa toàn bộ lịch sử trò chuyện?")) {
        onClearChat();
        root.querySelector("#chat-messages").innerHTML = `
          <div class="chat-msg ai-msg">
            Đã xóa lịch sử trò chuyện. Tôi có thể giúp gì cho bạn?
          </div>
        `;
      }
    });
  }
  
  if (inpChat) {
    inpChat.addEventListener("input", () => {
      btnSend.disabled = inpChat.value.trim() === "";
    });
    inpChat.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event("submit"));
      }
    });
  }
  
  if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = inpChat.value.trim();
      if (!text) return;
      
      inpChat.value = "";
      btnSend.disabled = true;
      
      appendChatMessage("user", text, false, root);
      openChatPanel(root);
      
      appendChatMessage("system-typing", "", false, root);
      try {
        const responseText = await onSendChat(text);
        removeTypingIndicator(root);
        // Safe HTML formatting: Escape first, then format bold
        const escapedResp = escapeHTML(responseText);
        const formattedResp = escapedResp.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        appendChatMessage("assistant", formattedResp, true, root);
      } catch (err) {
        removeTypingIndicator(root);
        appendChatMessage("assistant", `❌ Lỗi: ${err.message}`, true, root);
      }
    });
  }
}

export function bindSettingsEvents(settings, onSaveSettings, onFetchModels, root = document) {
  const btnSettings = root.querySelector("#btn-settings");
  const modalSettings = root.querySelector("#modal-settings");
  const btnCloseSettings = root.querySelector("#btn-close-modal-settings");
  const btnSaveSettings = root.querySelector("#btn-save-settings");
  const btnFetchModels = root.querySelector("#btn-fetch-models");
  
  if (btnSettings && modalSettings) {
    btnSettings.addEventListener("click", () => {
      root.querySelector("#inp-ai-provider").value = settings.aiProvider || "gemini";
      root.querySelector("#inp-ai-model").value = settings.aiModel || "";
      root.querySelector("#inp-api-key").value = settings.apiKey || "";
      
      // Load AI Advisor profile
      root.querySelector("#inp-trading-style").value = settings.tradingStyle || "lướt sóng";
      root.querySelector("#inp-risk-level").value = settings.riskLevel || "trung bình";
      
      // Load Telegram settings
      root.querySelector("#inp-tg-token").value = settings.tgToken || "";
      root.querySelector("#inp-tg-chatid").value = settings.tgChatId || "";
      root.querySelector("#chk-tg-enabled").checked = !!settings.tgEnabled;

      const msgEl = root.querySelector("#msg-api-key");
      if (msgEl) msgEl.innerHTML = `Lấy Key tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--accent-blue);">Google AI Studio</a> hoặc <a href="https://platform.openai.com/api-keys" target="_blank" style="color:var(--accent-blue);">OpenAI</a>`;
      modalSettings.style.display = "flex";
    });
    
    btnCloseSettings.addEventListener("click", () => modalSettings.style.display = "none");
    modalSettings.addEventListener("click", (e) => {
      if (e.target === modalSettings) modalSettings.style.display = "none";
    });

    const btnTestTg = root.querySelector("#btn-test-tg");
    if (btnTestTg) {
      btnTestTg.addEventListener("click", async () => {
        const token = root.querySelector("#inp-tg-token").value.trim();
        const chatId = root.querySelector("#inp-tg-chatid").value.trim();
        if (!token || !chatId) {
          alert("Vui lòng nhập Token và Chat ID trước khi test!");
          return;
        }
        btnTestTg.textContent = "⏳...";
        try {
          const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: "🔔 Kết nối Trading Portfolio Pro thành công! Tôi sẽ báo động cho bạn tại đây." })
          });
          const data = await resp.json();
          if (data.ok) alert("✅ Đã gửi tin nhắn test thành công!");
          else alert("❌ Lỗi Telegram: " + data.description);
        } catch (e) {
          alert("❌ Lỗi kết nối: " + e.message);
        } finally {
          btnTestTg.textContent = "Test 🔔";
        }
      });
    }
    
    if (btnFetchModels && onFetchModels) {
      btnFetchModels.addEventListener("click", async (e) => {
        e.preventDefault();
        const provider = root.querySelector("#inp-ai-provider").value;
        const key = root.querySelector("#inp-api-key").value.trim();
        const msgEl = root.querySelector("#msg-api-key");
        
        if (!key) {
          msgEl.innerHTML = `<span style="color:var(--loss);">Vui lòng nhập API Key trước khi Fetch.</span>`;
          return;
        }
        
        btnFetchModels.textContent = "⏳...";
        btnFetchModels.disabled = true;
        msgEl.innerHTML = `<span style="color:var(--text-muted);">Đang tải danh sách Models từ hệ thống...</span>`;
        
        try {
          const models = await onFetchModels(provider, key);
          const datalist = root.querySelector("#ai-models-list");
          datalist.innerHTML = "";
          models.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m;
            datalist.appendChild(opt);
          });
          
          msgEl.innerHTML = `<span style="color:var(--profit);">Đã tải ${models.length} options thành công. Bấm xuống ô Tên Model để chọn.</span>`;
          
          const inpModel = root.querySelector("#inp-ai-model");
          if (!inpModel.value && models.length > 0) {
             const defaultModel = models.find(m => m.includes("flash") || m.includes("gpt-4o")) || models[0];
             inpModel.value = defaultModel;
          }
        } catch (err) {
          msgEl.innerHTML = `<span style="color:var(--loss);">Lỗi: ${err.message}</span>`;
        } finally {
          btnFetchModels.textContent = "🔄 Fetch";
          btnFetchModels.disabled = false;
        }
      });
    }

    btnSaveSettings.addEventListener("click", async () => {
      const provider = root.querySelector("#inp-ai-provider").value;
      const model = root.querySelector("#inp-ai-model").value.trim();
      const key = root.querySelector("#inp-api-key").value.trim();

      settings.aiProvider = provider;
      settings.aiModel = model;
      settings.apiKey = key;

      // Save AI Advisor profile
      settings.tradingStyle = root.querySelector("#inp-trading-style").value;
      settings.riskLevel = root.querySelector("#inp-risk-level").value;

      // Save Telegram settings
      settings.tgToken = root.querySelector("#inp-tg-token").value.trim();
      settings.tgChatId = root.querySelector("#inp-tg-chatid").value.trim();
      settings.tgEnabled = root.querySelector("#chk-tg-enabled").checked;

      await onSaveSettings(settings);
      modalSettings.style.display = "none";
    });
  }
}

/**
 * Render the full portfolio list into #portfolio-list.
 * Performs in-place DOM patching to avoid flicker.
 *
 * @param {Array}    portfolio - trade objects from storage
 * @param {Function} onDelete  - (id) => Promise<void>
 * @param {Function} onEdit    - (id) => void
 * @param {Object}   priceMap  - Mapping of symbol -> { close, change, change_abs }
 */
export function renderPortfolio(portfolio, onDelete, onEdit, priceMap = {}, root = document) {
  const container = root.querySelector("#portfolio-list");
  if (!container) return;

  // ── Empty state ──
  if (!portfolio || portfolio.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No trades yet.</p>
        <p class="empty-sub">Add your first position above.</p>
      </div>`;
    updateSummaryBar(portfolio, priceMap);
    return;
  }

  // ── Update or create cards ──
  const existingIds = new Set(
    [...container.querySelectorAll(".trade-card")].map((el) => el.dataset.id),
  );
  const incomingIds = new Set(portfolio.map((t) => t.id));

  // Remove deleted cards
  container.querySelectorAll(".trade-card").forEach((el) => {
    if (!incomingIds.has(el.dataset.id)) el.remove();
  });

  let totalPnl = 0;

  portfolio.forEach((trade) => {
    const divisor = getDivisor(trade.symbol);
    const priceData = priceMap[trade.symbol] || {
      close: trade.entryPrice,
      change: 0,
      change_abs: 0,
    };
    
    // Internal calculation using full prices
    const { pnl, pct } = calculatePnL(trade, priceData.close);
    totalPnl += pnl;

    // Display prices (divided by divisor)
    const currentDisplayPrice = priceData.close / divisor;
    const entryDisplayPrice = parseFloat(trade.entryPrice) / divisor;
    const slDisplayPrice = trade.stopLoss ? (parseFloat(trade.stopLoss) / divisor) : null;
    const tpDisplayPrice = trade.takeProfit ? (parseFloat(trade.takeProfit) / divisor) : null;

    const isProfit = pnl >= 0;
    const pnlClass = isProfit ? "profit" : "loss";
    const typeClass = trade.type === "BUY" ? "badge-buy" : "badge-sell";

    const changePct = priceData.change;
    const changeClass = changePct >= 0 ? "profit" : "loss";

    let trendIndicator = "";
    if (priceData.ema200 && priceData.close) {
      if (priceData.close > priceData.ema200) trendIndicator = "<span style='color:var(--profit);font-size:10px;margin-left:4px;' title='Trend Tăng'>▲</span>";
      else if (priceData.close < priceData.ema200) trendIndicator = "<span style='color:var(--loss);font-size:10px;margin-left:4px;' title='Trend Giạm'>▼</span>";
    }

    const slText = slDisplayPrice ? fmt(slDisplayPrice) : "—";
    const tpText = tpDisplayPrice ? fmt(tpDisplayPrice) : "—";
// Sanitize user-controllable strings for HTML
    const safeSymbol = escapeHTML(trade.symbol);
    const safeNote = trade.note ? escapeHTML(trade.note) : "";
    const noteHtml = safeNote
      ? `<div class="trade-note">💬 ${safeNote}</div>`
      : "";

    const html = `
      <div class="trade-header">
        <span class="trade-symbol">${safeSymbol}${trendIndicator} <span class="btn-info" data-id="${trade.id}" style="cursor:pointer;font-size:12px;margin-left:4px;filter:grayscale(100%);" title="Xem phân tích kỹ thuật">ℹ️</span></span>
        <span class="badge ${typeClass}">${trade.type}</span>
        <span class="trade-qty">×${fmt(parseFloat(trade.quantity))}</span>
      </div>
      <div class="trade-prices">
        <span class="price-item">Entry <strong>${fmt(entryDisplayPrice)}</strong></span>
        <span class="price-item">Current <strong>${fmt(currentDisplayPrice)}</strong> <span class="${changeClass}">(${fmtSigned(changePct)}%)</span></span>
        <span class="price-item">SL <strong>${slText}</strong></span>
        <span class="price-item">TP <strong>${tpText}</strong></span>
      </div>
      ${noteHtml}
      <div class="trade-footer">
        <div class="pnl ${pnlClass}">
          ${fmtSigned(pnl / 1000)} <span class="pnl-pct">(${fmtSigned(pct)}%)</span>
        </div>
      <div class="trade-actions">
        <button class="btn btn-view" data-symbol="${safeSymbol}" title="View on TradingView">📈 View</button>
        <button class="btn btn-close-trade" data-id="${trade.id}" style="background:#089981; color:white;" title="Chốt Lời & Cấn Trừ Hạ Giá Vốn">💰 Chốt</button>
        <button class="btn btn-dca" data-id="${trade.id}" style="background:#5264b3; color:white;" title="DCA / Gỡ Lỗ">🧮 DCA</button>
        <button class="btn btn-edit"   data-id="${trade.id}" style="background:var(--bg-input); color:var(--text-primary);">✏️ Edit</button>
        <button class="btn btn-delete" data-id="${trade.id}">🗑 Delete</button>
      </div>
      </div>`;

    let card = container.querySelector(`.trade-card[data-id="${trade.id}"]`);
    if (!card) {
      card = document.createElement("div");
      card.className = "trade-card";
      card.dataset.id = trade.id;
      container.appendChild(card);
    }
    card.innerHTML = html;
  });

  updateSummaryBar(portfolio, priceMap, root);

  // Bind info buttons
  root.querySelectorAll(".btn-info").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const trade = portfolio.find(t => t.id === id);
      if (!trade) return;
      
      const priceData = priceMap[trade.symbol] || { close: trade.entryPrice, change:0, change_abs:0 };
      const analysisHtml = getAnalysisHTML(trade.symbol, priceData, trade.type);
      
      const typeClass = trade.type === "BUY" ? "badge-buy" : "badge-sell";
      root.querySelector("#modal-title").innerHTML = `Phân Tích <strong>${trade.symbol}</strong> <span class="badge ${typeClass}" style="margin-left:8px;font-size:10px;">${trade.type}</span>`;
      root.querySelector("#modal-body").innerHTML = analysisHtml;
      root.querySelector("#modal-analysis").style.display = "flex";
    });
  });

  // Bind DCA buttons
  root.querySelectorAll(".btn-dca").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const trade = portfolio.find(t => t.id === id);
      if (!trade) return;
      
      const priceData = priceMap[trade.symbol] || { close: trade.entryPrice };
      const divisor = getDivisor(trade.symbol);
      
      currentDCATrade = trade;
      currentDCAPrice = priceData.close; // Store full price for AI synchronization
      
      const typeClass = trade.type === "BUY" ? "badge-buy" : "badge-sell";
      root.querySelector("#dca-title").innerHTML = `🧮 Gỡ Lỗ / DCA: <strong>${trade.symbol}</strong> <span class="badge ${typeClass}" style="margin-left:8px;font-size:10px;">${trade.type}</span>`;
      root.querySelector("#dca-qty").textContent = fmt(trade.quantity);
      root.querySelector("#dca-entry").textContent = fmt(parseFloat(trade.entryPrice) / divisor);
      root.querySelector("#dca-current").textContent = fmt(currentDCAPrice / divisor);
      
      const aiResponse = root.querySelector("#ai-dca-response");
      if (aiResponse) {
        aiResponse.style.display = "none";
        aiResponse.innerHTML = "";
      }
      
      root.querySelector("#inp-dca-qty").value = "";
      root.querySelector("#dca-result").innerHTML = "Hãy nhập số lượng mua/bán thêm để xem kịch bản hòa vốn.";
      root.querySelector("#modal-dca").style.display = "flex";
    });
  });

  // Bind Close / Rollover buttons
  root.querySelectorAll(".btn-close-trade").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const trade = portfolio.find(t => t.id === id);
      if (!trade) return;
      
      const priceData = priceMap[trade.symbol] || { close: trade.entryPrice };
      const divisor = getDivisor(trade.symbol);
      
      currentCloseTradeId = id;
      
      root.querySelector("#close-sym").textContent = `${trade.symbol} (${trade.type})`;
      
      const inpQty = root.querySelector("#inp-close-qty");
      const inpPrice = root.querySelector("#inp-close-price");
      const pnlEl = root.querySelector("#close-pnl");
      
      // Default values
      inpQty.value = parseFloat(trade.quantity);
      inpPrice.value = parseFloat(priceData.close) / divisor;
      
      // Function to dynamically recalculate PnL
      const updateDynamicPnl = () => {
        const q = parseFloat(inpQty.value) || 0;
        const p = parseFloat(inpPrice.value) || 0;
        
        // Full price logic
        const exitFullPrice = p * divisor;
        const entryFullPrice = parseFloat(trade.entryPrice);
        
        let pnl = 0;
        if (trade.type === "BUY") {
           pnl = (exitFullPrice - entryFullPrice) * q;
        } else {
           pnl = (entryFullPrice - exitFullPrice) * q;
        }
        
        currentRealizedPnl = pnl;
        pnlEl.textContent = fmtSigned(pnl / 1000);
        pnlEl.style.color = pnl >= 0 ? "var(--profit)" : "var(--loss)";
      };
      
      inpQty.removeEventListener("input", updateDynamicPnl);
      inpPrice.removeEventListener("input", updateDynamicPnl);
      
      inpQty.addEventListener("input", updateDynamicPnl);
      inpPrice.addEventListener("input", updateDynamicPnl);
      
      // Initial trigger
      updateDynamicPnl();
      
      const selTarget = root.querySelector("#sel-merge-target");
      selTarget.innerHTML = '<option value="">-- Chỉ xóa lệnh (Giữ nguyên các mã khác) --</option>';
      
      portfolio.forEach(t => {
        if (t.id !== id && t.symbol === trade.symbol) {
          const opt = document.createElement("option");
          opt.value = t.id;
          opt.textContent = `Gộp vào: ${t.symbol} (SL: ${fmt(t.quantity)} @ ${fmt(parseFloat(t.entryPrice) / divisor)})`;
          selTarget.appendChild(opt);
        }
      });
      
      root.querySelector("#modal-close").style.display = "flex";
    });
  });

  // ── Bind action buttons ──
  container.querySelectorAll(".btn-view").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sym = btn.dataset.symbol;
      chrome.tabs.update({
        url: `https://www.tradingview.com/chart/?symbol=${sym}`,
      });
    });
  });

  container.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (onEdit) onEdit(btn.dataset.id);
    });
  });

  container.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (confirm(`Delete this trade?`)) {
        await onDelete(btn.dataset.id);
      }
    });
  });
}

/**
 * Update the top summary bar with total PnL and Health Score.
 */
export function updateSummaryBar(portfolio, priceMap, root = document) {
  let totalPnl = 0;
  let totalValue = 0;
  let winningTrades = 0;

  portfolio.forEach((trade) => {
    const data = priceMap[trade.symbol] || { close: trade.entryPrice };
    const divisor = getDivisor(trade.symbol);
    
    // Internal calculation using full prices
    const isBuy = trade.type === "BUY";
    const pnl = isBuy
      ? (data.close - trade.entryPrice) * trade.quantity
      : (trade.entryPrice - data.close) * trade.quantity;
    
    totalPnl += pnl;
    totalValue += data.close * trade.quantity;
    if (pnl > 0) winningTrades++;
  });

  const winRate = portfolio.length > 0 ? (winningTrades / portfolio.length) * 100 : 0;
  const healthScore = winRate; // Simple health score based on win rate

  const elPnl = root.querySelector("#total-pnl");
  const elHeader = root.querySelector(".header");

  // For display, we divide by 1000 (primary currency scaling)
  const displayTotalPnl = totalPnl / 1000;

  if (elPnl) {
    elPnl.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:flex-end;">
        <span style="font-size:16px; font-weight:bold; color:${totalPnl >= 0 ? "var(--profit)" : "var(--loss)"};">
          ${totalPnl >= 0 ? "+" : ""}${fmt(displayTotalPnl)}
        </span>
        <div style="font-size:10px; color:var(--text-muted); display:flex; gap:8px;">
          <span>Health: <strong style="color:${healthScore > 50 ? "var(--profit)" : "orange"};">${fmt(healthScore)}%</strong></span>
          <span>Win Rate: <strong>${fmt(winRate)}%</strong></span>
        </div>
      </div>
    `;
  }

  // Mini Allocation Bar integration
  let allocationBar = root.querySelector("#allocation-bar");
  if (!allocationBar && elHeader) {
    allocationBar = document.createElement("div");
    allocationBar.id = "allocation-bar";
    allocationBar.style.cssText = "height:3px; width:100%; position:absolute; bottom:0; left:0; display:flex;";
    elHeader.style.position = "relative";
    elHeader.appendChild(allocationBar);
  }


  if (portfolio.length > 0) {
    let barHtml = "";
    const symbols = [...new Set(portfolio.map(t => t.symbol))];
    const colors = ["#26a69a", "#ef5350", "#2196f3", "#ff9800", "#9c27b0", "#00bcd4"];
    
    let currentTotalValue = 0;
    const weights = symbols.map((s, i) => {
      const val = portfolio.filter(t => t.symbol === s).reduce((acc, t) => {
        const p = priceMap[s]?.close || 0; // Use full price for weighting
        return acc + (p * t.quantity);
      }, 0);
      currentTotalValue += val;
      return { sym: s, val, color: colors[i % colors.length] };
    });

    weights.forEach(w => {
      const pct = (w.val / (currentTotalValue || 1)) * 100;
      barHtml += `<div title="${w.sym}: ${fmt(pct)}%" style="width:${pct}%; background:${w.color}; height:100%;"></div>`;
    });
    allocationBar.innerHTML = barHtml;
  }
}

/**
 * Bind the add-trade form events.
 *
 * @param {Function} onSave - (tradeData) => Promise<void>
 */
export function bindFormEvents(onSave, root = document) {
  const form = root.querySelector("#trade-form");
  const symIn = root.querySelector("#inp-symbol");
  const btnCancel = root.querySelector("#btn-cancel");
  const btnToggle = root.querySelector("#btn-toggle-form");
  const formSection = root.querySelector("#form-section");

  const btnAnalyze = root.querySelector("#btn-analyze");
  const analysisCard = root.querySelector("#analysis-card");
  const typeSelect = root.querySelector("#inp-type");

  const modalClose = root.querySelector("#modal-close");
  const btnCloseModalClose = root.querySelector("#btn-close-modal-close");
  const btnConfirmClose = root.querySelector("#btn-confirm-close");

  if (modalClose && btnCloseModalClose) {
    btnCloseModalClose.addEventListener("click", () => modalClose.style.display = "none");
    modalClose.addEventListener("click", (e) => {
      if (e.target === modalClose) modalClose.style.display = "none";
    });
  }

  if (btnConfirmClose) {
    btnConfirmClose.addEventListener("click", async () => {
      const targetId = root.querySelector("#sel-merge-target").value;
      const closeQty = parseFloat(root.querySelector("#inp-close-qty").value);
      const closePrice = parseFloat(root.querySelector("#inp-close-price").value);
      
      if (!closeQty || closeQty <= 0) {
        alert("Khối lượng chốt phải lớn hơn 0");
        return;
      }
      if (!closePrice || closePrice <= 0) {
        alert("Giá chốt không hợp lệ");
        return;
      }
      
      if (handleTakeProfit && currentCloseTradeId) {
        btnConfirmClose.textContent = "⏳...";
        await handleTakeProfit(currentCloseTradeId, closeQty, closePrice, targetId);
        btnConfirmClose.textContent = "Xác nhận Chốt & Cấn trừ";
      }
      modalClose.style.display = "none";
    });
  }

  const modalAnalysis = root.querySelector("#modal-analysis");
  const btnCloseModal = root.querySelector("#btn-close-modal");

  if (modalAnalysis && btnCloseModal) {
    btnCloseModal.addEventListener("click", () => {
      modalAnalysis.style.display = "none";
    });
    modalAnalysis.addEventListener("click", (e) => {
      if (e.target === modalAnalysis) {
        modalAnalysis.style.display = "none";
      }
    });
  }

  const modalDCA = root.querySelector("#modal-dca");
  const btnCloseDCA = root.querySelector("#btn-close-dca");
  const inpDCA = root.querySelector("#inp-dca-qty");

  if (modalDCA && btnCloseDCA) {
    btnCloseDCA.addEventListener("click", () => modalDCA.style.display = "none");
    modalDCA.addEventListener("click", (e) => {
      if (e.target === modalDCA) modalDCA.style.display = "none";
    });
  }

  if (inpDCA) {
    inpDCA.addEventListener("input", (e) => {
      if (!currentDCATrade || !currentDCAPrice) return;
      
      const divisor = getDivisor(currentDCATrade.symbol);
      const addQty = parseFloat(e.target.value) || 0;
      const currentQty = parseFloat(currentDCATrade.quantity);
      const entryPrice = parseFloat(currentDCATrade.entryPrice);
      const isBuy = currentDCATrade.type === "BUY";
      
      if (addQty <= 0) {
        root.querySelector("#dca-result").innerHTML = "Hãy nhập số lượng mua/bán thêm để xem kịch bản hòa vốn.";
        return;
      }
      
      const totalValue = (currentQty * entryPrice) + (addQty * currentDCAPrice);
      const totalQty = currentQty + addQty;
      const newAvg = totalValue / totalQty;
      
      if (isBuy) {
        const bounceNeeded = ((newAvg - currentDCAPrice) / currentDCAPrice) * 100;
        const oldBounceNeeded = ((entryPrice - currentDCAPrice) / currentDCAPrice) * 100;
        
        root.querySelector("#dca-result").innerHTML = `
          <strong>Giá Trung Bình Mới:</strong> <span style="font-size:14px;color:var(--text-primary);">${fmt(newAvg / (divisor || 1))}</span><br/>
          <div style="margin-top:8px;">Để hòa vốn, tổng danh mục cài mới cần tăng: <strong style="color:var(--profit);">+${fmt(bounceNeeded)}%</strong> <br/>
          <i style="color:var(--text-muted);font-size:11px;">(Thay vì +${fmt(oldBounceNeeded)}% như cũ)</i></div>
        `;
      } else {
        const dropNeeded = ((currentDCAPrice - newAvg) / currentDCAPrice) * 100;
        const oldDropNeeded = ((currentDCAPrice - entryPrice) / currentDCAPrice) * 100;
        
        root.querySelector("#dca-result").innerHTML = `
          <strong>Giá Trung Bình Mới:</strong> <span style="font-size:14px;color:var(--text-primary);">${fmt(newAvg / (divisor || 1))}</span><br/>
          <div style="margin-top:8px;">Để hòa vốn, tổng danh mục cài mới cần sập: <strong style="color:var(--profit);">${fmtSigned(-dropNeeded)}%</strong> <br/>
          <i style="color:var(--text-muted);font-size:11px;">(Thay vì ${fmtSigned(-oldDropNeeded)}% như cũ)</i></div>
        `;
      }

      // T0 "Thay nước từ từ" strategy breakdown
      const chunkBounces = [2, 3, 5, 7]; // Percentages (Lowered for more realistic T0)
      let t0Html = `<div style="margin-top:12px; padding-top:12px; border-top:1px dashed var(--border);">`;
      t0Html += `<strong style="font-size:12px; color:var(--text-primary);">🌊 Chiến lược "Thay nước" (Lướt lô nhỏ)</strong><br/>`;
      t0Html += `<div style="color:var(--text-muted); font-size:11px; margin-bottom:8px;">Kế hoạch chốt lời nhanh chỉ riêng phần <strong>${fmt(addQty)}</strong> units vừa gom:</div>`;

      let bestScenario = null;

      chunkBounces.forEach(pct => {
          const scenario = calculateT0Scenario(currentDCATrade, currentDCAPrice, pct, addQty);
          if (pct === 3) bestScenario = scenario; // Default recommended

          t0Html += `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
            <span>Giá hồi <strong>+${pct}%</strong> (lên ${fmt(scenario.targetExit / (divisor || 1))})</span>
            <span style="color:var(--profit);">Bỏ túi: +${fmt(scenario.totalProfit / 1000)}</span>
          </div>`;
      });
      t0Html += `</div>`;

      root.querySelector("#dca-result").innerHTML += t0Html;

      // Show T0 confirmation area with the 3% scenario as preview
      const t0Area = root.querySelector("#t0-action-area");
      const t0Details = root.querySelector("#t0-details");
      if (t0Area && bestScenario) {
        const divisor = getDivisor(currentDCATrade.symbol);
        t0Area.style.display = "block";
        t0Details.innerHTML = `Giả định lướt <strong>${fmt(addQty)}</strong> units với lợi nhuận 3% (+${fmt(bestScenario.totalProfit / 1000)}), giá vốn mã gốc sẽ hạ từ ${fmt(parseFloat(currentDCATrade.entryPrice) / divisor)} xuống <strong>${fmt(bestScenario.newEntry / divisor)}</strong>.`;
        
        // Setup the one-time confirm event
        const btnT0 = root.querySelector("#btn-confirm-t0");
        btnT0.onclick = async () => {
           if (handleT0) {
             btnT0.textContent = "⏳...";
             await handleT0(currentDCATrade.id, bestScenario.newEntry, bestScenario.totalProfit);
             root.querySelector("#modal-dca").style.display = "none";
             btnT0.textContent = "Xác nhận đã lướt T0 thành công";
           }
        };
      }
    });
  }

  if (btnAnalyze) {
    btnAnalyze.addEventListener("click", async () => {
      const sym = symIn.value.trim().toUpperCase();
      if (!sym) return;

      btnAnalyze.textContent = "⏳...";
      btnAnalyze.disabled = true;
      analysisCard.style.display = "none";
      clearErrors();

      try {
        const dataMap = await fetchPricesMap([sym]);
        const data = dataMap[sym];

        if (!data || data.close === 0) {
          showError("err-symbol", `❌ Không tìm thấy mã ${sym}`);
          return;
        }

        const divisor = getDivisor(sym);

        const currentPrice = data.close / divisor;
        const atr = (data.atr || 0) / divisor;

        // Auto-fill entry price
        root.querySelector("#inp-entry").value = currentPrice;

        // Auto-fill SL / TP based on ATR
        if (atr > 0) {
          const sl_atr_mult = 1.5;
          const rr_ratio = 2.0;
          if (typeSelect.value === "BUY") {
            const sl = currentPrice - atr * sl_atr_mult;
            const tp = currentPrice + (currentPrice - sl) * rr_ratio;
            root.querySelector("#inp-sl").value = sl.toFixed(2);
            root.querySelector("#inp-tp").value = tp.toFixed(2);
          } else {
            const sl = currentPrice + atr * sl_atr_mult;
            const tp = currentPrice - (sl - currentPrice) * rr_ratio;
            root.querySelector("#inp-sl").value = sl.toFixed(2);
            root.querySelector("#inp-tp").value = tp.toFixed(2);
          }
        }

        lastAnalyzedSym = sym;
        lastAnalyzedData = data;

        const analysisHtml = getAnalysisHTML(sym, data, typeSelect.value);

        const contentDiv = root.querySelector("#analysis-card-content");
        if (contentDiv) {
          contentDiv.innerHTML = `
            ${analysisHtml}
            <i style="color:var(--text-muted);margin-top:6px;display:block;border-top:1px solid var(--border);padding-top:4px;">Đã tự động điền Giá, SL & TP (Theo ATR = ${atr.toFixed(2)})</i>
          `;
        }
        
        const aiResp = root.querySelector("#ai-response");
        if (aiResp) {
          aiResp.style.display = "none";
          aiResp.innerHTML = "";
        }

        analysisCard.style.display = "block";

      } catch (e) {
        showError("err-symbol", "Lỗi phân tích: " + e.message);
      } finally {
        btnAnalyze.textContent = "Khám (Analyze)";
        btnAnalyze.disabled = false;
      }
    });
  }

  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      resetFormUI(root); // ensures clean state
      formSection.style.display = "block";
      btnToggle.style.display = "none";
      if (btnCancel) btnCancel.style.display = "block";
      symIn.focus();
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      resetFormUI(root);
      clearErrors(root);
    });
  }

  // Auto-uppercase symbol
  symIn.addEventListener("input", () => {
    const pos = symIn.selectionStart;
    symIn.value = symIn.value.toUpperCase();
    symIn.setSelectionRange(pos, pos);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();

    const symbol = symIn.value.trim().toUpperCase();
    const divisor = getDivisor(symbol);
    const type = root.querySelector("#inp-type").value;
    const quantity = parseFloat(root.querySelector("#inp-qty").value) || 1;
    let entryPrice = parseFloat(root.querySelector("#inp-entry").value);
    let stopLoss =
      parseFloat(root.querySelector("#inp-sl").value) || null;
    let takeProfit =
      parseFloat(root.querySelector("#inp-tp").value) || null;
    const note = root.querySelector("#inp-note").value.trim();

    // Data normalization: Store at full price
    if (entryPrice) entryPrice *= divisor;
    if (stopLoss) stopLoss *= divisor;
    if (takeProfit) takeProfit *= divisor;

    let valid = true;
    if (!symbol) {
      showError("err-symbol", "Symbol is required");
      valid = false;
    }
    if (!entryPrice || isNaN(entryPrice)) {
      showError("err-entry", "Entry price is required");
      valid = false;
    }
    if (!valid) return;

    const btnSubmit = root.querySelector("#btn-submit");
    const originalText = btnSubmit.textContent;
    btnSubmit.textContent = "Checking...";
    btnSubmit.disabled = true;

    try {
      await onSave({
        id: currentEditId,
        symbol,
        type,
        quantity,
        entryPrice,
        stopLoss,
        takeProfit,
        note,
      });

      resetFormUI(root);
      symIn.focus();
    } catch (err) {
      showError("err-symbol", err.message);
    } finally {
      btnSubmit.textContent = originalText;
      btnSubmit.disabled = false;
    }
  });
}

export function populateForm(trade, root = document) {
  currentEditId = trade.id;
  const divisor = getDivisor(trade.symbol);
  root.querySelector("#inp-symbol").value = trade.symbol;
  root.querySelector("#inp-type").value = trade.type;
  root.querySelector("#inp-qty").value = trade.quantity;
  root.querySelector("#inp-entry").value = trade.entryPrice / divisor;
  root.querySelector("#inp-sl").value = trade.stopLoss ? (trade.stopLoss / divisor) : "";
  root.querySelector("#inp-tp").value = trade.takeProfit ? (trade.takeProfit / divisor) : "";
  root.querySelector("#inp-note").value = trade.note || "";

  root.querySelector("#form-title").textContent = "✏️ Edit Position";
  root.querySelector("#btn-submit").textContent = "Update Position";
  root.querySelector("#btn-cancel").style.display = "block";

  root.querySelector("#form-section").style.display = "block";
  root.querySelector("#btn-toggle-form").style.display = "none";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetFormUI(root = document) {
  currentEditId = null;
  root.querySelector("#trade-form").reset();
  root.querySelector("#form-title").textContent = "➕ New Position";
  root.querySelector("#btn-submit").textContent = "Add Position";
  root.querySelector("#btn-cancel").style.display = "none";
  
  const analysisCard = root.querySelector("#analysis-card");
  if (analysisCard) analysisCard.style.display = "none";

  root.querySelector("#form-section").style.display = "none";
  root.querySelector("#btn-toggle-form").style.display = "block";
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = msg;
    el.style.display = "block";
  }
}

export function clearErrors(root = document) {
  root.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
    el.style.display = "none";
  });
}

/**
 * Render trade history modal.
 * @param {Array} history
 */
export function renderHistory(history, root = document) {
  const container = root.querySelector("#history-list");
  const summary = root.querySelector("#history-summary");
  if (!container || !summary) return;

  if (!history || history.length === 0) {
    summary.innerHTML = "Chưa có giao dịch chốt lời/lỗ nào.";
    container.innerHTML = "";
    return;
  }

  // Calculate totals
  let totalRealized = 0;
  let winCount = 0;
  let lossCount = 0;

  const htmlBytes = [];
  
  // Sort history descending by date
  const sortedHistory = [...history].sort((a,b) => b.date - a.date);

  sortedHistory.forEach(record => {
    totalRealized += record.realizedPnl;
    if (record.realizedPnl >= 0) winCount++;
    else lossCount++;

    const dateStr = new Date(record.date).toLocaleString("vi-VN");
    const pnlClass = record.realizedPnl >= 0 ? "profit" : "loss";
    const typeClass = record.type === "BUY" ? "badge-buy" : "badge-sell";
    
    // Convert to display currency bounds
    const displayPnl = record.realizedPnl / 1000;
    
    htmlBytes.push(`
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:8px;">
        <div>
          <div style="font-size:11px; color:var(--text-muted);">${dateStr}</div>
          <strong style="color:var(--text-primary); margin-right:4px;">${record.symbol}</strong>
          <span class="badge ${typeClass}" style="font-size:9px;">${record.type}</span>
          <br/>
          <span style="font-size:12px; color:var(--text-muted);">Khối lượng:</span> <strong>${fmt(record.qtyClosed)}</strong> 
          <span style="font-size:12px; color:var(--text-muted); margin-left:8px;">Tại giá:</span> <strong>${fmt(record.closePrice)}</strong>
        </div>
        <div style="text-align:right;">
          <div class="pnl ${pnlClass}" style="font-size:15px;">${fmtSigned(displayPnl)}</div>
        </div>
      </div>
    `);
  });

  const totalDisplayPnl = totalRealized / 1000;
  const healthClass = totalRealized >= 0 ? "profit" : "loss";
  
  summary.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <span style="color:var(--text-muted); font-size:11px;">Tổng Lợi Nhuận Đã Chốt:</span><br/>
        <strong style="font-size:18px; color:var(--${healthClass});">${fmtSigned(totalDisplayPnl)}</strong>
      </div>
      <div style="text-align:right; font-size:12px;">
        <span style="color:var(--profit);">Thắng: <strong>${winCount}</strong></span> | 
        <span style="color:var(--loss);">Thua: <strong>${lossCount}</strong></span>
      </div>
    </div>
  `;

  container.innerHTML = htmlBytes.join("");
}
