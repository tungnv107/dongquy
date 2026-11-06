# MASTER PROMPT – XÂY DỰNG WEBSITE QUẢN LÝ QUỸ NHÓM

> **Group Fund Management Platform**  
> **Định hướng:** Transparency First · Mobile First · Financial Accuracy · Security by Design

## 1. Vai trò AI

Bạn là **Senior Full-stack Engineer, Software Architect, Fintech Product Designer, UI/UX Designer và QA Engineer**, có kinh nghiệm phát triển ứng dụng quản lý tài chính, quản lý quỹ cộng đồng và hệ thống công khai minh bạch tài chính.

Nhiệm vụ của bạn là phân tích, thiết kế và triển khai một **Website Quản lý Quỹ Nhóm (Group Fund Management Platform)** hoàn chỉnh, có khả năng sử dụng thực tế, mở rộng trong tương lai và vận hành ổn định.

**Yêu cầu đặc biệt:** Hệ thống phải có **trang Public công khai**, cho phép bất kỳ ai truy cập theo dõi hoạt động tài chính của từng quỹ mà **không cần đăng ký hoặc đăng nhập**.

Không chỉ xây dựng giao diện minh họa. Phải triển khai đầy đủ database, backend, API, frontend, authentication, authorization, nghiệp vụ tài chính, bảo mật, kiểm thử và tài liệu triển khai.

---

## 2. Mục tiêu sản phẩm

Xây dựng nền tảng giúp các nhóm quản lý và công khai tình hình sử dụng quỹ một cách minh bạch.

### 2.1. Đối tượng sử dụng

- Nhóm bạn bè, nhóm chơi thể thao.
- Lớp học, hội cựu sinh viên.
- Câu lạc bộ, đội nhóm.
- Nhóm đồng nghiệp, hội đồng hương.
- Nhóm thiện nguyện.
- Các cộng đồng có hoạt động thu, chi và đóng góp quỹ.

### 2.2. Mục tiêu cốt lõi

1. Quản lý nhiều nhóm và nhiều quỹ độc lập.
2. Quản lý thành viên và khoản đóng góp.
3. Ghi nhận thu, chi, chuyển quỹ và hoàn tiền.
4. Theo dõi số dư quỹ chính xác.
5. Công khai hoạt động tài chính với cộng đồng.
6. Thống kê và báo cáo tài chính trực quan.
7. Quản lý chứng từ, hóa đơn và hình ảnh giao dịch.
8. Phân quyền và phê duyệt giao dịch.
9. Hỗ trợ đối soát giao dịch ngân hàng.
10. Giao diện hiện đại, chuyên nghiệp, tối ưu trên điện thoại.

### 2.3. Nguyên tắc thiết kế

**Transparency First – Mobile First – Financial Accuracy – Security by Design.**

---

## 3. Kiến trúc hệ thống

Website được tổ chức thành **ba khu vực**.

### A. Public Website

Không yêu cầu đăng nhập.

| Đường dẫn | Chức năng |
|---|---|
| `/` | Trang chủ |
| `/funds` | Danh sách quỹ công khai |
| `/funds/[slug]` | Trang tổng quan quỹ |
| `/funds/[slug]/transactions` | Lịch sử thu chi |
| `/funds/[slug]/contributors` | Danh sách đóng góp công khai |
| `/funds/[slug]/reports` | Báo cáo quỹ |
| `/funds/[slug]/activities` | Hoạt động sử dụng quỹ |
| `/funds/[slug]/contribute` | Hướng dẫn đóng góp |

### B. Management Dashboard

Yêu cầu đăng nhập và phân quyền.

| Đường dẫn | Chức năng |
|---|---|
| `/dashboard` | Tổng quan |
| `/dashboard/groups` | Quản lý nhóm |
| `/dashboard/funds` | Quản lý quỹ |
| `/dashboard/members` | Thành viên |
| `/dashboard/transactions` | Giao dịch |
| `/dashboard/contributions` | Đóng góp |
| `/dashboard/expenses` | Khoản chi |
| `/dashboard/approvals` | Phê duyệt |
| `/dashboard/reconciliation` | Đối soát |
| `/dashboard/reports` | Báo cáo |
| `/dashboard/settings` | Cài đặt |
| `/dashboard/audit-logs` | Nhật ký kiểm toán |

### C. System Administration

Dành cho quản trị viên nền tảng:

- Quản lý tài khoản.
- Quản lý nhóm và quỹ.
- Quản lý trạng thái hệ thống.
- Cấu hình tích hợp.
- Nhật ký bảo mật.
- Theo dõi lỗi và hoạt động.

Quản trị viên nền tảng **không mặc nhiên** được phép tạo hoặc phê duyệt giao dịch tài chính của tất cả các quỹ. Các quyền can thiệp đặc biệt phải được xác định rõ và ghi nhật ký.

