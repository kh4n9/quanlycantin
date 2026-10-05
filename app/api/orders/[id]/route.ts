import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { dungDongHang, khoiTao, suaPhieuBan, timPhieuBan, xoaPhieuBan } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await khoiTao();
  const kq = await yeuCau("xem_phieu");
  if ("res" in kq) return kq.res;

  const { id } = await params;
  const phieu = await timPhieuBan(id);
  if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu" }, { status: 404 });
  return NextResponse.json({ order: phieu });
}

/** Sửa phiếu bán. Số phiếu giữ nguyên, chỉ đổi nội dung. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("sua_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    if (!(await timPhieuBan(id))) {
      return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    }

    const body = await req.json();
    const patch: Record<string, unknown> = {};

    if (body.hoTen !== undefined) {
      const hoTen = String(body.hoTen).trim();
      if (!hoTen) return NextResponse.json({ error: "Chưa nhập họ tên can phạm" }, { status: 400 });
      patch.hoTen = hoTen;
    }
    if (body.namSinh !== undefined) {
      const namSinh = Math.round(Number(body.namSinh) || 0);
      const namNay = new Date().getFullYear();
      if (namSinh && (namSinh < 1900 || namSinh > namNay)) {
        return NextResponse.json({ error: `Năm sinh phải trong khoảng 1900 – ${namNay}` }, { status: 400 });
      }
      patch.namSinh = namSinh;
    }
    if (body.buongGiam !== undefined) patch.buongGiam = String(body.buongGiam).trim();
    if (body.ghiChu !== undefined) patch.ghiChu = String(body.ghiChu);
    if (body.ngay !== undefined) patch.ngay = String(body.ngay);

    // Có gửi danh sách hàng thì tính lại toàn bộ tiền theo giá hiện hành
    if (body.items !== undefined) {
      const { items, tongTien } = await dungDongHang(body.items);
      patch.items = items;
      patch.tongTien = tongTien;
    }

    const phieu = await suaPhieuBan(id, patch as never);
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("xoa_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const phieu = await xoaPhieuBan(id);
    if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    return NextResponse.json({ ok: true, soPhieu: phieu.soPhieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
