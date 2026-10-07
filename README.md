# Quản lý căn tin phạm nhân

Ứng dụng web lập **phiếu bán hàng** cho can phạm tại căn tin. Mỗi phiếu ghi họ tên,
năm sinh, buồng giam của can phạm và danh sách mặt hàng kèm số lượng.

Không có danh mục can phạm riêng: thông tin can phạm được nhập thẳng trên phiếu.
Khi lập phiếu, ô họ tên tự gợi ý những người đã mua trước đây (suy ra từ chính các
phiếu cũ) — chọn một gợi ý là tự điền luôn năm sinh và buồng giam.

## Chạy ứng dụng

Cần có file `.env` ở thư mục gốc với thông tin kết nối MongoDB:

```env
MONGODB_URI=mongodb+srv://<tên-miền>/
MONGODB_USERNAME=<tài khoản>
MONGODB_PASSWORD=<mật khẩu>
MONGODB_DB=quanlycantin      # không bắt buộc, mặc định là "quanlycantin"
```

Nếu `MONGODB_URI` đã có sẵn tài khoản trong chuỗi thì bỏ qua `MONGODB_USERNAME`/`MONGODB_PASSWORD`.

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
| **Phiếu bán** | Tra cứu theo ngày, **sửa** lại, xem và in lại phiếu đã lập; **thùng rác** |
| **Mặt hàng** | Danh mục mặt hàng, đơn vị tính, giá bán, **tắt/bật bán** |
| **Báo cáo** | Số phiếu, số lượng hàng, mặt hàng và can phạm mua nhiều; xuất Excel |
| **Tài khoản** | Tạo tài khoản, bật/tắt từng quyền, đặt lại mật khẩu |
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

## Xuất Excel

Nút **Excel** ở các màn hình Phiếu bán, Mặt hàng và Báo cáo tải về file **`.xlsx` thật**
(đúng định dạng Office Open XML, không phải CSV đổi đuôi):

- Có sẵn dòng tiêu đề in đậm, tô nền, kẻ khung và độ rộng cột hợp lý.
- Cột tiền được định dạng số `#,##0`, mở lên là lọc và tính tổng được ngay.
- Tiếng Việt có dấu hiển thị đúng, không bị lỗi phông như CSV.
- Báo cáo xuất thành **4 trang tính** trong cùng một file: Tổng quan, Theo ngày,
  Mặt hàng, Can phạm.
- File phiếu bán có thêm cột trạng thái kiểm để đối chiếu với màn hình Kiểm phiếu.

## Đăng nhập và phân quyền

Lần đầu chạy, hệ thống tự tạo một tài khoản quản trị:

| Tên đăng nhập | Mật khẩu |
|---|---|
| `admin` | `admin` |

**Đổi mật khẩu này ngay sau lần đăng nhập đầu tiên.** Khi còn dùng mật khẩu ban đầu,
ứng dụng luôn hiện nhắc nhở ở đầu trang.

Mỗi tài khoản được **bật/tắt từng quyền riêng**, không theo nhóm cố định:

| Quyền | Cho phép làm gì |
|---|---|
| Xem phiếu bán | Xem danh sách, xem lại và in phiếu |
| Lập phiếu bán | Tạo phiếu bán mới |
| Sửa phiếu bán | Sửa nội dung phiếu đã lập |
| Xoá phiếu bán | Xoá phiếu khỏi hệ thống |
| Quản lý mặt hàng | Thêm, sửa, xoá, tắt/bật bán mặt hàng |
| Xem báo cáo | Xem báo cáo và xuất Excel |
| Sửa cài đặt và dữ liệu | Vào màn Cài đặt, sửa thông tin đơn vị, thiết lập thùng rác, nạp/xoá dữ liệu |
| Quản lý tài khoản | Tạo tài khoản, phân quyền, đặt lại mật khẩu |

Mục nào không có quyền thì **không hiện** trên thanh điều hướng, và API cũng chặn
tương ứng — không chỉ ẩn giao diện.

Mật khẩu lưu dạng băm scrypt kèm muối, **không xem lại được**. Nếu người dùng quên,
quản trị viên vào *Tài khoản* → nút chìa khoá để đặt lại mật khẩu mới.

