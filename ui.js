/**
 * ui.js
 * Rendering and DOM event binding.
 */

import { fetchPricesMap } from "./price.js";
import { calculatePnL } from "./pnl.js";
import { getDivisor, escapeHTML, calculateT0Scenario, parseMarkdown, calculatePositionSize, calculateProbability, detectCandlePattern, getSector, calculateSectorAllocation } from "./utils.js";
import { suggestEntryExit, calculateFibLevels } from "./analysis.js";



/** Format a number to 2 decimal places with thousands separators */
function fmt(n) {
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
/** Format price according to its scale (supporting crypto and tiny decimal values) */
function fmtPrice(n) {
  const num = Number(n);
  if (isNaN(num)) return "0.00";
  if (num === 0) return "0.00";
  if (num < 0.0001) return num.toFixed(8);
  if (num < 0.01) return num.toFixed(6);
  if (num < 1) return num.toFixed(4);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
/** Format a number to 2 decimal places with sign */
function fmtSigned(n) {
  return (n >= 0 ? "+" : "") + fmt(n);
}

/** Helper to format price for display (handles divisor) */
function fmtDisplay(val, symbol) {
  if (val === null || val === undefined) return "—";
  const divisor = getDivisor(symbol);
  return fmt(parseFloat(val) / divisor);
}

/** Generic modal toggle helper */
export function toggleModal(root, modalId, show = true) {
  const modal = root.querySelector(`#${modalId}`);
  if (modal) modal.style.display = show ? "flex" : "none";
}

/** Standardize modal close event binding */
export function bindModalClose(root, modalId, btnCloseId) {
  const modal = root.querySelector(`#${modalId}`);
  const btnClose = root.querySelector(`#${btnCloseId}`);
  if (modal && btnClose) {
    btnClose.addEventListener("click", () => toggleModal(root, modalId, false));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) toggleModal(root, modalId, false);
    });
  }
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
    btnHistory.addEventListener("click", () => toggleModal(root, "modal-history", true));
    bindModalClose(root, "modal-history", "btn-close-modal-history");
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
  if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
  const inpChat = root.querySelector("#inp-chat");
  if (inpChat) {
    inpChat.focus();
    setTimeout(() => inpChat.focus(), 100);
  }
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

export function bindScannerEvents(onScan, onAIAnalyze, onAskAdvisor, root = document) {
  const btnScan = root.querySelector("#btn-scan-market");

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
      btnAI.disabled = true;
      const originalText = btnAI.textContent;
      btnAI.textContent = "⏳ Đang lọc AI...";
      try {
        await onAIAnalyze();
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

      // 1. Nếu bấm vào mã cổ phiếu hoặc icon 📈 -> Mở TradingView
      const tickerLink = e.target.closest(".ticker-link");
      if (tickerLink) {
        e.preventDefault(); // Chặn hành động mặc định của thẻ <a>
        const url = tickerLink.getAttribute("href");
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.update({ url: url });
        } else {
          window.open(url, "_blank");
        }
        return;
      }

      // Mặc định là xem tư vấn AI (Khi click vào các vùng khác của thẻ)
      onAskAdvisor(symbol);
    });
  }
}

const gradeColor = (grade) => grade === 'A' ? '#00e676' : grade === 'B' ? '#4caf50' : grade === 'C' ? '#ff9800' : grade === 'D' ? '#f44336' : '#9e9e9e';

