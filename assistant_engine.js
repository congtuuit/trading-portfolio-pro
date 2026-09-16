/**
 * assistant_engine.js
 * Core engine for Smart Stock & Crypto Assistant.
 * Combines TradingView real-time snapshots, deterministic quant calculations,
 * and structured AI reasoning.
 */

import { fetchPricesMap, normalizeSymbolCandidates, fetchDeepResearchData } from "./price.js";
import { scoreStock } from "./scorer.js";
import { getDivisor, calculatePositionSize, calculateRR, escapeHTML } from "./utils.js";
import { queryAI } from "./ai.js";

/**
 * Detect active symbol from TradingView URL or DOM.
 * Works both inside injected content script and extension views.
 * @returns {string|null} Detected symbol (e.g., "HOSE:FPT", "BINANCE:BTCUSDT")
 */
export function detectActiveTradingViewSymbol() {
  if (typeof window === "undefined") return null;

  try {
    const url = new URL(window.location.href);
    // 1. Check URL query params ?symbol=...
    if (url.searchParams.has("symbol")) {
      const sym = url.searchParams.get("symbol");
      if (sym) return sym.trim().toUpperCase();
    }

    // 2. Check TradingView Chart pathname /chart/?symbol=... or /chart/<id>/?symbol=...
    const match = window.location.pathname.match(/\/symbols\/([^/]+)/i);
    if (match && match[1]) {
      return decodeURIComponent(match[1]).trim().toUpperCase();
    }

    // 3. Check TradingView DOM elements if available
    const headerBtn = document.querySelector('[id*="header-toolbar-symbol-search"] button, button#header-toolbar-symbol-search');
    if (headerBtn && headerBtn.textContent) {
      const text = headerBtn.textContent.trim().toUpperCase();
      if (text && text.length < 20) return text;
    }

    // 4. Check document title (e.g. "FPT Chart — TradingView" or "BTCUSDT 65,000 — TradingView")
    const title = document.title || "";
    const titleMatch = title.match(/^([A-Z0-9_:]+)\s+(Chart|Price|Biểu đồ)/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim().toUpperCase();
    }
  } catch (err) {
    console.warn("[TPP Assistant] Failed to detect active symbol:", err);
  }

  return null;
}

/**
 * Deterministically compute technical entry zone, TP1, TP2, Stop Loss and R:R.
 * Follows Pine Script v5.5 Confluence & Anti-Overbought rules.
 * @param {Object} snapshot - Market technical snapshot
 * @param {Object} scoreData - Quant score data from scorer.js
 * @param {Object} settings - User settings
 * @returns {Object} Technical plan object
 */
