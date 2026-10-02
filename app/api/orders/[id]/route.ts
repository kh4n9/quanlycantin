import { NextResponse } from "next/server";
import { dungDongHang, getDB, mutate } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDB();
  const phieu = db.orders.find((o) => o.id === id);
  if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu" }, { status: 404 });
  return NextResponse.json({ order: phieu });
}

/** Sửa phiếu bán. Số phiếu giữ nguyên, chỉ đổi nội dung. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const phieu = await mutate((db) => {
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new Error("Không tìm thấy phiếu bán");

      if (body.hoTen !== undefined) {
        const hoTen = String(body.hoTen).trim();
        if (!hoTen) throw new Error("Chưa nhập họ tên can phạm");
        o.hoTen = hoTen;
      }
      if (body.namSinh !== undefined) {
        const namSinh = Math.round(Number(body.namSinh) || 0);
        const namNay = new Date().getFullYear();
        if (namSinh && (namSinh < 1900 || namSinh > namNay)) {
          throw new Error(`Năm sinh phải trong khoảng 1900 – ${namNay}`);
        }
        o.namSinh = namSinh;
      }
      if (body.buongGiam !== undefined) o.buongGiam = String(body.buongGiam).trim();
      if (body.ghiChu !== undefined) o.ghiChu = String(body.ghiChu);
      if (body.ngay !== undefined) o.ngay = String(body.ngay);

      // Có gửi danh sách hàng thì tính lại toàn bộ tiền theo giá hiện hành
      if (body.items !== undefined) {
        const { items, tongTien } = dungDongHang(db, body.items);
        o.items = items;
        o.tongTien = tongTien;
      }
      return o;
    });
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const soPhieu = await mutate((db) => {
      const phieu = db.orders.find((o) => o.id === id);
      if (!phieu) throw new Error("Không tìm thấy phiếu bán");
      db.orders = db.orders.filter((o) => o.id !== id);
      return phieu.soPhieu;
    });
    return NextResponse.json({ ok: true, soPhieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
