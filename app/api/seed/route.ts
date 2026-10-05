import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, laySanPham } from "@/lib/db";
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
    return NextResponse.json(await napDuLieuMau());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
