import { NextResponse } from "next/server";
import { danhSachCanPham, getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Danh sách can phạm suy ra từ các phiếu bán đã lập — dùng cho ô gợi ý khi
 * lập phiếu mới. Không có danh mục can phạm riêng.
 */
export async function GET() {
  const db = await getDB();
  return NextResponse.json({ canPham: danhSachCanPham(db) });
}
