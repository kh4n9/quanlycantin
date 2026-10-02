import { NextResponse } from "next/server";
import { mutate } from "@/lib/db";
import { napDuLieuMau } from "@/lib/seed";

export const dynamic = "force-dynamic";

/** Nạp danh mục mặt hàng mẫu. Chỉ chạy khi kho đang trống, trừ khi yêu cầu ghi đè. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ketQua = await mutate((db) => {
      if (db.products.length > 0 && !body.ghiDe) {
        throw new Error("Đã có dữ liệu. Bỏ trống thao tác để tránh ghi đè.");
      }
      return napDuLieuMau(db);
    });
    return NextResponse.json(ketQua);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
