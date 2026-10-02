import { NextResponse } from "next/server";
import { getDB, mutate, newId } from "@/lib/db";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDB();
  const products = [...db.products].sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ten = String(body.ten || "").trim();
    if (!ten) return NextResponse.json({ error: "Chưa nhập tên mặt hàng" }, { status: 400 });
    const ma = String(body.ma || "").trim() || `H-${ten.slice(0, 8).toUpperCase()}`;

    const ketQua = await mutate((db) => {
      if (db.products.some((p) => p.ma.toLowerCase() === ma.toLowerCase())) {
        throw new Error(`Mã mặt hàng "${ma}" đã tồn tại`);
      }
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
      db.products.push(sp);
      return sp;
    });
    return NextResponse.json({ product: ketQua }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
