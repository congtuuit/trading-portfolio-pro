/**
 * ==============================================================================
 * Trading Portfolio Pro - Google Apps Script Cloud Sync
 * ==============================================================================
 * Hướng dẫn cài đặt:
 * 1. Mở Google Sheets của bạn (hoặc tạo một trang tính mới tại https://sheets.new).
 * 2. Vào menu: Tiện ích mở rộng (Extensions) -> Apps Script.
 * 3. Xóa hết code mặc định trong file Code.gs và dán toàn bộ nội dung file này vào.
 * 4. Bấm biểu tượng "Lưu" (Save - Ctrl+S / Cmd+S).
 * 5. Bấm nút "Triển khai" (Deploy) ở góc trên bên phải -> "Tùy chọn triển khai mới" (New deployment).
 *    - Chọn loại (Select type): "Ứng dụng web" (Web app).
 *    - Mô tả (Description): Trading Portfolio Pro Sync API.
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me - your email).
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone).
 * 6. Bấm "Triển khai" (Deploy). Google sẽ yêu cầu Cấp quyền (Authorize Access) -> Chọn tài khoản Google của bạn -> Advanced -> Go to ... (unsafe) -> Allow.
 * 7. Copy URL của Ứng dụng web (Web App URL có dạng: https://script.google.com/macros/s/.../exec).
 * 8. Dán URL này vào mục: Cấu hình hệ thống -> Đồng bộ Cloud (Google Sheets) trên Extension.
 * ==============================================================================
 */

const SHEET_NAME = "Portfolio";
const HEADERS = ["ID", "Symbol", "Type", "Quantity", "Entry Price", "Stop Loss", "Take Profit", "Note", "Date", "Updated At"];

/**
 * Lấy hoặc tạo Sheet Portfolio với header chuẩn
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // Kiểm tra header row
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow === 0 || lastCol < HEADERS.length) {
    sheet.clear();
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setValues([HEADERS]);
    headerRange.setBackground("#1e222d");
    headerRange.setFontColor("#d1d4dc");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
    
    // Auto-fit columns
    for (let i = 1; i <= HEADERS.length; i++) {
      sheet.setColumnWidth(i, 130);
    }
  }
  return sheet;
}

/**
 * Xử lý GET Request: Pull danh mục từ Sheet về Extension hoặc Test kết nối
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "pull";
    
    // Hỗ trợ lưu qua GET query param (Fallback phòng trường hợp POST gặp chuyển hướng mạng)
    if (action === "push" && e.parameter.data) {
      const items = JSON.parse(decodeURIComponent(e.parameter.data));
      return savePortfolioToSheet(items);
    }
    
    if (action === "ping" || action === "test") {
      const sheet = getOrCreateSheet();
      const count = Math.max(0, sheet.getLastRow() - 1);
      return jsonResponse({
        success: true,
        message: "Kết nối Google Apps Script thành công!",
        sheetName: sheet.getName(),
        count: count,
        timestamp: new Date().toISOString()
      });
    }

    // Mặc định action = pull: Đọc dữ liệu ra mảng objects cho Extension
    const sheet = getOrCreateSheet();
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return jsonResponse({
        success: true,
        count: 0,
        data: [],
        timestamp: new Date().toISOString()
      });
    }

    const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    const portfolio = values.map(row => {
      const id = String(row[0] || "").trim();
      const symbol = String(row[1] || "").trim();
      const type = String(row[2] || "BUY").toUpperCase();
      const quantity = Number(row[3]) || 0;
      const entryPrice = Number(row[4]) || 0;
      const stopLoss = row[5] !== "" && row[5] !== null ? Number(row[5]) : null;
      const takeProfit = row[6] !== "" && row[6] !== null ? Number(row[6]) : null;
      const note = String(row[7] || "");
      const date = row[8] ? (typeof row[8] === "number" ? row[8] : new Date(row[8]).getTime()) : Date.now();

      return {
        id: id || ("trade_" + Date.now()),
        symbol: symbol,
        type: type,
        quantity: quantity,
        entryPrice: entryPrice,
        stopLoss: stopLoss,
        takeProfit: takeProfit,
        note: note,
        date: date,
        tpAlerted: false,
        slAlerted: false,
        t0Alerted: false
      };
    }).filter(item => item.symbol);

    return jsonResponse({
      success: true,
      count: portfolio.length,
      data: portfolio,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * Xử lý POST Request: Push danh mục từ Extension lên Sheet
 */
function doPost(e) {
  try {
    let payload = null;
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    let items = [];
    if (Array.isArray(payload)) {
      items = payload;
    } else if (payload && Array.isArray(payload.data)) {
      items = payload.data;
    } else if (payload && Array.isArray(payload.portfolio)) {
      items = payload.portfolio;
    } else {
      throw new Error("Dữ liệu danh mục không đúng định dạng mảng (Array)");
    }

    return savePortfolioToSheet(items);

  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

/**
 * Lưu danh sách lệnh vào Google Sheet
 */
function savePortfolioToSheet(items) {
  const sheet = getOrCreateSheet();
  
  // Xóa toàn bộ dòng dữ liệu cũ (giữ lại dòng tiêu đề header 1)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }

  if (!items || items.length === 0) {
    return jsonResponse({
      success: true,
      count: 0,
      message: "Đã xóa trắng danh mục trên Sheet theo yêu cầu",
      timestamp: new Date().toISOString()
    });
  }

  const nowIso = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const rows = items.map(t => [
    t.id || ("trade_" + Date.now()),
    t.symbol || "",
    t.type || "BUY",
    Number(t.quantity) || 0,
    Number(t.entryPrice) || 0,
    t.stopLoss !== null && t.stopLoss !== undefined ? Number(t.stopLoss) : "",
    t.takeProfit !== null && t.takeProfit !== undefined ? Number(t.takeProfit) : "",
    t.note || "",
    t.date || Date.now(),
    nowIso
  ]);

  sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);

  return jsonResponse({
    success: true,
    count: rows.length,
    message: "Đã đồng bộ thành công " + rows.length + " mã lên Google Sheet!",
    timestamp: new Date().toISOString()
  });
}

/**
 * Trả về JSON Output với chuẩn UTF-8
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
