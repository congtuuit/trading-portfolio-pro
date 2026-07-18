/**
 * mcp.js
 * Simulated MCP Tool Client for Trading Assistant Chat.
 * Automatically detects stock symbols and handles slash commands to load real-time market data.
 */

import { fetchDeepResearchData } from "./price.js";

// Common trading terms to ignore when auto-detecting stock symbols
const IGNORED_WORDS = new Set([
  "BUY", "SELL", "RSI", "DCA", "PNL", "EMA", "MACD", "ATR", "JSON", 
  "API", "SWOT", "HELP", "INFO", "VIEW", "EDIT", "CHAT", "PLAN",
  "HOSE", "HNX", "UPCOM", "FIB", "FIBS"
]);

/**
 * Normalizes a stock symbol by adding a default HOSE exchange prefix if missing.
 * @param {string} rawSymbol
 * @returns {string}
 */
export function normalizeSymbol(rawSymbol) {
  let sym = rawSymbol.trim().toUpperCase();
  if (sym.includes(":")) return sym;
  
  // Default to HOSE for 3-letter tickers in VN market
  if (sym.length === 3) {
    return `HOSE:${sym}`;
  }
  return sym;
}

/**
 * Extracts potential stock symbols from a text message.
 * @param {string} message
 * @returns {string[]} Unique normalized symbols found
 */
export function extractSymbols(message) {
  const symbols = [];
  
  // 1. Match full exchange tickers like HOSE:FPT
  const fullTickerRegex = /(HOSE|HNX|UPCOM):[A-Z]{3,4}/gi;
  let match;
  while ((match = fullTickerRegex.exec(message)) !== null) {
    symbols.push(match[0].toUpperCase());
  }

  // 2. Match potential standalone 3-4 letter tickers (e.g. FPT, HPG, TCB)
  const wordRegex = /\b[A-Z]{3,4}\b/g;
  const words = message.toUpperCase().match(wordRegex) || [];
  words.forEach(word => {
    if (!IGNORED_WORDS.has(word) && !symbols.some(s => s.endsWith(word))) {
      symbols.push(`HOSE:${word}`);
    }
  });

  return [...new Set(symbols)];
}

/**
 * Processes slash commands in the message if present.
 * @param {string} message
 * @returns {Object|null} { command, symbol } or null if not a slash command
 */
export function parseSlashCommand(message) {
  const msg = message.trim();
  if (!msg.startsWith("/")) return null;

  const parts = msg.split(/\s+/);
  const command = parts[0].toLowerCase();
  const rawSymbol = parts[1] || "";
  
  if (!rawSymbol) return null;
  const symbol = normalizeSymbol(rawSymbol);

  if (command === "/analyze" || command === "/research") {
    return { command: "analyze", symbol };
  }
  if (command === "/dca") {
    return { command: "dca", symbol };
  }
  if (command === "/price" || command === "/quote") {
    return { command: "price", symbol };
  }
  if (command === "/predict") {
    return { command: "predict", symbol };
  }
  if (command === "/scenarios") {
    return { command: "scenarios", symbol };
  }
  
  return null;
}

/**
 * Fetches data for the detected symbols and returns a system instruction string.
 * @param {string} message
 * @returns {Promise<string|null>} Formatted stock context if found, otherwise null
 */
