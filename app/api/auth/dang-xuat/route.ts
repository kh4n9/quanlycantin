import { NextResponse } from "next/server";
import { dongPhien, nguoiDungHienTai } from "@/lib/auth";
import { COL, getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const nd = await nguoiDungHienTai();
    if (nd) {
      const db = await getDb();
      await db.collection(COL.nguoiDung).updateOne(
        { id: nd.id },
        { $set: { lanHoatDong: "", trangDangXem: "" } },
      );
    }
  } catch {
    // Dù không ghi được trạng thái thì vẫn phải xoá phiên đăng nhập.
  }
  await dongPhien();
  return NextResponse.json({ ok: true });
}
