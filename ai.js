/**
 * ai.js
 * Handles AI API integrations (Gemini, OpenAI)
 */
import { getAdviceCache, saveAdviceCache, addSystemLog } from "./storage.js";

export async function queryAI(inputData, settings) {
  if (!settings.apiKey) {
    throw new Error(
      "Chưa cấu hình API Key. Vui lòng mở Settings ⚙️ để nhập khóa API.",
    );
  }

  let messages = [];
  if (typeof inputData === "string") {
    messages = [{ role: "user", text: inputData }];
  } else if (Array.isArray(inputData)) {
    messages = inputData;
  }

  const provider = settings.aiProvider || "gemini";
  await addSystemLog('AI_PROMPT', `Gửi yêu cầu tới ${provider}`, messages);

  try {
    let result = "";
    if (provider === "gemini") {
      const model = settings.aiModel || "gemini-1.5-flash";
      result = await queryGemini(messages, model, settings.apiKey, settings.systemPromptOverride);
    } else if (provider === "openai") {
      const model = settings.aiModel || "gpt-4o-mini";
      result = await queryOpenAI(messages, model, settings.apiKey, settings.systemPromptOverride);
    } else {
      throw new Error("Nhà cung cấp AI không hợp lệ.");
    }

    await addSystemLog('AI_RES', `Phản hồi từ ${provider}`, result);
    return result;
  } catch (err) {
    await addSystemLog('ERROR', `Lỗi AI (${provider})`, err.message);
    throw err;
  }
}

/**
 * PHASE 02: SMART SCREENER (STABLE VERSION)
 */