Vài chốt chặn an toàn đã có:

- Không thể tự bỏ quyền quản lý tài khoản, tự khoá hay tự xoá tài khoản của mình.
- Luôn phải còn ít nhất một tài khoản đang hoạt động có quyền quản lý tài khoản.
- Sai mật khẩu 5 lần liên tiếp thì tạm khoá đăng nhập 60 giây.
- Phiên đăng nhập có chữ ký, hết hạn sau 7 ngày, cookie chỉ máy chủ đọc được.

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

## Mẫu phiếu in

Vào *Cài đặt* → thẻ **Mẫu phiếu in**. Sửa tới đâu thấy ngay trong khung **Xem trước**
bên phải, ưng thì bấm *Lưu mẫu in*. Nút *Khôi phục mặc định* trả về bản gốc.

**Bật/tắt từng phần:** số phiếu, ngày bán, năm sinh, buồng giam, ghi chú, cột ĐVT,
cột đơn giá, cột thành tiền, dòng tổng cộng, đọc tiền bằng chữ.

- Muốn phiếu **chỉ ghi số lượng** thì tắt *Cột đơn giá* và *Cột thành tiền*.
- Tắt cột thành tiền thì dòng *TỔNG CỘNG* tự đổi thành **tổng số lượng**, và ô
  *Đọc tiền bằng chữ* tự mờ đi vì không còn gì để đọc.

**Sửa chữ hiện trên phiếu:** tiêu đề phiếu, nhãn họ tên, năm sinh, buồng giam,
ghi chú, tiêu đề các cột, chữ ở dòng tổng cộng.

**Chữ ký:** thêm/bớt tuỳ ý, mỗi ô sửa được tên và dòng phụ bên dưới
(`(Ký, ghi rõ họ tên)`). Chọn **số chữ ký mỗi hàng** từ 1 đến 4 — ví dụ 4 chữ ký với
2 cột mỗi hàng sẽ in thành 2 hàng, mỗi hàng 2 ô.

Mẫu in áp dụng cho cả phiếu in ra lẫn cửa sổ xem trước ở màn hình Phiếu bán.

## Hàng thiếu và bù hàng

Khi bán mà căn tin chưa có đủ hàng, ghi lại phần còn nợ can phạm để sau này bù.

- Ở màn hình **Phiếu bán**, mỗi dòng có nút tam giác để mở hộp thoại **Hàng thiếu**.
  Dòng nào đang nợ hàng thì có nhãn vàng `thiếu N` và biểu tượng màu cam.
- Hộp thoại có hai chế độ:
  - **Ghi hàng thiếu** — nhập số lượng chưa giao được cho từng mặt hàng.
  - **Bù hàng** — nhập số lượng bù cho lần giao này (tối đa bằng số còn thiếu),
    kèm ngày và ghi chú. Bấm *Điền bù hết phần còn thiếu* để điền nhanh.
- Mỗi lần bù đều được lưu lại: **bù bao nhiêu, ngày nào, ghi chú gì, ai bù** — hiện
  ở mục *Đã bù những gì* trong hộp thoại.
- Ô lọc **Còn thiếu hàng (N)** trên thanh công cụ chỉ hiện những phiếu đang nợ hàng.
- Sửa phiếu bán **không làm mất** công nợ hàng thiếu; giảm số lượng trên phiếu thì
  số thiếu cũng tự kẹp theo.

Trong **Báo cáo** có mục **Hàng còn thiếu**, hai cách xem cho hai việc khác nhau:

- **Trên màn hình** — gom theo **mặt hàng**, để biết cần mua/bù tổng bao nhiêu mỗi món.
- **Nút “In danh sách phát”** — in ra bản sắp theo **buồng giam rồi tới phiếu**, kèm
  ghi chú của từng phiếu và ô ký nhận. Cầm tờ này đi phát hàng cho can phạm.

File Excel xuất ra cũng tách làm hai trang tính tương ứng:

| Trang tính | Dùng để |
|---|---|
| **Tổng hợp hàng thiếu** | Mỗi mặt hàng một dòng kèm tổng còn thiếu — để đi mua hàng |
| **Chi tiết theo buồng** | Sắp theo buồng, trong buồng sắp theo số phiếu, có cột ghi chú — để in đi phát |