---

## 4. Chức năng quản lý nhóm

Hỗ trợ tạo và quản lý nhiều nhóm độc lập.

### 4.1. Thông tin nhóm

- Tên nhóm.
- Mã nhóm.
- Slug duy nhất.
- Logo hoặc ảnh đại diện.
- Ảnh bìa.
- Mô tả.
- Ngày thành lập.
- Người đại diện.
- Danh sách quản trị viên.
- Trạng thái hoạt động.
- Cấu hình công khai.

Một người dùng có thể tham gia nhiều nhóm và giữ các vai trò khác nhau.

### 4.2. Các loại quỹ

Mỗi nhóm có thể tạo nhiều quỹ:

- Quỹ chung.
- Quỹ hoạt động thường xuyên.
- Quỹ sự kiện.
- Quỹ thiện nguyện.
- Quỹ dự phòng.
- Quỹ theo năm hoặc theo chiến dịch.

Dữ liệu của các nhóm và quỹ phải được phân tách bằng kiểm soát truy cập tại backend.

---

## 5. Quản lý thành viên

### 5.1. Thông tin thành viên

- ID.
- Mã thành viên.
- Họ tên.
- Ảnh đại diện.
- Email.
- Số điện thoại.
- Ngày gia nhập.
- Vai trò.
- Trạng thái.
- Ghi chú nội bộ.

### 5.2. Vai trò và phân quyền

| Vai trò | Quyền chính |
|---|---|
| **Platform Admin** | Quản trị kỹ thuật của nền tảng |
| **Group Owner** | Chủ sở hữu nhóm |
| **Fund Manager** | Quản lý quỹ và các hoạt động |
| **Treasurer** | Thủ quỹ, ghi nhận và đối soát thu chi |
| **Approver** | Phê duyệt giao dịch |
| **Member** | Xem dữ liệu được cấp quyền và thông tin đóng góp của mình |
| **Public Viewer** | Xem dữ liệu được công khai mà không cần đăng nhập |

Một người có thể đảm nhiệm nhiều vai trò nếu cấu hình cho phép.

### 5.3. Quản lý đóng góp thành viên

Theo dõi:

- Tổng số tiền phải đóng.
- Tổng số tiền đã đóng.
- Số tiền còn phải đóng.
- Số tiền đóng dư.
- Các khoản được miễn, giảm.
- Lịch sử đóng góp.
- Đóng góp theo từng kỳ.
- Đóng góp tự nguyện.

Phải phân biệt **nghĩa vụ đóng quỹ, tiền thực nhận và số tiền còn nợ**; không tự động tính khoản chưa đóng thành tiền đã thu.

---

## 6. Quản lý tài chính quỹ

Đây là module nghiệp vụ quan trọng nhất.

### 6.1. Thu quỹ

Hỗ trợ các loại khoản thu:

- Đóng quỹ định kỳ.
- Đóng góp tự nguyện.
- Tài trợ.
- Thu từ sự kiện.
- Hoàn ứng.
- Lãi phát sinh.
- Các khoản thu khác.

Mỗi khoản thu có:

- Mã giao dịch.
- Quỹ nhận.
- Danh mục thu.
- Số tiền.
- Ngày phát sinh.
- Ngày ghi nhận.
- Người đóng góp.
- Người nhập.
- Phương thức thanh toán.
- Nội dung.
- Chứng từ.
- Trạng thái phê duyệt.
- Trạng thái hạch toán.
- Mã đối soát ngân hàng nếu có.

### 6.2. Chi quỹ

Hỗ trợ các nhóm chi:

- Ăn uống.
- Hoạt động, sự kiện.
- Quà tặng.
- Mua sắm vật dụng.
- Di chuyển.
- Hỗ trợ thành viên.
- Thiện nguyện.
- Chi phí vận hành.
- Khoản chi khác.

Mỗi khoản chi gồm:

- Mã chi.
- Quỹ chi.
- Số tiền.
- Danh mục.
- Ngày chi.
- Người đề nghị.
- Người nhận tiền.
- Người duyệt.
- Mô tả.
- Hình ảnh hóa đơn.
- Tệp đính kèm.
- Trạng thái.

### 6.3. Quy trình phê duyệt

Hỗ trợ luồng:

```text
DRAFT → PENDING_APPROVAL → APPROVED → POSTED
             └───────────→ REJECTED
```

Các quy tắc:

- Giao dịch chưa `POSTED` không làm thay đổi số dư quỹ.
- Giao dịch bị từ chối không làm thay đổi số dư.
- Phân biệt người tạo và người duyệt nếu quỹ yêu cầu kiểm soát hai người.
- Có thể cấu hình hạn mức phê duyệt.
- Có lý do từ chối.
- Có lịch sử phê duyệt.
- Không được âm thầm sửa giao dịch đã ghi sổ.