export function renderScannerResults(results, root = document, timestamp = null, containerId = "#scanner-raw-results", settings = {}) {
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

  const isAIList = containerId === "#scanner-ai-results";
  const accountBal = settings.accountBalance || 100000000;
  const riskPct = settings.riskPercent || 2.0;

  html += results.map(res => {
    const ticker = res.ticker || res.symbol || res.s;
    const displayTicker = res.s || (res.symbol && res.symbol.includes(':') ? res.symbol.split(':')[1] : res.symbol) || ticker;
    const tvUrl = `https://vn.tradingview.com/chart/?symbol=${ticker}`;
    const isCrypto = res.type === "crypto" || res.subtype === "crypto";

    // Format Volume
    const volVal = res.volume;
    let volStr = "0";
    if (volVal >= 1000000) {
      volStr = (volVal / 1000000).toFixed(1) + "M";
    } else if (volVal >= 1000) {
      volStr = (volVal / 1000).toFixed(0) + "K";
    } else if (volVal) {
      volStr = volVal.toString();
    }

    // Format Volume Ratio
    const volRatio = res.volume && res.avgVolume10d ? (res.volume / res.avgVolume10d) : 1;
    const ratioStr = volRatio > 1.05 || volRatio < 0.95 ? `x${volRatio.toFixed(1)}` : "";

    // Pine Script V5.5 Analytics
    const prob = res._probability || calculateProbability(res);
    const pattern = res._pattern || detectCandlePattern(res);
    const confluence = res._confluence !== undefined ? res._confluence : 7.0;

    // Position Sizing for AI Card
    let posSize = null;
    if (isAIList && res.aiEntry && res.aiStoploss) {
      posSize = calculatePositionSize(res.aiEntry, res.aiStoploss, accountBal, riskPct, isCrypto);
    }

    return `
      <div class="scanner-card ${isAIList ? 'ai-card' : ''}" data-symbol="${ticker}" data-raw='${JSON.stringify(res).replace(/'/g, "&apos;")}'>
        <!-- Row 1: Header (Symbol, Name, Rating badges) -->
        <div class="scanner-header">
          <div class="scanner-symbol-group">
            <a href="${tvUrl}" target="_self" class="ticker-link" data-tooltip="Xem biểu đồ TradingView (tab hiện tại)">
              <span class="scanner-ticker">${displayTicker}</span>
              <span style="font-size:11px;">📈</span>
            </a>
            <span class="scanner-name" title="${res.description || res.name || ''}">${res.description || res.name || ''}</span>
          </div>
          <div class="scanner-rating-group">
            ${confluence ? `<span class="tech-badge" style="background:rgba(142,36,170,0.2); border-color:#8e24aa; color:#e1bee7; font-size:10px; font-weight:bold;" data-tooltip="Điểm Đồng Thuận SMC 3 Lớp (0-10đ)">⚡ ${confluence}/10</span>` : ''}
            ${res._score ? `<span class="scanner-score" data-tooltip="Điểm số kỹ thuật: ${res._score}/100">${res._score}/100</span>` : ''}
            ${res._grade ? `<span class="scanner-grade-badge" style="background:${gradeColor(res._grade)};" data-tooltip="Xếp hạng: ${res._grade}">${res._grade}</span>` : ''}
          </div>
        </div>

        <!-- Row 2: Price, Change, and Technical Indicators -->
        <div class="scanner-row scanner-price-row">
          <div class="scanner-price-group">
            <span class="scanner-price">${fmtPrice(res.price)}</span>
            <span class="scanner-change-badge ${res.changePercent >= 0 ? 'profit' : 'loss'}">
              ${fmtSigned(res.changePercent)}%
            </span>
          </div>
          <div class="scanner-tech-group">
            ${pattern ? `<span class="tech-badge" style="background:rgba(38,166,154,0.15); border-color:rgba(38,166,154,0.4); color:var(--text-primary); font-size:10px;" data-tooltip="Nhận diện Price Action">${pattern.icon} ${pattern.label}</span>` : ''}
            <span class="tech-badge" data-tooltip="Chỉ số RSI (14 phiên)">RSI: <strong>${Math.round(res.rsi || 50)}</strong></span>
            <span class="tech-badge" data-tooltip="Khối lượng giao dịch & tỷ lệ so với trung bình 10 ngày">Vol: <strong>${volStr}</strong>${ratioStr ? `<span class="vol-ratio">${ratioStr}</span>` : ''}</span>
          </div>
        </div>

        <!-- Row 2.5: Probability Assessment Bar (Pine Script V5.5 Engine) -->
        ${prob ? `
        <div class="prob-wrapper" style="margin: 6px 0 8px; background:rgba(0,0,0,0.2); padding:6px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.06);" data-tooltip="Bảng dự báo xác suất xu hướng (SMC V5.5 Engine)">
          <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:3px;">
            <span>Dự báo: <strong style="color:${prob.dirColor}; font-weight:bold;">${prob.direction}</strong></span>
            <span style="color:var(--text-muted);">Độ tin cậy: <strong style="color:#fff;">${prob.strength}</strong></span>
          </div>
          <div style="display:flex; height:6px; border-radius:3px; overflow:hidden; background:#334155;">
            <div style="width:${prob.bullProb}%; background:linear-gradient(90deg, #059669, #10b981); transition:width 0.3s;"></div>
            <div style="width:${prob.bearProb}%; background:linear-gradient(90deg, #ef4444, #dc2626); transition:width 0.3s;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:9px; color:var(--text-muted); margin-top:2px;">
            <span style="color:#34d399;">Tăng ${prob.bullProb}%</span>
            <span style="color:#f87171;">Giảm ${prob.bearProb}%</span>
          </div>
        </div>` : ''}

        <!-- Row 3: Holding Expectations & Breakout Projections -->
        ${res._winRate ? `
        <div class="scanner-row scanner-strategy-row">
          <span class="strategy-badge" data-tooltip="Xác suất thắng dự kiến">🎯 Win Rate: <strong style="color:var(--profit);">${res._winRate}%</strong></span>
          <span class="strategy-badge" data-tooltip="Thời gian nắm giữ kỳ vọng">📅 Kỳ vọng: <strong>${res._sessions}</strong></span>
          ${res._breakoutDist !== undefined ? `
          <span class="strategy-badge" data-tooltip="Khoảng cách tới kháng cự / điểm breakout">📊 Breakout: <strong style="color:${res._breakingOut ? 'var(--profit)' : res._nearResistance ? '#f1c40f' : 'var(--text-muted)'};">${res._breakoutDist}%</strong></span>
          ` : ''}
        </div>` : ''}

        <!-- Row 4: Detailed Rating Explanation -->
        ${res._gradeLabel ? `
        <div class="scanner-desc-box" style="border-left-color: ${gradeColor(res._grade)}">
          <strong>${res._grade}:</strong> ${res._gradeLabel}
        </div>` : ''}

        <!-- AI Plan section (Only for AI advisor list) -->
        ${isAIList ? `
        <div class="ai-reason" style="margin-top: 8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span>🤖 <strong>AI Phân Tích:</strong></span>
            ${res.aiScore ? `<span style="background:${res.aiScore >= 8 ? 'var(--profit)' : 'var(--warning, #f1c40f)'}; color:white; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:bold;">Độ an toàn: ${res.aiScore}/10</span>` : ''}
          </div>
          <div style="font-size:11px; margin-bottom:8px; line-height:1.4; color:var(--text-primary); opacity:0.9;">
            ${parseMarkdown(res.aiReason || '')}
          </div>

          <!-- Bảng kế hoạch giao dịch chi tiết -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; background:rgba(255,255,255,0.02); padding:8px; border-radius:6px; border:1px solid var(--border);">
            <div style="font-size:10px; background:rgba(255,255,255,0.03); padding:4px 6px; border-radius:4px; border-top:2px solid var(--accent-blue);">📥 Vào: <strong style="color:var(--text-primary);">${res.aiEntry || 'N/A'}</strong></div>
            <div style="font-size:10px; background:rgba(255,255,255,0.03); padding:4px 6px; border-radius:4px; border-top:2px solid var(--warning, #f1c40f);">⏳ Giữ: <strong style="color:var(--warning, #f1c40f);">${res.aiDuration || 0} ${isCrypto ? 'ngày' : 'phiên'}</strong></div>
            <div style="font-size:10px; background:rgba(255,255,255,0.03); padding:4px 6px; border-radius:4px; border-top:2px solid var(--profit);">🎯 Target: <strong style="color:var(--profit);">${res.aiTarget || 'N/A'}</strong></div>
            <div style="font-size:10px; background:rgba(255,255,255,0.03); padding:4px 6px; border-radius:4px; border-top:2px solid var(--loss);">🛡️ Cắt lỗ: <strong style="color:var(--loss);">${res.aiStoploss || 'N/A'}</strong></div>
            <div style="font-size:10px; grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.05); padding-top:4px; margin-top:2px; display:flex; justify-content:space-between; align-items:center;">
              <span>🔥 Xác suất thắng: <strong style="color:#00e676;">${res.aiWinRate || 0}%</strong></span>
              ${res.aiRR ? `<span style="background:${res.aiRR >= 2 ? 'var(--profit)' : (res.aiRR >= 1.5 ? 'var(--warning, #f1c40f)' : 'var(--loss)')}; color:white; padding:2px 6px; border-radius:4px; font-weight:bold; font-size:9px;">R:R = 1:${res.aiRR}</span>` : ''}
            </div>
          </div>

          <!-- Position Sizing Suggestion Box -->
          ${posSize && posSize.units > 0 ? `
          <div style="margin-top:6px; background:rgba(33,150,243,0.08); border:1px dashed var(--accent-blue); padding:6px 8px; border-radius:6px; font-size:10px; display:flex; justify-content:space-between; align-items:center;">
            <span>🛡️ Khối lượng đi lệnh tối ưu: <strong style="color:var(--accent-blue); font-size:11px;">${posSize.units.toLocaleString()} ${isCrypto ? 'Coin' : 'CP'}</strong></span>
            <span style="color:var(--text-muted);">(Rủi ro: ${posSize.riskAmount.toLocaleString()} ${isCrypto ? 'USDT' : 'đ'})</span>
          </div>` : ''}
        </div>
        ` : ''}
      </div>
    `;
  }).join("");

  container.innerHTML = html;
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
      
      if (msg.role === "assistant" || msg.role === "system") {
        formattedText = parseMarkdown(msg.text);
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
            Đã xóa lịch sử trò chuyện. Bạn có thể tra cứu tự do (VD: "HPG thế nào?") hoặc sử dụng lệnh:<br/>
            - <code>/analyze FPT</code>: Phân tích sâu kỹ thuật/cơ bản<br/>
            - <code>/dca HPG</code>: Lập kế hoạch gom giá<br/>
            - <code>/price TCB</code>: Báo giá nhanh
          </div>
        `;
      }
    });
  }
  
  const suggestionsBox = root.querySelector("#chat-suggestions");
  const availableCommands = [
    { cmd: "/analyze", desc: "Phân tích sâu kĩ thuật & cơ bản cổ phiếu" },
    { cmd: "/predict", desc: "Dự đoán xu hướng phát triển & tỷ lệ chuẩn xác %" },
    { cmd: "/scenarios", desc: "Xây dựng kịch bản giao dịch (Tốt/Xấu/Đi ngang) %" },
    { cmd: "/dca", desc: "Lập kế hoạch gom tích lũy / trung bình giá" },
    { cmd: "/price", desc: "Xem nhanh báo giá và xu hướng chỉ báo" }
  ];

  let selectedIndex = 0;

  function renderSuggestions(filterText) {
    if (!suggestionsBox) return;
    const filter = filterText.toLowerCase();
    const matched = availableCommands.filter(c => c.cmd.startsWith(filter));
    
    if (matched.length === 0) {
      suggestionsBox.style.display = "none";
      selectedIndex = -1;
      return;
    }

    // Reset selectedIndex if it goes out of range
    if (selectedIndex >= matched.length || selectedIndex < 0) {
      selectedIndex = 0;
    }

    suggestionsBox.innerHTML = matched.map((c, idx) => `
      <div class="suggestion-item ${idx === selectedIndex ? 'selected' : ''}" data-cmd="${c.cmd}" data-index="${idx}">
        <span class="suggestion-cmd">${c.cmd}</span>
        <span class="suggestion-desc">${c.desc}</span>
      </div>
    `).join("");

    suggestionsBox.style.display = "flex";
  }

  function hideSuggestions() {
    if (suggestionsBox) {
      suggestionsBox.style.display = "none";
      selectedIndex = 0;
    }
  }

  function updateSelection(newIndex) {
    if (!suggestionsBox) return;
    const items = suggestionsBox.querySelectorAll(".suggestion-item");
    if (items.length === 0) return;

    if (newIndex < 0) newIndex = items.length - 1;
    if (newIndex >= items.length) newIndex = 0;

    selectedIndex = newIndex;

    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.classList.add("selected");
        item.scrollIntoView({ block: "nearest" });
      } else {
        item.classList.remove("selected");
      }
    });
  }

  if (suggestionsBox) {
    suggestionsBox.addEventListener("click", (e) => {
      const item = e.target.closest(".suggestion-item");
      if (!item) return;
      const cmd = item.dataset.cmd;
      inpChat.value = cmd + " ";
      btnSend.disabled = false;
      hideSuggestions();
      inpChat.focus();
    });
  }

  if (inpChat) {
    inpChat.addEventListener("input", () => {
      const val = inpChat.value;
      btnSend.disabled = val.trim() === "";
      
      if (val.startsWith("/")) {
        renderSuggestions(val.split(/\s+/)[0]);
      } else {
        hideSuggestions();
      }
    });
    inpChat.addEventListener("keydown", (e) => {
      const isVisible = suggestionsBox && suggestionsBox.style.display === "flex";
      
      if (isVisible) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          updateSelection(selectedIndex + 1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          updateSelection(selectedIndex - 1);
        } else if (e.key === "Tab" || e.key === "Enter") {
          e.preventDefault();
          const items = suggestionsBox.querySelectorAll(".suggestion-item");
          const selectedEl = items[selectedIndex];
          if (selectedEl) {
            const cmd = selectedEl.dataset.cmd;
            inpChat.value = cmd + " ";
            btnSend.disabled = false;
            hideSuggestions();
            inpChat.focus();
          }
        }
      } else {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          chatForm.dispatchEvent(new Event("submit"));
        }
      }
    });
  }
  
  if (chatForm) {
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideSuggestions();
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
        const formattedResp = parseMarkdown(responseText);
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
      
      // Load Position Sizing / Capital Management
      const inpBal = root.querySelector("#inp-account-balance");
      if (inpBal) inpBal.value = settings.accountBalance || 100000000;
      const inpRisk = root.querySelector("#inp-risk-percent");
      if (inpRisk) inpRisk.value = settings.riskPercent || 2.0;

      // Load Telegram settings
      root.querySelector("#inp-tg-token").value = settings.tgToken || "";
      root.querySelector("#inp-tg-chatid").value = settings.tgChatId || "";
      root.querySelector("#chk-tg-enabled").checked = !!settings.tgEnabled;

      // Load Lookback Periods slider
      const sliderEl = root.querySelector("#inp-lookback");
      const displayEl = root.querySelector("#lookback-display");
      if (sliderEl) {
        sliderEl.value = settings.lookbackPeriods || 20;
        if (displayEl) displayEl.textContent = `${sliderEl.value} phiên`;
        sliderEl.oninput = () => { if (displayEl) displayEl.textContent = `${sliderEl.value} phiên`; };
      }

      const msgEl = root.querySelector("#msg-api-key");
      if (msgEl) msgEl.innerHTML = `Lấy Key tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--accent-blue);">Google AI Studio</a> hoặc <a href="https://platform.openai.com/api-keys" target="_blank" style="color:var(--accent-blue);">OpenAI</a>`;
      toggleModal(root, "modal-settings", true);
    });
    
    bindModalClose(root, "modal-settings", "btn-close-modal-settings");

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

      // Save Position Sizing
      const inpBal = root.querySelector("#inp-account-balance");
      if (inpBal) settings.accountBalance = parseFloat(inpBal.value) || 100000000;
      const inpRisk = root.querySelector("#inp-risk-percent");
      if (inpRisk) settings.riskPercent = parseFloat(inpRisk.value) || 2.0;

      // Save Telegram settings
      settings.tgToken = root.querySelector("#inp-tg-token").value.trim();
      settings.tgChatId = root.querySelector("#inp-tg-chatid").value.trim();
      settings.tgEnabled = root.querySelector("#chk-tg-enabled").checked;

      // Save Lookback Periods
      const sliderEl = root.querySelector("#inp-lookback");
      if (sliderEl) settings.lookbackPeriods = parseInt(sliderEl.value) || 20;

      await onSaveSettings(settings);
      modalSettings.style.display = "none";
    });
  }
}

