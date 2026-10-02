import { NextResponse } from "next/server";
import { mutate } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const sp = await mutate((db) => {
      const p = db.products.find((x) => x.id === id);
      if (!p) throw new Error("Không tìm thấy mặt hàng");
      if (body.ma !== undefined) {
        const ma = String(body.ma).trim();
        if (!ma) throw new Error("Mã mặt hàng không được để trống");
        if (db.products.some((x) => x.id !== id && x.ma.toLowerCase() === ma.toLowerCase())) {
          throw new Error(`Mã mặt hàng "${ma}" đã tồn tại`);
        }
        p.ma = ma;
      }
      if (body.ten !== undefined) {
        const ten = String(body.ten).trim();
        if (!ten) throw new Error("Tên mặt hàng không được để trống");
        p.ten = ten;
      }
      if (body.nhom !== undefined) p.nhom = String(body.nhom).trim() || "Khác";
      if (body.donViTinh !== undefined) p.donViTinh = String(body.donViTinh).trim() || "cái";
      if (body.giaBan !== undefined) p.giaBan = Math.max(0, Math.round(Number(body.giaBan) || 0));
      if (body.dangDung !== undefined) p.dangDung = Boolean(body.dangDung);
      if (body.ghiChu !== undefined) p.ghiChu = String(body.ghiChu);
      return p;
    });
    return NextResponse.json({ product: sp });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ketQua = await mutate((db) => {
      const p = db.products.find((x) => x.id === id);
      if (!p) throw new Error("Không tìm thấy mặt hàng");
      const daBan = db.orders.some((o) => o.items.some((i) => i.productId === id));
      if (daBan) {
        // Đã lên phiếu bán thì không xoá cứng, chỉ ngừng dùng để giữ lịch sử
        p.dangDung = false;
        return { daAn: true, ten: p.ten };
      }
      db.products = db.products.filter((x) => x.id !== id);
      return { daAn: false, ten: p.ten };
    });
    return NextResponse.json(ketQua);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
