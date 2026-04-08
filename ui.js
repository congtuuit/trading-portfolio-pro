/**
 * ui.js
 * Rendering and DOM event binding.
 */

import { fetchPricesMap } from "./price.js";
import { calculatePnL } from "./pnl.js";

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
  
  return `
    <strong style="color:${scoreColor}; font-size:12px;">🏆 Confluence Score: ${score}/4 ${stars}</strong><br/>
    <div style="margin-top:4px; line-height: 1.4;">${reasons.join("<br/>")}</div>
  `;
}

let currentEditId = null;
let currentDCATrade = null;
let currentDCAPrice = null;
let currentCloseTradeId = null;
let currentRealizedPnl = 0;
let handleRollover = null;
let lastAnalyzedSym = null;
let lastAnalyzedData = null;

export function bindRolloverEvents(cb) {
  handleRollover = cb;
}

export function bindAIEvents(onAskAI) {
  const btnAskAI = document.getElementById("btn-ask-ai");
  if (btnAskAI) {
    btnAskAI.addEventListener("click", () => {
      if (!lastAnalyzedSym || !lastAnalyzedData) return;
      onAskAI(lastAnalyzedSym, lastAnalyzedData, document.getElementById("inp-type").value);
    });
  }
}

export function bindAIDCA(onAskDCA) {
  const btnAIDCA = document.getElementById("btn-ai-dca");
  if (btnAIDCA) {
    btnAIDCA.addEventListener("click", () => {
      if (!currentDCATrade || !currentDCAPrice) return;
      onAskDCA(currentDCATrade, currentDCAPrice);
    });
  }
}

export function bindAIPortfolio(onAskPortfolio) {
  const btnAIPortfolio = document.getElementById("btn-ai-portfolio");
  if (btnAIPortfolio) {
    btnAIPortfolio.addEventListener("click", () => {
      onAskPortfolio();
    });
  }
}

export function openChatPanel() {
  document.getElementById("panel-chat").classList.add("open");
  const msgContainer = document.getElementById("chat-messages");
  msgContainer.scrollTop = msgContainer.scrollHeight;
}

export function closeChatPanel() {
  document.getElementById("panel-chat").classList.remove("open");
}

export function appendChatMessage(role, text, isHtml = false) {
  const container = document.getElementById("chat-messages");
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
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

export function removeTypingIndicator() {
  const typing = document.getElementById("chat-typing");
  if (typing) typing.remove();
}

export function bindChatEvents(onSendChat, onClearChat) {
  const btnFloating = document.getElementById("btn-floating-chat");
  const btnClose = document.getElementById("btn-chat-close");
  const btnClear = document.getElementById("btn-chat-clear");
  const chatForm = document.getElementById("chat-form");
  const inpChat = document.getElementById("inp-chat");
  const btnSend = document.getElementById("btn-chat-send");
  
  if (btnFloating) btnFloating.addEventListener("click", openChatPanel);
  if (btnClose) btnClose.addEventListener("click", closeChatPanel);
  
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      onClearChat();
      document.getElementById("chat-messages").innerHTML = `
        <div class="chat-msg ai-msg">
          Đã xóa lịch sử trò chuyện. Tôi có thể giúp gì cho bạn?
        </div>
      `;
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
      
      appendChatMessage("user", text);
      openChatPanel();
      
      appendChatMessage("system-typing", "");
      try {
        const responseText = await onSendChat(text);
        removeTypingIndicator();
        // Gán Regex cho formatted html bold
        const formattedResp = responseText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        appendChatMessage("assistant", formattedResp, true);
      } catch (err) {
        removeTypingIndicator();
        appendChatMessage("assistant", `❌ Lỗi: ${err.message}`, true);
      }
    });
  }
}

