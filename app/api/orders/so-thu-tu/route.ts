import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, soThuTuConTrong } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Gợi ý số thứ tự cho form lập / sửa phiếu: số còn trống nhỏ nhất trong ngày.
 *
 * `boQua` là id phiếu đang sửa — không tính chính nó, nếu không thì số hiện tại
 * của phiếu sẽ bị coi là đã dùng.
 */
export async function GET(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("xem_phieu");
    if ("res" in kq) return kq.res;

    const url = new URL(req.url);
    const ngay = (url.searchParams.get("ngay") || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
      return NextResponse.json({ error: "Ngày không hợp lệ" }, { status: 400 });
    }

    const boQua = url.searchParams.get("boQua") || "";
    return NextResponse.json({ soThuTu: await soThuTuConTrong(ngay, boQua) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