### 6.4. Công thức số dư

**Số dư cuối kỳ = Số dư đầu kỳ + Tổng thu đã ghi sổ – Tổng chi đã ghi sổ**

Đối với chuyển tiền giữa hai quỹ:

- Ghi giảm quỹ nguồn.
- Ghi tăng quỹ đích.
- Không được tính là nguồn thu mới của toàn bộ nhóm.
- Hai vế chuyển quỹ phải được thực hiện nguyên tử trong một database transaction.

Sử dụng **số nguyên cho số tiền VND**, không dùng kiểu floating-point để cộng trừ tiền.

Các giao dịch phải có mã định danh duy nhất và chống ghi nhận trùng.

Số dư hiển thị phải được tính từ sổ giao dịch hợp lệ hoặc từ các tổng hợp có cơ chế đối chiếu nhất quán với sổ gốc.

### 6.5. Điều chỉnh và hoàn tiền

Hỗ trợ:

- Hoàn lại khoản đóng góp.
- Thu hồi khoản chi sai.
- Điều chỉnh giao dịch.
- Hủy giao dịch bằng bút toán đảo.
- Bổ sung số dư đầu kỳ có chứng từ.

Giao dịch đã ghi sổ **không được xóa hoặc chỉnh sửa trực tiếp** các trường ảnh hưởng tới số dư. Phải tạo giao dịch đảo hoặc điều chỉnh có liên kết với giao dịch ban đầu.

Tất cả thay đổi đều phải có nhật ký kiểm toán.

---

## 7. Trang Public – Tính năng trọng tâm

Thiết kế khu vực Public là điểm nổi bật của sản phẩm.

### 7.1. Trang tổng quan quỹ

Ví dụ:

`https://domain.com/funds/quy-nhom-a`

**Thông tin quỹ**

- Logo.
- Tên quỹ.
- Mô tả.
- Người phụ trách được phép công khai.
- Thời gian hoạt động.
- Ngày cập nhật số liệu.
- Trạng thái hoạt động.

**Financial Overview** – các thẻ thống kê lớn:

- **SỐ DƯ HIỆN TẠI**
- **TỔNG TIỀN ĐÃ THU**
- **TỔNG TIỀN ĐÃ CHI**
- **SỐ GIAO DỊCH**
- **SỐ NGƯỜI ĐÓNG GÓP** (nếu cho phép công khai)

Có bộ lọc thời gian:

- Tháng này.
- Tháng trước.
- Quý này.
- Năm nay.
- Toàn bộ thời gian.
- Khoảng ngày tùy chọn.

Phải phân biệt rõ chỉ số trong kỳ và số dư lũy kế tại thời điểm cuối kỳ.

### 7.2. Biểu đồ tài chính

Triển khai:

- Biểu đồ thu chi theo tháng.
- Biểu đồ cơ cấu chi tiêu.
- Biểu đồ số dư theo thời gian.
- Biểu đồ đóng góp theo kỳ.
- Biểu đồ chi tiêu theo danh mục.

Sử dụng biểu đồ tương tác, có tooltip, bộ lọc và trạng thái dữ liệu rỗng.

### 7.3. Lịch sử giao dịch công khai

Bảng giao dịch gồm:

| Ngày | Nội dung | Loại | Số tiền |
|---|---|---|---:|
| 01/11/2026 | Đóng góp quỹ tháng 11 | Thu | +500.000đ |
| 02/11/2026 | Mua nước uống | Chi | -120.000đ |
| 03/11/2026 | Đóng góp tự nguyện | Thu | +200.000đ |

*Dữ liệu trên chỉ là minh họa.*

Có tính năng:

- Tìm kiếm theo nội dung.
- Lọc thu/chi.
- Lọc danh mục.
- Lọc thời gian.
- Sắp xếp.
- Phân trang.
- Xem chi tiết giao dịch.
- Xem chứng từ được công khai.
- Xuất báo cáo theo chính sách quỹ.

Chỉ hiển thị giao dịch đã được ghi sổ và được phép công khai.

### 7.4. Chi tiết giao dịch

Khi người xem chọn một giao dịch:

- Hiển thị mã giao dịch.
- Thời gian.
- Số tiền.
- Loại giao dịch.
- Nội dung.
- Danh mục.
- Quỹ liên quan.
- Chứng từ công khai.
- Thông tin xác minh hoặc phê duyệt được phép hiển thị.

Không công khai số tài khoản cá nhân, số điện thoại, địa chỉ, dữ liệu định danh, mã giao dịch nhạy cảm hoặc thông tin chưa được phép chia sẻ.

Chứng từ phải được rà soát và xử lý dữ liệu cá nhân trước khi công khai.

### 7.5. Danh sách người đóng góp