export async function getLiveStockContext(message) {
  // Check slash command first
  const slash = parseSlashCommand(message);
  let symbols = [];
  let explicitCommand = null;

  if (slash) {
    symbols = [slash.symbol];
    explicitCommand = slash.command;
  } else {
    symbols = extractSymbols(message);
  }

  if (symbols.length === 0) return null;

  let contextStr = `\n\n[HỆ THỐNG - DỮ LIỆU THỜI GIAN THỰC]\n`;
  let successCount = 0;

  for (const symbol of symbols) {
    const data = await fetchDeepResearchData(symbol);
    if (data && data.close) {
      successCount++;
      contextStr += `\nCổ phiếu: ${symbol}\n`;
      contextStr += `- Giá hiện tại: ${data.close} VNĐ (Thay đổi: ${data.change || 0}%)\n`;
      contextStr += `- Các chỉ số kĩ thuật: RSI=${Math.round(data.rsi)}, EMA20=${data.ema20}, EMA50=${data.ema50}, EMA200=${data.ema200}, MACD=${data.macd}, Tín hiệu MACD=${data.macd_signal}, Khối lượng giao dịch=${data.volume}\n`;
      contextStr += `- Định giá & Sức khỏe (Cơ bản): P/E=${data.pe || "N/A"}, P/B=${data.pb || "N/A"}, ROE=${data.roe ? (data.roe + "%") : "N/A"}, Vốn hóa=${data.market_cap ? (data.market_cap + " VNĐ") : "N/A"}, Doanh thu quý gần nhất=${data.revenue || "N/A"}, Nợ/Vốn chủ sở hữu=${data.debt_equity || "N/A"}\n`;
      contextStr += `- Lĩnh vực: ${data.sector || "N/A"} (${data.industry || "N/A"})\n`;
    }
  }

  if (successCount === 0) return null;

  if (explicitCommand) {
    contextStr += `\n[Yêu cầu lệnh đặc biệt]: Người dùng đã chạy lệnh /${explicitCommand} cho mã ${symbols[0]}.\n`;
    if (explicitCommand === "analyze") {
      contextStr += `Nhiệm vụ: Hãy đưa ra phân tích chuyên môn sâu, toàn diện bao gồm SWOT và khuyến nghị Mua/Bán rõ ràng kèm giá cắt lỗ/chốt lời cho mã này dựa trên số liệu thực tế phía trên. Trình bày đẹp mắt sử dụng Markdown.\n`;
    } else if (explicitCommand === "dca") {
      contextStr += `Nhiệm vụ: Hãy lập kế hoạch gom/trung bình giá (DCA) cụ thể, chi tiết các bước và các vùng hỗ trợ kỹ thuật để mua tích lũy cho mã này. Trình bày đẹp mắt sử dụng Markdown.\n`;
    } else if (explicitCommand === "price") {
      contextStr += `Nhiệm vụ: Hãy báo giá hiện tại, xu hướng ngắn hạn/dài hạn dựa trên các đường EMA20/50/200 và chỉ số RSI của mã này. Trình bày ngắn gọn.\n`;
    } else if (explicitCommand === "predict") {
      contextStr += `Nhiệm vụ: Hãy phân tích xu hướng hiện tại và dự đoán khả năng phát triển, tăng trưởng của mã ${symbols[0]} trong tương lai gần (1-4 tuần tới). YÊU CẦU BẮT BUỘC: Đưa ra tỷ lệ dự đoán chuẩn xác/mức độ tin cậy cụ thể trên thang điểm 100% (Ví dụ: Độ tin cậy dự đoán: 78/100) kèm lý luận kỹ thuật chặt chẽ. Trình bày đẹp mắt sử dụng Markdown.\n`;
    } else if (explicitCommand === "scenarios") {
      contextStr += `Nhiệm vụ: Xây dựng 3 kịch bản phát triển có khả năng xảy ra nhất cho mã ${symbols[0]} (Uptrend, Downtrend, Sideways). YÊU CẦU BẮT BUỘC: Đưa ra xác suất xảy ra (%) cho từng kịch bản trên thang điểm 100% (tổng 3 kịch bản cộng lại là 100%) và hành động tương ứng ứng với mỗi kịch bản. Trình bày đẹp mắt sử dụng Markdown.\n`;
    }
  } else {
    contextStr += `\nNhiệm vụ: Người dùng đang thảo luận/hỏi về cổ phiếu này. Hãy sử dụng bộ số liệu thời gian thực trên để phân tích và trả lời thắc mắc của họ một cách chuyên nghiệp và chính xác nhất, tránh nói chung chung. Trình bày sử dụng Markdown.\n`;
  }

  return contextStr;
}