export function bindSettingsEvents(settings, onSaveSettings, onFetchModels) {
  const btnSettings = document.getElementById("btn-settings");
  const modalSettings = document.getElementById("modal-settings");
  const btnCloseSettings = document.getElementById("btn-close-modal-settings");
  const btnSaveSettings = document.getElementById("btn-save-settings");
  const btnFetchModels = document.getElementById("btn-fetch-models");
  
  if (btnSettings && modalSettings) {
    btnSettings.addEventListener("click", () => {
      document.getElementById("inp-ai-provider").value = settings.aiProvider || "gemini";
      document.getElementById("inp-ai-model").value = settings.aiModel || "";
      document.getElementById("inp-api-key").value = settings.apiKey || "";
      const msgEl = document.getElementById("msg-api-key");
      if (msgEl) msgEl.innerHTML = `Lấy Key tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--accent-blue);">Google AI Studio</a> hoặc <a href="https://platform.openai.com/api-keys" target="_blank" style="color:var(--accent-blue);">OpenAI</a>`;
      modalSettings.style.display = "flex";
    });
    
    btnCloseSettings.addEventListener("click", () => modalSettings.style.display = "none");
    modalSettings.addEventListener("click", (e) => {
      if (e.target === modalSettings) modalSettings.style.display = "none";
    });
    
    if (btnFetchModels && onFetchModels) {
      btnFetchModels.addEventListener("click", async (e) => {
        e.preventDefault();
        const provider = document.getElementById("inp-ai-provider").value;
        const key = document.getElementById("inp-api-key").value.trim();
        const msgEl = document.getElementById("msg-api-key");
        
        if (!key) {
          msgEl.innerHTML = `<span style="color:var(--loss);">Vui lòng nhập API Key trước khi Fetch.</span>`;
          return;
        }
        
        btnFetchModels.textContent = "⏳...";
        btnFetchModels.disabled = true;
        msgEl.innerHTML = `<span style="color:var(--text-muted);">Đang tải danh sách Models từ hệ thống...</span>`;
        
        try {
          const models = await onFetchModels(provider, key);
          const datalist = document.getElementById("ai-models-list");
          datalist.innerHTML = "";
          models.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m;
            datalist.appendChild(opt);
          });
          
          msgEl.innerHTML = `<span style="color:var(--profit);">Đã tải ${models.length} options thành công. Bấm xuống ô Tên Model để chọn.</span>`;
          
          const inpModel = document.getElementById("inp-ai-model");
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
      const provider = document.getElementById("inp-ai-provider").value;
      const model = document.getElementById("inp-ai-model").value.trim();
      const key = document.getElementById("inp-api-key").value.trim();
      settings.aiProvider = provider;
      settings.aiModel = model;
      settings.apiKey = key;
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
export function renderPortfolio(portfolio, onDelete, onEdit, priceMap = {}) {
  const container = document.getElementById("portfolio-list");

  // ── Empty state ──
  if (!portfolio || portfolio.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No trades yet.</p>
        <p class="empty-sub">Add your first position above.</p>
      </div>`;
    updateSummaryBar(0);
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
    const currentPrice = priceData.close / 1000;
    const { pnl, pct } = calculatePnL(trade, currentPrice);
    totalPnl += pnl;

    const isProfit = pnl >= 0;
    const pnlClass = isProfit ? "profit" : "loss";
    const typeClass = trade.type === "BUY" ? "badge-buy" : "badge-sell";

    const changePct = priceData.change;
    const changeClass = changePct >= 0 ? "profit" : "loss";

    let trendIndicator = "";
    if (priceData.ema200 && priceData.close) {
      if (priceData.close > priceData.ema200) trendIndicator = "<span style='color:var(--profit);font-size:10px;margin-left:4px;' title='Trend Tăng'>▲</span>";
      else if (priceData.close < priceData.ema200) trendIndicator = "<span style='color:var(--loss);font-size:10px;margin-left:4px;' title='Trend Giảm'>▼</span>";
    }

    const slText = trade.stopLoss ? fmt(trade.stopLoss) : "—";
    const tpText = trade.takeProfit ? fmt(trade.takeProfit) : "—";
    const noteText = trade.note
      ? `<div class="trade-note">💬 ${trade.note}</div>`
      : "";

    const html = `
      <div class="trade-header">
        <span class="trade-symbol">${trade.symbol}${trendIndicator} <span class="btn-info" data-id="${trade.id}" style="cursor:pointer;font-size:12px;margin-left:4px;filter:grayscale(100%);" title="Xem phân tích kỹ thuật">ℹ️</span></span>
        <span class="badge ${typeClass}">${trade.type}</span>
        <span class="trade-qty">×${fmt(parseFloat(trade.quantity))}</span>
      </div>
      <div class="trade-prices">
        <span class="price-item">Entry <strong>${fmt(parseFloat(trade.entryPrice))}</strong></span>
        <span class="price-item">Current <strong>${fmt(currentPrice)}</strong> <span class="${changeClass}">(${fmtSigned(changePct)}%)</span></span>
        <span class="price-item">SL <strong>${slText}</strong></span>
        <span class="price-item">TP <strong>${tpText}</strong></span>
      </div>
      ${noteText}
      <div class="trade-footer">
        <div class="pnl ${pnlClass}">
          ${fmtSigned(pnl)} <span class="pnl-pct">(${fmtSigned(pct)}%)</span>
        </div>
      <div class="trade-actions">
        <button class="btn btn-view" data-symbol="${trade.symbol}" title="View on TradingView">📈 View</button>
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

  updateSummaryBar(totalPnl);

  // Bind info buttons
  document.querySelectorAll(".btn-info").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const trade = portfolio.find(t => t.id === id);
      if (!trade) return;
      
      const priceData = priceMap[trade.symbol] || { close: trade.entryPrice, change:0, change_abs:0 };
      const analysisHtml = getAnalysisHTML(trade.symbol, priceData, trade.type);
      
      const typeClass = trade.type === "BUY" ? "badge-buy" : "badge-sell";
      document.getElementById("modal-title").innerHTML = `Phân Tích <strong>${trade.symbol}</strong> <span class="badge ${typeClass}" style="margin-left:8px;font-size:10px;">${trade.type}</span>`;
      document.getElementById("modal-body").innerHTML = analysisHtml;
      document.getElementById("modal-analysis").style.display = "flex";
    });
  });

  // Bind DCA buttons
  document.querySelectorAll(".btn-dca").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const trade = portfolio.find(t => t.id === id);
      if (!trade) return;
      
      const priceData = priceMap[trade.symbol] || { close: trade.entryPrice };
      let divisor = 1;
      if (trade.symbol.startsWith("HOSE:") || trade.symbol.startsWith("HNX:") || trade.symbol.startsWith("UPCOM:")) {
        divisor = 1000;
      }
      
      currentDCATrade = trade;
      currentDCAPrice = priceData.close / divisor;
      
      const typeClass = trade.type === "BUY" ? "badge-buy" : "badge-sell";
      document.getElementById("dca-title").innerHTML = `🧮 Gỡ Lỗ / DCA: <strong>${trade.symbol}</strong> <span class="badge ${typeClass}" style="margin-left:8px;font-size:10px;">${trade.type}</span>`;
      document.getElementById("dca-qty").textContent = fmt(trade.quantity);
      document.getElementById("dca-entry").textContent = fmt(trade.entryPrice);
      document.getElementById("dca-current").textContent = fmt(currentDCAPrice);
      
      const aiResponse = document.getElementById("ai-dca-response");
      if (aiResponse) {
        aiResponse.style.display = "none";
        aiResponse.innerHTML = "";
      }
      
      document.getElementById("inp-dca-qty").value = "";
      document.getElementById("dca-result").innerHTML = "Hãy nhập số lượng mua/bán thêm để xem kịch bản hòa vốn.";
      document.getElementById("modal-dca").style.display = "flex";
    });
  });

  // Bind Close / Rollover buttons
  document.querySelectorAll(".btn-close-trade").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      const trade = portfolio.find(t => t.id === id);
      if (!trade) return;
      
      const priceData = priceMap[trade.symbol] || { close: trade.entryPrice };
      let divisor = 1;
      if (trade.symbol.startsWith("HOSE:") || trade.symbol.startsWith("HNX:") || trade.symbol.startsWith("UPCOM:")) {
        divisor = 1000;
      }
      
      const currentPrice = priceData.close / divisor;
      const { pnl } = calculatePnL(trade, currentPrice);
      
      currentCloseTradeId = id;
      currentRealizedPnl = pnl;
      
      document.getElementById("close-sym").textContent = `${trade.symbol} (${trade.type})`;
      const pnlEl = document.getElementById("close-pnl");
      pnlEl.textContent = fmtSigned(pnl);
      pnlEl.style.color = pnl >= 0 ? "var(--profit)" : "var(--loss)";
      
      const selTarget = document.getElementById("sel-merge-target");
      selTarget.innerHTML = '<option value="">-- Chỉ xóa lệnh (Giữ nguyên các mã khác) --</option>';
      
      portfolio.forEach(t => {
        if (t.id !== id && t.symbol === trade.symbol) {
          const opt = document.createElement("option");
          opt.value = t.id;
          opt.textContent = `Gộp vào: ${t.symbol} (SL: ${fmt(t.quantity)} @ ${fmt(t.entryPrice)})`;
          selTarget.appendChild(opt);
        }
      });
      
      document.getElementById("modal-close").style.display = "flex";
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
 * Update the top summary bar with total PnL.
 * @param {number} totalPnl
 */
