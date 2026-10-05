import { NextResponse } from "next/server";
import { congKhai, nguoiDungHienTai } from "@/lib/auth";
import { khoiTao } from "@/lib/db";
import { layCaiDat } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Người dùng của phiên hiện tại. 401 nếu chưa đăng nhập. */
export async function GET() {
  try {
    await khoiTao();
    const nd = await nguoiDungHienTai();
    if (!nd) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    return NextResponse.json({ nguoiDung: congKhai(nd), caiDat: await layCaiDat() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
