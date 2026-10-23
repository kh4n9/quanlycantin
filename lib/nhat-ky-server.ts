import { newId } from "./db";
import { boDau } from "./format";
import { COL, getDb } from "./mongo";
import type { LoaiNhatKy, MucThayDoi } from "./nhat-ky";

/** Người thực hiện thao tác. Null với lần đăng nhập thất bại chưa xác định được ai. */
export type NguoiGhiNhatKy = {
  id: string;
  tenDangNhap: string;
  hoTen: string;
} | null;

export type TinNhatKy = {
  hanhDong: string;
  loai: LoaiNhatKy;
  doiTuong?: string;
  doiTuongId?: string;
  moTa?: string;
  thayDoi?: MucThayDoi[];
};

/** Ngày địa phương dạng YYYY-MM-DD, tách khỏi giờ UTC để lọc cho đúng. */
function ngayDiaPhuong(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Ghi một dòng nhật ký.
 *
 * Mọi lỗi đều được nuốt và chỉ ghi ra console: nhật ký là phụ, không được làm
 * hỏng thao tác chính của người dùng.
 */
export async function ghiNhatKy(nguoi: NguoiGhiNhatKy, tin: TinNhatKy): Promise<void> {
  try {
    const db = await getDb();
    const luc = new Date();
    const ban = {
      id: newId("nk"),
      luc: luc.toISOString(),
      ngay: ngayDiaPhuong(luc),
      nguoiDungId: nguoi?.id ?? "",
      tenDangNhap: nguoi?.tenDangNhap ?? "",
      hoTen: nguoi?.hoTen ?? "",
      hanhDong: tin.hanhDong,
      loai: tin.loai,
      doiTuongId: tin.doiTuongId ?? "",
      doiTuong: tin.doiTuong ?? "",
      moTa: tin.moTa ?? "",
      thayDoi: tin.thayDoi ?? [],
      timKiem: boDau(
        [
          nguoi?.hoTen,
          nguoi?.tenDangNhap,
          tin.hanhDong,
          tin.doiTuong,
          tin.moTa,
          ...(tin.thayDoi ?? []).flatMap((x) => [x.truong, x.truoc, x.sau]),
        ]
          .filter(Boolean)
          .join(" "),
      ),
    };
    await db.collection(COL.nhatKy).insertOne(ban);
  } catch (e) {
    console.error("[nhat-ky] Không ghi được nhật ký:", (e as Error).message);
  }
}
