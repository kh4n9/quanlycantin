import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { dungDongHang, khoiTao, suaPhieuBan, timPhieuBan, xoaPhieuBan } from "@/lib/db";
import { ngayVN, so, tien } from "@/lib/format";
import { soSanhTruong } from "@/lib/nhat-ky";
import { ghiNhatKy } from "@/lib/nhat-ky-server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await khoiTao();
  const kq = await yeuCau("xem_phieu");
  if ("res" in kq) return kq.res;

  const { id } = await params;
  const phieu = await timPhieuBan(id);
  if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu" }, { status: 404 });
  return NextResponse.json({ order: phieu });
}

/** Sửa phiếu bán. Số phiếu giữ nguyên, chỉ đổi nội dung. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("sua_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const truoc = await timPhieuBan(id);
    if (!truoc) {
      return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    }

    const body = await req.json();
    const patch: Record<string, unknown> = {};

    if (body.hoTen !== undefined) {
      const hoTen = String(body.hoTen).trim();
      if (!hoTen) return NextResponse.json({ error: "Chưa nhập họ tên can phạm" }, { status: 400 });
      patch.hoTen = hoTen;
    }
    if (body.namSinh !== undefined) {
      const namSinh = Math.round(Number(body.namSinh) || 0);
      const namNay = new Date().getFullYear();
      if (namSinh && (namSinh < 1900 || namSinh > namNay)) {
        return NextResponse.json({ error: `Năm sinh phải trong khoảng 1900 – ${namNay}` }, { status: 400 });
      }
      patch.namSinh = namSinh;
    }
    if (body.buongGiam !== undefined) patch.buongGiam = String(body.buongGiam).trim();
    if (body.ghiChu !== undefined) patch.ghiChu = String(body.ghiChu);
    if (body.ngay !== undefined) patch.ngay = String(body.ngay);

    // Có gửi danh sách hàng thì tính lại toàn bộ tiền theo giá hiện hành
    if (body.items !== undefined) {
      // Giữ lại số lượng thiếu và lịch sử bù hàng của các dòng cũ
      const { items, tongTien } = await dungDongHang(body.items, truoc.items);
      patch.items = items;
      patch.tongTien = tongTien;
    }

    const phieu = await suaPhieuBan(id, patch as never);
    if (!phieu) {
      return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    }

    const sau = { ...truoc, ...patch } as typeof truoc;
    const thayDoi = soSanhTruong(
      truoc as unknown as Record<string, unknown>,
      sau as unknown as Record<string, unknown>,
      {
        hoTen: "Họ tên",
        namSinh: "Năm sinh",
        buongGiam: "Buồng giam",
        ngay: "Ngày bán",
        ghiChu: "Ghi chú",
      },
      { ngay: (v) => ngayVN(String(v)) || "—" },
    );
    if (JSON.stringify(truoc.items) !== JSON.stringify(sau.items)) {
      thayDoi.push({
        truong: "Hàng bán",
        truoc: `${so(truoc.items.length)} dòng · ${tien(truoc.tongTien)}`,
        sau: `${so(sau.items.length)} dòng · ${tien(sau.tongTien)}`,
      });
    }
    await ghiNhatKy(kq.nd, {
      hanhDong: "Sửa phiếu bán",
      loai: "phieu",
      doiTuongId: phieu.id,
      doiTuong: `Phiếu ${phieu.soPhieu}`,
      moTa: `${phieu.hoTen}${thayDoi.length ? ` · ${so(thayDoi.length)} mục thay đổi` : ""}`,
      thayDoi,
    });
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Chuyển phiếu vào thùng rác (không xoá hẳn — phục hồi được). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("xoa_phieu");
    if ("res" in kq) return kq.res;

    // Lý do xoá là tuỳ chọn — không bắt buộc để khỏi cản việc xoá nhanh
    const body = await req.json().catch(() => ({}));

    const { id } = await params;
    const lyDo = String(body.lyDo ?? "").trim();
    const phieu = await xoaPhieuBan(id, kq.nd.hoTen || kq.nd.tenDangNhap, lyDo);
    if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    await ghiNhatKy(kq.nd, {
      hanhDong: "Xoá phiếu (thùng rác)",
      loai: "phieu",
      doiTuongId: phieu.id,
      doiTuong: `Phiếu ${phieu.soPhieu}`,
      moTa: [phieu.hoTen, lyDo ? `Lý do: ${lyDo}` : ""].filter(Boolean).join(" · "),
    });
    return NextResponse.json({ ok: true, soPhieu: phieu.soPhieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
