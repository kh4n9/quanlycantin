import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { ghiThieuHang, khoiTao, timPhieuBan } from "@/lib/db";
import { so } from "@/lib/format";
import { ghiNhatKy } from "@/lib/nhat-ky-server";

export const dynamic = "force-dynamic";

/** Ghi nhận số lượng còn thiếu của từng mặt hàng trên phiếu. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("sua_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const body = await req.json();
    const thieu = (body.thieu ?? {}) as Record<string, number>;

    const truoc = await timPhieuBan(id);
    if (!truoc) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });

    const phieu = await ghiThieuHang(id, thieu);
    if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });

    const thayDoi = phieu.items.flatMap((i) => {
      const cu = truoc.items.find((x) => x.productId === i.productId);
      if (!cu || cu.thieu === i.thieu) return [];
      return [{ truong: i.ten, truoc: `${so(cu.thieu)} ${i.donViTinh}`, sau: `${so(i.thieu)} ${i.donViTinh}` }];
    });
    const tongThieu = phieu.items.reduce((t, i) => t + i.thieu, 0);

    await ghiNhatKy(kq.nd, {
      hanhDong: "Ghi nhận thiếu hàng",
      loai: "phieu",
      doiTuongId: id,
      doiTuong: `Phiếu ${phieu.soPhieu}`,
      moTa: `${phieu.hoTen} · còn thiếu ${so(tongThieu)} đơn vị`,
      thayDoi,
    });
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
