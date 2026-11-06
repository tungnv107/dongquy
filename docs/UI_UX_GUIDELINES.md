# Thiết kế giao diện

Tên sản phẩm: **Đồng Quỹ**. Định hướng xanh navy, xanh blue, nền giấy sáng, bố cục dữ liệu dễ đọc. Tiếng Việt thống nhất, định dạng VND vi-VN. Typography system Inter-compatible để không phụ thuộc tải font ngoài khi build.

Public: header tối giản, hero có nhận diện quỹ và huy hiệu công khai, số dư nổi bật, thẻ thu/chi/giao dịch, biểu đồ tương tác, bảng gần đây, mục tiêu và hoạt động. Các tabs tổng quan/giao dịch/đóng góp/báo cáo/hoạt động/hướng dẫn đóng góp có URL thật. Nêu rõ số liệu mẫu khi seed.

Dashboard: sidebar desktop, drawer mobile, topbar chuyển nhóm/quỹ, trạng thái phiên, theme switch, thông báo. Các trang quản lý dùng forms thật, filter, pagination, chi tiết và confirm dialog cho hành động ghi sổ/đảo. Trạng thái tiền có nhãn và màu, không dùng màu đơn độc.

Accessible: semantic landmarks, labels, skip link, focus-visible, dialog Escape và focus trap, live region cho kết quả/lỗi, tables cuộn trên mobile. 360px → 1440px. Dark mode lưu localStorage. Empty/loading/error states phải có hướng xử lý rõ.

Không số liệu giả trong components. Seed tách biệt và gắn nhãn. Không chỉ báo thành công cho việc tạo QR. Đồ thị chỉ là biểu diễn, tính toán tiền ở backend.
