# Kế hoạch kiểm thử

Unit: bigint arithmetic, date ranges, balance classification, dues/partial/overpayment/adjustments, bank fingerprint và CSV formula sanitization.

Integration với PostgreSQL riêng: tạo user/group/fund/member, approve/post/transfer/reverse, allocations, statement dedup/reconciliation. Truy vấn DB trực tiếp chứng minh posted ledger và audit bất biến. Chạy nhiều post đồng thời để xác nhận không âm/chuyển nửa vời/ghi trùng.

Security: 401 anonymous private API, 403 cross-group mutation, 404 private public fund, public DTO không PII/debt, dual-control, limits, POST không Origin, CSV formula injection, unsafe uploads, invalid/replayed webhook. Platform admin không mặc nhiên có quyền quỹ.

E2E Playwright: admin đăng ký → tạo nhóm/quỹ → thành viên thứ hai → thu nháp → gửi → duyệt bằng tài khoản khác → ghi sổ → public không login hiển thị balance. Kiểm các trang, mobile overflow, modal keyboard, theme, filters, exports. Chụp ảnh desktop/mobile để kiểm tra giao diện.

Build gate: lint + tsc + unit + integration + Next build + E2E. Lưu kết quả chính xác trong IMPLEMENTATION_PLAN. Kiểm thử tích hợp/E2E dùng DB riêng có `_test` trong tên, có guard chống production.
