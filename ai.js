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
export async function screenPotentialStocks(rawStocks, targetProfit, settings) {
  try {
    // 1. Giảm payload để tránh AI bị quá tải token
    const compactData = rawStocks.map(s => ({
      s: s.s,
      p: s.p,
      c: s.c,
      v: s.v,
      rsi: s.rsi,
      atr: s.atr,
      m: s.m
    }));

    const cleanedData = JSON.stringify(compactData);

    const prompt = `Dữ liệu cổ phiếu (JSON):
${cleanedData}

Nhiệm vụ: Tìm ra Top 10 cổ phiếu có thiết lập Swing Trade (lướt sóng) đẹp nhất dựa trên Price Action.

Tiêu chí lọc:
1. Xu hướng: Chỉ chọn cổ phiếu có xu hướng Tăng hoặc Đang tích lũy nền chặt chẽ trên D1.
2. Price Action & Patterns:
   - Ưu tiên: Mẫu hình Cốc tay cầm, VCP, Nền giá phẳng (Flat Base), hoặc Breakout kháng cự với Vol lớn.
   - Nến: Tìm kiếm các dấu hiệu đảo chiều/tiếp diễn như Pinbar, Engulfing tại các vùng hỗ trợ mạnh.
3. Thanh khoản: Volume trung bình 10 phiên >= 1 triệu cổ (để đảm bảo thoát hàng dễ).
4. Sức mạnh giá (Relative Strength): Cổ phiếu giữ giá tốt hơn thị trường chung khi thị trường chỉnh.

Mục tiêu & Quản trị rủi ro:
- Lướt sóng T+3 đến T+10.
- Target lợi nhuận: Kỳ vọng thực tế theo các mốc kháng cự.
- Tỷ lệ Risk/Reward: Bắt buộc >= 1:2.

Yêu cầu trả về (Mỗi dòng một mã, format chuẩn):
Mã: [Ticker] | Lý do: [Mẫu hình Price Action + Dòng tiền] | Điểm: [0-10] | Phiên: [3-10] | Vào: [Giá entry] | Mục tiêu: [Giá target] | Cắt lỗ: [Giá SL] | Win: [0-100]

Chỉ trả về danh sách, không giải thích thêm.`;

    const systemPrompt = "Bạn là chuyên gia trading ngắn hạn (T+3 đến T+5), giỏi phân tích breakout, dòng tiền và hành vi giá.";

    const response = await queryAIWithSystem(prompt, systemPrompt, settings);

    // 2. Phân tích văn bản thô (Mỗi dòng một mã)
    const lines = response.split('\n').filter(l => l.includes('Mã:') && l.includes('|'));

    const results = lines.map(line => {
      try {
        const parts = {};
        line.split('|').forEach(part => {
          const [key, val] = part.split(':').map(s => s.trim());
          if (key && val) parts[key.toLowerCase()] = val;
        });

        if (!parts['mã']) return null;

        return {
          s: parts['mã'],
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

  // 2. Tìm mảng JSON [ ... ]
  const startIdx = cleaned.indexOf('[');
  const endIdx = cleaned.lastIndexOf(']');

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
      maxOutputTokens: 4096,
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
