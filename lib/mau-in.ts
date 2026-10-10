import type {
  HienThieu,
  KieuInThieu,
  MauInPhieu,
  MauInThieu,
  NhanPhieu,
  NhanThieu,
  OChuKy,
} from "./types";

/** Mẫu phiếu in mặc định — giống hệt bản in trước khi có phần tuỳ chỉnh. */
export const MAU_IN_MAC_DINH: MauInPhieu = {
  tieuDe: "Phiếu bán hàng",
  nhan: {
    hoTen: "Họ và tên can phạm",
    namSinh: "Năm sinh",
    buongGiam: "Buồng giam",
    ghiChu: "Ghi chú",
    stt: "STT",
    tenHang: "Tên mặt hàng",
    donViTinh: "ĐVT",
    soLuong: "Số lượng",
    donGia: "Đơn giá",
    thanhTien: "Thành tiền",
    tongCong: "TỔNG CỘNG",
  },
  hien: {
    soPhieu: true,
    ngay: true,
    namSinh: true,
    buongGiam: true,
    ghiChu: true,
    cotDonViTinh: true,
    cotDonGia: true,
    cotThanhTien: true,
    dongTongCong: true,
    bangChu: true,
  },
  chuKy: [
    { nhan: "Người mua hàng", ghiChu: "(Ký, ghi rõ họ tên)" },
    { nhan: "Người bán hàng", ghiChu: "(Ký, ghi rõ họ tên)" },
  ],
  soCotChuKy: 2,
};

/** Mẫu in danh sách hàng còn thiếu (phiếu trả đồ thiếu). */
export const MAU_IN_THIEU_MAC_DINH: MauInThieu = {
  tieuDe: "Danh sách hàng còn thiếu",
  kieuIn: "theo_buong",
  nhan: {
    buongGiam: "Buồng giam",
    soPhieu: "Số phiếu",
    ngayBan: "Ngày bán",
    hoTen: "Họ và tên",
    matHang: "Tên mặt hàng",
    cacMon: "Các món còn thiếu",
    donViTinh: "ĐVT",
    conThieu: "Còn thiếu",
    ghiChu: "Ghi chú",
    tongCong: "TỔNG CỘNG",
    kyNhan: "Ký nhận",
  },
  hien: {
    buongGiam: true,
    soPhieu: true,
    ngayBan: true,
    ghiChu: true,
    donViTinh: true,
    dongTong: true,
    cotKyNhan: false,
  },
  chuKy: [
    { nhan: "Người lập danh sách", ghiChu: "(Ký, ghi rõ họ tên)" },
    { nhan: "Người phát hàng", ghiChu: "(Ký, ghi rõ họ tên)" },
    { nhan: "Người nhận hàng", ghiChu: "(Ký, ghi rõ họ tên)" },
  ],
  soCotChuKy: 3,
};

/** Ba kiểu sắp danh sách khi in, kèm mô tả cho người dùng chọn. */
export const DS_KIEU_IN: { khoa: KieuInThieu; nhan: string; moTa: string }[] = [
  {
    khoa: "theo_buong",
    nhan: "Theo buồng giam",
    moTa: "Đi lần lượt từng buồng, trong buồng xử lý từng phiếu",
  },
  {
    khoa: "theo_mon",
    nhan: "Theo món hàng",
    moTa: "Gom theo mặt hàng — hàng về đợt nào thì biết ngay cần phát cho ai",
  },
  {
    khoa: "gop_nguoi",
    nhan: "Gộp mỗi người một hàng",
    moTa: "Mỗi can phạm một dòng, ghi hết các món còn thiếu — dễ tích khi phát",
  },
];

/** Ô bật/tắt của bản in hàng thiếu. */
export const DS_BAT_TAT_THIEU: { khoa: keyof HienThieu; nhan: string; moTa: string }[] = [
  { khoa: "buongGiam", nhan: "Cột buồng giam", moTa: "" },
  { khoa: "soPhieu", nhan: "Cột số phiếu", moTa: "" },
  { khoa: "ngayBan", nhan: "Cột ngày bán", moTa: "" },
  { khoa: "ghiChu", nhan: "Cột ghi chú", moTa: "Ghi chú của phiếu bán" },
  { khoa: "donViTinh", nhan: "Cột đơn vị tính", moTa: "" },
  { khoa: "dongTong", nhan: "Dòng tổng cộng", moTa: "" },
  { khoa: "cotKyNhan", nhan: "Cột “Ký nhận”", moTa: "Thêm cột trống để can phạm ký khi nhận hàng" },
];

export const DS_NHAN_THIEU: { khoa: keyof NhanThieu; nhan: string }[] = [
  { khoa: "buongGiam", nhan: "Tiêu đề cột buồng giam" },
  { khoa: "soPhieu", nhan: "Tiêu đề cột số phiếu" },
  { khoa: "ngayBan", nhan: "Tiêu đề cột ngày bán" },
  { khoa: "hoTen", nhan: "Tiêu đề cột họ tên" },
  { khoa: "matHang", nhan: "Tiêu đề cột mặt hàng" },
  { khoa: "cacMon", nhan: "Tiêu đề cột gộp món (kiểu mỗi người một hàng)" },
  { khoa: "donViTinh", nhan: "Tiêu đề cột ĐVT" },
  { khoa: "conThieu", nhan: "Tiêu đề cột còn thiếu" },
  { khoa: "ghiChu", nhan: "Tiêu đề cột ghi chú" },
  { khoa: "tongCong", nhan: "Chữ ở dòng tổng cộng" },
  { khoa: "kyNhan", nhan: "Tiêu đề cột ký nhận" },
];