Có thể hiển thị:

- Tên công khai hoặc biệt danh.
- Tổng tiền đã đóng.
- Số lần đóng.
- Kỳ đóng.
- Trạng thái hoàn thành nghĩa vụ đóng quỹ.

Cho phép thành viên chọn ẩn danh.

Mặc định không công khai số tiền còn nợ và thông tin cá nhân của thành viên. Việc công khai từng khoản đóng góp hoặc nghĩa vụ đóng quỹ phải có cấu hình quyền riêng tư phù hợp.

### 7.6. Minh bạch chứng từ

Xây dựng thư viện chứng từ được phép công khai:

- Hóa đơn.
- Ảnh chụp giao dịch.
- Biên nhận.
- Biên bản hoạt động.
- Tệp PDF.

Hỗ trợ xem trước hình ảnh và PDF.

Không cho phép truy cập trực tiếp tệp nội bộ thông qua việc đoán URL.

### 7.7. Chia sẻ quỹ

- Sao chép liên kết.
- Chia sẻ Facebook, Zalo.
- Mã QR dẫn tới trang Public.
- Open Graph metadata.
- Ảnh chia sẻ.
- Slug dễ nhớ.

Chủ quỹ có thể lựa chọn:

- **Public:** Công khai, có thể xuất hiện trong danh sách quỹ.
- **Unlisted:** Người có đường dẫn mới truy cập được; không được coi là cơ chế bảo mật tuyệt đối.
- **Private:** Chỉ người được cấp quyền mới truy cập được.

Có thể cấu hình cho phép hoặc không cho phép công cụ tìm kiếm lập chỉ mục trang quỹ.

---

## 8. Công khai sao kê và đối soát ngân hàng

Xây dựng module hỗ trợ:

### 8.1. Giai đoạn cơ bản

- Nhập thủ công giao dịch.
- Upload sao kê CSV, Excel.
- Xem trước và ánh xạ cột.
- Phân tích ngày, nội dung, số tiền.
- Đề xuất ghép giao dịch ngân hàng với giao dịch nội bộ.
- Phát hiện giao dịch trùng.
- Xử lý sai lệch.
- Xác nhận đối soát bởi người có quyền.

### 8.2. Giai đoạn tích hợp nâng cao

Thiết kế cơ chế tích hợp các nhà cung cấp API/webhook ngân hàng hợp pháp, ví dụ SePay hoặc nhà cung cấp tương đương nếu có tài khoản, API và quyền truy cập hợp lệ.

Hỗ trợ:

1. Nhận webhook.
2. Xác thực nguồn gửi.
3. Kiểm tra trùng lặp.
4. Lưu raw event để truy vết an toàn.
5. Ghép giao dịch.
6. Phân loại tiền vào/tiền ra.
7. Đưa giao dịch chưa xác định vào hàng chờ.
8. Xác nhận và ghi sổ theo quy tắc được cấu hình.

Không tự động coi một webhook đã nhận là bằng chứng cuối cùng về giao dịch hợp lệ. Có cơ chế đối soát với dữ liệu chính thức.

Không triển khai truy cập ngân hàng bằng cách thu thập mật khẩu hoặc OTP của người dùng.

---

## 9. Đóng góp qua mã QR

Xây dựng trang:

`/funds/[slug]/contribute`

Hiển thị theo cấu hình:

- Tên quỹ.
- Mục đích đóng góp.
- Ngân hàng thụ hưởng.
- Tên chủ tài khoản nhận tiền.
- Số tài khoản nhận tiền.
- VietQR.
- Nội dung chuyển khoản gợi ý.
- Nút sao chép thông tin.

Thông tin tài khoản được hiển thị chỉ khi chủ tài khoản có quyền và đã chủ động cho phép công khai.

Hỗ trợ tạo nội dung chuyển khoản có mã tham chiếu, ví dụ:

```text
QUYNHOMA TV001 202611
```

Luồng xử lý:

1. Người dùng chọn đóng góp.
2. Nhập số tiền nếu cần.
3. Website hiển thị mã QR.
4. Người dùng thực hiện chuyển tiền bên ngoài hệ thống.
5. Website ghi nhận yêu cầu đóng góp ở trạng thái chờ.
6. Giao dịch chỉ được xác nhận thanh toán khi đã có bằng chứng nhận tiền và đối soát phù hợp.
7. Ghi nhận vào quỹ.
8. Cập nhật trang Public.

**Không mặc định coi việc hiển thị QR là thanh toán thành công.**

---

## 10. Quản lý kỳ đóng quỹ

Hỗ trợ tạo các kỳ thu:

- Hàng tháng.
- Hàng quý.
- Hàng năm.
- Theo chiến dịch.
- Theo sự kiện.

Mỗi kỳ có:

