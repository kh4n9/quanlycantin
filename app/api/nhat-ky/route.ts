import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao } from "@/lib/db";
import { boDau } from "@/lib/format";
import { NHAN_LOAI_NHAT_KY } from "@/lib/nhat-ky";
import { COL, getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

/** Chặn ký tự đặc biệt để người dùng gõ gì cũng không thành biểu thức regex lạ. */
function thoatRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("xem_nhat_ky");
    if ("res" in kq) return kq.res;

    const url = new URL(req.url);
    const tu = url.searchParams.get("tu") || "";
    const den = url.searchParams.get("den") || "";
    const loai = url.searchParams.get("loai") || "";
    const q = (url.searchParams.get("q") || "").trim();

    const trang = Math.max(1, Math.round(Number(url.searchParams.get("trang")) || 1));
    const coTrang = Math.min(500, Math.max(10, Math.round(Number(url.searchParams.get("coTrang")) || 40)));

    const dieuKien: Record<string, unknown> = {};
    if (tu || den) {
      dieuKien.ngay = {
        ...(tu ? { $gte: tu } : {}),
        ...(den ? { $lte: den } : {}),
      };
    }
    if (loai && loai in NHAN_LOAI_NHAT_KY) dieuKien.loai = loai;
    if (q) dieuKien.timKiem = { $regex: thoatRegex(boDau(q)) };

    const db = await getDb();
    const col = db.collection(COL.nhatKy);
    const [tong, nhatKy] = await Promise.all([
      col.countDocuments(dieuKien),
      col
        .find(dieuKien, { projection: { _id: 0, timKiem: 0 } })
        .sort({ luc: -1, _id: -1 })
        .skip((trang - 1) * coTrang)
        .limit(coTrang)
        .toArray(),
    ]);

    return NextResponse.json({
      nhatKy,
      tong,
      trang,
      coTrang,
      soTrang: Math.max(1, Math.ceil(tong / coTrang)),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
