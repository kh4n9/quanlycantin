import { TEN_QUYEN, type Quyen } from "./quyen";

/** Nhóm thao tác để lọc trong sổ nhật ký. */
export const NHAN_LOAI_NHAT_KY = {
  phieu: "Phiếu bán",
  mat_hang: "Mặt hàng",
  tai_khoan: "Tài khoản",
  cai_dat: "Cài đặt & dữ liệu",
  dang_nhap: "Đăng nhập",
} as const;

export type LoaiNhatKy = keyof typeof NHAN_LOAI_NHAT_KY;

/** Một trường bị đổi, hiển thị dạng "Trước → Sau". */
export type MucThayDoi = {
  truong: string;
  truoc: string;
  sau: string;
};

/** Một dòng trong sổ nhật ký hoạt động. */
export type NhatKy = {
  id: string;
  /** Thời điểm thao tác, dạng ISO. */
  luc: string;
  /** Ngày theo giờ địa phương, dạng YYYY-MM-DD, dùng để lọc. */
  ngay: string;
  nguoiDungId: string;
  tenDangNhap: string;
  hoTen: string;
  hanhDong: string;
  loai: LoaiNhatKy;
  doiTuongId: string;
  doiTuong: string;
  moTa: string;
  thayDoi: MucThayDoi[];
};

/**
 * So sánh hai bản ghi và trả về những trường thực sự đổi.
 * `nhan` quy định trường nào cần ghi và tên hiển thị của nó.
 */
export function soSanhTruong(
  truoc: Record<string, unknown>,
  sau: Record<string, unknown>,
  nhan: Record<string, string>,
  dinhDang: Record<string, (v: unknown) => string> = {},
): MucThayDoi[] {
  const hien = (k: string, v: unknown): string => {
    const f = dinhDang[k];
    if (f) return f(v);
    if (v === true) return "Có";
    if (v === false) return "Không";
    if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
    const s = String(v ?? "").trim();
    return s || "—";
  };

  return Object.entries(nhan).flatMap(([k, ten]) => {
    if (!(k in sau)) return [];
    const a = JSON.stringify(truoc[k] ?? null);
    const b = JSON.stringify(sau[k] ?? null);
    if (a === b) return [];
    return [{ truong: ten, truoc: hien(k, truoc[k]), sau: hien(k, sau[k]) }];
  });
}

/** Danh sách quyền thành câu chữ dễ đọc, dùng khi ghi thay đổi phân quyền. */
export function tenQuyen(ds: unknown): string {
  if (!Array.isArray(ds)) return "—";
  const nhan = ds.map((q) => TEN_QUYEN[q as Quyen] ?? String(q));
  return nhan.length ? nhan.join(", ") : "—";
}