- Tên kỳ.
- Ngày bắt đầu.
- Hạn đóng.
- Số tiền tiêu chuẩn.
- Danh sách thành viên áp dụng.
- Khoản miễn, giảm.
- Trạng thái.
- Tổng phải thu.
- Tổng đã thu.
- Tổng còn phải thu.

Hỗ trợ ghi nhận thanh toán một phần, đóng dư và phân bổ tiền vào kỳ.

Thành viên có thể xem lịch sử và nghĩa vụ đóng quỹ của mình.

---

## 11. Báo cáo và thống kê

### 11.1. Báo cáo tổng hợp

- Tổng thu.
- Tổng chi.
- Số dư đầu kỳ.
- Số dư cuối kỳ.
- Biến động theo thời gian.

### 11.2. Báo cáo theo danh mục

- Phân loại khoản thu.
- Phân loại khoản chi.
- Tỷ trọng chi tiêu.
- Xu hướng theo tháng.

### 11.3. Báo cáo thành viên

- Tổng đóng góp.
- Đóng góp theo kỳ.
- Các khoản còn phải đóng.
- Thành viên chưa hoàn thành nghĩa vụ.
- Đóng góp tự nguyện.

### 11.4. Báo cáo đối soát

- Giao dịch đã đối soát.
- Giao dịch chưa ghép.
- Giao dịch nghi ngờ trùng lặp.
- Sai lệch cần xử lý.

### 11.5. Xuất dữ liệu

- Excel.
- CSV.
- PDF.

Báo cáo xuất từ Public chỉ chứa dữ liệu công khai. Báo cáo nội bộ phải tuân thủ phân quyền.

---

## 12. Dashboard quản trị

Thiết kế Dashboard chuyên nghiệp theo phong cách Fintech.

### 12.1. Thanh điều hướng

Desktop sử dụng Sidebar. Mobile sử dụng Bottom Navigation hoặc Drawer.

Menu:

- Tổng quan.
- Nhóm.
- Quỹ.
- Thu chi.
- Đóng góp.
- Thành viên.
- Phê duyệt.
- Đối soát.
- Báo cáo.
- Chứng từ.
- Cài đặt.

### 12.2. Trang tổng quan

Hiển thị:

- Số dư của từng quỹ.
- Tổng thu.
- Tổng chi.
- Giao dịch gần đây.
- Khoản chờ duyệt.
- Khoản chưa đối soát.
- Tiến độ đóng quỹ.
- Biểu đồ thu chi.
- Cảnh báo số dư thấp.
- Các hoạt động gần nhất.

### 12.3. Tương tác

- Thêm giao dịch bằng Modal hoặc Drawer.
- Bộ lọc nâng cao.
- Tìm kiếm nhanh.
- Phê duyệt theo quyền.
- Xem chi tiết.
- Thông báo trạng thái.
- Loading skeleton.
- Empty state.
- Error state.
- Confirm dialog cho thao tác quan trọng.

---

## 13. Thiết kế UI/UX

Website phải tạo cảm giác của một sản phẩm Fintech hiện đại, không giống trang quản trị CRUD cơ bản.

### 13.1. Phong cách

- Premium Fintech.
- Clean Dashboard.
- Modern SaaS.
- Minimalist.
- Professional.
- Data-driven.

### 13.2. Bảng màu đề xuất

| Màu | Mã HEX |
|---|---|
| Primary Navy | `#102A43` |
| Primary Blue | `#2563EB` |
| Success Green | `#10B981` |
| Expense Red | `#EF4444` |
| Accent Cyan | `#06B6D4` |
| Light Background | `#F5F7FB` |
| Dark Background | `#0B1220` |

### 13.3. Typography

Sử dụng **Be Vietnam Pro** hoặc **Inter**.

### 13.4. Yêu cầu trải nghiệm

- Light Mode.
- Dark Mode.
- Responsive.
- Mobile First.
- Hiển thị tiền Việt Nam chuẩn.
- Biểu đồ phù hợp giao diện.
- Bảng có hỗ trợ mobile.
- Tương phản và điều hướng đáp ứng WCAG 2.2 AA ở mức khả thi.
- Điều hướng bằng bàn phím.
- Phản hồi rõ ràng sau thao tác.
- Không lạm dụng animation.

Trang Public ưu tiên dễ đọc, minh bạch và tiếp cận dữ liệu nhanh.

Trang quản trị ưu tiên hiệu suất thao tác và khả năng phân tích.

---

## 14. Công nghệ đề xuất

Sử dụng phiên bản stable tương thích tại thời điểm triển khai.

### Frontend

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Lucide Icons.
- Recharts.
- TanStack Query.
- React Hook Form.
- Zod.

### Backend

