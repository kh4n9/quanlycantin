import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { boDanhDauKiem, danhDauDaKiem, khoiTao, timPhieuBan } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Đánh dấu phiếu đã kiểm xong. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("kiem_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    if (!(await timPhieuBan(id))) {
      return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const ghiChu = String(body.ghiChu ?? "").trim();
    const phieu = await danhDauDaKiem(id, kq.nd.hoTen || kq.nd.tenDangNhap, ghiChu);
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Bỏ đánh dấu đã kiểm, đưa phiếu trở lại danh sách chờ kiểm. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("kiem_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    if (!(await timPhieuBan(id))) {
      return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    }
    return NextResponse.json({ order: await boDanhDauKiem(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
