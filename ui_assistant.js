/**
 * ui_assistant.js
 * Specialized UI rendering module for Smart Stock & Crypto Assistant.
 * Decoupled from ui.js to prevent god-nodes.
 */

import { escapeHTML } from "./utils.js";

/**
 * Render Smart Stock Assistant interactive card.
 * @param {HTMLElement} container - Target container element
 * @param {Object} planData - Structured plan object from assistant_engine.js
 * @param {Object} callbacks - { onApplyToPosition, onCopyPineScript, onRefresh }
 */
export function renderSmartStockCard(container, planData, callbacks = {}) {
  if (!container || !planData) return;

  const { symbol, name, displayPrice, change, divisor, isCrypto, scoreData, verdict, verdictColor, plan, aiRationale } = planData;
  const isUp = change >= 0;
  const changeColor = isUp ? "var(--profit)" : "var(--loss)";
  const changeIcon = isUp ? "▲" : "▼";

  const gradeColor = scoreData.grade === "A" ? "#10b981" :
                     scoreData.grade === "B" ? "#3b82f6" :
                     scoreData.grade === "C" ? "#f59e0b" : "#ef4444";

  const html = `
    <div class="assistant-card" style="background:var(--bg-card); border:1px solid var(--border); border-radius:10px; padding:16px; margin-top:12px; box-shadow:0 8px 24px rgba(0,0,0,0.3); animation:fadeIn 0.25s ease-out;">

      <!-- ── Header Section ── -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:10px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px; font-weight:700; color:var(--text-primary); letter-spacing:0.5px;">${escapeHTML(symbol)}</span>
            <span class="score-badge" style="background:${gradeColor}22; color:${gradeColor}; border:1px solid ${gradeColor}66; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700;">
              ⭐ ${scoreData.score}/100 (${scoreData.grade})
            </span>
          </div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
            ${scoreData.gradeLabel} • Confluence: <strong style="color:var(--accent-blue);">${scoreData.confluence}/10</strong>
          </div>
        </div>

        <div style="text-align:right;">
          <div style="font-size:18px; font-weight:700; color:${changeColor};">
            ${displayPrice.toLocaleString('vi-VN')}
          </div>
          <div style="font-size:11px; font-weight:600; color:${changeColor};">
            ${changeIcon} ${Math.abs(change).toFixed(2)}%
          </div>
        </div>
      </div>

      <!-- ── Verdict & Signals Banner ── -->
      <div style="background:${verdictColor}15; border:1px solid ${verdictColor}44; border-radius:8px; padding:10px 12px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-size:11px; font-weight:700; color:${verdictColor}; text-transform:uppercase; letter-spacing:0.5px;">
            🎯 KHUYẾN NGHỊ: ${escapeHTML(verdict)}
          </span>
          <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.08); color:var(--text-muted);">
            ${scoreData.pattern.icon} ${escapeHTML(scoreData.pattern.label)}
          </span>
        </div>
        <div style="font-size:12px; color:var(--text-primary); line-height:1.4;">
          ${escapeHTML(aiRationale.summary || plan.verdictDetail)}
        </div>
      </div>

      <!-- ── Probability Bar ── -->
      <div style="margin-bottom:14px; background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:6px; padding:8px 10px;">
        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
          <span>${scoreData.probability.badgeText}</span>
        </div>
        <div style="height:6px; width:100%; background:#334155; border-radius:3px; overflow:hidden; display:flex;">
          <div style="width:${scoreData.probability.bullProb}%; background:linear-gradient(90deg, #10b981, #059669); transition:width 0.4s ease;"></div>
          <div style="width:${scoreData.probability.bearProb}%; background:linear-gradient(90deg, #dc2626, #ef4444); transition:width 0.4s ease;"></div>
        </div>
      </div>

      <!-- ── Staged Targets Grid ── -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px;">

        <!-- Entry Zone -->
        <div style="background:rgba(59, 130, 246, 0.08); border:1px solid rgba(59, 130, 246, 0.25); border-radius:6px; padding:8px 10px;">
          <div style="font-size:10px; font-weight:600; color:#60a5fa; text-transform:uppercase;">Vùng Mua (Entry)</div>
          <div style="font-size:13px; font-weight:700; color:var(--text-primary); margin-top:2px;">
            ${plan.entryZone.text}
          </div>
          <div style="font-size:10px; color:var(--text-muted);">Retest EMA20/Hỗ trợ</div>
        </div>

        <!-- Stop Loss -->
        <div style="background:rgba(239, 68, 68, 0.08); border:1px solid rgba(239, 68, 68, 0.25); border-radius:6px; padding:8px 10px;">
          <div style="font-size:10px; font-weight:600; color:#f87171; text-transform:uppercase;">Cắt Lỗ (Stop Loss)</div>
          <div style="font-size:13px; font-weight:700; color:#f87171; margin-top:2px;">
            ${plan.stopLoss.displayPrice.toLocaleString('vi-VN')} <span style="font-size:11px;">(${plan.stopLoss.pct}%)</span>
          </div>
          <div style="font-size:10px; color:var(--text-muted);">Dưới hỗ trợ cứng</div>
        </div>

        <!-- Target 1 (TP1) -->
        <div style="background:rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.25); border-radius:6px; padding:8px 10px;">
          <div style="font-size:10px; font-weight:600; color:#34d399; text-transform:uppercase;">Chốt Lời 1 (TP1 - ${plan.tp1.ratio})</div>
          <div style="font-size:13px; font-weight:700; color:#34d399; margin-top:2px;">
            ${plan.tp1.displayPrice.toLocaleString('vi-VN')} <span style="font-size:11px;">(+${plan.tp1.pct}%)</span>
          </div>
          <div style="font-size:10px; color:var(--text-muted);">Kháng cự gần/Đỉnh ngắn</div>
        </div>

        <!-- Target 2 (TP2) -->
        <div style="background:rgba(16, 185, 129, 0.08); border:1px solid rgba(16, 185, 129, 0.25); border-radius:6px; padding:8px 10px;">
          <div style="font-size:10px; font-weight:600; color:#34d399; text-transform:uppercase;">Chốt Lời 2 (TP2 - ${plan.tp2.ratio})</div>
          <div style="font-size:13px; font-weight:700; color:#34d399; margin-top:2px;">
            ${plan.tp2.displayPrice.toLocaleString('vi-VN')} <span style="font-size:11px;">(+${plan.tp2.pct}%)</span>
          </div>
          <div style="font-size:10px; color:var(--text-muted);">Mở rộng sóng / R:R cao</div>
        </div>

      </div>

      <!-- ── Risk / Reward & Position Sizing Tile ── -->
      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:10px 12px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:11px; font-weight:600; color:var(--text-muted);">📐 KÍCH THƯỚC VỊ THẾ GỢI Ý</span>
          <span style="font-size:11px; font-weight:700; color:${plan.rr >= 2 ? 'var(--profit)' : '#f59e0b'};">
            Tỷ lệ R:R = 1:${plan.rr} ${plan.rr >= 2 ? '🟢 Đạt chuẩn' : '🟡 Cân nhắc'}
          </span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; text-align:center;">
          <div style="background:rgba(0,0,0,0.2); padding:6px; border-radius:4px;">
            <div style="font-size:10px; color:var(--text-muted);">Khối lượng</div>
            <div style="font-size:12px; font-weight:700; color:var(--text-primary);">
              ${plan.positionSizing.units.toLocaleString('vi-VN')} ${isCrypto ? 'coin' : 'cp'}
            </div>
          </div>
          <div style="background:rgba(0,0,0,0.2); padding:6px; border-radius:4px;">
            <div style="font-size:10px; color:var(--text-muted);">Tổng giá trị</div>
            <div style="font-size:12px; font-weight:700; color:var(--text-primary);">
              ${(plan.positionSizing.totalInvestment / (isCrypto ? 1 : 1000000)).toFixed(1)} ${isCrypto ? '$' : 'tr'}
            </div>
          </div>
          <div style="background:rgba(0,0,0,0.2); padding:6px; border-radius:4px;">
            <div style="font-size:10px; color:var(--text-muted);">Tỷ trọng vốn</div>
            <div style="font-size:12px; font-weight:700; color:var(--accent-blue);">
              ${plan.positionSizing.percentOfPortfolio}%
            </div>
          </div>
        </div>
      </div>

      <!-- ── AI Insights Details ── -->
      ${aiRationale.catalysts && aiRationale.catalysts.length > 0 ? `
        <div style="margin-bottom:14px; font-size:12px;">
          <div style="font-weight:600; color:var(--text-primary); margin-bottom:4px; display:flex; align-items:center; gap:4px;">
            <span>💡 Động lực & Xúc tác:</span>
          </div>
          <ul style="margin:0; padding-left:18px; color:var(--text-muted);">
            ${aiRationale.catalysts.map(c => `<li style="margin-bottom:2px;">${escapeHTML(c)}</li>`).join("")}
          </ul>
        </div>
      ` : ''}

      ${aiRationale.risks && aiRationale.risks.length > 0 ? `
        <div style="margin-bottom:14px; font-size:12px;">
          <div style="font-weight:600; color:#f87171; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
            <span>⚠️ Yếu tố rủi ro:</span>
          </div>
          <ul style="margin:0; padding-left:18px; color:var(--text-muted);">
            ${aiRationale.risks.map(r => `<li style="margin-bottom:2px;">${escapeHTML(r)}</li>`).join("")}
          </ul>
        </div>
      ` : ''}

      <!-- ── Action Buttons Toolbar ── -->
      <div style="display:flex; gap:8px; margin-top:8px;">
        <button id="btn-apply-position" class="btn" style="flex:1; background:var(--profit); color:white; font-size:12px; padding:8px 10px; display:flex; align-items:center; justify-content:center; gap:6px; font-weight:600;" data-tooltip="Điền thông tin và mức chốt lời này vào Form thêm vị thế">
          <span>➕ Điền Form Thêm Vị Thế</span>
        </button>
        <button id="btn-copy-pinescript" class="btn" style="background:rgba(59, 130, 246, 0.15); color:#60a5fa; border:1px solid rgba(59, 130, 246, 0.3); font-size:12px; padding:8px 12px; display:flex; align-items:center; justify-content:center; gap:4px; font-weight:600; white-space:nowrap;" data-tooltip="Sao chép mã Pine Script v5 để vẽ hộp vùng mua & target lên TradingView">
          <span>📋 Copy Pine Script</span>
        </button>
      </div>

    </div>
  `;

  container.innerHTML = html;

  // Bind Card Action Buttons
  const btnApply = container.querySelector("#btn-apply-position");
  if (btnApply && callbacks.onApplyToPosition) {
    btnApply.addEventListener("click", () => {
      callbacks.onApplyToPosition(planData);
    });
  }

  const btnCopyPine = container.querySelector("#btn-copy-pinescript");
  if (btnCopyPine && callbacks.onCopyPineScript) {
    btnCopyPine.addEventListener("click", () => {
      callbacks.onCopyPineScript(planData);
    });
  }
}

