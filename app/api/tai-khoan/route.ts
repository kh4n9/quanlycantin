import { NextResponse } from "next/server";
import { bamMatKhau, chuanHoaNguoiDung, yeuCau } from "@/lib/auth";
import { khoiTao, newId } from "@/lib/db";
import { COL, KHONG_LAY_ID, getDb } from "@/lib/mongo";
import { chuanHoaQuyen } from "@/lib/quyen";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await khoiTao();
    const kq = await yeuCau("quan_ly_tai_khoan");
    if ("res" in kq) return kq.res;

    const db = await getDb();
    const ds = await db.collection(COL.nguoiDung).find({}, KHONG_LAY_ID).sort({ createdAt: 1 }).toArray();
    const nguoiDung = (ds as Record<string, unknown>[]).map((d) => {
      const { matKhauHash: _bo, ...con } = chuanHoaNguoiDung(d);
      return con;
    });
    return NextResponse.json({ nguoiDung });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("quan_ly_tai_khoan");
    if ("res" in kq) return kq.res;

    const body = await req.json();
    const tenDangNhap = String(body.tenDangNhap || "").trim().toLowerCase();
    const hoTen = String(body.hoTen || "").trim();
    const matKhau = String(body.matKhau || "");

    if (!/^[a-z0-9._-]{3,32}$/.test(tenDangNhap)) {
      return NextResponse.json(
        { error: "Tên đăng nhập chỉ gồm chữ thường, số và . _ - (3–32 ký tự)" },
        { status: 400 },
      );
    }
    if (!hoTen) return NextResponse.json({ error: "Chưa nhập họ tên" }, { status: 400 });
    if (matKhau.length < 6) {
      return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 });
    }

    const db = await getDb();
    if (await db.collection(COL.nguoiDung).findOne({ tenDangNhap })) {
      return NextResponse.json({ error: `Tên đăng nhập "${tenDangNhap}" đã tồn tại` }, { status: 400 });
    }

    const moi = {
      id: newId("nd"),
      tenDangNhap,
      hoTen,
      quyen: chuanHoaQuyen(body.quyen),
      dangHoatDong: body.dangHoatDong !== false,
      phaiDoiMatKhau: true,
      matKhauHash: await bamMatKhau(matKhau),
      lanDangNhapCuoi: "",
      createdAt: new Date().toISOString(),
    };
    await db.collection(COL.nguoiDung).insertOne({ ...moi });

    const { matKhauHash: _bo, ...congKhai } = moi;
    return NextResponse.json({ nguoiDung: congKhai }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
