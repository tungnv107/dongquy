# REST API v1

Base `/api`. JSON `{data: ...}` hoặc `{error: {code, message, details?}}`. Tiền VND chuỗi số nguyên, ngày ISO. GET danh sách có page/pageSize (tối đa 100), q, from, to, type/category tùy endpoint. Mutations JSON require same-origin; financial create yêu cầu header `Idempotency-Key` (UUID khuyến nghị).

## Identity

- POST `/auth/register`, `/auth/login`, `/auth/logout`
- GET `/auth/me`, `/auth/google`, `/auth/google/callback`
- PATCH `/auth/profile`; POST `/invitations/accept`

## Nhóm/quỹ

- GET/POST `/groups`; PATCH `/groups/:id`
- GET/POST `/groups/:id/members`; PATCH `/groups/:id/members/:memberId`
- POST `/groups/:id/invitations`
- GET/POST `/funds`; GET/PATCH `/funds/:id`
- GET/POST `/funds/:id/categories`
- GET `/dashboard`, `/notifications`; POST `/notifications/read`

## Finance

- GET/POST `/transactions`; GET/PATCH `/transactions/:id`
- POST `/transactions/:id/submit|approve|reject|post|reverse`
- GET/POST `/periods`; PATCH `/periods/:id` với `{closed: boolean}`; POST `/periods/:id/adjustments`
- POST `/contributions` phân bổ tiền đã ghi vào nghĩa vụ cùng thành viên/quỹ
- POST `/contribution-requests/:id/confirm` chỉ khi có transaction đã đối soát
- GET `/reports?fundId=&from=&to=&format=json|csv|xlsx|pdf`

## Banking/tệp/hoạt động

- POST `/statements/preview` (multipart) → headers/rows/mapping candidates
- POST `/statements/import` (JSON đã ánh xạ) → inserted/duplicates
- GET `/reconciliations?fundId=`; POST `/reconciliations`
- POST `/webhooks/bank` adapter HMAC SHA-256, timestamp trong 5 phút, dedup; chỉ hàng chờ
- GET/POST `/attachments`; GET `/attachments/:id`; PATCH `/attachments/:id`
- GET/POST `/announcements`; GET `/audit-logs`
- GET `/admin`; PATCH `/admin/users/:id` (disable, không quyền quỹ); PATCH `/admin/groups/:id` và `/admin/funds/:id` với `{active: boolean}` (audit bắt buộc)
- GET `/health` kiểm tra DB

## Public (không phiên)

- GET `/public/funds`
- GET `/public/funds/:slug` (gồm danh sách chứng từ đã duyệt) và `/statistics|transactions|contributors|reports|activities`
- GET `/public/funds/:slug/transactions/:id`
- POST `/public/funds/:slug/contribute` → request PENDING, không đổi balance

Các quỹ Private trả 404; Unlisted chỉ truy cập bằng slug, không xuất hiện danh sách/sitemap. Public exports yêu cầu allowExport và chỉ chứa transactions cho công khai. Tệp chỉ tải công khai khi isPublic + reviewed + transaction POSTED/public và fund không private.

## Lỗi

400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN/CSRF, 404 NOT_FOUND, 409 CONFLICT/INSUFFICIENT_FUNDS/IDEMPOTENCY_CONFLICT, 413 FILE_TOO_LARGE, 429 RATE_LIMITED, 503 NOT_CONFIGURED. Không trả stack trace/bí mật.
