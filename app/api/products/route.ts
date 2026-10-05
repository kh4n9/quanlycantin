import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, laySanPham, newId, themSanPham } from "@/lib/db";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await khoiTao();
    const kq = await yeuCau();
    if ("res" in kq) return kq.res;

    const products = (await laySanPham()).sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
    return NextResponse.json({ products });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("quan_ly_mat_hang");
    if ("res" in kq) return kq.res;

    const body = await req.json();
    const ten = String(body.ten || "").trim();
    if (!ten) return NextResponse.json({ error: "Chưa nhập tên mặt hàng" }, { status: 400 });
    const ma = String(body.ma || "").trim() || `H-${ten.slice(0, 8).toUpperCase()}`;

    const trungMa = (await laySanPham()).some((p) => p.ma.toLowerCase() === ma.toLowerCase());
    if (trungMa) return NextResponse.json({ error: `Mã mặt hàng "${ma}" đã tồn tại` }, { status: 400 });

    const sp: Product = {
      id: newId("sp"),
      ma,
      ten,
      nhom: String(body.nhom || "Khác").trim() || "Khác",
      donViTinh: String(body.donViTinh || "cái").trim() || "cái",
      giaBan: Math.max(0, Math.round(Number(body.giaBan) || 0)),
      dangDung: body.dangDung !== false,
      ghiChu: String(body.ghiChu || ""),
      createdAt: new Date().toISOString(),
    };
    await themSanPham(sp);
    return NextResponse.json({ product: sp }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
