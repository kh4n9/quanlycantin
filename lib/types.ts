// Kiểu dữ liệu dùng chung cho ứng dụng quản lý phiếu bán căn tin.

import type { Quyen } from "./quyen";

export type Product = {
  id: string;
  ma: string;
  ten: string;
  nhom: string;
  donViTinh: string;
  /** Giá bán. Để 0 nếu chỉ quản lý số lượng, không dùng đến tiền. */
  giaBan: number;
  dangDung: boolean;
  ghiChu: string;
  createdAt: string;
};

/** Một lần bù hàng cho phần còn thiếu của một dòng hàng. */
export type BuHang = {
  soLuong: number;
  ngay: string;
  ghiChu: string;
  boi: string;
};

/** Một dòng hàng trên phiếu bán. */
export type LineItem = {
  productId: string;
  ma: string;
  ten: string;
  donViTinh: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  /**
   * Số lượng còn nợ can phạm vì lúc bán chưa có đủ hàng.
   * 0 nghĩa là đã giao đủ.
   */
  thieu: number;
  /** Các lần bù hàng, cộng dồn lại thành số đã bù. */
  bu: BuHang[];
};

/**
 * Phiếu bán hàng cho can phạm.
 *
 * Thông tin can phạm (họ tên, năm sinh, buồng giam) được ghi thẳng trên phiếu,
 * không có danh mục can phạm riêng. Danh sách gợi ý khi lập phiếu được suy ra
 * từ chính các phiếu đã lập trước đó.
 */
export type Order = {
  id: string;
  soPhieu: string;
  ngay: string;
  hoTen: string;
  namSinh: number;
  buongGiam: string;
  items: LineItem[];
  tongTien: number;
  ghiChu: string;
  createdAt: string;
  /** Thời điểm kiểm phiếu, rỗng nghĩa là chưa kiểm. */
  kiemLuc: string;
  /** Họ tên người đã kiểm phiếu này. */
  kiemBoi: string;
  /** Ghi chú khi kiểm, thường dùng để ghi lại sai sót đã phát hiện. */
  kiemGhiChu: string;
  /** Thời điểm chuyển vào thùng rác, rỗng nghĩa là phiếu còn dùng bình thường. */
  xoaLuc: string;
  /** Họ tên người đã chuyển phiếu vào thùng rác. */
  xoaBoi: string;
  /** Lý do xoá phiếu, người xoá ghi lại khi chuyển vào thùng rác. */
  lyDoXoa: string;
};

/** Can phạm suy ra từ các phiếu bán cũ, dùng cho ô gợi ý khi lập phiếu. */
export type CanPhamGoiY = {
  hoTen: string;
  namSinh: number;
  buongGiam: string;
  soLan: number;
  lanCuoi: string;
};

/** Một ô chữ ký ở cuối phiếu in. */
export type OChuKy = {
  nhan: string;
  ghiChu: string;
};

/** Nhãn chữ hiện trên phiếu in — sửa được để hợp với từng đơn vị. */
export type NhanPhieu = {
  hoTen: string;
  namSinh: string;
  buongGiam: string;
  ghiChu: string;
  stt: string;
  tenHang: string;
  donViTinh: string;
  soLuong: string;
  donGia: string;
  thanhTien: string;
  tongCong: string;
};

/** Bật/tắt từng phần của phiếu in. */
export type HienPhieu = {
  soPhieu: boolean;
  ngay: boolean;
  namSinh: boolean;
  buongGiam: boolean;
  ghiChu: boolean;
  cotDonViTinh: boolean;
  cotDonGia: boolean;
  cotThanhTien: boolean;
  dongTongCong: boolean;
  bangChu: boolean;
};

/** Mẫu phiếu in, đơn vị tự chỉnh trong phần Cài đặt. */
export type MauInPhieu = {
  tieuDe: string;
  nhan: NhanPhieu;
  hien: HienPhieu;
  chuKy: OChuKy[];
  /** Số ô chữ ký trên mỗi hàng của phần ký */
  soCotChuKy: number;
};

/** Cách sắp danh sách hàng còn thiếu khi in. */
export type KieuInThieu = "theo_buong" | "theo_mon" | "gop_nguoi";

/** Nhãn chữ trên bản in danh sách hàng thiếu. */
export type NhanThieu = {
  buongGiam: string;
  soPhieu: string;
  ngayBan: string;
  hoTen: string;
  matHang: string;
  /** Tiêu đề cột gộp nhiều món của kiểu in "mỗi người một hàng" */
  cacMon: string;
  donViTinh: string;
  conThieu: string;
  ghiChu: string;
  tongCong: string;
  kyNhan: string;
};

/** Bật/tắt từng phần của bản in hàng thiếu. */
export type HienThieu = {
  buongGiam: boolean;
  soPhieu: boolean;
  ngayBan: boolean;
  ghiChu: boolean;
  donViTinh: boolean;
  dongTong: boolean;
  /** Cột trống để can phạm ký khi nhận hàng */
  cotKyNhan: boolean;
};

export type MauInThieu = {
  tieuDe: string;
  /** Kiểu sắp mặc định khi bấm in */
  kieuIn: KieuInThieu;
  nhan: NhanThieu;
  hien: HienThieu;
  chuKy: OChuKy[];
  soCotChuKy: number;
};

export type Settings = {
  tenDonVi: string;
  diaChi: string;
  nguoiLapPhieu: string;
  mauIn: MauInPhieu;
  mauInThieu: MauInThieu;
  /**
   * Số ngày giữ phiếu trong thùng rác trước khi xoá vĩnh viễn.
   * 0 nghĩa là giữ mãi, không tự xoá.
   */
  soNgayGiuThungRac: number;
};

/** Tài khoản đăng nhập. Mật khẩu chỉ lưu dạng đã băm, không bao giờ trả về client. */
export type NguoiDung = {
  id: string;
  tenDangNhap: string;
  hoTen: string;
  quyen: Quyen[];
  dangHoatDong: boolean;
  /** Bật khi tài khoản vừa được tạo/đặt lại mật khẩu — nhắc người dùng đổi ngay. */
  phaiDoiMatKhau: boolean;
  matKhauHash: string;
  lanDangNhapCuoi: string;
  createdAt: string;
};

/** Bản rút gọn để gửi ra ngoài, không có mật khẩu. */
export type NguoiDungCongKhai = Omit<NguoiDung, "matKhauHash">;

export type LineInput = {
  productId: string;
  soLuong: number;
  donGia?: number;
};
