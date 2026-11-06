# Kết quả kiểm chứng tại máy — 06/11/2026

Môi trường: Next.js 16.4.5 / React 19.3.1 / Prisma 7.10.1 / PostgreSQL 17. Bản production được build bằng Docker và chạy trên localhost; không publish/deploy/push ra bên ngoài.

| Hạng mục                      | Kết quả thực tế                                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                          | 13/13 đạt: số nguyên VND, ledger, chuyển/đảo, nghĩa vụ, CSV, tệp và ngày phát sinh                                                                                                  |
| Integration PostgreSQL        | 24/24 đạt; database riêng `dongquy_test`                                                                                                                                            |
| Browser E2E Chromium          | 2/2 đạt trong 25,3 giây; tạo nhóm/quỹ, hai người duyệt, ghi sổ, public 500.000đ, riêng tư, điều hướng/theme/mobile, XLSX/dedup/đối soát và xác nhận đóng góp không ghi tiền hai lần |
| Lint                          | Không lỗi                                                                                                                                                                           |
| Production build + TypeScript | Đạt trong Docker runner `dongquy:final`                                                                                                                                             |
| Dependency audit production   | `npm audit --omit=dev`: 0 vulnerabilities tại thời điểm kiểm tra                                                                                                                    |
| Tệp báo cáo thật              | CSV mở được; ExcelJS đọc XLSX 50 dòng với cột tiền numeric, tổng 34.120.000đ; PDF xuất và được render kiểm tra                                                                      |
| Backup/restore                | Khôi phục database mới: 56 giao dịch trước/sau; 0 journal mất cân đối                                                                                                               |
| Compose/Caddy                 | Cấu hình production parse được, Caddy validate thành công                                                                                                                           |
| Desktop/mobile                | Đã xem ảnh 1440px và 390px; 0 lỗi JavaScript, không tràn ngang; bảng mobile hiện ngày và số tiền                                                                                    |
| Axe WCAG                      | 7 trường hợp trang/theme (4 light, 3 dark): không phát hiện vi phạm WCAG 2/2.1/2.2 A/AA trong phạm vi axe                                                                           |
| Đọc API công khai             | 20 requests, concurrency 4, 0 lỗi; p50 162ms, p95 312ms, max 356ms trên dữ liệu mẫu local                                                                                           |

Integration chứng minh quyền theo nhóm (kể cả platform admin), kiểm soát hai người, hạn mức duyệt, last owner, lời mời một lần, idempotency, khóa ghi sổ đồng thời, chống âm quỹ, chuyển hai vế nguyên tử, bút toán đảo, sổ/audit bất biến ở PostgreSQL, phân bổ không vượt tiền thực nhận, khóa kỳ, nhắc hạn không trùng, chống rò rỉ Public DTO, giới hạn tệp, import trùng, mismatch đối soát, chữ ký/replay webhook và các định dạng xuất báo cáo.

Bằng chứng máy đọc được: `data/qa/integration.json`, `data/qa/accessibility.json`, `data/qa/public-load.json`, `test-results/e2e.json`. Ảnh kiểm tra: `data/qa/home-desktop.png`, `public-desktop.png`, `public-mobile.png`, `dashboard-desktop.png`, `dashboard-mobile.png`, `dashboard-dark-mobile.png`. Đây là dữ liệu local được gitignore.

Tệp xuất đã kiểm tra: `data/qa/export.csv`, `export.xlsx`, `export.pdf`, `exports.json`; PDF được Poppler nhận diện 4 trang A4 ngang, không JavaScript. Image bàn giao: `dongquy:final`, digest `sha256:9e7e4f8d1ac92da43279eb6adb5ad855cf1e203da885a36b36e7db980199ee69`.

## Phạm vi chưa được xác nhận ngoài môi trường local

- Google OIDC đã có adapter PKCE/state/nonce/JWKS; chưa có client credentials để kiểm thử đăng nhập với Google thật.
- Webhook ngân hàng là adapter HMAC được kiểm thử; chưa có tài khoản/provider sandbox để xác nhận với ngân hàng hoặc SePay thật. Webhook và QR không tự tạo tiền đã ghi sổ.
- Chưa cài tên miền, HTTPS public, máy chủ production, alerting hoặc backup offsite. Các cấu hình và hướng dẫn vận hành đã chuẩn bị; cần người vận hành cung cấp hạ tầng và yêu cầu triển khai.
- Kiểm tra axe tự động và đọc API local là kiểm chứng có giới hạn, không thay thế kiểm toán accessibility toàn diện, penetration test độc lập hay thử tải production.

Backup đã kiểm chứng: `backups/dongquy-20261106-122822.dump`, SHA-256 `91A6DEF24E8B7AF7EB210FB2C198A1CE5E694944211EDB2D4E794408613024E0`. Database khôi phục riêng: `dongquy_20261106_restore`; không ghi đè nguồn.
