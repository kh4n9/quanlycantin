// Kiểu dữ liệu dùng chung cho ứng dụng quản lý phiếu bán căn tin.

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

/** Một dòng hàng trên phiếu bán. */
export type LineItem = {
  productId: string;
  ma: string;
  ten: string;
  donViTinh: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
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
};

/** Can phạm suy ra từ các phiếu bán cũ, dùng cho ô gợi ý khi lập phiếu. */
export type CanPhamGoiY = {
  hoTen: string;
  namSinh: number;
  buongGiam: string;
  soLan: number;
  lanCuoi: string;
};

export type Settings = {
  tenDonVi: string;
  diaChi: string;
  nguoiLapPhieu: string;
};

export type DB = {
  products: Product[];
  orders: Order[];
  counters: { order: Record<string, number> };
  settings: Settings;
};

export type LineInput = {
  productId: string;
  soLuong: number;
  donGia?: number;
};
