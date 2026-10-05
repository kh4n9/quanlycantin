import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { danhSachCanPham, khoiTao } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Danh sách can phạm suy ra từ các phiếu bán đã lập — dùng cho ô gợi ý khi
 * lập phiếu mới. Không có danh mục can phạm riêng.
 */
export async function GET() {
  try {
    await khoiTao();
    const kq = await yeuCau("ban_hang");
    if ("res" in kq) return kq.res;
    return NextResponse.json({ canPham: await danhSachCanPham() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
