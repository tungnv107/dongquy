# Hướng dẫn vận hành

## Oracle + Nginx Proxy Manager: dongquy.online

Repository: https://github.com/tungnv107/dongquy. Server: `161.118.222.102`, user SSH `ubuntu`, thư mục `/home/ubuntu/dongquy`.

Triển khai bằng `bash scripts/deploy-oracle.sh` trong checkout trên server. Script pull `main` bằng fast-forward, tạo secrets ngẫu nhiên chỉ lần đầu, build image ARM64 trực tiếp trên server, chạy migration rồi app. Các lần sau giữ nguyên secrets và named volumes. Không chạy seed trên production.

Cấu hình **Add Proxy Host** trong Nginx Proxy Manager đang chạy trên server này:

| Trường                | Giá trị                                                    |
| --------------------- | ---------------------------------------------------------- |
| Domain Names          | `dongquy.online`                                           |
| Scheme                | `http`                                                     |
| Forward Hostname / IP | `dongquy-app`                                              |
| Forward Port          | `3000`                                                     |
| Access List           | Publicly Accessible                                        |
| Cache Assets          | Tắt                                                        |
| SSL                   | Cấp chứng chỉ Let's Encrypt; bật Force SSL, HTTP/2 và HSTS |

Trong **Advanced** thêm `client_max_body_size 11m;` để nhận chứng từ. NPM và app dùng mạng Docker có sẵn `npm_proxy`. Không nhập `127.0.0.1` vào Forward Hostname: đó là loopback của container NPM. Host port `127.0.0.1:3004` phục vụ kiểm tra tại server, không mở ra Internet. Không cần thêm firewall/Oracle ingress cho port 3000/3004 hoặc PostgreSQL.

DNS A của `dongquy.online` cần trỏ về `161.118.222.102` trước khi cấp SSL. APP_URL cố định là `https://dongquy.online`; truy cập bằng tên miền HTTPS để đăng ký/đăng nhập. Mật khẩu DB nằm trong `/home/ubuntu/dongquy/.env.production` (mode 600), không có trong Git.

Kiểm tra và xem log:

```bash
cd /home/ubuntu/dongquy
docker compose -f compose.npm.yml --env-file .env.production ps
curl -fsS http://127.0.0.1:3004/api/health
docker exec npm-app-1 curl -fsS http://dongquy-app:3000/api/health
docker compose -f compose.npm.yml --env-file .env.production logs --tail=100 app
docker compose -f compose.npm.yml --env-file .env.production run --rm --no-deps maintenance
```

Cấp Platform Admin sau khi tài khoản đã đăng ký:

```bash
docker compose -f compose.npm.yml --env-file .env.production run --rm --no-deps maintenance npm run admin:grant -- email@example.com
```

Không dùng `docker compose down -v`: named volumes chứa dữ liệu production. Trước khi nâng cấp tiếp theo, sao lưu PostgreSQL và uploads bằng quyền owner, giữ bản sao ngoài server.

## Môi trường

Development: .env local, PostgreSQL container port 54329, chạy next dev. Seed chủ động, có cờ isDemo.
Staging: DB và storage riêng; kiểm thử migration/restore/provider sandbox; không dùng dữ liệu cá nhân production.
Production: NODE_ENV=production, APP_URL HTTPS, secrets riêng, Google callbacks khớp tên miền, bank webhook disabled nếu thiếu secret; không chạy seed.

## Docker

`docker compose up -d db` chỉ khởi động DB local. Production dùng `docker compose -f compose.production.yml --env-file .env.production up -d --build` sau khi người vận hành đã cấu hình secrets/domain. Không tự chạy lệnh này khi chưa được yêu cầu.

Caddy reverse proxy TLS tự động theo DOMAIN; app không expose ra host. Migration chạy bởi service migrate trước app; app role không có quyền DDL. PostgreSQL và uploads dùng persistent volumes. Health check `/api/health` xác nhận DB.

## Backup/restore

Scripts trong `scripts/` sử dụng pg_dump/pg_restore qua docker, file backup lưu ngoài public. Restore chỉ cho phép database đích có hậu tố `_restore` hoặc `_test`, không ghi đè production. Backup cả uploads cùng thời điểm, encrypt/offsite theo quy trình của người vận hành. Thử restore, kiểm số row/ledger balance trước khi chuyển lưu lượng.

## Checklist go-live

Credentials/domain thật; bỏ demo data; kiểm OAuth callback; SMTP nếu bổ sung gửi email; consent tài khoản nhận tiền; duyệt bản chứng từ; kiểm least-privilege DB role; backup/alerting/retention; thử hai người duyệt; thử webhook với nhà cung cấp được cấp phép. Generic HMAC adapter chưa phải SePay integration được chứng nhận.

## Công việc định kỳ

Chạy `npm run maintenance` mỗi ngày qua scheduler của môi trường triển khai. Lệnh tạo thông báo trong ứng dụng cho nghĩa vụ sắp đến hạn/quá hạn (khử trùng theo ngày), xóa session/OAuth attempts/rate-limit buckets hết hạn; không sửa ledger. Để cấp Platform Admin cho tài khoản đã đăng ký, người vận hành chạy `npm run admin:grant -- email@example.com`; thao tác có audit và không cấp membership/quyền quỹ.

Compose production tạo `dongquy_app` riêng không có quyền DDL; migration dùng `dongquy_owner`. Mật khẩu phải khác nhau, ngẫu nhiên và được URL-encode trong connection strings. Script init chỉ chạy lần đầu trên volume trống; không tự thay đổi password của volume đã tồn tại.

## Bản xem thử hiện tại

`dongquy-preview` phục vụ http://localhost:3139 và dùng database local `dongquy`; volume `dongquy_preview_uploads` giữ chứng từ. Container có `--rm`, nên sau khi dừng cần chạy lại thay vì `docker start`. PostgreSQL qua compose vẫn giữ dữ liệu trong named volume. Lệnh khởi động lại trên máy development:

```powershell
docker compose up -d db
docker run -d --rm --name dongquy-preview -p 127.0.0.1:3139:3000 -v dongquy_preview_uploads:/app/uploads -e DATABASE_URL=postgresql://dongquy:local_dev_only@host.docker.internal:54329/dongquy -e APP_URL=http://localhost:3139 dongquy:final
```

Đây là thông tin kết nối development cục bộ. Production dùng `.env.production` và mật khẩu riêng. Không chạy đồng thời `npm run dev -- --port 3139` với container preview trên cùng cổng. Tài khoản minh họa nằm tại `data/dev-accounts.json`.