## Thùng rác phiếu bán

Xoá một phiếu bán **không làm mất dữ liệu** — phiếu được chuyển vào thùng rác.

- Nút **Thùng rác (số lượng)** nằm trên thanh công cụ màn hình *Phiếu bán*.
- Phiếu trong thùng rác **biến khỏi danh sách, báo cáo và ô gợi ý can phạm**, nhưng
  vẫn nằm nguyên trong cơ sở dữ liệu.
- Khi xoá, hộp thoại hỏi **lý do xoá** (không bắt buộc, nhưng nên ghi để sau này
  đối chiếu — ví dụ "lập trùng phiếu", "can phạm báo nhầm số lượng").
- Thùng rác có **ô tìm kiếm**: tìm theo số phiếu, họ tên, buồng giam hoặc lý do xoá.
- Bấm **Phục hồi** để đưa phiếu trở lại đúng chỗ cũ; lý do xoá được xoá theo.
- Chỉ **xoá vĩnh viễn** mới không lấy lại được, và chỉ áp dụng được với phiếu
  đang ở trong thùng rác.
- Mỗi phiếu ghi lại **ai xoá, xoá lúc nào và vì sao**.

Cần quyền *Xoá phiếu bán* mới xem và thao tác được trong thùng rác.

### Tự xoá phiếu cũ trong thùng rác

Vào *Cài đặt* → thẻ **Thùng rác**, đặt **số ngày giữ phiếu**:

- Để **0** (mặc định) là giữ mãi, không tự xoá.
- Đặt số ngày cụ thể thì phiếu nằm trong thùng rác quá số ngày đó sẽ bị **xoá vĩnh
  viễn, không lấy lại được**.
- Trong thùng rác, mỗi phiếu hiện **còn bao nhiêu ngày**; còn ≤ 3 ngày thì hiện màu đỏ.
- Việc dọn chạy khi mở thùng rác hoặc khi khởi động lại máy chủ — không cần hẹn giờ riêng.
- Khi có phiếu bị xoá tự động, ứng dụng báo ngay một dòng thông báo.

## Dữ liệu và sao lưu

Toàn bộ dữ liệu lưu trên **MongoDB**, trong cơ sở dữ liệu ghi ở `MONGODB_DB`
(mặc định `quanlycantin`). Nhiều máy cùng mở một địa chỉ là dùng chung dữ liệu.

Các bảng: `nguoi_dung`, `san_pham`, `phieu_ban`, `bo_dem`, `cau_hinh`.

- **Sao lưu**: vào *Cài đặt* → *Tải file sao lưu (JSON)*.
- **Xoá sạch để nhập dữ liệu thật**: *Cài đặt* → *Xoá sạch dữ liệu* (giữ lại tài khoản
  và thông tin đơn vị).
- **Chuyển từ bản cũ dùng file**: nếu cơ sở dữ liệu còn trống mà thấy file
  `data/db.json`, ứng dụng tự chuyển mặt hàng, phiếu bán và đánh số phiếu tiếp nối.
  File cũ được giữ nguyên làm bản sao.

## Ghi chú kỹ thuật

- Next.js 16 + React 19 + Tailwind CSS 4 + driver `mongodb` + `write-excel-file`.
- Mật khẩu băm bằng `scrypt` và phiên đăng nhập ký bằng HMAC — đều dùng module
  `node:crypto` sẵn có, không cần thư viện ngoài.
- Khoá ký phiên sinh một lần và lưu trong MongoDB, nên phiên vẫn hiệu lực sau khi
  khởi động lại máy chủ.
- Số phiếu dùng bộ đếm tăng nguyên tử trong MongoDB, nhiều người cùng lập phiếu
  vẫn không trùng số.
- Thông tin can phạm nằm ngay trên phiếu, nên sửa gì cũng không làm đổi các phiếu
  đã lập trước đó.
- Mặt hàng đã lên phiếu sẽ không bị xoá cứng mà chuyển sang *ngừng sử dụng*, giữ
  nguyên lịch sử.
- In phiếu: cỡ giấy A4, khổ dọc.
