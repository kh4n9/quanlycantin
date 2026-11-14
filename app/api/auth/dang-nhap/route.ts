import { NextResponse } from "next/server";
import { kiemMatKhau, moPhien, timNguoiDung } from "@/lib/auth";
import { COL, getDb } from "@/lib/mongo";
import { khoiTao } from "@/lib/db";
import { ghiNhatKy } from "@/lib/nhat-ky-server";

export const dynamic = "force-dynamic";

/**
 * Chặn dò mật khẩu: sau 5 lần sai liên tiếp thì tạm khoá 60 giây.
 * Bộ đếm giữ trong bộ nhớ, đủ dùng cho một máy chủ căn tin.
 *
 * Khoá theo cặp (tên đăng nhập, IP) chứ không chỉ theo tên: nếu khoá theo tên
 * thì ai cũng có thể gõ sai 5 lần để chặn chính người dùng thật. Kèm IP vẫn
 * chặn được dò mật khẩu trên một tài khoản từ cùng một máy.
 *
 * Mỗi lần ghi có dọn bớt mục đã hết hạn để bộ đếm không phình mãi khi bị dò
 * bằng vô số tên đăng nhập ngẫu nhiên.
 */
const soLanSai = new Map<string, { dem: number; khoaDen: number }>();
const TOI_DA = 5;
const THOI_GIAN_KHOA = 60_000;
/** Quá số này thì quét dọn trước khi thêm mục mới. */
const NGUONG_DON = 500;

function khoaTheoDoi(tenDangNhap: string, ip: string): string {
  return `${tenDangNhap}\u0000${ip}`;
}

function donMucHetHan(): void {
  if (soLanSai.size < NGUONG_DON) return;
  const bayGio = Date.now();
  for (const [khoa, muc] of soLanSai) {
    // Mục đã qua thời gian khoá và không còn trong đợt khoá nào thì bỏ
    if (muc.khoaDen !== 0 && muc.khoaDen <= bayGio) soLanSai.delete(khoa);
    else if (muc.khoaDen === 0 && muc.dem <= 0) soLanSai.delete(khoa);
  }
}

/** IP của máy gọi, ưu tiên header do proxy đặt rồi tới header chuẩn. */
function ipCua(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "khong-ro";
}

export async function POST(req: Request) {
  try {
    await khoiTao();
    const body = await req.json();
    const tenDangNhap = String(body.tenDangNhap || "").trim().toLowerCase();
    const matKhau = String(body.matKhau || "");

    if (!tenDangNhap || !matKhau) {
      return NextResponse.json({ error: "Chưa nhập tên đăng nhập hoặc mật khẩu" }, { status: 400 });
    }

    const khoa = khoaTheoDoi(tenDangNhap, ipCua(req));
    const theoDoi = soLanSai.get(khoa);
    if (theoDoi && theoDoi.khoaDen > Date.now()) {
      const con = Math.ceil((theoDoi.khoaDen - Date.now()) / 1000);
      return NextResponse.json({ error: `Sai quá nhiều lần. Thử lại sau ${con} giây.` }, { status: 429 });
    }

    const nd = await timNguoiDung(tenDangNhap);
    const dung = nd ? await kiemMatKhau(matKhau, nd.matKhauHash) : false;

    if (!nd || !dung) {
      const dem = (theoDoi?.dem ?? 0) + 1;
      donMucHetHan();
      soLanSai.set(khoa, {
        dem,
        khoaDen: dem >= TOI_DA ? Date.now() + THOI_GIAN_KHOA : 0,
      });
      await ghiNhatKy(null, {
        hanhDong: "Đăng nhập thất bại",
        loai: "dang_nhap",
        doiTuong: tenDangNhap || "—",
        moTa: "Sai tên đăng nhập hoặc mật khẩu",
      });
      // Cố tình không nói rõ sai tên hay sai mật khẩu
      return NextResponse.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng" }, { status: 401 });
    }

    if (!nd.dangHoatDong) {
      await ghiNhatKy(nd, {
        hanhDong: "Đăng nhập bị chặn",
        loai: "dang_nhap",
        doiTuong: `${nd.hoTen} (${nd.tenDangNhap})`,
        moTa: "Tài khoản đang bị khoá",
      });
      return NextResponse.json({ error: "Tài khoản đã bị khoá" }, { status: 403 });
    }

    soLanSai.delete(khoa);
    await moPhien(nd.id);

    const db = await getDb();
    const bayGio = new Date().toISOString();
    await db.collection(COL.nguoiDung).updateOne(
      { id: nd.id },
      { $set: { lanDangNhapCuoi: bayGio, lanHoatDong: bayGio, trangDangXem: "Đang vào hệ thống" } },
    );

    const { matKhauHash: _bo, ...congKhai } = nd;
    await ghiNhatKy(nd, {
      hanhDong: "Đăng nhập",
      loai: "dang_nhap",
      doiTuong: `${nd.hoTen} (${nd.tenDangNhap})`,
      moTa: "Đăng nhập thành công",
    });
    return NextResponse.json({ nguoiDung: congKhai });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
