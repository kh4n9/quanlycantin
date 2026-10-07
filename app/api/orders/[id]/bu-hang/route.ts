import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { ghiBuHang, khoiTao } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Ghi một lần bù hàng cho phần còn thiếu của phiếu. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("sua_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const body = await req.json();
    const bu = (body.bu ?? {}) as Record<string, number>;
    const ngay = String(body.ngay || new Date().toISOString().slice(0, 10));

    const phieu = await ghiBuHang(id, bu, ngay, String(body.ghiChu ?? "").trim(), kq.nd.hoTen || kq.nd.tenDangNhap);
    if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
