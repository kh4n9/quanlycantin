import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = await getDB();
  const url = new URL(req.url);
  const tu = url.searchParams.get("tu") || "";
  const den = url.searchParams.get("den") || "";

  const orders = db.orders.filter((o) => (!tu || o.ngay >= tu) && (!den || o.ngay <= den));

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

  let doanhThu = 0;
  let soLuongHang = 0;

  for (const o of orders) {
    doanhThu += o.tongTien;

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
      coDungTien,
    },
    theoNgay: [...theoNgay.values()].sort((a, b) => a.ngay.localeCompare(b.ngay)),
    theoHang: [...theoHang.values()].sort((a, b) =>
      coDungTien ? b.doanhThu - a.doanhThu : b.soLuong - a.soLuong,
    ),
    theoCanPham: [...theoCanPham.values()].sort((a, b) =>
      coDungTien ? b.doanhThu - a.doanhThu : b.soLuongHang - a.soLuongHang,
    ),
  });
}