/** Render a single trade card HTML */
function renderTradeCard(trade, priceData) {
  const isProfit = (trade.type === "BUY" ? (priceData.close >= trade.entryPrice) : (priceData.close <= trade.entryPrice));
  const { pnl, pct } = calculatePnL(trade, priceData.close);
  
  const pnlClass = pnl >= 0 ? "profit" : "loss";
  const typeClass = trade.type === "BUY" ? "badge-buy" : "badge-sell";
  const changeClass = priceData.change >= 0 ? "profit" : "loss";

  let trendIndicator = "";
  if (priceData.ema200 && priceData.close) {
    if (priceData.close > priceData.ema200) trendIndicator = "<span style='color:var(--profit);font-size:10px;margin-left:4px;' data-tooltip='Trend Tăng'>▲</span>";
    else if (priceData.close < priceData.ema200) trendIndicator = "<span style='color:var(--loss);font-size:10px;margin-left:4px;' data-tooltip='Trend Giảm'>▼</span>";
  }

  const safeSymbol = escapeHTML(trade.symbol);
  const safeNote = trade.note ? escapeHTML(trade.note) : "";
  const noteHtml = safeNote ? `<div class="trade-note">💬 ${safeNote}</div>` : "";

  return `
    <div class="trade-header">
      <span class="trade-symbol">${safeSymbol}${trendIndicator} <span class="btn-info" data-id="${trade.id}" style="cursor:pointer;font-size:12px;margin-left:4px;filter:grayscale(100%);" data-tooltip="Xem phân tích kỹ thuật">ℹ️</span></span>
      <span class="badge ${typeClass}">${trade.type}</span>
      <span class="trade-qty">×${fmt(parseFloat(trade.quantity))}</span>
    </div>
    <div class="trade-prices">
      <span class="price-item">Entry <strong>${fmtDisplay(trade.entryPrice, trade.symbol)}</strong></span>
      <span class="price-item">Current <strong>${fmtDisplay(priceData.close, trade.symbol)}</strong> <span class="${changeClass}">(${fmtSigned(priceData.change)}%)</span></span>
      <span class="price-item">SL <strong>${fmtDisplay(trade.stopLoss, trade.symbol)}</strong></span>
      <span class="price-item">TP <strong>${fmtDisplay(trade.takeProfit, trade.symbol)}</strong></span>
    </div>
    ${noteHtml}
    <div class="trade-footer">
      <div class="pnl ${pnlClass}">
        ${fmtSigned(pnl / 1000)} <span class="pnl-pct">(${fmtSigned(pct)}%)</span>
      </div>
      <div class="trade-actions">
        <button class="btn btn-view" data-symbol="${safeSymbol}" data-tooltip="Xem biểu đồ TradingView">📈 View</button>
        <button class="btn btn-close-trade" data-id="${trade.id}" style="background:#089981; color:white;" data-tooltip="Chốt Lời & Cấn Trừ Hạ Giá Vốn">💰 Chốt</button>
        <button class="btn btn-dca" data-id="${trade.id}" style="background:#5264b3; color:white;" data-tooltip="DCA / Gỡ Lỗ">🧮 DCA</button>
        <button class="btn btn-edit"   data-id="${trade.id}" style="background:var(--bg-input); color:var(--text-primary); padding: 4px 6px;" data-tooltip="Sửa vị thế">✏️</button>
        <button class="btn btn-delete" data-id="${trade.id}" style="background:var(--btn-del); color:white; padding: 4px 6px;" data-tooltip="Xóa vị thế">🗑</button>
      </div>
    </div>`;
}

