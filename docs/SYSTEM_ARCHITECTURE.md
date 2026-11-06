# Kiến trúc hệ thống và quyết định

## ADR-001: Monolith Next.js App Router

TypeScript, React, Next.js route handlers, Prisma và PostgreSQL. Server Components lấy dữ liệu qua cùng service với REST API; client forms gọi REST. Chỉ financial service được phép ghi ledger. DTO công khai tách khỏi dữ liệu nội bộ. Dùng Node runtime, không edge cho tài chính.

## ADR-002: PostgreSQL là nguồn sự thật

Không lưu balance có thể trôi. Tính tổng CASH entries của giao dịch POSTED. Tiền BIGINT, JS bigint khi tính; API dùng chuỗi số nguyên. Ghi sổ khóa hàng quỹ theo ID và transaction serializable có retry. Constraint/trigger PostgreSQL ngăn sửa ledger, giao dịch đã ghi và audit.

## ADR-003: Xác thực tương đương Auth.js

Scrypt password (salt ngẫu nhiên), opaque session token 256-bit, chỉ lưu SHA-256 token tại DB, cookie HttpOnly/SameSite=Lax/Secure trên HTTPS. Kiểm tra Origin cho mutations dùng cookie. Google OIDC authorization code + PKCE + state + nonce + chữ ký ID token; chỉ bật khi cấu hình. Không tự ghép tài khoản Google vào email/password hiện có.

## ADR-004: Tệp qua application gateway

Lưu tệp local volume ngoài public/; tên storage ngẫu nhiên. Endpoint tải lại kiểm tra membership/quyền công khai từng lần. Chỉ PDF/JPEG/PNG/WebP, kiểm tra magic bytes, dung lượng tối đa 10 MiB. Bản công khai cần xác nhận đã che thông tin riêng. Có thể thay adapter bằng S3/private bucket sau này, không đổi authorization.

## ADR-005: Triển khai đơn node trước

Docker app + PostgreSQL + Caddy. Rate limit dựa PostgreSQL để dùng được nhiều process. Không thêm Redis khi chưa cần. Cache public không lưu lâu, luôn no-store cho balance để bảo đảm cập nhật sau posting. Các tích hợp ngoài không có secret sẽ trả trạng thái chưa cấu hình.

## Luồng dữ liệu

Browser → route handler → validation/authentication → group policy → domain service → database transaction → ledger/audit/notification. Public → visibility policy → explicit DTO → SSR/client. Webhook → chữ ký/timestamp → event dedup → ngân hàng chờ đối soát, không ledger tự động.

Tài liệu framework tham khảo: https://nextjs.org/docs/app/getting-started/installation và https://www.prisma.io/docs/orm/v7.

## ADR-006: UI tự xây trên Radix và CSS

Dùng Radix Dialog để giữ focus/keyboard đúng, React Hook Form cho forms, TanStack Query cho server state, Recharts cho biểu đồ. CSS thuần được tổ chức theo thành phần và breakpoint; không thêm Tailwind/shadcn để tránh lớp cấu hình không cần thiết cho thiết kế riêng. Font Be Vietnam Pro được đóng gói local kèm giấy phép OFL. Cả luồng quản trị và public dùng dữ liệu từ backend.

Báo cáo đọc tổng hợp và biểu đồ trong một transaction RepeatableRead để cùng snapshot; dashboard gom số dư các quỹ bằng một groupBy. Số liệu tự cập nhật mỗi 30 giây và khi quay lại cửa sổ; lỗi cập nhật hiển thị rõ. Animation chart tắt để dữ liệu xuất hiện ngay và ổn định khi resize.
