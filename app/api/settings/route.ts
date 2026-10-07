import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, layCaiDat, luuCaiDat } from "@/lib/db";
import { chuanHoaMauIn } from "@/lib/mau-in";
import type { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await khoiTao();
    const kq = await yeuCau();
    if ("res" in kq) return kq.res;
    return NextResponse.json({ settings: await layCaiDat() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("sua_cai_dat");
    if ("res" in kq) return kq.res;

    const body = await req.json();
    const patch: Partial<Settings> = {};
    if (body.tenDonVi !== undefined) patch.tenDonVi = String(body.tenDonVi);
    if (body.diaChi !== undefined) patch.diaChi = String(body.diaChi);
    if (body.nguoiLapPhieu !== undefined) patch.nguoiLapPhieu = String(body.nguoiLapPhieu);
    if (body.soNgayGiuThungRac !== undefined) {
      patch.soNgayGiuThungRac = Math.max(0, Math.round(Number(body.soNgayGiuThungRac) || 0));
    }
    if (body.mauIn !== undefined) patch.mauIn = chuanHoaMauIn(body.mauIn);

    return NextResponse.json({ settings: await luuCaiDat(patch) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
