import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, layThungRac } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Danh sách phiếu bán đang nằm trong thùng rác. */
export async function GET() {
  try {
    await khoiTao();
    const kq = await yeuCau("xoa_phieu");
    if ("res" in kq) return kq.res;
    return NextResponse.json({ orders: await layThungRac() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
