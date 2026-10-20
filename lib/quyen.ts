/** Danh sách quyền có thể bật/tắt cho từng tài khoản. */
export const TEN_QUYEN = {
  xem_phieu: "Xem phiếu bán",
  ban_hang: "Lập phiếu bán",
  sua_phieu: "Sửa phiếu bán",
  kiem_phieu: "Kiểm phiếu",
  xoa_phieu: "Xoá phiếu bán",
  quan_ly_mat_hang: "Quản lý mặt hàng",
  xem_can_pham: "Xem can phạm",
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
  xem_can_pham: "Tra cứu can phạm, lịch sử mua hàng và mặt hàng thường mua",
  xem_bao_cao: "Xem báo cáo và xuất Excel",
  sua_cai_dat: "Sửa thông tin đơn vị, sao lưu và xoá dữ liệu",
  quan_ly_tai_khoan: "Tạo tài khoản, phân quyền, đặt lại mật khẩu",
};

/** Quyền gom theo nhóm để hiển thị cho dễ đọc. */
export const NHOM_QUYEN: { nhom: string; quyen: Quyen[] }[] = [
  { nhom: "Phiếu bán", quyen: ["xem_phieu", "ban_hang", "sua_phieu", "kiem_phieu", "xoa_phieu"] },
  { nhom: "Tra cứu và báo cáo", quyen: ["xem_can_pham", "xem_bao_cao"] },
  { nhom: "Danh mục", quyen: ["quan_ly_mat_hang"] },
  { nhom: "Hệ thống", quyen: ["sua_cai_dat", "quan_ly_tai_khoan"] },
];

export const QUYEN_DAY_DU: Quyen[] = [...DS_QUYEN];

/**
 * Quyền đi kèm: bật quyền bên trái thì bắt buộc có thêm các quyền bên phải.
 *
 * Ví dụ người kiểm phiếu vẫn phải xem được danh sách phiếu, người lập phiếu
 * cần tra cứu can phạm để điền gợi ý. Nhờ vậy không còn cảnh cấp một quyền
 * nhưng màn hình lại báo lỗi 403 vì thiếu quyền nền.
 */
export const QUYEN_KEM_THEO: Partial<Record<Quyen, Quyen[]>> = {
  ban_hang: ["xem_phieu", "xem_can_pham"],
  sua_phieu: ["xem_phieu", "xem_can_pham"],
  kiem_phieu: ["xem_phieu"],
  xoa_phieu: ["xem_phieu"],
  xem_can_pham: ["xem_phieu"],
};

/** Mở rộng danh sách quyền, thêm mọi quyền đi kèm (tính cả dây chuyền). */
export function themQuyenKemTheo(ds: Iterable<Quyen>): Quyen[] {
  const co = new Set<Quyen>(ds);
  let doi = true;
  while (doi) {
    doi = false;
    for (const q of [...co]) {
      for (const k of QUYEN_KEM_THEO[q] ?? []) {
        if (!co.has(k)) {
          co.add(k);
          doi = true;
        }
      }
    }
  }
  return DS_QUYEN.filter((q) => co.has(q));
}

/** Bỏ những quyền không còn tồn tại (dữ liệu cũ), thêm quyền đi kèm và sắp theo thứ tự chuẩn. */
export function chuanHoaQuyen(ds: unknown): Quyen[] {
  if (!Array.isArray(ds)) return [];
  const hopLe = new Set<string>(DS_QUYEN);
  const co = ds.filter((q): q is Quyen => typeof q === "string" && hopLe.has(q));
  return themQuyenKemTheo(co);
}

/**
 * Rút gọn về những quyền người quản trị đã chọn trực tiếp: bỏ các quyền chỉ
 * được bật kèm theo quyền khác. Dùng khi mở form sửa để các ô "tự động" hiện
 * đúng trạng thái thay vì bị lưu thành lựa chọn cứng.
 */
export function rutGonQuyen(ds: unknown): Quyen[] {
  const day = chuanHoaQuyen(ds);
  return day.filter(
    (q) => !day.some((k) => k !== q && (QUYEN_KEM_THEO[k] ?? []).includes(q)),
  );
}

/** Những quyền đang được chọn khiến quyền `q` buộc phải bật theo. */
export function quyenBatBuocBoi(q: Quyen, ds: Iterable<Quyen>): Quyen[] {
  const nguon = new Set<Quyen>();
  for (const k of ds) {
    if (k === q) continue;
    if (themQuyenKemTheo([k]).includes(q)) nguon.add(k);
  }
  return DS_QUYEN.filter((k) => nguon.has(k));
}

/* ------------------------------ Vai trò mẫu ------------------------------ */

export type VaiTro = {
  ma: string;
  ten: string;
  moTa: string;
  quyen: Quyen[];
};

const VAI_TRO_GOC: VaiTro[] = [
  {
    ma: "quan_tri",
    ten: "Quản trị viên",
    moTa: "Toàn quyền, kể cả tài khoản và dữ liệu",
    quyen: [...DS_QUYEN],
  },
  {
    ma: "quan_ly",
    ten: "Quản lý căn tin",
    moTa: "Bán hàng, sửa/kiểm/xoá phiếu, mặt hàng, báo cáo, cài đặt",
    quyen: [
      "xem_phieu",
      "ban_hang",
      "sua_phieu",
      "kiem_phieu",
      "xoa_phieu",
      "quan_ly_mat_hang",
      "xem_can_pham",
      "xem_bao_cao",
      "sua_cai_dat",
    ],
  },
  {
    ma: "thu_ngan",
    ten: "Thu ngân",
    moTa: "Lập phiếu bán, xem lại và sửa phiếu",
    quyen: ["xem_phieu", "ban_hang", "sua_phieu"],
  },
  {
    ma: "kiem_phieu",
    ten: "Kiểm phiếu",
    moTa: "Xem và kiểm phiếu, sửa số lượng khi phát hiện sai",
    quyen: ["xem_phieu", "kiem_phieu", "sua_phieu"],
  },
  {
    ma: "chi_xem",
    ten: "Chỉ xem",
    moTa: "Xem phiếu, can phạm và báo cáo, không sửa gì",
    quyen: ["xem_phieu", "xem_can_pham", "xem_bao_cao"],
  },
];

/** Vai trò mẫu đã chuẩn hoá quyền đi kèm, dùng để gán nhanh trong màn Tài khoản. */
export const VAI_TRO: VaiTro[] = VAI_TRO_GOC.map((v) => ({ ...v, quyen: chuanHoaQuyen(v.quyen) }));

/** Vai trò khớp chính xác với bộ quyền hiện tại, null nếu là bộ quyền tuỳ chỉnh. */
export function vaiTroCua(ds: unknown): VaiTro | null {
  const day = chuanHoaQuyen(ds).join("|");
  return VAI_TRO.find((v) => v.quyen.join("|") === day) ?? null;
}

export function coQuyen(nguoiDung: { quyen: Quyen[] } | null, quyen: Quyen): boolean {
  return Boolean(nguoiDung?.quyen?.includes(quyen));
}
