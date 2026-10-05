import { NextResponse } from "next/server";
import { dongPhien } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await dongPhien();
  return NextResponse.json({ ok: true });
}