/**
 * Render Sector Health & Concentration Allocation Bar into #portfolio-sector-health.
 */
export function renderSectorAllocation(portfolio, priceMap = {}, root = document) {
  const container = root.querySelector("#portfolio-sector-health");
  if (!container) return;

  if (!portfolio || portfolio.length === 0) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  const alloc = calculateSectorAllocation(portfolio, priceMap);
  if (!alloc || alloc.sectors.length === 0) {
    container.style.display = "none";
    return;
  }

  const barSegments = alloc.sectors.map(s => `
    <div style="width:${s.percent}%; background:${s.color}; height:100%;" data-tooltip="${s.name}: ${s.percent}%"></div>
  `).join("");

  const chips = alloc.sectors.slice(0, 4).map(s => `
    <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.04); border:1px solid ${s.color}; color:var(--text-primary); display:inline-flex; align-items:center; gap:4px;">
      <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${s.color};"></span>
      ${s.name}: <strong>${s.percent}%</strong>
    </span>
  `).join("");

  const warningHtml = alloc.isConcentrated ? `
    <div style="margin-top:6px; font-size:10px; color:#f59e0b; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); padding:4px 8px; border-radius:4px; line-height:1.3;">
      ${alloc.warningMessage}
    </div>
  ` : "";

  container.innerHTML = `
    <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:8px 10px; box-shadow:var(--shadow);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <span style="font-size:11px; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px;">📊 Phân Bổ Ngành & Rủi Ro</span>
        <span style="font-size:10px; color:var(--text-muted);">${alloc.sectors.length} nhóm ngành</span>
      </div>
      <div style="display:flex; height:6px; border-radius:3px; overflow:hidden; background:rgba(255,255,255,0.05); margin-bottom:6px;">
        ${barSegments}
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:4px;">
        ${chips}
      </div>
      ${warningHtml}
    </div>
  `;
  container.style.display = "block";
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

  // Render Sector Health & Concentration Bar
  renderSectorAllocation(portfolio, priceMap, root);

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
    const priceData = priceMap[trade.symbol] || {
      close: trade.entryPrice,
      change: 0,
      change_abs: 0,
    };
    
    let card = container.querySelector(`.trade-card[data-id="${trade.id}"]`);
    if (!card) {
      card = document.createElement("div");
      card.className = "trade-card";
      card.dataset.id = trade.id;
      container.appendChild(card);
    }
    card.innerHTML = renderTradeCard(trade, priceData);
  });

  updateSummaryBar(portfolio, priceMap, root);

  // ── Event Delegation for Portfolio Actions ──
  if (!container.dataset.bound) {
    container.addEventListener("click", async (e) => {
      const btn = e.target.closest(".btn");
      if (!btn) {
        // Handle info icon specifically
        const infoBtn = e.target.closest(".btn-info");
        if (infoBtn) {
          const id = infoBtn.dataset.id;
          const trade = (await import("./storage.js").then(m => m.getPortfolio())).find(t => t.id === id);
          if (!trade) return;
          const prices = priceMap[trade.symbol] || { close: trade.entryPrice, change: 0 };
          const analysisHtml = getAnalysisHTML(trade.symbol, prices, trade.type);
          const typeClass = trade.type === "BUY" ? "badge-buy" : "badge-sell";
          root.querySelector("#modal-title").innerHTML = `Phân Tích <strong>${trade.symbol}</strong> <span class="badge ${typeClass}" style="margin-left:8px;font-size:10px;">${trade.type}</span>`;
          root.querySelector("#modal-body").innerHTML = analysisHtml;
          toggleModal(root, "modal-analysis", true);
        }
        return;
      }

      const id = btn.dataset.id;
      const symbol = btn.dataset.symbol;

      if (btn.classList.contains("btn-view")) {
        chrome.tabs.update({ url: `https://www.tradingview.com/chart/?symbol=${symbol}` });
      } else if (btn.classList.contains("btn-edit")) {
        if (onEdit) onEdit(id);
      } else if (btn.classList.contains("btn-delete")) {
        if (confirm(`Delete this trade?`)) await onDelete(id);
      } else if (btn.classList.contains("btn-dca")) {
        const trade = (await import("./storage.js").then(m => m.getPortfolio())).find(t => t.id === id);
        if (!trade) return;
        const priceData = priceMap[trade.symbol] || { close: trade.entryPrice };
        const divisor = getDivisor(trade.symbol);
        currentDCATrade = trade;
        currentDCAPrice = priceData.close;
        const typeClass = trade.type === "BUY" ? "badge-buy" : "badge-sell";
        root.querySelector("#dca-title").innerHTML = `🧮 Gỡ Lỗ / DCA: <strong>${trade.symbol}</strong> <span class="badge ${typeClass}" style="margin-left:8px;font-size:10px;">${trade.type}</span>`;
        root.querySelector("#dca-qty").textContent = fmt(trade.quantity);
        root.querySelector("#dca-entry").textContent = fmtDisplay(trade.entryPrice, trade.symbol);
        root.querySelector("#dca-current").textContent = fmtDisplay(currentDCAPrice, trade.symbol);
        renderDCATechnicalAdvice(root, trade, priceData);
        const aiResponse = root.querySelector("#ai-dca-response");
        if (aiResponse) { aiResponse.style.display = "none"; aiResponse.innerHTML = ""; }
        root.querySelector("#inp-dca-qty").value = "";
        root.querySelector("#dca-result").innerHTML = "Hãy nhập số lượng mua/bán thêm để xem kịch bản hòa vốn.";
        toggleModal(root, "modal-dca", true);
      } else if (btn.classList.contains("btn-close-trade")) {
        const trade = (await import("./storage.js").then(m => m.getPortfolio())).find(t => t.id === id);
        if (!trade) return;
        const priceData = priceMap[trade.symbol] || { close: trade.entryPrice };
        const divisor = getDivisor(trade.symbol);
        currentCloseTradeId = id;
        root.querySelector("#close-sym").textContent = `${trade.symbol} (${trade.type})`;
        const inpQty = root.querySelector("#inp-close-qty");
        const inpPrice = root.querySelector("#inp-close-price");
        const pnlEl = root.querySelector("#close-pnl");
        inpQty.value = parseFloat(trade.quantity);
        inpPrice.value = parseFloat(priceData.close) / divisor;
        const updateDynamicPnl = () => {
          const q = parseFloat(inpQty.value) || 0;
          const p = parseFloat(inpPrice.value) || 0;
          const exitFullPrice = p * divisor;
          const entryFullPrice = parseFloat(trade.entryPrice);
          let pnl = trade.type === "BUY" ? (exitFullPrice - entryFullPrice) * q : (entryFullPrice - exitFullPrice) * q;
          currentRealizedPnl = pnl;
          pnlEl.textContent = fmtSigned(pnl / 1000);
          pnlEl.style.color = pnl >= 0 ? "var(--profit)" : "var(--loss)";
        };
        inpQty.oninput = updateDynamicPnl;
        inpPrice.oninput = updateDynamicPnl;
        updateDynamicPnl();
        const selTarget = root.querySelector("#sel-merge-target");
        selTarget.innerHTML = '<option value="">-- Chỉ xóa lệnh (Giữ nguyên các mã khác) --</option>';
        (await import("./storage.js").then(m => m.getPortfolio())).forEach(t => {
          if (t.id !== id && t.symbol === trade.symbol) {
            const opt = document.createElement("option");
            opt.value = t.id;
            opt.textContent = `Gộp vào: ${t.symbol} (SL: ${fmt(t.quantity)} @ ${fmtDisplay(t.entryPrice, t.symbol)})`;
            selTarget.appendChild(opt);
          }
        });
        toggleModal(root, "modal-close", true);
      }
    });
    container.dataset.bound = "true";
  }
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
    const { pnl } = calculatePnL(trade, data.close);
    
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