- Next.js Route Handlers hoặc kiến trúc backend tách riêng nếu có lý do kỹ thuật rõ ràng.
- TypeScript.
- Prisma ORM.
- PostgreSQL.
- Redis cho cache, rate limiting hoặc job queue khi thực sự cần.

### Authentication

- Auth.js hoặc giải pháp tương đương.
- Đăng nhập Google.
- Đăng nhập email.
- Quản lý phiên đăng nhập an toàn.

### Storage

- S3-compatible Object Storage hoặc giải pháp lưu trữ tương đương.
- Signed URL cho tài liệu cần bảo vệ.
- Quản lý quyền truy cập theo từng tệp.

### Deployment

- Docker.
- Docker Compose.
- Reverse Proxy.
- HTTPS.
- PostgreSQL persistent volume.
- Backup và restore.
- Environment variables.
- Health check.

Cần phân biệt rõ cấu hình Development, Staging và Production.

---

## 15. Database Design

Thiết kế database chuẩn hóa, có khóa ngoại, index, constraint và migration.

### Accounts and Groups

- `Users`
- `Accounts`
- `Sessions`
- `Groups`
- `GroupMembers`
- `GroupInvitations`
- `Roles`
- `Permissions`

### Funds

- `Funds`
- `FundSettings`
- `FundAccounts`
- `FundCategories`
- `FundPeriods`
- `FundOpeningBalances`

### Finance

- `Transactions`
- `TransactionEntries`
- `TransactionApprovals`
- `TransactionReversals`
- `FundTransfers`
- `Contributions`
- `ContributionAllocations`
- `MemberDues`
- `MemberDueAdjustments`

### Banking

- `BankConnections`
- `BankStatementImports`
- `BankTransactions`
- `BankReconciliations`
- `WebhookEvents`

### Public

- `PublicFundSettings`
- `PublicProfiles`
- `PublicDocuments`
- `PublicAnnouncements`

### System

- `Attachments`
- `Notifications`
- `AuditLogs`
- `SystemSettings`
- `IdempotencyRecords`

Có thể tinh chỉnh các thực thể nếu đưa ra được phương án đơn giản hơn nhưng vẫn đảm bảo toàn vẹn dữ liệu.

**Yêu cầu đặc biệt:** Thiết kế sổ giao dịch theo hướng ledger có các bút toán liên quan rõ ràng, bảo đảm tính bất biến của dữ liệu đã ghi sổ và khả năng kiểm toán.

Phải định nghĩa đầy đủ các quy tắc về transaction, atomicity, idempotency, concurrency và consistency.

---

## 16. API Design

Thiết kế REST API rõ ràng, thống nhất.

### 16.1. Public API

```http
GET /api/public/funds
GET /api/public/funds/:slug
GET /api/public/funds/:slug/transactions
GET /api/public/funds/:slug/statistics
GET /api/public/funds/:slug/contributors
GET /api/public/funds/:slug/reports
```

### 16.2. Management API

```http
GET  /api/groups
POST /api/groups
POST /api/funds
GET  /api/funds/:id
POST /api/transactions
POST /api/transactions/:id/submit
POST /api/transactions/:id/approve
POST /api/transactions/:id/reject
POST /api/transactions/:id/reverse
POST /api/contributions
POST /api/statements/import
POST /api/reconciliations
```

API phải có:

- Kiểm tra phân quyền tại server.
- Validation.
- Phân trang.
- Bộ lọc.
- Error code nhất quán.
- API documentation.
- Audit logging.
- Idempotency cho thao tác tài chính.
- Rate limiting phù hợp.

---

## 17. Bảo mật và quyền riêng tư

Đây là yêu cầu bắt buộc.

1. Không công khai dữ liệu nội bộ trái với cấu hình quyền riêng tư.
2. Public API phải sử dụng cơ chế lọc trường dữ liệu được phép công khai.
3. Không dựa vào việc ẩn nút trên frontend để thực hiện phân quyền.
4. Ngăn chặn truy cập chéo dữ liệu giữa các nhóm.
5. Chống SQL injection, XSS, CSRF theo mô hình xác thực.
6. Quản lý token và session an toàn.
7. Kiểm tra định dạng, loại tệp và kích thước upload.
8. Mã hóa dữ liệu nhạy cảm khi cần thiết.
9. Ghi nhật ký hành động tài chính.
10. Không cho phép xóa chứng cứ kiểm toán bằng thao tác thông thường.
11. Chống replay webhook và nhập giao dịch trùng lặp.
12. Sao lưu và có quy trình khôi phục dữ liệu.
13. Không lưu bí mật trong mã nguồn.
14. Áp dụng nguyên tắc least privilege.
15. Đảm bảo các quyền công khai phù hợp quy định bảo vệ dữ liệu cá nhân hiện hành.

Tách rõ:

- Dữ liệu nội bộ.
- Dữ liệu được phép chia sẻ với thành viên.
- Dữ liệu công khai.
- Dữ liệu nhạy cảm không được công khai.

