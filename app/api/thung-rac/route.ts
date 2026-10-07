import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { donThungRacQuaHan, khoiTao, layCaiDat, layThungRac } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Danh sách phiếu bán đang nằm trong thùng rác. */
export async function GET() {
  try {
    await khoiTao();
    const kq = await yeuCau("xoa_phieu");
    if ("res" in kq) return kq.res;

    // Mở thùng rác là dịp dọn luôn những phiếu đã quá hạn lưu
    const daXoaTuDong = await donThungRacQuaHan();
    const [orders, caiDat] = await Promise.all([layThungRac(), layCaiDat()]);

    return NextResponse.json({ orders, soNgayGiuThungRac: caiDat.soNgayGiuThungRac, daXoaTuDong });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
