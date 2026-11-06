# Database và tính nhất quán

Schema Prisma cùng migration SQL là đặc tả thực thi. Các thực thể được gộp khi quan hệ 1:1 không cần bảng riêng.

## Cụm dữ liệu

- Identity: User, Session, OAuthAttempt, Group, GroupMember, GroupInvitation.
- Fund: Fund (privacy/approval/bank settings), Category, FundPeriod, MemberDue, DueAdjustment.
- Finance: Transaction, LedgerEntry, Approval, ContributionAllocation. Transfer và reversal liên kết trực tiếp Transaction (targetFundId, reversalOfId).
- Banking: StatementImport, BankTransaction, Reconciliation, WebhookEvent.
- Public: Attachment (review/privacy), Announcement, ContributionRequest.
- System: AuditLog, Notification, RateLimit, IdempotencyRecord.

Group role là enum array trên membership; quyền là policy cố định trong mã, không role do client tự khai. Mọi quan hệ tài chính phải được service xác nhận cùng group/fund trước khi ghi. FK, unique và index bảo đảm tham chiếu, tra cứu và dedup.

## Ledger

INCOME/OPENING: CASH +amount, COUNTER -amount. EXPENSE: CASH -amount, COUNTER +amount. TRANSFER: CASH -amount quỹ nguồn, CASH +amount quỹ đích. REVERSAL: đảo dấu toàn bộ entries của giao dịch gốc. Tổng mọi entries của một giao dịch bằng 0, được kiểm tra bởi deferred trigger khi commit.

Mỗi giao dịch có amount > 0; entry khác 0; tiền bigint, API chuỗi. Chỉ POSTED tham gia số dư. Chứng từ bắt buộc cho OPENING. Một giao dịch chỉ đảo một lần và giao dịch đảo phải trải qua phê duyệt bình thường.

## Atomicity/concurrency/idempotency

- Ghi sổ/đảo/chuyển: serializable transaction; khóa tất cả fund rows theo ID tăng dần; kiểm tra trạng thái và đủ tiền trong khóa; retry lỗi serialization tối đa 3 lần.
- DRAFT không có entries. APPROVED được ghi entries rồi POSTED trong cùng commit. Không trạng thái nửa chuyển.
- Unique transaction idempotency key theo người + request scope, lưu request hash; cùng key khác payload trả 409.
- Unique bank transaction fingerprint theo quỹ; unique reconciliation(bankTransactionId, transactionId); webhook provider + event id unique.
- Trigger cấm UPDATE/DELETE posted transaction, posted entries và audit logs. Migration owner vẫn có đặc quyền quản trị; production app dùng DB role riêng không có DDL.

## Báo cáo

Opening = CASH trước start; income/expense = dòng tiền đối ngoại trong kỳ; transfer trình bày riêng; closing = opening + net tất cả CASH trong kỳ. Reversal phân loại theo bút toán gốc, hoàn tiền giảm thu/thu hồi giảm chi. Public aggregates yêu cầu showSummary, transactions yêu cầu isPublic.