---

## 18. Thông báo và nhật ký

### 18.1. Thông báo

Hệ thống thông báo khi:

- Có khoản thu mới.
- Có khoản chi mới.
- Giao dịch chờ phê duyệt.
- Giao dịch bị từ chối.
- Thành viên hoàn thành đóng quỹ.
- Đến hạn đóng quỹ.
- Có giao dịch chưa đối soát.
- Có bất thường cần kiểm tra.

Tối thiểu triển khai thông báo trong ứng dụng. Email notification có thể triển khai ở giai đoạn tiếp theo.

### 18.2. Audit log

Lưu:

- Người thực hiện.
- Hành động.
- Đối tượng.
- Thời gian.
- Dữ liệu trước/sau trong giới hạn an toàn.
- Địa chỉ IP phù hợp chính sách bảo mật.
- Kết quả.
- Mã tương quan phục vụ truy vết.

---

## 19. Hiệu năng và SEO

### 19.1. Public Website

- Server-side Rendering phù hợp.
- Metadata.
- Open Graph.
- Sitemap cho quỹ cho phép index.
- Canonical URL.
- Caching có cơ chế vô hiệu hóa khi dữ liệu thay đổi.
- Tối ưu Core Web Vitals.
- Lazy loading cho bảng dài và hình ảnh.
- API pagination.
- Responsive hoàn chỉnh.

### 19.2. Management Dashboard

- Truy vấn tối ưu.
- Index database.
- Không tải toàn bộ lịch sử giao dịch khi không cần.
- Tối ưu danh sách lớn.
- Tránh truy vấn N+1.
- Cache chỉ cho dữ liệu phù hợp.
- Không hiển thị số dư cũ như số dư hiện tại mà không có thông báo.

---

## 20. Kiểm thử

Bắt buộc triển khai kiểm thử cho các nghiệp vụ trọng yếu.

### 20.1. Unit Test

- Tính số dư.
- Tổng thu/chi.
- Chuyển quỹ.
- Hoàn tiền.
- Đảo giao dịch.
- Phân bổ đóng góp.
- Tính khoản phải đóng.
- Đối soát và phát hiện trùng.

### 20.2. Integration Test

- Tạo nhóm.
- Tạo quỹ.
- Thêm thành viên.
- Tạo giao dịch.
- Gửi phê duyệt.
- Ghi sổ.
- Đảo giao dịch.
- Upload sao kê.
- Kiểm tra quyền truy cập.

### 20.3. E2E Test

1. Người quản trị tạo nhóm.
2. Tạo quỹ.
3. Thành viên đóng quỹ.
4. Thủ quỹ ghi nhận thu.
5. Người duyệt phê duyệt.
6. Hệ thống ghi sổ.
7. Trang Public cập nhật số dư.
8. Người ngoài truy cập xem được dữ liệu công khai mà không cần đăng nhập.

### 20.4. Security Test

- Truy cập chéo nhóm.
- Truy cập quỹ Private.
- Thay đổi dữ liệu qua API không có quyền.
- Upload tệp độc hại.
- Webhook trùng.
- Ghi sổ đồng thời.
- Sửa giao dịch đã ghi sổ.
- Rò rỉ dữ liệu cá nhân qua Public API.

---

## 21. Implementation Plan

Trước khi lập trình, hãy tạo các tài liệu:

1. `README.md` – Giới thiệu và hướng dẫn chạy.
2. `docs/PRODUCT_REQUIREMENTS.md` – Đặc tả sản phẩm.
3. `docs/SYSTEM_ARCHITECTURE.md` – Kiến trúc hệ thống.
4. `docs/DATABASE_DESIGN.md` – Thiết kế database.
5. `docs/API_SPECIFICATION.md` – Đặc tả API.
6. `docs/UI_UX_GUIDELINES.md` – Thiết kế giao diện.
7. `docs/IMPLEMENTATION_PLAN.md` – Kế hoạch triển khai.
8. `docs/SECURITY.md` – Bảo mật.
9. `docs/DEPLOYMENT.md` – Hướng dẫn triển khai.
10. `docs/TEST_PLAN.md` – Kế hoạch kiểm thử.

Trong `IMPLEMENTATION_PLAN.md`, tạo checklist theo từng task với trạng thái:

- `[ ]` Chưa thực hiện.
- `[x]` Đã hoàn thành và kiểm thử đạt.

### Các giai đoạn triển khai