function updateSummaryBar(totalPnl) {
  const el = document.getElementById("total-pnl");
  if (!el) return;
  const isProfit = totalPnl >= 0;
  el.textContent = `Total PnL: ${fmtSigned(totalPnl)}`;
  el.className = "total-pnl " + (isProfit ? "profit" : "loss");
}

/**
 * Bind the add-trade form events.
 *
 * @param {Function} onSave - (tradeData) => Promise<void>
 */
export function bindFormEvents(onSave) {
  const form = document.getElementById("trade-form");
  const symIn = document.getElementById("inp-symbol");
  const btnCancel = document.getElementById("btn-cancel");
  const btnToggle = document.getElementById("btn-toggle-form");
  const formSection = document.getElementById("form-section");

  const btnAnalyze = document.getElementById("btn-analyze");
  const analysisCard = document.getElementById("analysis-card");
  const typeSelect = document.getElementById("inp-type");

  const modalClose = document.getElementById("modal-close");
  const btnCloseModalClose = document.getElementById("btn-close-modal-close");
  const btnConfirmClose = document.getElementById("btn-confirm-close");

  if (modalClose && btnCloseModalClose) {
    btnCloseModalClose.addEventListener("click", () => modalClose.style.display = "none");
    modalClose.addEventListener("click", (e) => {
      if (e.target === modalClose) modalClose.style.display = "none";
    });
  }

  if (btnConfirmClose) {
    btnConfirmClose.addEventListener("click", async () => {
      const targetId = document.getElementById("sel-merge-target").value;
      if (handleRollover && currentCloseTradeId) {
        btnConfirmClose.textContent = "⏳...";
        await handleRollover(currentCloseTradeId, targetId, currentRealizedPnl);
        btnConfirmClose.textContent = "Xác nhận Chốt & Cấn trừ";
      }
      modalClose.style.display = "none";
    });
  }

  const modalAnalysis = document.getElementById("modal-analysis");
  const btnCloseModal = document.getElementById("btn-close-modal");

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

  const modalDCA = document.getElementById("modal-dca");
  const btnCloseDCA = document.getElementById("btn-close-dca");
  const inpDCA = document.getElementById("inp-dca-qty");

  if (modalDCA && btnCloseDCA) {
    btnCloseDCA.addEventListener("click", () => modalDCA.style.display = "none");
    modalDCA.addEventListener("click", (e) => {
      if (e.target === modalDCA) modalDCA.style.display = "none";
    });
  }

  if (inpDCA) {
    inpDCA.addEventListener("input", (e) => {
      if (!currentDCATrade || !currentDCAPrice) return;
      
      const addQty = parseFloat(e.target.value) || 0;
      const currentQty = parseFloat(currentDCATrade.quantity);
      const entryPrice = parseFloat(currentDCATrade.entryPrice);
      const isBuy = currentDCATrade.type === "BUY";
      
      if (addQty <= 0) {
        document.getElementById("dca-result").innerHTML = "Hãy nhập số lượng mua/bán thêm để xem kịch bản hòa vốn.";
        return;
      }
      
      const totalValue = (currentQty * entryPrice) + (addQty * currentDCAPrice);
      const totalQty = currentQty + addQty;
      const newAvg = totalValue / totalQty;
      
      if (isBuy) {
        const bounceNeeded = ((newAvg - currentDCAPrice) / currentDCAPrice) * 100;
        const oldBounceNeeded = ((entryPrice - currentDCAPrice) / currentDCAPrice) * 100;
        
        document.getElementById("dca-result").innerHTML = `
          <strong>Giá Trung Bình Mới:</strong> <span style="font-size:14px;color:var(--text-primary);">${fmt(newAvg)}</span><br/>
          <div style="margin-top:8px;">Để hòa vốn, tổng danh mục cài mới cần tăng: <strong style="color:var(--profit);">+${fmt(bounceNeeded)}%</strong> <br/>
          <i style="color:var(--text-muted);font-size:11px;">(Thay vì +${fmt(oldBounceNeeded)}% như cũ)</i></div>
        `;
      } else {
        const dropNeeded = ((currentDCAPrice - newAvg) / currentDCAPrice) * 100;
        const oldDropNeeded = ((currentDCAPrice - entryPrice) / currentDCAPrice) * 100;
        
        document.getElementById("dca-result").innerHTML = `
          <strong>Giá Trung Bình Mới:</strong> <span style="font-size:14px;color:var(--text-primary);">${fmt(newAvg)}</span><br/>
          <div style="margin-top:8px;">Để hòa vốn, tổng danh mục cài mới cần sập: <strong style="color:var(--profit);">${fmtSigned(-dropNeeded)}%</strong> <br/>
          <i style="color:var(--text-muted);font-size:11px;">(Thay vì ${fmtSigned(-oldDropNeeded)}% như cũ)</i></div>
        `;
      }

      // T0 "Thay nước từ từ" strategy breakdown
      const chunkBounces = [5, 10, 15, 20]; // Percentages
      let t0Html = `<div style="margin-top:12px; padding-top:12px; border-top:1px dashed var(--border);">`;
      t0Html += `<strong style="font-size:12px; color:var(--text-primary);">🌊 Chiến lược "Thay nước" (Lướt lô nhỏ)</strong><br/>`;
      t0Html += `<div style="color:var(--text-muted); font-size:11px; margin-bottom:8px;">Kế hoạch chốt lời nhanh chỉ riêng phần <strong>${fmt(addQty)}</strong> units vừa gom:</div>`;

      chunkBounces.forEach(pct => {
         if (isBuy) {
           const targetPrice = currentDCAPrice * (1 + pct/100);
           const chunkProfit = addQty * (targetPrice - currentDCAPrice);
           t0Html += `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
             <span>Giá hồi <strong>+${pct}%</strong> (lên ${fmt(targetPrice)})</span>
             <span style="color:var(--profit);">Bỏ túi: +${fmt(chunkProfit)}</span>
           </div>`;
         } else {
           const targetPrice = currentDCAPrice * (1 - pct/100);
           const chunkProfit = addQty * (currentDCAPrice - targetPrice);
           t0Html += `<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;">
             <span>Giá sập <strong>-${pct}%</strong> (xuống ${fmt(targetPrice)})</span>
             <span style="color:var(--profit);">Bỏ túi: +${fmt(chunkProfit)}</span>
           </div>`;
         }
      });
      t0Html += `</div>`;

      document.getElementById("dca-result").innerHTML += t0Html;
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

        let divisor = 1;
        if (sym.startsWith("HOSE:") || sym.startsWith("HNX:") || sym.startsWith("UPCOM:")) {
          divisor = 1000;
        }

        const currentPrice = data.close / divisor;
        const atr = (data.atr || 0) / divisor;

        // Auto-fill entry price
        document.getElementById("inp-entry").value = currentPrice;

        // Auto-fill SL / TP based on ATR
        if (atr > 0) {
          const sl_atr_mult = 1.5;
          const rr_ratio = 2.0;
          if (typeSelect.value === "BUY") {
            const sl = currentPrice - atr * sl_atr_mult;
            const tp = currentPrice + (currentPrice - sl) * rr_ratio;
            document.getElementById("inp-sl").value = sl.toFixed(2);
            document.getElementById("inp-tp").value = tp.toFixed(2);
          } else {
            const sl = currentPrice + atr * sl_atr_mult;
            const tp = currentPrice - (sl - currentPrice) * rr_ratio;
            document.getElementById("inp-sl").value = sl.toFixed(2);
            document.getElementById("inp-tp").value = tp.toFixed(2);
          }
        }

        lastAnalyzedSym = sym;
        lastAnalyzedData = data;

        const analysisHtml = getAnalysisHTML(sym, data, typeSelect.value);

        const contentDiv = document.getElementById("analysis-card-content");
        if (contentDiv) {
          contentDiv.innerHTML = `
            ${analysisHtml}
            <i style="color:var(--text-muted);margin-top:6px;display:block;border-top:1px solid var(--border);padding-top:4px;">Đã tự động điền Giá, SL & TP (Theo ATR = ${atr.toFixed(2)})</i>
          `;
        }
        
        const aiResp = document.getElementById("ai-response");
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
      resetFormUI(); // ensures clean state
      formSection.style.display = "block";
      btnToggle.style.display = "none";
      if (btnCancel) btnCancel.style.display = "block";
      symIn.focus();
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      resetFormUI();
      clearErrors();
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
    const type = document.getElementById("inp-type").value;
    const quantity = parseFloat(document.getElementById("inp-qty").value) || 1;
    const entryPrice = parseFloat(document.getElementById("inp-entry").value);
    const stopLoss =
      parseFloat(document.getElementById("inp-sl").value) || null;
    const takeProfit =
      parseFloat(document.getElementById("inp-tp").value) || null;
    const note = document.getElementById("inp-note").value.trim();

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

    const btnSubmit = document.getElementById("btn-submit");
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

      resetFormUI();
      symIn.focus();
    } catch (err) {
      showError("err-symbol", err.message);
    } finally {
      btnSubmit.textContent = originalText;
      btnSubmit.disabled = false;
    }
  });
}

