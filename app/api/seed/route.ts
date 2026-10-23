import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, laySanPham } from "@/lib/db";
import { so } from "@/lib/format";
import { ghiNhatKy } from "@/lib/nhat-ky-server";
import { napDuLieuMau } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Thay danh mục mặt hàng bằng bộ dữ liệu mẫu. */
export async function POST(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("quan_ly_mat_hang");
    if ("res" in kq) return kq.res;

    const body = await req.json().catch(() => ({}));
    if ((await laySanPham()).length > 0 && !body.ghiDe) {
      throw new Error("Đã có dữ liệu. Bỏ trống thao tác để tránh ghi đè.");
    }
    const kqNap = await napDuLieuMau();
    await ghiNhatKy(kq.nd, {
      hanhDong: "Nạp dữ liệu mẫu",
      loai: "mat_hang",
      doiTuong: "Danh mục mặt hàng mẫu",
      moTa: `Đã thay danh mục bằng ${so(kqNap.soHang)} mặt hàng mẫu`,
    });
    return NextResponse.json(kqNap);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