export function calculateTechnicalLevels(snapshot, scoreData, settings = {}) {
  const price = snapshot.price || snapshot.close || 0;
  const divisor = getDivisor(snapshot.symbol);
  const isCrypto = divisor === 1 && (snapshot.symbol.includes("USDT") || snapshot.symbol.includes("USD") || snapshot.type === "crypto");

  const ema20 = snapshot.ema20 || price;
  const ema50 = snapshot.ema50 || price;
  const ema200 = snapshot.ema200 || price;
  const bbLower = snapshot.bb_lower || price * 0.95;
  const bbUpper = snapshot.bb_upper || price * 1.05;
  const atr = snapshot.atr || price * 0.025;

  const style = settings.tradingStyle || "swing";
  const riskLevel = settings.riskLevel || "trung bình";

  // Determine Entry Zone:
  // For Swing: Retest near EMA20 or current price if in breakout
  let entryMin = 0;
  let entryMax = 0;

  if (scoreData.isBreakingOut) {
    entryMin = Math.round(price);
    entryMax = Math.round(price * 1.015);
  } else if (scoreData.bbPct > 80) {
    // Overbought - suggest waiting for pullback
    entryMin = Math.round(Math.max(ema20 * 0.99, bbLower));
    entryMax = Math.round(ema20 * 1.01);
  } else {
    // Normal / Pullback accumulation zone
    entryMin = Math.round(Math.min(price * 0.985, Math.max(ema20 * 0.99, bbLower)));
    entryMax = Math.round(Math.max(price, ema20 * 1.01));
  }

  // Determine Stop Loss:
  // Technical SL below nearest key support (EMA20/EMA50/BB Lower or 1.5 * ATR)
  let rawSL = 0;
  if (style === "lướt sóng") {
    rawSL = Math.min(price - (1.2 * atr), ema20 * 0.975);
  } else if (style === "dài hạn") {
    rawSL = Math.min(price - (2.5 * atr), ema200 * 0.96, ema50 * 0.95);
  } else {
    // Swing default: below EMA20/EMA50 or 1.8 * ATR
    const keySupport = Math.min(ema20, ema50);
    rawSL = Math.min(keySupport * 0.97, price - (1.8 * atr));
  }

  // Ensure reasonable SL bounds (between 3.5% and 8% for stocks, 4% to 12% for crypto)
  const maxSLPct = isCrypto ? 0.12 : (riskLevel === "cao" ? 0.08 : 0.06);
  const minSLPct = isCrypto ? 0.04 : 0.035;

  let slPrice = Math.min(price * (1 - minSLPct), Math.max(price * (1 - maxSLPct), rawSL));
  slPrice = Math.round(slPrice);

  const riskPerShare = Math.max(1, price - slPrice);
  const riskPct = -parseFloat((((price - slPrice) / price) * 100).toFixed(2));

  // Determine Take Profit 1 & 2:
  // TP1: Targeting nearest resistance or minimum 1:1.8 R:R
  const targetMinRR1 = 1.8;
  const targetMinRR2 = 3.0;

  let rawTP1 = Math.max(bbUpper, price + (riskPerShare * targetMinRR1));
  let rawTP2 = Math.max(rawTP1 * 1.05, price + (riskPerShare * targetMinRR2));

  let tp1Price = Math.round(rawTP1);
  let tp2Price = Math.round(rawTP2);

  const tp1Pct = parseFloat((((tp1Price - price) / price) * 100).toFixed(2));
  const tp2Pct = parseFloat((((tp2Price - price) / price) * 100).toFixed(2));

  // Overall RR
  const weightedTarget = (tp1Price * 0.4) + (tp2Price * 0.6);
  const rr = calculateRR(price, weightedTarget, slPrice, "BUY") || parseFloat(((tp1Pct / Math.abs(riskPct))).toFixed(2));

  // Determine Verdict
  let verdict = "QUAN SÁT";
  let verdictColor = "#94a3b8";
  let verdictDetail = "Theo dõi thêm phản ứng dòng tiền tại vùng tích lũy.";

  if (scoreData.score >= 78 && scoreData.bbPct < 80 && scoreData.probability.bullProb >= 60) {
    if (scoreData.breakoutDistance <= 1.5 || scoreData.isBreakingOut) {
      verdict = "MUA NGAY (BREAKOUT)";
      verdictColor = "#10b981";
      verdictDetail = "Tín hiệu vượt đỉnh & dòng tiền tham gia mạnh. Vào lệnh giải ngân theo kế hoạch.";
    } else {
      verdict = "VÙNG MUA AN TOÀN (PULLBACK)";
      verdictColor = "#10b981";
      verdictDetail = "Cổ phiếu đang retest hỗ trợ lành mạnh, rủi ro thấp, tỷ lệ R:R thuận lợi.";
    }
  } else if (scoreData.bbPct >= 85 || scoreData.breakoutDistance < 0) {
    verdict = "QUÁ MUA - CHỜ PULLBACK";
    verdictColor = "#f59e0b";
    verdictDetail = "Giá đang chạm dải trên Bollinger Bands hoặc kháng cự mạnh. Tuyệt đối không FOMO, chờ nhịp điều chỉnh.";
  } else if (scoreData.score < 50 || scoreData.probability.bullProb < 45) {
    verdict = "TRÁNH MUA / RỦI RO";
    verdictColor = "#ef4444";
    verdictDetail = "Xu hướng yếu hoặc đang chịu áp lực điều chỉnh. Ưu tiên giữ tiền mặt.";
  }

  // Position Sizing Recommendation
  const accountBalance = settings.accountBalance || (isCrypto ? 5000 : 100000000);
  const riskPercent = settings.riskPercent || 2.0;
  const positionSizing = calculatePositionSize(price, slPrice, accountBalance, riskPercent, isCrypto);

  return {
    divisor,
    isCrypto,
    entryZone: {
      min: entryMin,
      max: entryMax,
      displayMin: entryMin / divisor,
      displayMax: entryMax / divisor,
      text: `${(entryMin / divisor).toLocaleString('vi-VN')} - ${(entryMax / divisor).toLocaleString('vi-VN')}`
    },
    stopLoss: {
      price: slPrice,
      displayPrice: slPrice / divisor,
      pct: riskPct
    },
    tp1: {
      price: tp1Price,
      displayPrice: tp1Price / divisor,
      pct: tp1Pct,
      ratio: "40%"
    },
    tp2: {
      price: tp2Price,
      displayPrice: tp2Price / divisor,
      pct: tp2Pct,
      ratio: "60%"
    },
    rr,
    verdict,
    verdictColor,
    verdictDetail,
    positionSizing
  };
}