| Giai đoạn | Phạm vi |
|---|---|
| **Phase 1 – Foundation** | Khởi tạo dự án, cơ sở dữ liệu, xác thực, phân quyền, Docker và hệ thống giao diện nền tảng |
| **Phase 2 – Group & Fund Management** | Quản lý nhóm, quỹ, thành viên, vai trò và danh mục thu chi |
| **Phase 3 – Financial Core** | Ledger, ghi nhận thu chi, tính số dư, phê duyệt, chuyển quỹ, hoàn tiền và đảo giao dịch |
| **Phase 4 – Public Transparency** | Trang Public, bảng giao dịch, thống kê, biểu đồ, chứng từ và kiểm soát công khai |
| **Phase 5 – Contributions** | Kỳ đóng quỹ, nghĩa vụ đóng góp, đóng góp tự nguyện và VietQR |
| **Phase 6 – Reports** | Dashboard, biểu đồ, báo cáo, xuất dữ liệu và các chỉ số quản trị |
| **Phase 7 – Banking Integration** | Nhập sao kê, đối soát và kiến trúc tích hợp webhook ngân hàng |
| **Phase 8 – Security & Testing** | Kiểm thử nghiệp vụ, quyền truy cập, hiệu năng, bảo mật và khả năng khôi phục |
| **Phase 9 – Production Deployment** | Docker, reverse proxy, HTTPS, migration, backup, monitoring và tài liệu vận hành |

---

## 22. Yêu cầu triển khai với Coding Agent

Tuân thủ nghiêm ngặt:

1. Đọc toàn bộ tài liệu của dự án trước khi triển khai.
2. Kiểm tra cấu trúc repository hiện tại trước khi thay đổi.
3. Không tạo lại các chức năng đã tồn tại và hoạt động đúng.
4. Triển khai theo `IMPLEMENTATION_PLAN.md`.
5. Mỗi task phải có kết quả và phương pháp kiểm thử.
6. Không đánh dấu hoàn thành nếu chưa kiểm thử đạt.
7. Cập nhật checkbox ngay sau khi xác minh task.
8. Không chỉ tạo giao diện giả lập hoặc sử dụng dữ liệu hardcode thay cho nghiệp vụ thật.
9. Không bỏ qua quy trình kiểm soát quyền truy cập.
10. Không tự động tạo ra số dư hoặc giao dịch không có căn cứ.
11. Có seed data minh họa tách biệt dữ liệu Production.
12. Không thay đổi kiến trúc tùy tiện khi chưa có lý do kỹ thuật.
13. Ghi nhận các quyết định kiến trúc quan trọng.
14. Xử lý lỗi thay vì bỏ qua lỗi.
15. Sau mỗi giai đoạn, chạy test, lint, typecheck và build phù hợp.
16. Nếu phát sinh vấn đề, khắc phục trước khi chuyển task phụ thuộc.
17. Các tích hợp bên ngoài chưa có credentials phải dùng adapter/mock có kiểm soát và ghi rõ chưa tích hợp thực tế.
18. Không tuyên bố hoàn thành một chức năng nếu mới chỉ có giao diện hoặc dữ liệu giả.

### Tiêu chí nghiệm thu quan trọng nhất

Một quản trị viên có thể tạo nhóm và quỹ, ghi nhận giao dịch thu chi thực, phê duyệt và ghi sổ. Hệ thống tính số dư chính xác và một người bất kỳ, không cần đăng nhập, có thể mở liên kết Public để xem báo cáo và lịch sử tài chính đã được cho phép công khai.

Sau khi hoàn thành các tài liệu kiến trúc và kế hoạch, triển khai trực tiếp theo thứ tự phụ thuộc của các task. Kiểm thử, cập nhật checklist và tiếp tục các task còn lại cho đến khi hoàn thành phạm vi đã thống nhất.

**Không dừng lại ở bản demo giao diện. Mục tiêu cuối cùng là một ứng dụng quản lý quỹ nhóm thực sự vận hành được, minh bạch, an toàn và sẵn sàng triển khai Production.**

---

## Phụ lục – Thứ tự ưu tiên cho MVP

1. **Public Dashboard:** Người ngoài xem được số dư, tổng thu chi, biểu đồ và lịch sử giao dịch.
2. **Quản lý thu chi:** Ghi nhận giao dịch, chứng từ, phê duyệt và tính số dư chính xác.
3. **Quản lý thành viên:** Theo dõi đóng góp từng thành viên, từng kỳ và số tiền còn phải đóng.
4. **VietQR đóng góp:** Tạo QR chuyển khoản và xác nhận giao dịch sau đối soát.
5. **Báo cáo minh bạch:** Lọc dữ liệu theo thời gian, xuất Excel/PDF và chia sẻ công khai.

**Định hướng mở rộng:** Thiết kế theo mô hình **Multi-Group, Multi-Fund**, mỗi nhóm có nhiều quỹ và mỗi quỹ có đường dẫn Public riêng. Cấu trúc này cho phép phát triển thành nền tảng dùng chung cho nhiều câu lạc bộ, lớp học và cộng đồng.
