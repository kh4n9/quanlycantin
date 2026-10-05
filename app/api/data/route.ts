import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, xoaHetDuLieu } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Xoá sạch mặt hàng và phiếu bán. Giữ lại tài khoản và thông tin đơn vị. */
export async function DELETE() {
  try {
    await khoiTao();
    const kq = await yeuCau("sua_cai_dat");
    if ("res" in kq) return kq.res;

    return NextResponse.json({ ok: true, ...(await xoaHetDuLieu()) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
