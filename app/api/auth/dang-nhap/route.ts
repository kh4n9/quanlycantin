import { NextResponse } from "next/server";
import { kiemMatKhau, moPhien, timNguoiDung } from "@/lib/auth";
import { COL, getDb } from "@/lib/mongo";
import { khoiTao } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Chặn dò mật khẩu: sau 5 lần sai liên tiếp thì tạm khoá 60 giây.
 * Bộ đếm giữ trong bộ nhớ, đủ dùng cho một máy chủ căn tin.
 */
const soLanSai = new Map<string, { dem: number; khoaDen: number }>();
const TOI_DA = 5;
const THOI_GIAN_KHOA = 60_000;

export async function POST(req: Request) {
  try {
    await khoiTao();
    const body = await req.json();
    const tenDangNhap = String(body.tenDangNhap || "").trim().toLowerCase();
    const matKhau = String(body.matKhau || "");

    if (!tenDangNhap || !matKhau) {
      return NextResponse.json({ error: "Chưa nhập tên đăng nhập hoặc mật khẩu" }, { status: 400 });
    }

    const theoDoi = soLanSai.get(tenDangNhap);
    if (theoDoi && theoDoi.khoaDen > Date.now()) {
      const con = Math.ceil((theoDoi.khoaDen - Date.now()) / 1000);
      return NextResponse.json({ error: `Sai quá nhiều lần. Thử lại sau ${con} giây.` }, { status: 429 });
    }

    const nd = await timNguoiDung(tenDangNhap);
    const dung = nd ? await kiemMatKhau(matKhau, nd.matKhauHash) : false;

    if (!nd || !dung) {
      const dem = (theoDoi?.dem ?? 0) + 1;
      soLanSai.set(tenDangNhap, {
        dem,
        khoaDen: dem >= TOI_DA ? Date.now() + THOI_GIAN_KHOA : 0,
      });
      // Cố tình không nói rõ sai tên hay sai mật khẩu
      return NextResponse.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" }, { status: 401 });
    }

    if (!nd.dangHoatDong) {
      return NextResponse.json({ error: "Tài khoản đã bị khoá" }, { status: 403 });
    }

    soLanSai.delete(tenDangNhap);
    await moPhien(nd.id);

    const db = await getDb();
    await db.collection(COL.nguoiDung).updateOne({ id: nd.id }, { $set: { lanDangNhapCuoi: new Date().toISOString() } });

    const { matKhauHash: _bo, ...congKhai } = nd;
    return NextResponse.json({ nguoiDung: congKhai });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
