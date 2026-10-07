import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, layPhieuBan } from "@/lib/db";
import { conThieu } from "@/lib/thieu-hang";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("xem_bao_cao");
    if ("res" in kq) return kq.res;

    const url = new URL(req.url);
    const tu = url.searchParams.get("tu") || "";
    const den = url.searchParams.get("den") || "";
    const orders = await layPhieuBan({ tu: tu || undefined, den: den || undefined });

    const theoHang = new Map<
      string,
      { productId: string; ma: string; ten: string; donViTinh: string; soLuong: number; doanhThu: number }
    >();
    const theoNgay = new Map<string, { ngay: string; soPhieu: number; doanhThu: number }>();
    const theoCanPham = new Map<
      string,
      {
        hoTen: string;
        namSinh: number;
        buongGiam: string;
        soPhieu: number;
        soLuongHang: number;
        doanhThu: number;
        lanCuoi: string;
      }
    >();

    /** Hàng còn nợ can phạm, gom theo mặt hàng để tiện đối chiếu khi hàng về */
    const theoThieu = new Map<
      string,
      {
        productId: string;
        ma: string;
        ten: string;
        donViTinh: string;
        conThieu: number;
        phieu: { id: string; soPhieu: string; ngay: string; hoTen: string; buongGiam: string; conThieu: number }[];
      }
    >();
    let soPhieuThieu = 0;
    let tongLuongThieu = 0;

    let doanhThu = 0;
    let soLuongHang = 0;

    for (const o of orders) {
      doanhThu += o.tongTien;

      let phieuCoThieu = false;
      for (const item of o.items) {
        const thieu = conThieu(item);
        if (thieu <= 0) continue;
        phieuCoThieu = true;
        tongLuongThieu += thieu;
        const t = theoThieu.get(item.productId) || {
          productId: item.productId,
          ma: item.ma,
          ten: item.ten,
          donViTinh: item.donViTinh,
          conThieu: 0,
          phieu: [],
        };
        t.conThieu += thieu;
        t.phieu.push({
          id: o.id,
          soPhieu: o.soPhieu,
          ngay: o.ngay,
          hoTen: o.hoTen,
          buongGiam: o.buongGiam,
          conThieu: thieu,
        });
        theoThieu.set(item.productId, t);
      }
      if (phieuCoThieu) soPhieuThieu += 1;

      const n = theoNgay.get(o.ngay) || { ngay: o.ngay, soPhieu: 0, doanhThu: 0 };
      n.soPhieu += 1;
      n.doanhThu += o.tongTien;
      theoNgay.set(o.ngay, n);

      let soLuongPhieu = 0;
      for (const item of o.items) {
        soLuongPhieu += item.soLuong;
        const h = theoHang.get(item.productId) || {
          productId: item.productId,
          ma: item.ma,
          ten: item.ten,
          donViTinh: item.donViTinh,
          soLuong: 0,
          doanhThu: 0,
        };
        h.soLuong += item.soLuong;
        h.doanhThu += item.thanhTien;
        theoHang.set(item.productId, h);
      }
      soLuongHang += soLuongPhieu;

      // Can phạm gộp theo họ tên, giữ thông tin của phiếu mới nhất
      const khoa = o.hoTen.trim().toLowerCase().replace(/\s+/g, " ");
      const p = theoCanPham.get(khoa) || {
        hoTen: o.hoTen.trim(),
        namSinh: o.namSinh,
        buongGiam: o.buongGiam,
        soPhieu: 0,
        soLuongHang: 0,
        doanhThu: 0,
        lanCuoi: o.ngay,
      };
      p.soPhieu += 1;
      p.soLuongHang += soLuongPhieu;
      p.doanhThu += o.tongTien;
      if (o.ngay >= p.lanCuoi) {
        p.lanCuoi = o.ngay;
        // Ưu tiên cách viết có chữ hoa đầu
        if (/^\p{Lu}/u.test(o.hoTen.trim()) || !/^\p{Lu}/u.test(p.hoTen)) p.hoTen = o.hoTen.trim();
        if (o.namSinh) p.namSinh = o.namSinh;
        if (o.buongGiam) p.buongGiam = o.buongGiam;
      }
      theoCanPham.set(khoa, p);
    }

    // Nếu mọi phiếu đều để giá 0 thì báo cáo chỉ nói về số lượng
    const coDungTien = orders.some((o) => o.tongTien > 0);

    return NextResponse.json({
      tongQuan: {
        doanhThu,
        soPhieu: orders.length,
        soMatHang: theoHang.size,
        soLuongHang,
        soCanPham: theoCanPham.size,
        soPhieuThieu,
        tongLuongThieu,
        coDungTien,
      },
      hangThieu: [...theoThieu.values()]
        .map((t) => ({ ...t, phieu: t.phieu.sort((a, b) => a.ngay.localeCompare(b.ngay)) }))
        .sort((a, b) => b.conThieu - a.conThieu),
      theoNgay: [...theoNgay.values()].sort((a, b) => a.ngay.localeCompare(b.ngay)),
      theoHang: [...theoHang.values()].sort((a, b) =>
        coDungTien ? b.doanhThu - a.doanhThu : b.soLuong - a.soLuong,
      ),
      theoCanPham: [...theoCanPham.values()].sort((a, b) =>
        coDungTien ? b.doanhThu - a.doanhThu : b.soLuongHang - a.soLuongHang,
      ),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