export async function screenPotentialStocks(rawStocks, targetProfit, settings, assetType = "STOCKS") {
  try {
    // 1. Inject user profile into the prompt
    const profile = {
      trading_style: settings.tradingStyle || "swing",
      risk_level: settings.riskLevel || "trung bình"
    };

    const isCrypto = assetType === "CRYPTO";

    const styleLabel = profile.trading_style === "lướt sóng" ?
      (isCrypto ? "LƯỚT SÓNG (Scalping, 1h ~ 1 ngày)" : "LƯỚT SÓNG (Scalping, T+0 ~ T+3)") :
      profile.trading_style === "swing" ?
      (isCrypto ? "SWING (Ngắn hạn, 3 ~ 10 ngày)" : "SWING (Ngắn hạn, T+3 ~ T+10)") :
      (isCrypto ? "ĐẦU TƯ DÀI HẠN (Position, 20 ngày trở lên)" : "ĐẦU TƯ DÀI HẠN (Position, T+20 trở lên)");

    const riskLabel = profile.risk_level === "cao" ? "CHẤP NHẬN RỦI RO CAO (ưu tiên lợi nhuận, chấp nhận biến động mạnh)" :
      profile.risk_level === "thấp" ? "AN TOÀN (ưu tiên bảo toàn vốn)" : "TRUNG BÌNH (cân bằng rủi ro-lợi nhuận)";

    // 2. Build compact but enriched data with anti-overbought indicators
    const compactData = rawStocks.map(s => ({
      s: s.s || s.symbol,
      p: s.p || s.price,
      c: s.c || s.changePercent,
      v: s.v || s.volume,
      rsi: s.rsi,
      atr: s.atr,
      e20: s.e20,
      e50: s.e50,
      e200: s.e200,
      bl: s.bl,
      bu: s.bu,
      bbp: s.bbp !== undefined ? s.bbp : (s.bu - s.bl > 0 ? Math.round(((s.p - s.bl) / (s.bu - s.bl)) * 100) : 50),
      ed20: s.ed20 !== undefined ? s.ed20 : (s.e20 > 0 ? parseFloat((((s.p - s.e20) / s.e20) * 100).toFixed(1)) : 0),
      up: s.up !== undefined ? s.up : (s.bu > s.p ? parseFloat((((s.bu - s.p) / s.p) * 100).toFixed(1)) : 0),
      m: s.m,
      vr: s.vr,
      sc: s.sc,
      g: s.g
    }));

    const cleanedData = JSON.stringify(compactData);

    const prompt = isCrypto ?
    `CHỌN 8 COINS TỐT NHẤT từ dữ liệu đã chấm điểm:
${cleanedData}

Hồ sơ NĐT: ${styleLabel} | ${riskLabel}

QUY TẮC CHỌN LỌC KỸ THUẬT (CHỐNG ĐU ĐỈNH / QUÁ MUA):
1. TUYỆT ĐỐI KHÔNG CHỌN:
   - Coin đã chạm hoặc vượt dải trên Bollinger Bands (bbp >= 90 hoặc up < 3%).
   - Coin bị kéo giãn quá xa đường EMA20 (ed20 > 6.0%).
   - Coin có RSI quá mua nghiêm trọng (rsi > 75).
   - Coin có MACD suy yếu/cắt xuống (m = "DOWN") trừ khi đang bật nảy tại hỗ trợ cứng EMA200/BB Lower.
2. ƯU TIÊN CHỌN VÙNG MUA AN TOÀN (Sweet Buy Zone):
   - Coin Pullback lành mạnh về gần EMA20/EMA50 (ed20 từ -2% đến +3%), RSI 45-62, bbp từ 25-70, MACD tăng (m = "UP"), dư địa tăng up >= 8%.
   - Tỷ lệ Lợi nhuận / Rủi ro (R:R) tối thiểu đạt 1:2.

Lưu ý quan trọng về giá: Các mức giá vào (e), mục tiêu (t), cắt lỗ (sl) phải khớp với định dạng giá thực tế của coin đó trong danh sách (Ví dụ: BTCUSDT là 63906, SOLUSDT là 75.09, PEPEUSDT là 0.0000085). Không được nhân hay chia giá cho 1000.

CHỈ trả về JSON array thuần (KHÔNG markdown, KHÔNG giải thích):
[{"s":"BTCUSDT","r":"Lý do ngắn gọn","sc":8.5,"d":"3-5 ngày","e":63500,"t":68000,"sl":61500,"w":75}]`
    :
    `CHỌN 8 CP TỐT NHẤT từ dữ liệu đã chấm điểm:
${cleanedData}

Hồ sơ NĐT: ${styleLabel} | ${riskLabel}

QUY TẮC CHỌN LỌC KỸ THUẬT (CHỐNG ĐU ĐỈNH / QUÁ MUA):
1. TUYỆT ĐỐI KHÔNG CHỌN:
   - Cổ phiếu đã chạm hoặc vượt dải trên Bollinger Bands (bbp >= 85 hoặc dư địa up < 2.5%).
   - Cổ phiếu bị kéo giãn quá xa đường EMA20 (ed20 > 3.5%).
   - Cổ phiếu có RSI quá mua (rsi > 68 với Swing/Dài hạn, rsi > 75 với Lướt sóng).
   - Cổ phiếu có MACD cắt xuống (m = "DOWN") trừ khi đang ở hỗ trợ cứng EMA200/BB Lower và bật tăng.
2. ƯU TIÊN CHỌN VÙNG MUA VÀNG (Sweet Buy Zone / Healthy Pullback):
   - Cổ phiếu Pullback hoặc tích lũy lành mạnh sát EMA20/EMA50 (ed20 từ -1% đến +2%), RSI 48-60, bbp 30-70, MACD hướng lên (m = "UP"), còn nhiều dư địa tăng (up >= 5%).
   - Thiết lập giao dịch có tỷ lệ Risk/Reward (R:R) tối thiểu 1:2.

CHỈ trả về JSON array thuần (KHÔNG markdown, KHÔNG giải thích):
[{"s":"Mã","r":"Lý do ngắn gọn","sc":8.5,"d":"3-5","e":14500,"t":16000,"sl":13800,"w":75}]`;


    const systemPrompt = isCrypto ?
      `Chuyên gia PTKT Crypto, phong cách ${profile.trading_style}, khẩu vị ${profile.risk_level}. Output: JSON array thuần, không markdown, không text thừa.` :
      `Chuyên gia PTKT, phong cách ${profile.trading_style}, khẩu vị ${profile.risk_level}. Output: JSON array thuần, không markdown, không text thừa.`;

    const response = await queryAIWithSystem(prompt, systemPrompt, settings);

    let results = [];

    // Cách 1: Thử parse dạng JSON array trước
    try {
      const parsed = safeParseJSON(response);
      if (Array.isArray(parsed) && parsed.length > 0) {
        results = parsed.map(item => {
          if (!item || !item.s) return null;
          return {
            s: String(item.s).toUpperCase(),
            r: item.r || "",
            sc: parseFloat(item.sc) || 0,
            d: String(item.d || "3-5"),
            e: parseFloat(item.e) || 0,
            t: parseFloat(item.t) || 0,
            sl: parseFloat(item.sl) || 0,
            w: parseFloat(item.w) || 0
          };
        }).filter(Boolean);
      }
    } catch (e) {
      console.log("[Screener] JSON parse failed, using fallbacks...");
    }

    // Cách 2: Nếu JSON parse rỗng, thử parse định dạng dòng pipe truyền thống
    if (results.length === 0) {
      const lines = response.split('\n').filter(l => l.includes('Mã:') && l.includes('|'));
      results = lines.map(line => {
        try {
          const parts = {};
          line.split('|').forEach(part => {
            const [key, val] = part.split(':').map(s => s.trim());
            if (key && val) parts[key.toLowerCase()] = val;
          });

          if (!parts['mã']) return null;

          return {
            s: parts['mã'].toUpperCase(),
            r: parts['lý do'] || "",
            sc: parseFloat(parts['điểm']) || 0,
            d: parts['phiên'] || "3-5",
            e: parseFloat(parts['vào']) || 0,
            t: parseFloat(parts['mục tiêu']) || 0,
            sl: parseFloat(parts['cắt lỗ']) || 0,
            w: parseFloat(parts['win']) || 0
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    }

    // Cách 3: Nếu vẫn rỗng (Gemini trả văn bản tự do/danh sách hoa thị như "* MSB: SL 14900, Target 16100")
    if (results.length === 0) {
      const lines = response.split('\n');
      for (const line of lines) {
        // Trích xuất từ viết hoa 3-4 chữ cái làm mã (ví dụ: MSB, HPG)
        const symbolMatch = line.match(/(?:^|\s|\*|\[)([A-Z]{3,4})(?:\s|:|\b)/);
        if (symbolMatch) {
          const s = symbolMatch[1].toUpperCase();
          // Bỏ qua các từ khóa phổ biến trùng khớp
          if (["BUY", "SELL", "NOTE", "JSON", "RISK", "STOP", "LOSS", "RSI", "VOL", "DIFF", "OK", "MIN", "MAX"].includes(s)) continue;

          // Tìm thông số cắt lỗ, mục tiêu, giá vào
          const slMatch = line.match(/(?:sl|cắt lỗ|stop\s*loss)\s*:?\s*(\d+)/i);
          const targetMatch = line.match(/(?:target|mục tiêu|tg)\s*:?\s*(\d+)/i);
          const entryMatch = line.match(/(?:vào|entry|buy)\s*:?\s*(\d+)/i);

          if (slMatch || targetMatch) {
            const sl = slMatch ? parseFloat(slMatch[1]) : 0;
            const target = targetMatch ? parseFloat(targetMatch[1]) : 0;
            
            // Tìm giá hiện tại làm giá vào nếu AI không chỉ rõ
            const raw = rawStocks.find(r => (r.s || r.ticker || "").toUpperCase().includes(s));
            if (raw) {
              const entry = entryMatch ? parseFloat(entryMatch[1]) : (raw.price || raw.p || 0);
              results.push({
                s: s,
                r: line.trim().replace(/^\*\s*/, ''),
                sc: 8,
                d: "3-5",
                e: entry,
                t: target,
                sl: sl,
                w: 70
              });
            }
          }
        }
      }
    }

    return results.slice(0, 10);

  } catch (e) {
    addSystemLog('ERROR', 'Screener failed', { error: e.message });
    return [];
  }
}


/**
 * Parse JSON an toàn (3 lớp chống lỗi)
 */
function safeParseJSON(text) {
  if (!text) return [];

  // 1. Làm sạch Markdown và ký tự rác
  let cleaned = text.trim();
  if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```json|```/g, '').trim();
  }

  // 2. Tìm mảng JSON [ ... ] hoặc object { ... }
  let startIdx = cleaned.indexOf('[');
  let endIdx = cleaned.lastIndexOf(']');
  
  const objStartIdx = cleaned.indexOf('{');
  const objEndIdx = cleaned.lastIndexOf('}');
  
  if (objStartIdx !== -1 && (startIdx === -1 || objStartIdx < startIdx)) {
    startIdx = objStartIdx;
    endIdx = objEndIdx;
  }

  let jsonPart = cleaned;
  if (startIdx !== -1) {
    if (endIdx > startIdx) {
      jsonPart = cleaned.substring(startIdx, endIdx + 1);
    } else {
      jsonPart = cleaned.substring(startIdx);
    }
  }

  // 3. Thử parse trực tiếp
  try {
    return JSON.parse(jsonPart);
  } catch { }

  // 4. Nếu fail, thử vá lỗi (bao gồm xử lý dấu phẩy thừa)
  try {
    const fixed = fixTruncatedJson(jsonPart);
    return JSON.parse(fixed);
  } catch (e) {
    console.error("[TPP] Trầm trọng: Không thể vá JSON", e);
  }

  return [];
}


/**
 * Chuẩn hóa output từ AI
 */
function normalizeStockOutput(item) {
  try {
    if (!item || !item.s) return null;

    return {
      s: String(item.s),
      r: String(item.r || ""),
      sc: Number(item.sc || 0),
      d: Number(item.d || 0),
      e: Number(item.e || 0),
      t: Number(item.t || 0),
      w: Number(item.w || 0)
    };
  } catch {
    return null;
  }
}


/**
 * Vá JSON bị cắt cụt
 */
function fixTruncatedJson(str) {
  let repaired = str.trim();

  // 1. Xử lý dấu phẩy thừa ở cuối (trailing comma)
  repaired = repaired.replace(/,\s*$/, '');

  // 2. Fix dấu ngoặc kép nếu bị thiếu trong string
  const lastQuote = repaired.lastIndexOf('"');
  const lastColon = repaired.lastIndexOf(':');
  if (lastQuote > lastColon) {
    // Có vẻ đang dở dang trong một chuỗi văn bản
    const quoteCount = (repaired.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) repaired += '"';
  }

  // 3. Đếm và đóng ngoặc {} []
  let openBraces = (repaired.match(/\{/g) || []).length;
  let closeBraces = (repaired.match(/\}/g) || []).length;
  let openBrackets = (repaired.match(/\[/g) || []).length;
  let closeBrackets = (repaired.match(/\]/g) || []).length;

  while (openBraces > closeBraces) {
    repaired += '}';
    closeBraces++;
  }
  while (openBrackets > closeBrackets) {
    repaired += ']';
    closeBrackets++;
  }

  return repaired;
}

/**
 * PHASE 03: PROFESSIONAL AI ADVISOR
 * Phân tích chi tiết một mã cụ thể theo yêu cầu của User.
 */
/**
 * PHASE 04: DEEP RESEARCH AI
 * Phân tích chuyên sâu kết hợp Cơ bản và Kỹ thuật.
 */
export async function analyzeDeepStock(symbol, contextData, settings) {
  const prompt = `Bạn là Giám đốc Phân tích Đầu tư. Dưới đây là dữ liệu toàn diện về cổ phiếu ${symbol} (Thị trường VN):

${JSON.stringify(contextData)}

Nhiệm vụ:
1. Đánh giá sức khỏe tài chính (Cơ bản) thông qua các chỉ số PE, PB, ROE, Lợi nhuận (revenue, debt_equity).
2. Nhận định xu hướng giá, ngưỡng hỗ trợ/kháng cự từ dữ liệu kỹ thuật.
3. Tổng hợp SWOT (Điểm mạnh, Điểm yếu, Cơ hội, Thách thức) từ cả 2 góc độ Cơ bản và Kỹ thuật.
4. Đưa ra Khuyến nghị (MUA/BÁN/NẮM GIỮ).

YÊU CẦU BẮT BUỘC: Bạn PHẢI trả về ĐÚNG ĐỊNH DẠNG JSON như sau (không chứa các khối markdown):
{
  "symbol": "${symbol}",
  "score": 8,
  "summary": "Tóm tắt 1-2 câu",
  "technical": "Nhận định phân tích kỹ thuật",
  "fundamental": "Nhận định cơ bản",
  "swot": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "opportunities": ["..."],
    "threats": ["..."]
  },
  "action": "MUA",
  "trading_plan": {
    "entry": "Vùng giá mua/bán (VD: 70000 - 71000)",
    "target": "Vùng chốt lời (VD: 78000)",
    "stoploss": "Vùng cắt lỗ (VD: 68000)"
  }
}`;

  const systemPrompt = "Bạn là Giám đốc Phân tích Đầu tư. Chỉ trả về đúng dữ liệu định dạng JSON thuần túy, không giải thích.";
  const response = await queryAIWithSystem(prompt, systemPrompt, settings);
  
  return safeParseJSON(response);
}

/**
 * PHASE 03: PROFESSIONAL AI ADVISOR (Enhanced with Price Action)
 * Phân tích chi tiết một mã cụ thể theo yêu cầu của User.
 * @param {string} symbol
 * @param {object} fullData - Dữ liệu snapshot hiện tại
 * @param {object} settings
 * @param {string} historyText - Dữ liệu lịch sử đã được format (từ history.js)
 */
export async function getDetailedAdvice(symbol, fullData, settings, historyText = "") {
  const profile = {
    trading_style: settings.tradingStyle || "lướt sóng",
    risk_level: settings.riskLevel || "trung bình"
  };

  const prompt = `Bạn là một AI advisor chuyên tư vấn giao dịch cổ phiếu Việt Nam (Swing Trading).

Hồ sơ nhà đầu tư:
- Phong cách: ${profile.trading_style}
- Khẩu vị rủi ro: ${profile.risk_level}

Dữ liệu kĩ thuật hiện tại (Snapshot):
${JSON.stringify(fullData)}
${historyText ? `\nDữ liệu lịch sử OHLCV:\n${historyText}` : ""}

Nhiệm vụ:
1. Phân tích Xu hướng & Price Action: Nhận diện mẫu hình nến, vùng S/R (kháng cự/hỗ trợ) và xu hướng ngắn hạn.
2. Đánh giá tính phù hợp với nhà đầu tư.
3. Đưa ra kế hoạch giao dịch dựa trên tỷ lệ Risk/Reward (R:R) tối ưu.

Phân tích theo cấu trúc:
[1] Tóm tắt & Điểm an toàn (Scale từ 1 đến 10)
[2] Phân tích Price Action: (Ví dụ: Xuất hiện nến Pinbar retest MA20, Mẫu hình Cốc tay cầm đang hình thành, v.v.)
[3] Đánh giá Win Rate (%) và R:R Ratio (Kỳ vọng ít nhất 1:2)
[4] Phù hợp với user? (Có/Không + Lý do)
[5] Chiến thuật cụ thể:
    - Giá vào (Entry)
    - Chốt lời (Target)
    - Cắt lỗ (Stoploss)
[6] Cảnh báo rủi ro chính.

Nguyên tắc: Không nói lý thuyết, tập trung vào hành vi giá thực tế từ dữ liệu.`;

  return await queryAI(prompt, settings);
}

/**
 * Helper để gọi AI với system instruction tùy chỉnh.
 */
async function queryAIWithSystem(userPrompt, systemPrompt, settings) {
  // Ghi đè system instruction vào settings để queryAI xử lý
  const customSettings = { ...settings, systemPromptOverride: systemPrompt };
  return await queryAI([{ role: "user", text: userPrompt }], customSettings);
}

async function queryGemini(messages, model, apiKey, systemPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }]
  }));

  const payload = {
    contents: contents,
    system_instruction: {
      parts: [
        { text: systemPrompt || "Bạn là một trợ lý giao dịch tài chính chuyên nghiệp, am hiểu chiến thuật lướt T0 (Thay nước) và phân tích kỹ thuật (Fibonacci, S/R). Luôn trả lời súc tích, quyết đoán, đủ ý và có dữ liệu dẫn chứng." }
      ]
    },
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      topP: 0.8,
      topK: 40
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || "Lỗi giao tiếp với Gemini API.");
  }

  const data = await response.json();
  if (
    data.candidates &&
    data.candidates[0].content &&
    data.candidates[0].content.parts
  ) {
    // Join all parts to avoid truncation
    return data.candidates[0].content.parts.map(p => p.text).join("");
  }

  throw new Error("Gemini không trả về kết quả hợp lệ.");
}

