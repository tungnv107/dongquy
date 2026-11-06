# Đặc tả sản phẩm

Nguồn yêu cầu: `PROMPT_WEBSITE_QUAN_LY_QUY_NHOM.md` trong repository. Toàn bộ tiền tệ là VND nguyên. Không đồng nhất nghĩa vụ đóng góp, yêu cầu đóng góp với tiền đã nhận.

## Phạm vi và nghiệm thu

1. Người dùng đăng ký/đăng nhập email; Google OIDC khi có cấu hình. Phiên có thể thu hồi.
2. Tạo nhóm, quỹ, thành viên nhiều vai trò, danh mục và cấu hình công khai. Platform admin không thừa hưởng quyền tài chính của nhóm.
3. Tạo nháp → gửi duyệt → duyệt → ghi sổ. Từ chối có lý do. Hai người nếu bật kiểm soát kép. Có hạn mức duyệt.
4. Thu, chi, chuyển quỹ nguyên tử, số dư đầu kỳ có chứng từ và đảo giao dịch (hoàn tiền/thu hồi). Không sửa/xóa sổ đã ghi. Chống số dư âm và trùng lặp.
5. Public / Unlisted / Private; Public DTO chỉ gồm trường cho phép. Công khai lịch sử chỉ POSTED và isPublic. Không lộ nợ, email, số điện thoại, tài khoản riêng hoặc raw bank events.
6. Kỳ đóng, miễn giảm, phân bổ một phần/đóng dư; số thực nhận từ bút toán đã ghi. Yêu cầu chuyển khoản/QR luôn chờ đối soát.
7. Sao kê CSV/XLSX có xem trước/ánh xạ, khử trùng, ghép gợi ý, xác nhận theo quyền. Webhook HMAC là adapter, không tự ghi sổ.
8. Chứng từ riêng có kiểm soát truy cập; công khai bản đã rà soát. Hoạt động quỹ, thông báo và audit trong ứng dụng.
9. Báo cáo theo ngày/danh mục, CSV/XLSX/PDF, biểu đồ, chia sẻ, metadata, sitemap, giao diện mobile và dark mode.
10. Docker/PostgreSQL/Caddy HTTPS, health check, backup/restore, kiểm thử và tài liệu vận hành.

## Ranh giới

- Sổ quỹ là sổ tiền thực tế; chuyển quỹ không tính vào thu mới toàn nhóm.
- Summary công khai là tổng hợp quỹ khi chủ quỹ bật công khai tổng hợp, có thể bao gồm giao dịch không công khai chi tiết; bảng chỉ hiển thị chi tiết được phép. Giao diện giải thích phạm vi này.
- Unlisted ngăn liệt kê/index, không phải mật khẩu.
- Đồng ý công khai thông tin nhận tiền là lựa chọn chủ động; mặc định tắt.
- Email gửi ra ngoài, kết nối ngân hàng thật và thanh toán online không giả lập là đã tích hợp.
