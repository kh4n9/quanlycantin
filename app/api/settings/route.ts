import { NextResponse } from "next/server";
import { getDB, mutate } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDB();
  return NextResponse.json({ settings: db.settings });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const settings = await mutate((db) => {
      if (body.tenDonVi !== undefined) db.settings.tenDonVi = String(body.tenDonVi);
      if (body.diaChi !== undefined) db.settings.diaChi = String(body.diaChi);
      if (body.nguoiLapPhieu !== undefined) db.settings.nguoiLapPhieu = String(body.nguoiLapPhieu);
      return db.settings;
    });
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
