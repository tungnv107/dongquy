# Kế hoạch triển khai và kiểm chứng

Chỉ đánh dấu khi có bằng chứng chạy thành công. Không triển khai/publish/push tự động.

## Phase 1 — Foundation

- [x] Scaffold Next.js/TypeScript, dependencies, lint/typecheck/build. Kiểm chứng: lint và production Docker build gồm TypeScript.
- [x] PostgreSQL migration, constraints, seed development tách production. Kiểm chứng: migration deploy + seed + integration.
- [x] Session/email authentication, CSRF, rate limits; integration và E2E đăng ký/đăng nhập đạt. Google adapter PKCE/state/nonce có cấu hình và kiểm tra chưa cấu hình; đăng nhập Google thật chưa xác nhận do thiếu credentials.
- [x] Group-scoped authorization; platform admin độc lập quyền tài chính. Kiểm chứng: integration ACL.
- [x] Layout responsive, navigation, dark mode, trạng thái giao diện. Kiểm chứng: E2E đổi theme/menu mobile, ảnh desktop/mobile được xem thực tế.

## Phase 2 — Groups & Funds

- [x] CRUD nhóm/quỹ, phân quyền nhiều vai trò, membership/invitations. Kiểm chứng: integration tạo/sửa và lời mời một lần.
- [x] Cấu hình privacy, bank consent, approval policy, categories. Kiểm chứng: service tests và seed qua API domain.

## Phase 3 — Financial core

- [x] Ledger thu/chi/đầu kỳ; approval/reject/post, idempotency. Kiểm chứng: unit + integration.
- [x] Chuyển quỹ nguyên tử, khóa đồng thời, chống âm quỹ. Kiểm chứng: concurrent posting integration.
- [x] Đảo/hoàn tiền, sổ bất biến, audit và notifications. Kiểm chứng: reversal và SQL mutation bị từ chối.

## Phase 4 — Public transparency

- [x] Trang chủ, danh sách quỹ, public detail và các tabs. Kiểm chứng: SSR dữ liệu thật, E2E public không phiên và đọc trang thực tế.
- [x] Public DTO/visibility, giao dịch lọc/sort/pagination/chi tiết. Kiểm chứng: private 404, PII exclusion integration.
- [x] Biểu đồ, chứng từ có quyền, hoạt động, chia sẻ/QR/metadata/sitemap. Kiểm chứng: visual QA, E2E QR/Escape, sitemap và integration quyền tệp.

## Phase 5 — Contributions

- [x] Kỳ đóng, miễn giảm, một phần/đóng dư, phân bổ thực nhận, khóa/mở kỳ, nhắc hạn và thông báo hoàn thành. Kiểm chứng: unit dues + integration allocations/notifications.
- [x] Hướng dẫn VietQR có consent, yêu cầu chờ, xác nhận sau đối soát. E2E xác nhận PENDING không đổi balance, từ chối xác nhận thiếu đối soát, nhập XLSX và khử trùng, đối soát rồi CONFIRMED vẫn không ghi thu lần hai. Không gửi tiền thật.

## Phase 6 — Reports

- [x] Dashboard tổng hợp, báo cáo khoảng ngày/danh mục. Kiểm chứng: số dư từ sổ gốc, E2E 500.000đ, trang báo cáo và biểu đồ có dữ liệu thật.
- [x] Xuất CSV/XLSX/PDF theo privacy và group authorization. Kiểm chứng: mở bytes XLSX/PDF và kiểm tra CSV không chứa trường riêng.

## Phase 7 — Banking

- [x] Preview/column mapping CSV/XLSX, dedup imports. Kiểm chứng: CSV parser + import trùng; xuất XLSX đọc được.
- [x] Gợi ý và xác nhận reconciliation, mismatch handling. Kiểm chứng: exact-match và mismatch integration.
- [x] Webhook HMAC/replay protection và hàng chờ; integration thật cần credentials. Kiểm chứng: unsigned/expired/replay không ghi sổ.

## Phase 8 — Security & tests

- [x] Unit tests nghiệp vụ tài chính và ngày phát sinh: 13/13 pass.
- [x] Integration: group/fund/member/approval/post/reverse/import/ACL/periods/notifications: 24/24 pass.
- [x] Security: cross-tenant/private/public PII/files/replay/concurrency/immutability: nằm trong integration suite.
- [x] Browser E2E luồng nghiệm thu, desktop/mobile thực tế: 2/2 đạt (25,3 giây), gồm 12 trang quản trị, các tab public, QR chia sẻ, bộ lọc, theme/menu mobile và luồng đóng góp–XLSX–đối soát.
- [x] Lint, typecheck, production build pass. Docker runner build với Next.js production và TypeScript đã thành công.

## Phase 9 — Deployment readiness

- [x] Docker/Compose/Caddy/healthcheck và hướng dẫn production. Runner build, healthcheck DB, compose config và Caddy validate đạt tại máy.
- [x] Backup/restore scripts và kiểm thử restore riêng: dump/restore PostgreSQL; 56 giao dịch trước và sau khôi phục.
- [x] Tài liệu cấu hình development/staging/production, vận hành và giới hạn; đối chiếu Docker/Compose/Caddy và scripts thực tế.
- [ ] Live production deployment (chỉ khi người dùng yêu cầu và có credentials).

## Bằng chứng

Unit 13/13, integration 24/24 và E2E 2/2 đã chạy đạt. Npm audit production: 0 vulnerabilities sau override uuid 11.1.1 tương thích ExcelJS. Docker runner production build thành công. Visual QA: desktop/mobile/dark, 0 page errors, không tràn ngang. Axe bảy trường hợp trang/theme ở light và dark: không phát hiện vi phạm. Excel báo cáo đọc 50 dòng, tổng tiền khớp 34.120.000đ; PDF 4 trang render bằng Poppler. Xem `VERIFICATION.md` để biết bằng chứng và giới hạn. Production thực tế và provider credentials chưa được cung cấp.
