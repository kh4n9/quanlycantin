# Quản lý căn tin phạm nhân

Ứng dụng web lập **phiếu bán hàng** cho can phạm tại căn tin. Mỗi phiếu ghi họ tên,
năm sinh, buồng giam của can phạm và danh sách mặt hàng kèm số lượng.

Không có danh mục can phạm riêng: thông tin can phạm được nhập thẳng trên phiếu.
Khi lập phiếu, ô họ tên tự gợi ý những người đã mua trước đây (suy ra từ chính các
phiếu cũ) — chọn một gợi ý là tự điền luôn năm sinh và buồng giam.

## Chạy ứng dụng

```bash
npm install     # chỉ cần chạy lần đầu
npm run dev     # mở http://localhost:3000
```

Khi dùng thật, nên chạy bản đã tối ưu cho nhanh và ổn định:

```bash
npm run build
npm start
```

## Các màn hình

| Màn hình | Việc dùng |
|---|---|
| **Bán hàng** | Nhập thông tin can phạm → nhập số lượng từng mặt hàng → lưu phiếu và in |
| **Phiếu bán** | Tra cứu theo ngày, **sửa** lại, xem và in lại phiếu đã lập |
| **Mặt hàng** | Danh mục mặt hàng, đơn vị tính, giá bán, **tắt/bật bán** |
| **Báo cáo** | Số phiếu, số lượng hàng, mặt hàng và can phạm mua nhiều; xuất Excel |
| **Cài đặt** | Tên đơn vị in trên phiếu, sao lưu, nạp/xoá dữ liệu |

Bấm `Alt + 1…5` để chuyển nhanh giữa các màn hình. Địa chỉ trang nhớ màn hình
đang mở (ví dụ `http://localhost:3000/#phieu`).

## Nhập liệu nhanh ở màn hình Bán hàng

Thứ tự gõ tự nhiên, `Enter` nhảy sang ô kế tiếp:

**Họ và tên → Năm sinh → Buồng giam → Mặt hàng**

- Gõ vài chữ trong ô họ tên để thấy gợi ý người đã mua trước đây; `↑` `↓` rồi
  `Enter` để chọn — năm sinh và buồng giam tự điền theo.
- Người mua lần đầu thì cứ gõ tên mới và điền năm sinh, buồng giam bình thường.
- Ở ô mặt hàng, gõ **số lượng + dấu cách + tên hàng**, ví dụ `5 mì` rồi `Enter`
  — thêm ngay 5 gói mì.
- Gõ không dấu vẫn tìm được (`mi tom` ra `Mì tôm`).
- Sửa số lượng trực tiếp trong bảng; `Enter` ở ô số lượng quay lại ô tìm hàng.
- `Ctrl + Enter` để lưu phiếu.
- Thêm cùng một mặt hàng hai lần thì số lượng tự cộng dồn.

Nếu không dùng đến tiền, cứ để **giá bán = 0**: phiếu in và báo cáo sẽ chỉ hiện
mặt hàng cùng số lượng, không có cột đơn giá/thành tiền.

## Tắt / bật bán một mặt hàng

Ở màn hình **Mặt hàng**, cột *Trạng thái* có nút bấm đổi qua lại giữa **Đang bán**
và **Tạm dừng**. Mặt hàng tạm dừng sẽ **không hiện** trong ô chọn hàng ở màn hình
Bán hàng, nhưng vẫn giữ nguyên trong các phiếu cũ và trong báo cáo.

Dùng khi hết hàng, hàng lỗi, hoặc tạm thời không bán nữa — không cần xoá mặt hàng.
Thanh công cụ cũng có bộ lọc *Tất cả trạng thái / Đang bán / Tạm dừng bán*.

## Sửa phiếu bán

Ở màn hình **Phiếu bán**, bấm nút bút chì ở dòng cần sửa. Hộp thoại mở ra với đầy
đủ thông tin cũ; sửa xong bấm *Lưu thay đổi* (hoặc `Ctrl + Enter`).

- **Số phiếu giữ nguyên**, chỉ nội dung thay đổi.
- Sửa danh sách mặt hàng thì tiền được **tính lại** theo giá hiện tại của mặt hàng.
- Không đụng tới danh sách hàng thì các dòng hàng giữ nguyên.
- Phiếu sửa xong vẫn in ra bình thường.

## Dữ liệu và sao lưu

Toàn bộ dữ liệu nằm trong một file duy nhất: **`data/db.json`**.

- **Sao lưu**: vào *Cài đặt* → *Tải file sao lưu (JSON)*.
- **Khôi phục**: chép đè nội dung file sao lưu vào `data/db.json` rồi tải lại trang.
- **Xoá sạch để nhập dữ liệu thật**: *Cài đặt* → *Xoá sạch dữ liệu*.
- Muốn dùng nhiều máy cùng lúc thì chép cả thư mục dự án; dữ liệu vẫn nằm ở máy
  chạy `npm start`.

## Ghi chú kỹ thuật

- Next.js 16 + React 19 + Tailwind CSS 4, không dùng thêm thư viện ngoài.
- Máy chủ đọc/ghi file `data/db.json`, có hàng đợi ghi và thử lại khi Windows
  tạm khoá file (OneDrive, antivirus) để không mất dữ liệu.
- Thông tin can phạm nằm ngay trên phiếu, nên sửa gì cũng không làm đổi các phiếu
  đã lập trước đó.
- Mặt hàng đã lên phiếu sẽ không bị xoá cứng mà chuyển sang *ngừng sử dụng*, giữ
  nguyên lịch sử.
- In phiếu: cỡ giấy A4, khổ dọc.
