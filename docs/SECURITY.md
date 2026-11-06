# Bảo mật và riêng tư

- Không tin fundId/groupId từ client: mọi service private kiểm tra active membership và role theo group của resource. Owner không được bỏ qua dual-control khi chính mình tạo transaction. Platform admin chỉ quản trị user/system.
- Password scrypt, session opaque/hashed/revocable/expiry, Secure cookies production; session disabled nếu user disabled. Không log token/password/bank secret.
- CSRF kiểm Origin với APP_URL; mutations JSON và same-origin; webhooks có HMAC riêng. Session throttle dùng DB rate limit, đăng nhập trả lỗi chung.
- Prisma parameterized queries; Zod whitelist input; React escaping; giới hạn body; response no-store cho tài chính; security headers và CSP.
- Public serializers whitelist fields; private fund 404; contributor displayName chỉ khi opted-in, mặc định ẩn danh; không public debts. Không sử dụng tên giao dịch nội bộ làm public description khi chưa duyệt.
- Public bank details phải consent; chứng từ public phải được rà soát/redaction thủ công trước upload và publish; file type/magic/size validated; không phục vụ SVG/HTML; attachment gateway chống đoán URL.
- SQL triggers chống chỉnh posted data/audit; app DB user phải không có DDL; backup được bảo vệ, diễn tập restore. Idempotency, atomic transfers, duplicate reconciliation, signed webhook window.
- Quản trị quyền cần ít nhất một active owner, không cho thành viên tự nâng quyền. Activity/audit trong ứng dụng, thao tác tài chính có correlation ID.
- Production hardening: HTTPS, secret ngẫu nhiên, backup encrypted/offsite, giám sát lỗi không PII, rotation credentials, scan file trước khi triển khai rộng, retention/legal review theo nơi vận hành. Không tuyên bố chứng nhận pháp lý hay audit độc lập.

Google OAuth và webhook adapter cần kiểm thử end-to-end với credentials hợp lệ trước khi bật cho người dùng thật.
