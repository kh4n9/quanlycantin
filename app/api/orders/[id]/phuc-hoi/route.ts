import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, phucHoiPhieuBan } from "@/lib/db";
import { ghiNhatKy } from "@/lib/nhat-ky-server";

export const dynamic = "force-dynamic";

/** Lấy phiếu ra khỏi thùng rác. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("xoa_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const phieu = await phucHoiPhieuBan(id);
    if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    await ghiNhatKy(kq.nd, {
      hanhDong: "Phục hồi phiếu",
      loai: "phieu",
      doiTuongId: phieu.id,
      doiTuong: `Phiếu ${phieu.soPhieu}`,
      moTa: `${phieu.hoTen} · lấy ra khỏi thùng rác`,
    });
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
