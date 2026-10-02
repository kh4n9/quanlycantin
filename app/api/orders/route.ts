import { NextResponse } from "next/server";
import { dungDongHang, getDB, mutate, newId, soPhieuMoi } from "@/lib/db";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = await getDB();
  const url = new URL(req.url);
  const tu = url.searchParams.get("tu") || "";
  const den = url.searchParams.get("den") || "";
  const q = (url.searchParams.get("q") || "").toLowerCase();
  const hoTen = (url.searchParams.get("hoTen") || "").toLowerCase();

  let ds = [...db.orders];
  if (tu) ds = ds.filter((o) => o.ngay >= tu);
  if (den) ds = ds.filter((o) => o.ngay <= den);
  if (hoTen) ds = ds.filter((o) => o.hoTen.trim().toLowerCase() === hoTen);
  if (q) {
    ds = ds.filter(
      (o) =>
        o.soPhieu.toLowerCase().includes(q) ||
        o.hoTen.toLowerCase().includes(q) ||
        o.buongGiam.toLowerCase().includes(q),
    );
  }
  ds.sort((a, b) => (a.ngay === b.ngay ? b.createdAt.localeCompare(a.createdAt) : b.ngay.localeCompare(a.ngay)));
  return NextResponse.json({ orders: ds });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ngay = String(body.ngay || new Date().toISOString().slice(0, 10));
    const hoTen = String(body.hoTen || "").trim();
    if (!hoTen) return NextResponse.json({ error: "Chưa nhập họ tên can phạm" }, { status: 400 });

    const namSinh = Math.round(Number(body.namSinh) || 0);
    const namNay = new Date().getFullYear();
    if (namSinh && (namSinh < 1900 || namSinh > namNay)) {
      return NextResponse.json({ error: `Năm sinh phải trong khoảng 1900 – ${namNay}` }, { status: 400 });
    }

    const phieu = await mutate((db) => {
      const { items, tongTien } = dungDongHang(db, body.items || []);
      const moi: Order = {
        id: newId("pb"),
        soPhieu: soPhieuMoi(db, ngay),
        ngay,
        hoTen,
        namSinh,
        buongGiam: String(body.buongGiam || "").trim(),
        items,
        tongTien,
        ghiChu: String(body.ghiChu || ""),
        createdAt: new Date().toISOString(),
      };
      db.orders.push(moi);
      return moi;
    });
    return NextResponse.json({ order: phieu }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
