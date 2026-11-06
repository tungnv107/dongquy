# Rà soát bảo mật ngày 06/11/2026

Phạm vi: mã ứng dụng, xác thực/CSRF, phân quyền nhóm/quỹ, dữ liệu công khai, tải chứng từ/sao kê, dependency npm và cấu hình Docker triển khai.

## Các vấn đề đã sửa

| Vấn đề                                                      | Tác động                                                                          | Bản sửa                                                                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Tin địa chỉ đầu tiên của X-Forwarded-For                    | Giả IP để tạo bucket giới hạn mới phía sau proxy nối thêm IP                      | Dùng địa chỉ cuối do proxy thêm, kiểm tra/canonicalize IP; ứng dụng chỉ truy cập qua mạng Docker và loopback                                   |
| Giới hạn login chỉ theo cặp IP/email                        | Đổi IP hoặc đổi email để tăng số lần thử mật khẩu                                 | Bổ sung giới hạn riêng theo tài khoản và IP, giữ giới hạn cặp IP/email                                                                         |
| MANAGER tạo quỹ với dualControl=false                       | Vượt quyền OWNER trong cấu hình kiểm soát phê duyệt                               | Kiểm tra OWNER khi tắt dual control cả lúc tạo và cập nhật                                                                                     |
| Giao dịch từ quỹ PRIVATE xuất hiện ở quỹ nhận PUBLIC        | Lộ nội dung/metadata giao dịch của quỹ riêng tư qua danh sách, chi tiết và export | Serializer công khai chỉ truy vấn nguồn PUBLIC/UNLISTED đang hoạt động trong nhóm đang hoạt động                                               |
| ZIP chỉ kiểm tra kích thước khai báo                        | XLSX giả kích thước có thể gây cạn bộ nhớ khi giải nén                            | Yauzl đọc tuần tự, xác minh kích thước thực tế, tối đa 30 MiB/999 entries trước ExcelJS; từ chối trùng entry, mã hóa và đường dẫn không hợp lệ |
| CSV chỉ giới hạn cột ở tiêu đề                              | Dòng dữ liệu quá rộng vượt giới hạn import                                        | Giới hạn từng dòng 50 cột, 1.000 dòng dữ liệu, độ dài ô 10.000 ký tự                                                                           |
| Danh sách riêng và nhận lời mời thiếu kiểm tra nhóm bị khóa | Thành viên tiếp tục thấy nhóm/quỹ bị đình chỉ hoặc nhận lời mời vào nhóm đó       | Lọc group.active và chặn nhận lời mời khi nhóm không hoạt động                                                                                 |
| minimatch 10.2.6 trong công cụ lint                         | DoS qua glob amplification; 8 cảnh báo npm cùng nguyên nhân                       | Override có phạm vi @typescript-eslint/typescript-estree sang minimatch 11.0.1                                                                 |

Tham chiếu dependency: [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). Cách xác minh kích thước giải nén: [yauzl](https://github.com/thejoshwolfe/yauzl#openreadstreamentry-options-callback).

## Triển khai

- `compose.npm.yml`: NPM gọi `http://dongquy-app:3000` qua `npm_proxy`; host chỉ mở loopback `127.0.0.1:3004` để kiểm tra.
- PostgreSQL không publish port, nằm trên mạng backend nội bộ; app dùng role riêng không có quyền DDL/superuser.
- Container ứng dụng chạy user node, bỏ capabilities, no-new-privileges, giới hạn memory/CPU/PIDs và log rotation.
- Secrets mới được tạo trên server, `.env.production` có mode 600; không commit .env, khóa, dữ liệu mẫu, uploads hoặc backup.
- APP_URL ở cả build và runtime là `https://dongquy.online`; cookie Secure và kiểm tra Origin theo tên miền này.
- Production khởi tạo database trống; không chạy seed. Google OAuth và webhook vẫn tắt khi chưa có credentials.

## Kiểm chứng

Kết quả thực tế: `npm audit` 0 lỗ hổng (cả dev và production); 21/21 unit test; 26/26 kiểm thử tích hợp PostgreSQL; 3/3 E2E Chromium trên production build với TRUST_PROXY=true; TypeScript và production build đạt; lint 0 lỗi, 3 cảnh báo unused imports có sẵn trong script tạo poster. Các kiểm thử hồi quy nằm trong `tests/unit/security.test.ts`, `tests/e2e/security.spec.ts` và `scripts/integration.ts`.

Tải PDF kiểm tra magic bytes và một số dấu hiệu nội dung chủ động, đồng thời áp dụng CSP sandbox; đây không phải bộ quét malware đầy đủ. Phân quyền và duyệt thủ công chứng từ vẫn cần được thực hiện trước khi công khai.
