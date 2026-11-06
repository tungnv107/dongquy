# Đồng Quỹ — nền tảng quản lý quỹ nhóm

Ứng dụng tiếng Việt cho nhiều nhóm, nhiều quỹ, với sổ thu chi bất biến và trang minh bạch công khai. Đây là dự án có backend và PostgreSQL thật; dữ liệu mẫu chỉ được tạo bằng lệnh seed riêng.

## Chạy tại máy

Yêu cầu: Node.js 24 LTS, Docker Desktop (Linux containers).

```powershell
Copy-Item .env.example .env
npm ci
docker compose up -d db
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Mở http://localhost:3000. Tài khoản và mật khẩu seed được in bởi lệnh seed và lưu tại `data/dev-accounts.json` (được gitignore), không được tạo trong production. Có thể đăng ký tài khoản mới và bắt đầu với dữ liệu trống. Nếu đổi cổng, đặt `APP_URL` tương ứng trong `.env` và chạy `npm run dev -- --port <cổng>`.

Bản xem thử đã chuẩn bị cho phiên làm việc này chạy tại http://localhost:3139. Trang quỹ mẫu: `/funds/quy-song-xanh`; quản trị: `/dashboard`. Dữ liệu minh họa nằm trong PostgreSQL local, tách khỏi `dongquy_test` dùng kiểm thử.

## Kiểm chứng

```powershell
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:e2e
```

Kiểm thử tích hợp/E2E chỉ dùng cơ sở dữ liệu thử riêng, không xóa dữ liệu người dùng. E2E mặc định khởi động bản đã build tại cổng 3140; cần chạy `npm run build` trước. Có thể đặt `E2E_BASE_URL` để kiểm bản production trong Docker với database thử. Xem `docs/TEST_PLAN.md` và `docs/IMPLEMENTATION_PLAN.md` để biết trạng thái đã kiểm chứng.

## Tài liệu

- [Yêu cầu sản phẩm](docs/PRODUCT_REQUIREMENTS.md)
- [Kiến trúc](docs/SYSTEM_ARCHITECTURE.md)
- [Database và ledger](docs/DATABASE_DESIGN.md)
- [REST API](docs/API_SPECIFICATION.md)
- [Giao diện](docs/UI_UX_GUIDELINES.md)
- [Kế hoạch và trạng thái](docs/IMPLEMENTATION_PLAN.md)
- [Bảo mật](docs/SECURITY.md)
- [Rà soát và bản vá bảo mật 06/11/2026](docs/SECURITY_REVIEW_2026-11-06.md)
- [Vận hành](docs/DEPLOYMENT.md)
- [Kiểm thử](docs/TEST_PLAN.md)
- [Hướng dẫn sử dụng](docs/USER_GUIDE.md)
- [Kết quả kiểm chứng](docs/VERIFICATION.md)

Không tự động publish, deploy hoặc push. Google OAuth, HTTPS tên miền thật và webhook ngân hàng cần cấu hình vận hành/credentials riêng.