export function renderDCATechnicalAdvice(root, trade, priceData) {
  const container = root.querySelector("#dca-tech-advice");
  if (!container) return;

  if (!priceData || !priceData.close) {
    container.style.display = "none";
    return;
  }

  const divisor = getDivisor(trade.symbol);
  const curPrice = priceData.close / divisor;
  const bbLower = (priceData.bb_lower || 0) / divisor;
  const ema200 = (priceData.ema200 || 0) / divisor;
  const rsi = Math.round(priceData.rsi || 0);
  const isBuy = trade.type === "BUY";

  let html = `<strong>💡 Cố vấn Kỹ thuật (TradingView)</strong><br/>`;
  if (isBuy) {
    html += `- Hỗ trợ BB Lower: <strong>${bbLower ? bbLower.toFixed(2) : "N/A"}</strong><br/>`;
    html += `- Hỗ trợ EMA200: <strong>${ema200 ? ema200.toFixed(2) : "N/A"}</strong><br/>`;
    html += `- Chỉ số RSI: <strong>${rsi}</strong> (${rsi <= 30 ? '<span style="color:var(--profit); font-weight:bold;">QUÁ BÁN</span>' : 'Bình thường'})<br/>`;

    // Đánh giá vùng DCA
    if (priceData.bb_lower && priceData.close <= priceData.bb_lower) {
      html += `<div style="margin-top:6px; color:var(--profit); font-weight:500;">➔ Giá đã chạm/phá dưới dải dưới Bollinger Bands. Vùng DCA rất tốt!</div>`;
    } else if (priceData.bb_lower && priceData.close > priceData.bb_lower) {
      html += `<div style="margin-top:6px; color:var(--text-muted);">➔ Giá đang nằm trên dải dưới BB. Hãy cân nhắc gom thêm khi giá sát vùng hỗ trợ <strong>${bbLower.toFixed(2)}</strong>.</div>`;
    }
  } else {
    // For SELL positions
    const bbUpper = (priceData.bb_upper || 0) / divisor;
    html += `- Kháng cự BB Upper: <strong>${bbUpper ? bbUpper.toFixed(2) : "N/A"}</strong><br/>`;
    html += `- Kháng cự EMA200: <strong>${ema200 ? ema200.toFixed(2) : "N/A"}</strong><br/>`;
    html += `- Chỉ số RSI: <strong>${rsi}</strong> (${rsi >= 70 ? '<span style="color:var(--loss); font-weight:bold;">QUÁ MUA</span>' : 'Bình thường'})<br/>`;

    // Đánh giá vùng DCA
    if (priceData.bb_upper && priceData.close >= priceData.bb_upper) {
      html += `<div style="margin-top:6px; color:var(--profit); font-weight:500;">➔ Giá đã chạm/phá trên dải trên Bollinger Bands. Vùng DCA bán khống rất tốt!</div>`;
    } else if (priceData.bb_upper && priceData.close < priceData.bb_upper) {
      html += `<div style="margin-top:6px; color:var(--text-muted);">➔ Giá đang dưới dải trên BB. Cân nhắc chờ hồi sát kháng cự <strong>${bbUpper.toFixed(2)}</strong> trước khi bán thêm.</div>`;
    }
  }

  container.innerHTML = html;
  container.style.display = "block";
}

