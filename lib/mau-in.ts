import type { MauInPhieu, NhanPhieu, OChuKy } from "./types";

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
