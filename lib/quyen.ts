/** Danh sách quyền có thể bật/tắt cho từng tài khoản. */
export const TEN_QUYEN = {
  xem_phieu: "Xem phiếu bán",
  ban_hang: "Lập phiếu bán",
  sua_phieu: "Sửa phiếu bán",
  kiem_phieu: "Kiểm phiếu",
  xoa_phieu: "Xoá phiếu bán",
  quan_ly_mat_hang: "Quản lý mặt hàng",
  xem_bao_cao: "Xem báo cáo",
  sua_cai_dat: "Sửa cài đặt và dữ liệu",
  quan_ly_tai_khoan: "Quản lý tài khoản",
} as const;

export type Quyen = keyof typeof TEN_QUYEN;

export const DS_QUYEN = Object.keys(TEN_QUYEN) as Quyen[];

export const MO_TA_QUYEN: Record<Quyen, string> = {
  xem_phieu: "Xem danh sách phiếu bán, xem lại và in phiếu",
  ban_hang: "Lập phiếu bán mới cho can phạm",
  sua_phieu: "Sửa nội dung phiếu bán đã lập",
  kiem_phieu: "Rà soát lại số lượng, đánh dấu phiếu đã kiểm",
  xoa_phieu: "Xoá phiếu bán khỏi hệ thống",
  quan_ly_mat_hang: "Thêm, sửa, xoá và tắt/bật bán mặt hàng",
  xem_bao_cao: "Xem báo cáo và xuất Excel",
  sua_cai_dat: "Sửa thông tin đơn vị, sao lưu và xoá dữ liệu",
  quan_ly_tai_khoan: "Tạo tài khoản, phân quyền, đặt lại mật khẩu",
};

/** Quyền gom theo nhóm để hiển thị cho dễ đọc. */
export const NHOM_QUYEN: { nhom: string; quyen: Quyen[] }[] = [
  { nhom: "Phiếu bán", quyen: ["xem_phieu", "ban_hang", "sua_phieu", "kiem_phieu", "xoa_phieu"] },
  { nhom: "Danh mục và báo cáo", quyen: ["quan_ly_mat_hang", "xem_bao_cao"] },
  { nhom: "Hệ thống", quyen: ["sua_cai_dat", "quan_ly_tai_khoan"] },
];

export const QUYEN_DAY_DU: Quyen[] = [...DS_QUYEN];

/** Bỏ những quyền không còn tồn tại (dữ liệu cũ) và sắp xếp theo thứ tự chuẩn. */
export function chuanHoaQuyen(ds: unknown): Quyen[] {
  if (!Array.isArray(ds)) return [];
  const co = new Set(ds.filter((q): q is string => typeof q === "string"));
  return DS_QUYEN.filter((q) => co.has(q));
}

export function coQuyen(nguoiDung: { quyen: Quyen[] } | null, quyen: Quyen): boolean {
  return Boolean(nguoiDung?.quyen?.includes(quyen));
}
