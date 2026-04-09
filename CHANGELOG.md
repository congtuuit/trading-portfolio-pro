# Changelog

## [2026-04-09] Trading Portfolio Pro v1.0.0 (Widget Update)
### Added
- **Floating AI & Portfolio Widget**: Bong bóng AI tự động nổi ở góc trái mọi website, tích hợp Side Panel xem/thêm giao dịch nhanh chóng và Chat AI thời gian thực.
- Sử dụng **Shadow DOM** để đóng gói toàn bộ CSS, bảo vệ giao diện widget khỏi các style phá bĩnh từ host website.
- **Background Cors Proxy**: Lấy dữ liệu chứng khoán thông qua background service worker để vượt mặt chính sách `CORS`. 

### Changed
- Refactored hàm render UI (`ui.js`) để nhận tham số DOM (Shadow Root) thay vì tra thẳng từ `document` chính.

### Fixed
- Lỗi `Failed to fetch` khi gọi web resources từ môi trường strict CSP.
- Sửa lỗi UI component sập ("Cannot set properties of null") do thiếu template nội dung DCA và Close Modal bên trong Shadow DOM.
