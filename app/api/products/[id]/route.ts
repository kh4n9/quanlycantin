import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, laySanPham, sanPhamDaLenPhieu, suaSanPham, timSanPham, xoaSanPham } from "@/lib/db";
import { so } from "@/lib/format";
import { soSanhTruong } from "@/lib/nhat-ky";
import { ghiNhatKy } from "@/lib/nhat-ky-server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("quan_ly_mat_hang");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const body = await req.json();
    const hienTai = await timSanPham(id);
    if (!hienTai) return NextResponse.json({ error: "Không tìm thấy mặt hàng" }, { status: 404 });

    const patch: Record<string, unknown> = {};

    if (body.ma !== undefined) {
      const ma = String(body.ma).trim();
      if (!ma) return NextResponse.json({ error: "Mã mặt hàng không được để trống" }, { status: 400 });
      const trung = (await laySanPham()).some((p) => p.id !== id && p.ma.toLowerCase() === ma.toLowerCase());
      if (trung) return NextResponse.json({ error: `Mã mặt hàng "${ma}" đã tồn tại` }, { status: 400 });
      patch.ma = ma;
    }
    if (body.ten !== undefined) {
      const ten = String(body.ten).trim();
      if (!ten) return NextResponse.json({ error: "Tên mặt hàng không được để trống" }, { status: 400 });
      patch.ten = ten;
    }
    if (body.nhom !== undefined) patch.nhom = String(body.nhom).trim() || "Khác";
    if (body.donViTinh !== undefined) patch.donViTinh = String(body.donViTinh).trim() || "cái";
    if (body.giaBan !== undefined) patch.giaBan = Math.max(0, Math.round(Number(body.giaBan) || 0));
    if (body.dangDung !== undefined) patch.dangDung = Boolean(body.dangDung);
    if (body.ghiChu !== undefined) patch.ghiChu = String(body.ghiChu);

    const sp = await suaSanPham(id, patch);
    if (!sp) return NextResponse.json({ error: "Không tìm thấy mặt hàng" }, { status: 404 });

    const thayDoi = soSanhTruong(
      hienTai as unknown as Record<string, unknown>,
      { ...hienTai, ...patch } as unknown as Record<string, unknown>,
      {
        ma: "Mã hàng",
        ten: "Tên hàng",
        nhom: "Nhóm hàng",
        donViTinh: "Đơn vị tính",
        giaBan: "Giá bán",
        dangDung: "Trạng thái",
        ghiChu: "Ghi chú",
      },
      {
        giaBan: (v) => `${so(Number(v) || 0)} đ`,
        dangDung: (v) => (v ? "Đang bán" : "Tạm dừng bán"),
      },
    );
    const chiDoiTrangThai =
      body.dangDung !== undefined && Object.keys(patch).length === 1 && patch.dangDung !== hienTai.dangDung;

    await ghiNhatKy(kq.nd, {
      hanhDong: chiDoiTrangThai ? (patch.dangDung ? "Mở bán mặt hàng" : "Tạm dừng bán") : "Sửa mặt hàng",
      loai: "mat_hang",
      doiTuongId: sp.id,
      doiTuong: `${sp.ten} (${sp.ma})`,
      moTa: chiDoiTrangThai ? `${sp.ten} · ${patch.dangDung ? "mở bán lại" : "ngừng bán"}` : `Cập nhật ${so(thayDoi.length)} mục`,
      thayDoi,
    });
    return NextResponse.json({ product: sp });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("quan_ly_mat_hang");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const sp = await timSanPham(id);
    if (!sp) return NextResponse.json({ error: "Không tìm thấy mặt hàng" }, { status: 404 });

    // Đã lên phiếu bán thì không xoá cứng, chỉ ngừng dùng để giữ lịch sử
    if (await sanPhamDaLenPhieu(id)) {
      await suaSanPham(id, { dangDung: false });
      await ghiNhatKy(kq.nd, {
        hanhDong: "Ngừng dùng mặt hàng",
        loai: "mat_hang",
        doiTuongId: sp.id,
        doiTuong: `${sp.ten} (${sp.ma})`,
        moTa: "Mặt hàng đã lên phiếu bán nên chỉ chuyển sang ngừng dùng, không xoá dữ liệu",
      });
      return NextResponse.json({ daAn: true, ten: sp.ten });
    }
    await xoaSanPham(id);
    await ghiNhatKy(kq.nd, {
      hanhDong: "Xoá mặt hàng",
      loai: "mat_hang",
      doiTuongId: sp.id,
      doiTuong: `${sp.ten} (${sp.ma})`,
      moTa: "Xoá khỏi danh mục mặt hàng",
    });
    return NextResponse.json({ daAn: false, ten: sp.ten });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