export function calculateFormPositionSize(root = document) {
  const symIn = root.querySelector("#inp-symbol");
  const riskIn = root.querySelector("#inp-risk-amt");
  const entryIn = root.querySelector("#inp-entry");
  const slIn = root.querySelector("#inp-sl");
  const qtyIn = root.querySelector("#inp-qty");

  if (!symIn || !riskIn || !entryIn || !slIn || !qtyIn) return;

  const symbol = symIn.value.trim().toUpperCase();
  const riskAmt = parseFloat(riskIn.value) || 0;
  const entry = parseFloat(entryIn.value) || 0;
  const sl = parseFloat(slIn.value) || 0;

  // Cập nhật nhãn đơn vị tiền tệ tự động
  const lblUnit = root.querySelector("#lbl-risk-unit");
  if (lblUnit) {
    const isVN = symbol.startsWith("HOSE:") || symbol.startsWith("HNX:") || symbol.startsWith("UPCOM:") || (symbol.length === 3 && !symbol.includes(":"));
    lblUnit.textContent = isVN ? "VND" : "USD";
  }

  if (riskAmt <= 0 || entry <= 0 || sl <= 0 || entry === sl) {
    return; // Không đủ thông tin tính toán
  }

  const divisor = getDivisor(symbol);
  const diff = Math.abs(entry - sl);

  // Qty = Risk / (Diff * Divisor)
  let qty = riskAmt / (diff * divisor);

  // Nếu là VN (divisor == 1000 hoặc lô 100), làm tròn xuống lô 100
  if (divisor === 1000) {
    qty = Math.floor(qty / 100) * 100;
    if (qty < 100) qty = 100; // Tối thiểu 100 cổ phiếu tại VN
  } else {
    qty = Math.round(qty);
    if (qty < 1) qty = 1;
  }

  qtyIn.value = qty;
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
    bindModalClose(root, "modal-close", "btn-close-modal-close");
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
    bindModalClose(root, "modal-analysis", "btn-close-modal");
  }

  const modalDCA = root.querySelector("#modal-dca");
  const btnCloseDCA = root.querySelector("#btn-close-dca");
  const inpDCA = root.querySelector("#inp-dca-qty");

  if (modalDCA && btnCloseDCA) {
    bindModalClose(root, "modal-dca", "btn-close-dca");
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

  // Lắng nghe thay đổi để tự động tính toán khối lượng vị thế (Position Sizing)
  const riskIn = root.querySelector("#inp-risk-amt");
  const entryIn = root.querySelector("#inp-entry");
  const slIn = root.querySelector("#inp-sl");

  const handleCalc = () => calculateFormPositionSize(root);
  symIn.addEventListener("input", handleCalc);
  if (riskIn) riskIn.addEventListener("input", handleCalc);
  entryIn.addEventListener("input", handleCalc);
  slIn.addEventListener("input", handleCalc);
  typeSelect.addEventListener("change", handleCalc);

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
  root.querySelector("#inp-risk-amt").value = "";
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
    const typeClass = record.type.includes("BUY") ? "badge-buy" : "badge-sell";
    
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

export function bindDeepResearchEvents(onResearch, root = document) {
  const btn = root.querySelector("#btn-deep-research");
  const inp = root.querySelector("#inp-deep-symbol");
  
  if (btn && inp) {
    btn.addEventListener("click", async () => {
      const symbol = inp.value.trim().toUpperCase();
      if (!symbol) return;
      btn.disabled = true;
      btn.textContent = "Đang Phân Tích...";
      try {
        await onResearch(symbol);
      } finally {
        btn.disabled = false;
        btn.textContent = "Phân Tích";
      }
    });
    
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") btn.click();
    });
  }
}

