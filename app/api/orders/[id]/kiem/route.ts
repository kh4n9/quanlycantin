import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { boDanhDauKiem, danhDauDaKiem, khoiTao, timPhieuBan } from "@/lib/db";
import { ghiNhatKy } from "@/lib/nhat-ky-server";

export const dynamic = "force-dynamic";

/** Đánh dấu phiếu đã kiểm xong. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("kiem_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const truoc = await timPhieuBan(id);
    if (!truoc) {
      return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const ghiChu = String(body.ghiChu ?? "").trim();
    const phieu = await danhDauDaKiem(id, kq.nd.hoTen || kq.nd.tenDangNhap, ghiChu);
    await ghiNhatKy(kq.nd, {
      hanhDong: "Kiểm phiếu",
      loai: "phieu",
      doiTuongId: id,
      doiTuong: `Phiếu ${truoc.soPhieu}`,
      moTa: [truoc.hoTen, ghiChu ? `Ghi chú: ${ghiChu}` : "Đã đối chiếu xong"].filter(Boolean).join(" · "),
    });
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Bỏ đánh dấu đã kiểm, đưa phiếu trở lại danh sách chờ kiểm. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("kiem_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const truoc = await timPhieuBan(id);
    if (!truoc) {
      return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    }
    const phieu = await boDanhDauKiem(id);
    await ghiNhatKy(kq.nd, {
      hanhDong: "Bỏ kiểm phiếu",
      loai: "phieu",
      doiTuongId: id,
      doiTuong: `Phiếu ${truoc.soPhieu}`,
      moTa: `${truoc.hoTen} · đưa phiếu trở lại danh sách chờ kiểm`,
    });
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
