import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import {
  chonSoThuTu,
  dungDongHang,
  khoiTao,
  laLoiTrungKhoa,
  layPhieuBan,
  newId,
  soPhieuMoi,
  themPhieuBan,
  type LocPhieu,
} from "@/lib/db";
import type { Order } from "@/lib/types";
import { so, tien } from "@/lib/format";
import { ghiNhatKy } from "@/lib/nhat-ky-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("xem_phieu");
    if ("res" in kq) return kq.res;

    const url = new URL(req.url);
    const loc: LocPhieu = {
      tu: url.searchParams.get("tu") || undefined,
      den: url.searchParams.get("den") || undefined,
      hoTen: url.searchParams.get("hoTen") || undefined,
    };
    let ds = await layPhieuBan(loc);

    const q = (url.searchParams.get("q") || "").toLowerCase();
    if (q) {
      ds = ds.filter(
        (o) =>
          o.soPhieu.toLowerCase().includes(q) ||
          o.hoTen.toLowerCase().includes(q) ||
          o.buongGiam.toLowerCase().includes(q),
      );
    }
    return NextResponse.json({ orders: ds });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("ban_hang");
    if ("res" in kq) return kq.res;

    const body = await req.json();
    const ngay = String(body.ngay || new Date().toISOString().slice(0, 10));
    const hoTen = String(body.hoTen || "").trim();
    if (!hoTen) return NextResponse.json({ error: "Chưa nhập họ tên can phạm" }, { status: 400 });

    const namSinh = Math.round(Number(body.namSinh) || 0);
    const namNay = new Date().getFullYear();
    if (namSinh && (namSinh < 1900 || namSinh > namNay)) {
      return NextResponse.json({ error: `Năm sinh phải trong khoảng 1900 – ${namNay}` }, { status: 400 });
    }

    const { items, tongTien } = await dungDongHang(body.items || []);

    // Số thứ tự trong ngày: nhập tay thì dùng đúng số đó, để trống thì lấy số
    // còn trống nhỏ nhất. Chỉ mục duy nhất theo ngày chặn trường hợp hai người
    // cùng lưu một số — khi đó tự chọn lại số trống và thử lại.
    const soGui = body.soThuTu;
    const soYeuCau = soGui === undefined || soGui === null || soGui === "" ? 0 : Number(soGui);
    if (soYeuCau > 0 && (!Number.isFinite(soYeuCau) || !Number.isInteger(soYeuCau))) {
      return NextResponse.json({ error: "Số thứ tự phải là số nguyên dương" }, { status: 400 });
    }
    const soNhapTay = soYeuCau > 0 ? soYeuCau : 0;
    // Số phiếu lấy một lần ngoài vòng lặp, để lần thử lại không làm nhảy số PB
    const soPhieu = await soPhieuMoi(ngay);
    let moi: Order | null = null;
    for (let lan = 1; lan <= 5 && !moi; lan += 1) {
      const phieu: Order = {
        id: newId("pb"),
        soPhieu,
        soThuTu: await chonSoThuTu(ngay, soNhapTay),
        ngay,
        hoTen,
        namSinh,
        buongGiam: String(body.buongGiam || "").trim(),
        items,
        tongTien,
        ghiChu: String(body.ghiChu || ""),
        createdAt: new Date().toISOString(),
        kiemLuc: "",
        kiemBoi: "",
        kiemGhiChu: "",
        xoaLuc: "",
        xoaBoi: "",
        lyDoXoa: "",
      };
      try {
        await themPhieuBan(phieu);
        moi = phieu;
      } catch (e) {
        if (soNhapTay > 0 || lan >= 5 || !laLoiTrungKhoa(e)) throw e;
      }
    }
    if (!moi) throw new Error("Không chọn được số thứ tự còn trống, vui lòng thử lại");

    await ghiNhatKy(kq.nd, {
      hanhDong: "Tạo phiếu bán",
      loai: "phieu",
      doiTuongId: moi.id,
      doiTuong: `Phiếu ${moi.soPhieu}`,
      moTa: [
        `STT ${moi.soThuTu}`,
        moi.hoTen,
        moi.buongGiam,
        `${so(moi.items.length)} mặt hàng`,
        moi.tongTien > 0 ? tien(moi.tongTien) : "",
      ]
        .filter(Boolean)
        .join(" · "),
    });
    return NextResponse.json({ order: moi }, { status: 201 });
  } catch (e) {
    if (laLoiTrungKhoa(e)) {
      return NextResponse.json(
        { error: "Số thứ tự vừa bị phiếu khác lấy, vui lòng chọn số khác" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