export function renderDeepResearch(data, root = document) {
  const container = root.querySelector("#deep-research-content");
  if (!container) return;

  if (!data || data.error) {
    container.innerHTML = `<div class="empty-state" style="color:var(--loss);">❌ Lỗi: ${data?.error || "Không thể phân tích mã này."}</div>`;
    return;
  }

  const badgeColor = data.score >= 7 ? "var(--profit)" : data.score >= 5 ? "var(--warning, #f1c40f)" : "var(--loss)";
  const renderList = (arr) => {
    if (!arr || !arr.length) return "<li>Không có dữ liệu</li>";
    return arr.map(item => `<li>${item}</li>`).join("");
  };

  container.innerHTML = `
    <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:8px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:12px;">
        <h2 style="margin:0; font-size:18px; color:var(--text-primary);">${data.symbol} <span style="background:${badgeColor}; color:white; font-size:12px; padding:2px 8px; border-radius:12px; vertical-align:middle; margin-left:8px;">Score: ${data.score}/10</span></h2>
        <span style="font-weight:bold; color:${data.action === 'MUA' ? 'var(--profit)' : data.action === 'BÁN' ? 'var(--loss)' : 'var(--warning, #f1c40f)'}; font-size:14px; border:1px solid currentColor; padding:4px 12px; border-radius:4px;">${data.action}</span>
      </div>
      
      <p style="font-size:13px; line-height:1.5; color:var(--text-primary); margin-bottom:16px;"><strong>Tóm tắt:</strong> ${data.summary}</p>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
        <div style="background:rgba(0,0,0,0.1); padding:12px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
          <h3 style="margin-top:0; font-size:13px; color:var(--accent-blue);">📊 Phân tích Kỹ thuật</h3>
          <p style="font-size:12px; line-height:1.4; color:var(--text-muted);">${data.technical}</p>
        </div>
        <div style="background:rgba(0,0,0,0.1); padding:12px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
          <h3 style="margin-top:0; font-size:13px; color:var(--profit);">🏦 Phân tích Cơ bản</h3>
          <p style="font-size:12px; line-height:1.4; color:var(--text-muted);">${data.fundamental}</p>
        </div>
      </div>
      
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; font-size:12px; background:rgba(255,255,255,0.02); padding:12px; border-radius:6px;">
        <div>
          <h4 style="color:var(--profit); margin-bottom:4px; margin-top:0;">💪 Điểm mạnh (Strengths)</h4>
          <ul style="color:var(--text-muted); padding-left:16px; margin-top:0;">${renderList(data.swot?.strengths)}</ul>
          <h4 style="color:var(--accent-blue); margin-bottom:4px; margin-top:12px;">🌟 Cơ hội (Opportunities)</h4>
          <ul style="color:var(--text-muted); padding-left:16px; margin-top:0;">${renderList(data.swot?.opportunities)}</ul>
        </div>
        <div>
          <h4 style="color:var(--loss); margin-bottom:4px; margin-top:0;">📉 Điểm yếu (Weaknesses)</h4>
          <ul style="color:var(--text-muted); padding-left:16px; margin-top:0;">${renderList(data.swot?.weaknesses)}</ul>
          <h4 style="color:var(--warning, #f1c40f); margin-bottom:4px; margin-top:12px;">⚠️ Rủi ro (Threats)</h4>
          <ul style="color:var(--text-muted); padding-left:16px; margin-top:0;">${renderList(data.swot?.threats)}</ul>
        </div>
      </div>
      
      ${data.trading_plan ? `
      <div style="margin-top:16px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:6px;">
        <h3 style="margin:0 0 12px 0; font-size:14px; color:var(--text-primary);">🎯 Kế hoạch Giao dịch</h3>
        <div style="display:flex; justify-content:space-between; text-align:center; gap:8px;">
          <div style="flex:1; background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; border-top:3px solid var(--accent-blue);">
            <div style="font-size:10px; color:var(--text-muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.3px;">Giá Vào (Entry)</div>
            <div class="price-zone-indicator price-zone-entry" style="display:block; text-align:center; padding:4px 2px;">${data.trading_plan.entry || "-"}</div>
          </div>
          <div style="flex:1; background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; border-top:3px solid var(--profit);">
            <div style="font-size:10px; color:var(--text-muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.3px;">Mục Tiêu (Target)</div>
            <div class="price-zone-indicator price-zone-target" style="display:block; text-align:center; padding:4px 2px;">${data.trading_plan.target || "-"}</div>
          </div>
          <div style="flex:1; background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; border-top:3px solid var(--loss);">
            <div style="font-size:10px; color:var(--text-muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.3px;">Cắt Lỗ (Stoploss)</div>
            <div class="price-zone-indicator price-zone-stoploss" style="display:block; text-align:center; padding:4px 2px;">${data.trading_plan.stoploss || "-"}</div>
          </div>
        </div>
      </div>
      ` : ""}
    </div>
  `;
}

// ── Phase 2: Caught Signals UI ──