/**
 * Generate visual Pine Script v5 code for TradingView chart overlay.
 * @param {Object} plan - Complete Smart Stock plan
 * @returns {string} Pine Script v5 source code
 */
export function generatePineScriptLevels(plan) {
  const sym = plan.symbol || "TICKER";
  const entryMin = plan.plan.entryZone.priceMin || plan.plan.entryZone.min;
  const entryMax = plan.plan.entryZone.priceMax || plan.plan.entryZone.max;
  const tp1 = plan.plan.tp1.price;
  const tp2 = plan.plan.tp2.price;
  const sl = plan.plan.stopLoss.price;

  return `//@version=5
indicator("TPP Smart Plan: ${sym}", overlay=true)

// ── Smart Levels generated by Trading Portfolio Pro ──
var color col_entry = color.new(#3b82f6, 80)
var color col_tp    = color.new(#10b981, 20)
var color col_sl    = color.new(#ef4444, 20)

// Entry Zone Box
var box b_entry = box.new(left=bar_index - 15, top=${entryMax}, right=bar_index + 30, bottom=${entryMin},
    border_color=color.blue, border_style=line.style_dashed, bgcolor=col_entry, text="VÙNG MUA (${(entryMin / plan.divisor).toFixed(1)} - ${(entryMax / plan.divisor).toFixed(1)})", text_color=color.white, text_size=size.small)

// Target 1 Line
var line l_tp1 = line.new(bar_index - 15, ${tp1}, bar_index + 30, ${tp1}, color=col_tp, width=2, style=line.style_solid)
var label lbl_tp1 = label.new(bar_index + 30, ${tp1}, "🎯 TP1: ${(tp1 / plan.divisor).toFixed(1)} (+${plan.plan.tp1.pct}%)", color=color.new(color.green, 100), textcolor=#10b981, size=size.small)

// Target 2 Line
var line l_tp2 = line.new(bar_index - 15, ${tp2}, bar_index + 30, ${tp2}, color=col_tp, width=2, style=line.style_solid)
var label lbl_tp2 = label.new(bar_index + 30, ${tp2}, "🎯 TP2: ${(tp2 / plan.divisor).toFixed(1)} (+${plan.plan.tp2.pct}%)", color=color.new(color.green, 100), textcolor=#10b981, size=size.small)

// Stop Loss Line
var line l_sl = line.new(bar_index - 15, ${sl}, bar_index + 30, ${sl}, color=col_sl, width=2, style=line.style_solid)
var label lbl_sl = label.new(bar_index + 30, ${sl}, "🛡️ SL: ${(sl / plan.divisor).toFixed(1)} (${plan.plan.stopLoss.pct}%)", color=color.new(color.red, 100), textcolor=#ef4444, size=size.small)
`;
}

/**
 * Build complete Smart Stock Plan with quant calculations and structured AI rationale.
 * @param {string} rawSymbol - Symbol input (e.g. "FPT", "HOSE:FPT", "BTCUSDT")
 * @param {Object} settings - App settings with API key, trading style, etc.
 * @returns {Promise<Object>} Complete Plan object
 */
