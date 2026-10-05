import { NextResponse } from "next/server";
import { bamMatKhau, kiemMatKhau, yeuCau } from "@/lib/auth";
import { khoiTao } from "@/lib/db";
import { COL, getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

/** Người dùng tự đổi mật khẩu của mình. Phải nhập đúng mật khẩu hiện tại. */
export async function POST(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau();
    if ("res" in kq) return kq.res;

    const body = await req.json();
    const matKhauCu = String(body.matKhauCu || "");
    const matKhauMoi = String(body.matKhauMoi || "");

    if (matKhauMoi.length < 6) {
      return NextResponse.json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự" }, { status: 400 });
    }
    if (matKhauMoi === matKhauCu) {
      return NextResponse.json({ error: "Mật khẩu mới phải khác mật khẩu hiện tại" }, { status: 400 });
    }
    if (!(await kiemMatKhau(matKhauCu, kq.nd.matKhauHash))) {
      return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection(COL.nguoiDung).updateOne(
      { id: kq.nd.id },
      { $set: { matKhauHash: await bamMatKhau(matKhauMoi), phaiDoiMatKhau: false } },
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
