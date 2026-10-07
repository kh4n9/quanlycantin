import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { ghiThieuHang, khoiTao } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Ghi nhận số lượng còn thiếu của từng mặt hàng trên phiếu. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("sua_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const body = await req.json();
    const thieu = (body.thieu ?? {}) as Record<string, number>;

    const phieu = await ghiThieuHang(id, thieu);
    if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