export function renderCaughtSignals(signals, root = document) {
  const container = root.querySelector("#caught-signals-list");
  if (!container) return;

  if (!signals || signals.length === 0) {
    container.innerHTML = `<div class="empty-state">Đang chờ tín hiệu từ TradingView...</div>`;
    return;
  }

  container.innerHTML = signals.map((sig, idx) => {
    const timeStr = sig.timestamp ? new Date(sig.timestamp).toLocaleTimeString() : "";
    const isBuy = sig.action === "BUY";
    const typeClass = isBuy ? "badge-buy" : "badge-sell";
    const actionText = isBuy ? "MUA" : "BÁN";
    const symbol = sig.symbol || "UNKNOWN";
    
    // Tính toán Risk/Reward đơn giản
    const risk = Math.abs(sig.price - (sig.sl || sig.price));
    const reward = Math.abs((sig.tp1 || sig.price) - sig.price);
    const rr = risk > 0 ? (reward / risk).toFixed(1) : "N/A";
    const scoreStars = sig.score ? "⭐".repeat(Math.round(sig.score)) : "";

    return `
      <div class="scanner-card" style="border-left: 3px solid ${isBuy ? 'var(--profit)' : 'var(--loss)'}; padding: 12px; margin-bottom: 8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge ${typeClass}">${actionText}</span>
            <strong style="font-size:14px;">${symbol}</strong>
            <span style="font-size:10px; color:var(--text-muted);">${timeStr}</span>
          </div>
          <div style="font-size:10px;">${scoreStars}</div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px; margin-bottom:8px; background:rgba(255,255,255,0.02); padding:8px; border-radius:4px;">
          <div><span style="color:var(--text-muted);">Giá báo:</span> <strong style="font-size:12px;">${fmt(sig.price)}</strong></div>
          <div><span style="color:var(--text-muted);">Vị thế (Size):</span> <strong>${fmt(sig.size || 0)}</strong></div>
          <div><span style="color:var(--text-muted);">Cắt lỗ (SL):</span> <strong style="color:var(--loss);">${sig.sl ? fmt(sig.sl) : 'N/A'}</strong></div>
          <div><span style="color:var(--text-muted);">Chốt lời (TP1):</span> <strong style="color:var(--profit);">${sig.tp1 ? fmt(sig.tp1) : 'N/A'}</strong></div>
        </div>
        
        <!-- Risk Calculator (Inline) -->
        <div style="background:var(--bg-input); padding:8px; border-radius:4px; margin-bottom:8px; border:1px solid var(--border);">
           <div style="font-size:10px; color:var(--text-muted); margin-bottom:4px;">Mô phỏng vốn rủi ro (Risk Calculator):</div>
           <div style="display:flex; gap:6px; align-items:center;">
             <input type="number" class="inp-sim-risk full-width" placeholder="VD: Rủi ro 500,000đ" style="padding:4px 8px; font-size:11px;" />
             <button class="btn btn-calc-risk" data-risk="${risk}" style="background:var(--bg-hover); color:var(--text-primary); padding:4px 8px; font-size:11px; white-space:nowrap;">Tính Khối Lượng</button>
           </div>
           <div class="res-calc-risk" style="font-size:11px; margin-top:6px; color:var(--profit); font-weight:bold; display:none;"></div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px;">
          <div style="font-size:10px;">
            <span style="color:var(--text-muted);">Tỷ lệ R:R = </span> <strong>1 : ${rr}</strong>
          </div>
          <button class="btn btn-add-signal" data-idx="${idx}" style="background:linear-gradient(90deg, #1A73E8, #8E24AA); color:white; padding:4px 12px; font-size:11px; border-radius:4px;">Nhập Danh Mục ➕</button>
        </div>
      </div>
    `;
  }).join("");
}

export function bindCaughtSignalEvents(getLatestSignals, onSaveToPortfolio, onClearSignals, root = document) {
  const container = root.querySelector("#caught-signals-list");
  if (container) {
    container.addEventListener("click", (e) => {
      // 1. Add to Portfolio
      const btnAdd = e.target.closest(".btn-add-signal");
      if (btnAdd) {
        const idx = btnAdd.dataset.idx;
        const sig = getLatestSignals()[idx];
        if (sig && onSaveToPortfolio) {
          onSaveToPortfolio(sig);
        }
        return;
      }
      
      // 2. Calculate Risk
      const btnCalc = e.target.closest(".btn-calc-risk");
      if (btnCalc) {
        const card = btnCalc.closest(".scanner-card");
        const inp = card.querySelector(".inp-sim-risk");
        const resDiv = card.querySelector(".res-calc-risk");
        const riskPerShare = parseFloat(btnCalc.dataset.risk);
        const totalRisk = parseFloat(inp.value);
        if (totalRisk > 0 && riskPerShare > 0) {
           const qty = Math.floor(totalRisk / riskPerShare);
           resDiv.innerHTML = `Khối lượng mua tối đa: <span style="font-size:13px;">${qty}</span> cổ phiếu.`;
           resDiv.style.display = "block";
        } else {
           resDiv.innerHTML = "Vui lòng nhập số tiền rủi ro hợp lệ (VD: 500000).";
           resDiv.style.display = "block";
        }
      }
    });
  }

  const btnClear = root.querySelector("#btn-clear-signals");
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (confirm("Xóa toàn bộ tín hiệu đã bắt?")) {
        if (onClearSignals) onClearSignals();
      }
    });
  }
}

/**
 * Bind the Side Panel toggle button in Header.
 */
export function bindSidePanelButton(root = document) {
  const btnSidePanel = root.querySelector("#btn-sidepanel");
  if (btnSidePanel) {
    btnSidePanel.addEventListener("click", async (e) => {
      e.preventDefault();
      if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.open) {
        try {
          const win = await chrome.windows.getCurrent();
          if (win && win.id) {
            await chrome.sidePanel.open({ windowId: win.id });
            setTimeout(() => window.close(), 150);
            return;
          }
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab && tab.id) {
            await chrome.sidePanel.open({ tabId: tab.id });
            setTimeout(() => window.close(), 150);
            return;
          }
        } catch (err) {
          console.warn("[TPP] sidePanel.open notice:", err);
          alert("💡 Cách mở Side Panel nhanh trên Chrome:\n1. Click chuột phải vào biểu tượng Extension Trading Portfolio Pro trên thanh công cụ Chrome.\n2. Chọn 'Mở bảng điều khiển bên' (Open side panel).\n\nThanh bên sẽ ghim cố định bên cạnh TradingView!");
        }
      } else {
        alert("💡 Cách mở Side Panel nhanh trên Chrome:\n1. Click chuột phải vào biểu tượng Extension Trading Portfolio Pro trên thanh công cụ Chrome.\n2. Chọn 'Mở bảng điều khiển bên' (Open side panel).\n\nThanh bên sẽ ghim cố định bên cạnh TradingView!");
      }
    });
  }
}


