import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao } from "@/lib/db";
import { COL, getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

/**
 * Tín hiệu "đang truy cập" từ trình duyệt.
 *
 * Không dùng để phân quyền — chỉ cập nhật màn hình và thời điểm hoạt động gần
 * nhất để màn Tài khoản biết ai đang online. Tín hiệu cũ tự hết hiệu lực sau
 * vài phút nên đóng tab đột ngột cũng không làm trạng thái bị treo.
 */
export async function POST(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau();
    if ("res" in kq) return kq.res;

    const body = (await req.json().catch(() => ({}))) as { trang?: unknown; thietBi?: unknown };
    const trang = String(body.trang || "").trim().slice(0, 80);
    const thietBi = String(body.thietBi || "").trim().slice(0, 120);

    const db = await getDb();
    await db.collection(COL.nguoiDung).updateOne(
      { id: kq.nd.id },
      {
        $set: {
          lanHoatDong: new Date().toISOString(),
          trangDangXem: trang,
          thietBi,
        },
      },
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
