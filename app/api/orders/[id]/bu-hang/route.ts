import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { ghiBuHang, khoiTao, timPhieuBan } from "@/lib/db";
import { so } from "@/lib/format";
import { ghiNhatKy } from "@/lib/nhat-ky-server";

export const dynamic = "force-dynamic";

/** Ghi một lần bù hàng cho phần còn thiếu của phiếu. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("sua_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const body = await req.json();
    const bu = (body.bu ?? {}) as Record<string, number>;
    const ngay = String(body.ngay || new Date().toISOString().slice(0, 10));
    const ghiChu = String(body.ghiChu ?? "").trim();

    const truoc = await timPhieuBan(id);
    if (!truoc) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });

    const phieu = await ghiBuHang(id, bu, ngay, ghiChu, kq.nd.hoTen || kq.nd.tenDangNhap);
    if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });

    const daBu = (o: { bu?: { soLuong: number }[] }) => (o.bu ?? []).reduce((t, b) => t + b.soLuong, 0);
    let them = 0;
    const thayDoi = phieu.items.flatMap((i) => {
      const cu = truoc.items.find((x) => x.productId === i.productId);
      if (!cu) return [];
      const truocDo = daBu(cu);
      const bayGio = daBu(i);
      if (truocDo === bayGio) return [];
      them += bayGio - truocDo;
      return [{ truong: i.ten, truoc: `${so(truocDo)} ${i.donViTinh}`, sau: `${so(bayGio)} ${i.donViTinh}` }];
    });

    await ghiNhatKy(kq.nd, {
      hanhDong: "Bù hàng",
      loai: "phieu",
      doiTuongId: id,
      doiTuong: `Phiếu ${phieu.soPhieu}`,
      moTa: [`${phieu.hoTen} · bù ${so(them)} đơn vị`, ghiChu].filter(Boolean).join(" · "),
      thayDoi,
    });
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
