import { NextResponse } from "next/server";
import { bamMatKhau, chuanHoaNguoiDung, timNguoiDungTheoId, yeuCau } from "@/lib/auth";
import { khoiTao } from "@/lib/db";
import { COL, KHONG_LAY_ID, getDb } from "@/lib/mongo";
import { chuanHoaQuyen, type Quyen } from "@/lib/quyen";

export const dynamic = "force-dynamic";

/**
 * Còn bao nhiêu tài khoản đang hoạt động và có quyền quản lý tài khoản.
 * Dùng để không cho thao tác khiến hệ thống hết người quản trị.
 */
async function soQuanTriConLai(truId?: string): Promise<number> {
  const db = await getDb();
  const ds = await db
    .collection(COL.nguoiDung)
    .find({ dangHoatDong: { $ne: false } }, KHONG_LAY_ID)
    .toArray();
  return (ds as Record<string, unknown>[])
    .filter((d) => d.id !== truId)
    .filter((d) => chuanHoaQuyen(d.quyen).includes("quan_ly_tai_khoan")).length;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("quan_ly_tai_khoan");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const body = await req.json();
    const nd = await timNguoiDungTheoId(id);
    if (!nd) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });

    const laChinhMinh = nd.id === kq.nd.id;
    const patch: Record<string, unknown> = {};

    if (body.hoTen !== undefined) {
      const hoTen = String(body.hoTen).trim();
      if (!hoTen) return NextResponse.json({ error: "Họ tên không được để trống" }, { status: 400 });
      patch.hoTen = hoTen;
    }

    if (body.quyen !== undefined) {
      const quyenMoi = chuanHoaQuyen(body.quyen) as Quyen[];
      if (laChinhMinh && !quyenMoi.includes("quan_ly_tai_khoan")) {
        return NextResponse.json(
          { error: "Không thể tự bỏ quyền quản lý tài khoản của chính mình" },
          { status: 400 },
        );
      }
      if (!quyenMoi.includes("quan_ly_tai_khoan") && (await soQuanTriConLai(id)) === 0) {
        return NextResponse.json({ error: "Phải còn ít nhất một tài khoản quản lý tài khoản" }, { status: 400 });
      }
      patch.quyen = quyenMoi;
    }

    if (body.dangHoatDong !== undefined) {
      const hoatDong = Boolean(body.dangHoatDong);
      if (laChinhMinh && !hoatDong) {
        return NextResponse.json({ error: "Không thể tự khoá tài khoản của chính mình" }, { status: 400 });
      }
      if (!hoatDong && (await soQuanTriConLai(id)) === 0) {
        return NextResponse.json({ error: "Phải còn ít nhất một tài khoản quản trị đang hoạt động" }, { status: 400 });
      }
      patch.dangHoatDong = hoatDong;
    }

    // Đặt lại mật khẩu cho tài khoản khác (quản trị viên làm)
    if (body.matKhauMoi !== undefined) {
      const matKhauMoi = String(body.matKhauMoi);
      if (matKhauMoi.length < 6) {
        return NextResponse.json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, { status: 400 });
      }
      patch.matKhauHash = await bamMatKhau(matKhauMoi);
      patch.phaiDoiMatKhau = true;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Không có thay đổi nào" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection(COL.nguoiDung).updateOne({ id }, { $set: patch });

    const sau = await timNguoiDungTheoId(id);
    if (!sau) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
    const { matKhauHash: _bo, ...congKhai } = sau;
    return NextResponse.json({ nguoiDung: congKhai });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("quan_ly_tai_khoan");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const nd = await timNguoiDungTheoId(id);
    if (!nd) return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
    if (nd.id === kq.nd.id) {
      return NextResponse.json({ error: "Không thể xoá tài khoản đang đăng nhập" }, { status: 400 });
    }
    if (nd.quyen.includes("quan_ly_tai_khoan") && (await soQuanTriConLai(id)) === 0) {
      return NextResponse.json({ error: "Phải còn ít nhất một tài khoản quản lý tài khoản" }, { status: 400 });
    }

    const db = await getDb();
    await db.collection(COL.nguoiDung).deleteOne({ id });
    return NextResponse.json({ ok: true, hoTen: nd.hoTen });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
