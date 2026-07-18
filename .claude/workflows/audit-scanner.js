export const meta = {
  name: "audit-scanner",
  description: "Kiểm tra toàn bộ thuật toán và dữ liệu quét của Cổ phiếu & Crypto",
  phases: [
    { title: "Kiểm tra Scorer", detail: "Phân tích logic scorer.js cho Cổ phiếu và Crypto" },
    { title: "Kiểm tra Scanner Data", detail: "Rà soát cấu trúc API và mapping dữ liệu trong scanner_data.js" }
  ]
};

// Phase 1: Audit Scorer.js
phase("Kiểm tra Scorer");
log("Đang bắt đầu phân tích logic scorer.js...");
const scorerAudit = await agent(
  "Hãy đọc file scorer.js. Kiểm tra các khía cạnh:\n" +
  "1. Trọng số và cách tính điểm các chỉ báo (Trend, Momentum, Volume, Safety, RS).\n" +
  "2. Logic phân loại isCrypto có hoạt động chính xác không (sử dụng type hoặc subtype).\n" +
  "3. Tính hợp lý của việc scale ATR và volume khi chấm điểm coin so với cổ phiếu.\n" +
  "Hãy chỉ ra bất kỳ điểm bất thường hoặc đề xuất cải tiến nào."
);
log("Đã hoàn thành phân tích scorer.js.");

// Phase 2: Audit Scanner Data
phase("Kiểm tra Scanner Data");
log("Đang bắt đầu rà soát scanner_data.js...");
const scannerAudit = await agent(
  "Hãy đọc file scanner_data.js. Kiểm tra các khía cạnh:\n" +
  "1. Cấu trúc payload gửi lên TradingView cho cả scanVietnamStocks và scanCryptoCoins.\n" +
  "2. Danh sách tickers trong scanCryptoCoins có chính xác không (Binance USDT pairs).\n" +
  "3. Mapping dữ liệu cột (index trong d array) có khớp hoàn toàn với danh sách columns yêu cầu không.\n" +
  "Hãy báo cáo bất kỳ lỗi lệch cột hoặc cấu hình không chính xác."
);
log("Đã hoàn thành rà soát scanner_data.js.");

return {
  scorerAudit,
  scannerAudit
};