/** Bù các trường thiếu cho mẫu in hàng thiếu lưu từ bản cũ. */
export function chuanHoaMauInThieu(mau: unknown): MauInThieu {
  const m = (mau ?? {}) as Partial<MauInThieu>;
  const nhan = (m.nhan ?? {}) as Partial<NhanThieu>;
  const hien = (m.hien ?? {}) as Partial<HienThieu>;
  const chuKy: OChuKy[] = Array.isArray(m.chuKy)
    ? m.chuKy
        .filter((c) => c && typeof c === "object")
        .map((c) => ({ nhan: String(c.nhan ?? ""), ghiChu: String(c.ghiChu ?? "") }))
    : MAU_IN_THIEU_MAC_DINH.chuKy;
  const soCot = Math.round(Number(m.soCotChuKy));
  const kieuIn = DS_KIEU_IN.some((k) => k.khoa === m.kieuIn)
    ? (m.kieuIn as KieuInThieu)
    : MAU_IN_THIEU_MAC_DINH.kieuIn;

  return {
    tieuDe: String(m.tieuDe ?? MAU_IN_THIEU_MAC_DINH.tieuDe),
    kieuIn,
    nhan: { ...MAU_IN_THIEU_MAC_DINH.nhan, ...nhan },
    hien: { ...MAU_IN_THIEU_MAC_DINH.hien, ...hien },
    chuKy,
    soCotChuKy: soCot >= 1 && soCot <= 4 ? soCot : MAU_IN_THIEU_MAC_DINH.soCotChuKy,
  };
}

/** Bù các trường thiếu để mẫu in lưu từ bản cũ vẫn dùng được. */
export function chuanHoaMauIn(mau: unknown): MauInPhieu {
  const m = (mau ?? {}) as Partial<MauInPhieu>;
  const nhan = (m.nhan ?? {}) as Partial<NhanPhieu>;
  const hien = (m.hien ?? {}) as Partial<MauInPhieu["hien"]>;

  const chuKy: OChuKy[] = Array.isArray(m.chuKy)
    ? m.chuKy
        .filter((c) => c && typeof c === "object")
        .map((c) => ({ nhan: String(c.nhan ?? ""), ghiChu: String(c.ghiChu ?? "") }))
    : MAU_IN_MAC_DINH.chuKy;

  const soCot = Math.round(Number(m.soCotChuKy));
  return {
    tieuDe: String(m.tieuDe ?? MAU_IN_MAC_DINH.tieuDe),
    nhan: { ...MAU_IN_MAC_DINH.nhan, ...nhan },
    hien: { ...MAU_IN_MAC_DINH.hien, ...hien },
    chuKy,
    soCotChuKy: soCot >= 1 && soCot <= 4 ? soCot : MAU_IN_MAC_DINH.soCotChuKy,
  };
}

/** Các ô bật/tắt, kèm nhãn hiển thị trong phần Cài đặt. */
export const DS_BAT_TAT: { khoa: keyof MauInPhieu["hien"]; nhan: string; moTa: string }[] = [
  { khoa: "soPhieu", nhan: "Số phiếu", moTa: "Dòng “Số: PB-2026-0001”" },
  { khoa: "ngay", nhan: "Ngày bán", moTa: "Dòng “Ngày … tháng … năm …”" },
  { khoa: "namSinh", nhan: "Năm sinh can phạm", moTa: "" },
  { khoa: "buongGiam", nhan: "Buồng giam", moTa: "" },
  { khoa: "ghiChu", nhan: "Ghi chú của phiếu", moTa: "Chỉ hiện khi phiếu có ghi chú" },
  { khoa: "cotDonViTinh", nhan: "Cột ĐVT", moTa: "" },
  { khoa: "cotDonGia", nhan: "Cột đơn giá", moTa: "Tắt để phiếu chỉ còn số lượng" },
  { khoa: "cotThanhTien", nhan: "Cột thành tiền", moTa: "Tắt thì bỏ luôn dòng tổng tiền và bằng chữ" },
  { khoa: "dongTongCong", nhan: "Dòng tổng cộng", moTa: "Tắt cột thành tiền thì tổng là tổng số lượng" },
  { khoa: "bangChu", nhan: "Đọc tiền bằng chữ", moTa: "Cần có cột thành tiền" },
];

/** Các nhãn sửa được, kèm gợi ý. */
export const DS_NHAN: { khoa: keyof NhanPhieu; nhan: string }[] = [
  { khoa: "hoTen", nhan: "Nhãn họ tên can phạm" },
  { khoa: "namSinh", nhan: "Nhãn năm sinh" },
  { khoa: "buongGiam", nhan: "Nhãn buồng giam" },
  { khoa: "ghiChu", nhan: "Nhãn ghi chú" },
  { khoa: "stt", nhan: "Tiêu đề cột STT" },
  { khoa: "tenHang", nhan: "Tiêu đề cột tên hàng" },
  { khoa: "donViTinh", nhan: "Tiêu đề cột ĐVT" },
  { khoa: "soLuong", nhan: "Tiêu đề cột số lượng" },
  { khoa: "donGia", nhan: "Tiêu đề cột đơn giá" },
  { khoa: "thanhTien", nhan: "Tiêu đề cột thành tiền" },
  { khoa: "tongCong", nhan: "Chữ ở dòng tổng cộng" },
];