/**
 * Render Loading state skeleton for Assistant card.
 * @param {HTMLElement} container
 * @param {string} symbol
 */
export function renderAssistantLoading(container, symbol = "") {
  if (!container) return;
  container.innerHTML = `
    <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:10px; padding:24px; text-align:center; margin-top:12px;">
      <div style="font-size:28px; animation:spin 1s infinite linear; display:inline-block; margin-bottom:12px;">🔄</div>
      <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:4px;">
        Đang phân tích định lượng & kịch bản ${symbol ? `"${escapeHTML(symbol)}"` : ""}...
      </div>
      <div style="font-size:11px; color:var(--text-muted);">
        Đang lấy dữ liệu nến, tính toán hỗ trợ/kháng cự, kiểm tra vùng quá mua và xây dựng mức chốt lời tối ưu...
      </div>
    </div>
  `;
}

/**
 * Render Empty State for Assistant tab.
 * @param {HTMLElement} container
 */
export function renderAssistantEmpty(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state" style="padding:24px 16px; margin-top:12px;">
      <div style="font-size:36px; margin-bottom:10px;">🤖</div>
      <div style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:6px;">
        Trợ Lý Giao Dịch Định Lượng & Kế Hoạch Vào Lệnh
      </div>
      <div style="font-size:12px; color:var(--text-muted); line-height:1.5; max-width:360px; margin:0 auto 12px;">
        Nhập mã cổ phiếu (VD: <code>HOSE:FPT</code>, <code>VHM</code>) hoặc bấm <strong>"🎯 Lấy mã từ Chart"</strong> để xem vùng mua, chốt lời từng phần (TP1, TP2) và xuất mã Pine Script.
      </div>
    </div>
  `;
}

/**
 * Render Error State for Assistant tab.
 * @param {HTMLElement} container
 * @param {string} message
 */
export function renderAssistantError(container, message) {
  if (!container) return;
  container.innerHTML = `
    <div style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); border-radius:8px; padding:16px; text-align:center; margin-top:12px;">
      <div style="font-size:24px; margin-bottom:8px;">❌</div>
      <div style="font-size:13px; font-weight:600; color:#f87171; margin-bottom:4px;">
        Không thể hoàn tất phân tích
      </div>
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">
        ${escapeHTML(message)}
      </div>
    </div>
  `;
}