async function queryOpenAI(messagesArr, model, apiKey, systemPrompt) {
  const url = "https://api.openai.com/v1/chat/completions";

  const mappedMessages = messagesArr.map(m => ({
    role: m.role,
    content: m.text
  }));

  const sysMsg = systemPrompt || "Bạn là một trợ lý giao dịch tài chính chuyên nghiệp, am hiểu phân tích kỹ thuật và dòng tiền. Luôn trả lời súc tích, quyết đoán.";

  const payload = {
    model: model,
    messages: [
      { role: "system", content: sysMsg },
      ...mappedMessages
    ],
    temperature: 0.1,
    max_tokens: 2048,
    top_p: 0.8,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error("[TPP] OpenAI API Error:", errData);
    throw new Error(errData.error?.message || "Lỗi giao tiếp với OpenAI API.");
  }

  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }

  throw new Error("OpenAI không trả về kết quả hợp lệ.");
}

export async function fetchModels(provider, apiKey) {
  if (!apiKey) throw new Error("Chưa nhập API Key.");

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("API Key không hợp lệ hoặc nghẹt mạng.");
    const data = await res.json();
    return data.models
      .filter(
        (m) =>
          m.supportedGenerationMethods &&
          m.supportedGenerationMethods.includes("generateContent"),
      )
      .map((m) => m.name.replace("models/", ""));
  } else if (provider === "openai") {
    const url = "https://api.openai.com/v1/models";
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error("API Key không hợp lệ hoặc nghẹt mạng.");
    const data = await res.json();
    return data.data
      .filter((m) => m.id.includes("gpt"))
      .map((m) => m.id)
      .sort();
  }
  return [];
}
