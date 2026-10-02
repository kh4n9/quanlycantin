import { NextResponse } from "next/server";
import { mutate } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Xoá sạch mặt hàng và phiếu bán. Giữ lại thông tin đơn vị. */
export async function DELETE() {
  try {
    const ketQua = await mutate((db) => {
      const soLieu = { soHang: db.products.length, soPhieu: db.orders.length };
      db.products = [];
      db.orders = [];
      db.counters = { order: {} };
      return soLieu;
    });
    return NextResponse.json({ ok: true, ...ketQua });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