export function populateForm(trade) {
  currentEditId = trade.id;
  document.getElementById("inp-symbol").value = trade.symbol;
  document.getElementById("inp-type").value = trade.type;
  document.getElementById("inp-qty").value = trade.quantity;
  document.getElementById("inp-entry").value = trade.entryPrice;
  document.getElementById("inp-sl").value = trade.stopLoss || "";
  document.getElementById("inp-tp").value = trade.takeProfit || "";
  document.getElementById("inp-note").value = trade.note || "";

  document.getElementById("form-title").textContent = "✏️ Edit Position";
  document.getElementById("btn-submit").textContent = "Update Position";
  document.getElementById("btn-cancel").style.display = "block";

  document.getElementById("form-section").style.display = "block";
  document.getElementById("btn-toggle-form").style.display = "none";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetFormUI() {
  currentEditId = null;
  document.getElementById("trade-form").reset();
  document.getElementById("form-title").textContent = "➕ New Position";
  document.getElementById("btn-submit").textContent = "Add Position";
  document.getElementById("btn-cancel").style.display = "none";
  
  const analysisCard = document.getElementById("analysis-card");
  if (analysisCard) analysisCard.style.display = "none";

  document.getElementById("form-section").style.display = "none";
  document.getElementById("btn-toggle-form").style.display = "block";
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = msg;
    el.style.display = "block";
  }
}

function clearErrors() {
  document.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
    el.style.display = "none";
  });
}