export async function buildSmartStockPlan(rawSymbol, settings = {}) {
  if (!rawSymbol) {
    throw new Error("Vui lòng nhập hoặc chọn một mã cổ phiếu / crypto.");
  }

  const cleanSym = rawSymbol.trim().toUpperCase();

  // 1. Fetch live snapshot data
  const pricesMap = await fetchPricesMap([cleanSym]);
  let snapshot = pricesMap[cleanSym];

  if (!snapshot) {
    const cands = normalizeSymbolCandidates(cleanSym);
    for (const c of cands) {
      if (pricesMap[c]) {
        snapshot = pricesMap[c];
        break;
      }
    }
  }

  if (!snapshot || !snapshot.close) {
    throw new Error(`Không tìm thấy dữ liệu kỹ thuật từ TradingView cho mã: "${cleanSym}".`);
  }

  const divisor = getDivisor(snapshot.symbol);
  const displayPrice = snapshot.close / divisor;

  // 2. Local Quantitative Scoring (Deterministic First)
  const scoreData = scoreStock(snapshot, settings);

  // 3. Technical Staged Levels & Risk Management
  const technicalPlan = calculateTechnicalLevels(snapshot, scoreData, settings);

  // 4. Qualitative AI Rationale Formulation
  let aiRationale = {
    summary: `Cổ phiếu được chấm ${scoreData.score}/100 điểm (${scoreData.gradeLabel}). ${technicalPlan.verdictDetail}`,
    catalysts: [
      `Xác suất tăng dự phóng: ${scoreData.probability.bullProb}% (${scoreData.probability.strength}).`,
      `Mẫu hình nến: ${scoreData.pattern.icon} ${scoreData.pattern.label}.`,
      `Đồng thuận kỹ thuật: ${scoreData.confluence}/10 điểm.`
    ],
    risks: [
      `Ngưỡng cắt lỗ tối đa tại ${(technicalPlan.stopLoss.displayPrice).toFixed(1)} (${technicalPlan.stopLoss.pct}%).`,
      scoreData.bbPct > 80 ? "Cảnh báo: Giá đang ở vùng biên trên Bollinger Bands (quá mua ngắn hạn)." : "Chú ý biến động chung của chỉ số VN-Index/BTC."
    ],
    actionAdvice: technicalPlan.verdictDetail
  };

  // If AI is configured, enhance qualitative insights via LLM
  if (settings.apiKey) {
    try {
      const aiPrompt = `Bạn là Trưởng phòng Phân tích Chiến lược Đầu tư. Hãy thẩm định kế hoạch giao dịch định lượng sau:

MÃ: ${snapshot.symbol}
Giá hiện tại: ${displayPrice} (Giá gốc: ${snapshot.close})
Điểm định lượng Pine Script: ${scoreData.score}/100 (Hạng ${scoreData.grade} - ${scoreData.gradeLabel})
Độ đồng thuận (Confluence): ${scoreData.confluence}/10
Xác suất: Tăng ${scoreData.probability.bullProb}% | Giảm ${scoreData.probability.bearProb}%
Mẫu hình nến: ${scoreData.pattern.label}
Độ quá mua Bollinger %B: ${scoreData.bbPct}%
Khuyến nghị kỹ thuật: ${technicalPlan.verdict}
Kế hoạch Staged Levels:
- Vùng mua: ${technicalPlan.entryZone.text}
- Cắt lỗ: ${technicalPlan.stopLoss.displayPrice} (${technicalPlan.stopLoss.pct}%)
- Chốt lời 1 (40% vị thế): ${technicalPlan.tp1.displayPrice} (+${technicalPlan.tp1.pct}%)
- Chốt lời 2 (60% vị thế): ${technicalPlan.tp2.displayPrice} (+${technicalPlan.tp2.pct}%)
- Tỷ lệ R:R: 1:${technicalPlan.rr}
Hồ sơ NĐT: Phong cách ${settings.tradingStyle || "Swing"} | Khẩu vị rủi ro ${settings.riskLevel || "Trung bình"}

YÊU CẦU: Trả về JSON thuần (KHÔNG markdown):
{
  "summary": "Nhận định tổng quan 1-2 câu súc tích",
  "catalysts": ["Xúc tác 1", "Xúc tác 2"],
  "risks": ["Rủi ro chính 1", "Rủi ro chính 2"],
  "actionAdvice": "Lời khuyên hành động thực chiến cụ thể"
}`;

      const aiResponse = await queryAI(aiPrompt, settings);
      let parsed = null;
      try {
        const cleaned = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        const match = aiResponse.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      if (parsed && parsed.summary) {
        aiRationale = {
          summary: parsed.summary,
          catalysts: Array.isArray(parsed.catalysts) && parsed.catalysts.length > 0 ? parsed.catalysts : aiRationale.catalysts,
          risks: Array.isArray(parsed.risks) && parsed.risks.length > 0 ? parsed.risks : aiRationale.risks,
          actionAdvice: parsed.actionAdvice || technicalPlan.verdictDetail
        };
      }
    } catch (aiErr) {
      console.warn("[TPP Assistant] AI refinement skipped, using quantitative rules:", aiErr);
    }
  }

  const finalPlan = {
    symbol: snapshot.symbol,
    name: snapshot.symbol.split(":").pop() || snapshot.symbol,
    price: snapshot.close,
    displayPrice,
    change: snapshot.change || 0,
    divisor,
    isCrypto: technicalPlan.isCrypto,
    scoreData,
    verdict: technicalPlan.verdict,
    verdictColor: technicalPlan.verdictColor,
    plan: technicalPlan,
    aiRationale
  };

  // Generate ready-to-paste Pine Script v5 chart levels
  finalPlan.pineScriptLevels = generatePineScriptLevels(finalPlan);

  return finalPlan;
}
