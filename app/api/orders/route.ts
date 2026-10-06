import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import {
  dungDongHang,
  khoiTao,
  layPhieuBan,
  newId,
  soPhieuMoi,
  themPhieuBan,
  type LocPhieu,
} from "@/lib/db";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("xem_phieu");
    if ("res" in kq) return kq.res;

    const url = new URL(req.url);
    const loc: LocPhieu = {
      tu: url.searchParams.get("tu") || undefined,
      den: url.searchParams.get("den") || undefined,
      hoTen: url.searchParams.get("hoTen") || undefined,
    };
    let ds = await layPhieuBan(loc);

    const q = (url.searchParams.get("q") || "").toLowerCase();
    if (q) {
      ds = ds.filter(
        (o) =>
          o.soPhieu.toLowerCase().includes(q) ||
          o.hoTen.toLowerCase().includes(q) ||
          o.buongGiam.toLowerCase().includes(q),
      );
    }
    return NextResponse.json({ orders: ds });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("ban_hang");
    if ("res" in kq) return kq.res;

    const body = await req.json();
    const ngay = String(body.ngay || new Date().toISOString().slice(0, 10));
    const hoTen = String(body.hoTen || "").trim();
    if (!hoTen) return NextResponse.json({ error: "Chưa nhập họ tên can phạm" }, { status: 400 });

    const namSinh = Math.round(Number(body.namSinh) || 0);
    const namNay = new Date().getFullYear();
    if (namSinh && (namSinh < 1900 || namSinh > namNay)) {
      return NextResponse.json({ error: `Năm sinh phải trong khoảng 1900 – ${namNay}` }, { status: 400 });
    }

    const { items, tongTien } = await dungDongHang(body.items || []);
    const moi: Order = {
      id: newId("pb"),
      soPhieu: await soPhieuMoi(ngay),
      ngay,
      hoTen,
      namSinh,
      buongGiam: String(body.buongGiam || "").trim(),
      items,
      tongTien,
      ghiChu: String(body.ghiChu || ""),
      createdAt: new Date().toISOString(),
      kiemLuc: "",
      kiemBoi: "",
      kiemGhiChu: "",
      xoaLuc: "",
      xoaBoi: "",
      lyDoXoa: "",
    };
    await themPhieuBan(moi);
    return NextResponse.json({ order: moi }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
