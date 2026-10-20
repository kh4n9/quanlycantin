import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, layPhieuBan } from "@/lib/db";
import { conThieu } from "@/lib/thieu-hang";
import type { Order } from "@/lib/types";

export const dynamic = "force-dynamic";

type PhieuTomTat = {
  id: string;
  soPhieu: string;
  ngay: string;
  hoTen: string;
  namSinh: number;
  buongGiam: string;
  soMatHang: number;
  soLuong: number;
  tongTien: number;
  conThieu: number;
  kiemLuc: string;
  kiemGhiChu: string;
  ghiChu: string;
};

type PhieuHangTomTat = {
  id: string;
  soPhieu: string;
  ngay: string;
  hoTen: string;
  namSinh: number;
  buongGiam: string;
  soLuong: number;
  thanhTien: number;
  conThieu: number;
};

type MatHangTomTat = {
  productId: string;
  ma: string;
  ten: string;
  donViTinh: string;
  soLuong: number;
  thanhTien: number;
};

type HangTichLuy = {
  productId: string;
  ma: string;
  ten: string;
  donViTinh: string;
  soLuong: number;
  doanhThu: number;
  soPhieu: number;
  canPham: Set<string>;
  phieuIds: Set<string>;
  phieu: PhieuHangTomTat[];
};

type CanPhamTichLuy = {
  id: string;
  hoTen: string;
  namSinh: number;
  buongGiam: string;
  soPhieu: number;
  soLuongHang: number;
  doanhThu: number;
  lanDau: string;
  lanCuoi: string;
  hang: Map<string, MatHangTomTat>;
  phieu: PhieuTomTat[];
};

type NgayTichLuy = {
  ngay: string;
  soPhieu: number;
  soLuongHang: number;
  doanhThu: number;
  phieu: PhieuTomTat[];
};

function tomTatPhieu(o: Order): PhieuTomTat {
  const soLuong = o.items.reduce((s, item) => s + item.soLuong, 0);
  const conThieuPhieu = o.items.reduce((s, item) => s + conThieu(item), 0);
  return {
    id: o.id,
    soPhieu: o.soPhieu,
    ngay: o.ngay,
    hoTen: o.hoTen,
    namSinh: o.namSinh,
    buongGiam: o.buongGiam,
    soMatHang: o.items.length,
    soLuong,
    tongTien: o.tongTien,
    conThieu: conThieuPhieu,
    kiemLuc: o.kiemLuc,
    kiemGhiChu: o.kiemGhiChu,
    ghiChu: o.ghiChu,
  };
}

/** "2026-10-20" lùi n ngày, giữ nguyên múi ngày lịch. */
function luiNgayISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() - n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

/** Số ngày bao gồm cả hai đầu, null nếu khoảng ngày không hợp lệ. */
function soNgay(tu: string, den: string): number | null {
  if (!tu || !den) return null;
  const [y1, m1, d1] = tu.split("-").map(Number);
  const [y2, m2, d2] = den.split("-").map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return null;
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) return null;
  return Math.floor((b - a) / 86_400_000) + 1;
}

export async function GET(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("xem_bao_cao");
    if ("res" in kq) return kq.res;

    const url = new URL(req.url);
    const tu = url.searchParams.get("tu") || "";
    const den = url.searchParams.get("den") || "";

    // Kỳ trước dùng cùng độ dài để so sánh; chạy song song với kỳ hiện tại.
    const soNgayKy = soNgay(tu, den);
    const soSanhPromise = (async () => {
      if (!soNgayKy) return null;
      const denTruoc = luiNgayISO(tu, 1);
      const tuTruoc = luiNgayISO(denTruoc, soNgayKy - 1);
      if (!tuTruoc || !denTruoc) return null;
      const truoc = await layPhieuBan({ tu: tuTruoc, den: denTruoc });
      const hang = new Set<string>();
      const nguoi = new Set<string>();
      let doanhThu = 0;
      let soLuongHang = 0;
      for (const o of truoc) {
        doanhThu += o.tongTien;
        nguoi.add(o.hoTen.trim().toLowerCase().replace(/\s+/g, " "));
        for (const item of o.items) {
          hang.add(item.productId);
          soLuongHang += item.soLuong;
        }
      }
      return {
        tu: tuTruoc,
        den: denTruoc,
        doanhThu,
        soPhieu: truoc.length,
        soLuongHang,
        soMatHang: hang.size,
        soCanPham: nguoi.size,
      };
    })();

    const orders = await layPhieuBan({ tu: tu || undefined, den: den || undefined });
    const soSanh = await soSanhPromise;

    const theoHang = new Map<string, HangTichLuy>();
    const theoNgay = new Map<string, NgayTichLuy>();
    const theoCanPham = new Map<string, CanPhamTichLuy>();

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
    /**
     * Danh sách hàng thiếu đã trải phẳng, sắp theo buồng rồi tới phiếu.
     * Dùng để in ra đi phát hàng: đi lần lượt từng buồng, trong buồng xử lý
     * từng phiếu một.
     */
    const thieuTheoPhieu: {
      buongGiam: string;
      soPhieu: string;
      ngay: string;
      hoTen: string;
      ma: string;
      ten: string;
      donViTinh: string;
      conThieu: number;
      ghiChu: string;
    }[] = [];
    let soPhieuThieu = 0;
    let tongLuongThieu = 0;

    let doanhThu = 0;
    let soLuongHang = 0;

    for (const o of orders) {
      doanhThu += o.tongTien;
      const phieu = tomTatPhieu(o);
      const soLuongPhieu = phieu.soLuong;
      const khoa = o.hoTen.trim().toLowerCase().replace(/\s+/g, " ");

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

        thieuTheoPhieu.push({
          buongGiam: o.buongGiam || "",
          soPhieu: o.soPhieu,
          ngay: o.ngay,
          hoTen: o.hoTen,
          ma: item.ma,
          ten: item.ten,
          donViTinh: item.donViTinh,
          conThieu: thieu,
          ghiChu: o.ghiChu || "",
        });
      }
      if (phieuCoThieu) soPhieuThieu += 1;

      const n = theoNgay.get(o.ngay) || {
        ngay: o.ngay,
        soPhieu: 0,
        soLuongHang: 0,
        doanhThu: 0,
        phieu: [],
      };
      n.soPhieu += 1;
      n.soLuongHang += soLuongPhieu;
      n.doanhThu += o.tongTien;
      n.phieu.push(phieu);
      theoNgay.set(o.ngay, n);

      // Can phạm gộp theo họ tên, giữ thông tin của phiếu mới nhất
      const p = theoCanPham.get(khoa) || {
        id: khoa,
        hoTen: o.hoTen.trim(),
        namSinh: o.namSinh,
        buongGiam: o.buongGiam,
        soPhieu: 0,
        soLuongHang: 0,
        doanhThu: 0,
        lanDau: o.ngay,
        lanCuoi: o.ngay,
        hang: new Map<string, MatHangTomTat>(),
        phieu: [],
      };
      p.soPhieu += 1;
      p.soLuongHang += soLuongPhieu;
      p.doanhThu += o.tongTien;
      p.phieu.push(phieu);
      if (!p.lanDau || o.ngay < p.lanDau) p.lanDau = o.ngay;
      if (o.ngay >= p.lanCuoi) {
        p.lanCuoi = o.ngay;
        // Ưu tiên cách viết có chữ hoa đầu
        if (/^\p{Lu}/u.test(o.hoTen.trim()) || !/^\p{Lu}/u.test(p.hoTen)) p.hoTen = o.hoTen.trim();
        if (o.namSinh) p.namSinh = o.namSinh;
        if (o.buongGiam) p.buongGiam = o.buongGiam;
      }

      for (const item of o.items) {
        const h = theoHang.get(item.productId) || {
          productId: item.productId,
          ma: item.ma,
          ten: item.ten,
          donViTinh: item.donViTinh,
          soLuong: 0,
          doanhThu: 0,
          soPhieu: 0,
          canPham: new Set<string>(),
          phieuIds: new Set<string>(),
          phieu: [],
        };
        h.soLuong += item.soLuong;
        h.doanhThu += item.thanhTien;
        h.canPham.add(khoa);
        if (!h.phieuIds.has(o.id)) {
          h.soPhieu += 1;
          h.phieuIds.add(o.id);
          h.phieu.push({
            id: o.id,
            soPhieu: o.soPhieu,
            ngay: o.ngay,
            hoTen: o.hoTen,
            namSinh: o.namSinh,
            buongGiam: o.buongGiam,
            soLuong: item.soLuong,
            thanhTien: item.thanhTien,
            conThieu: conThieu(item),
          });
        }
        theoHang.set(item.productId, h);

        const mh = p.hang.get(item.productId) || {
          productId: item.productId,
          ma: item.ma,
          ten: item.ten,
          donViTinh: item.donViTinh,
          soLuong: 0,
          thanhTien: 0,
        };
        mh.soLuong += item.soLuong;
        mh.thanhTien += item.thanhTien;
        p.hang.set(item.productId, mh);
      }
      soLuongHang += soLuongPhieu;
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
      soSanh,
      hangThieu: [...theoThieu.values()]
        .map((t) => ({ ...t, phieu: t.phieu.sort((a, b) => a.ngay.localeCompare(b.ngay)) }))
        .sort((a, b) => b.conThieu - a.conThieu),
      // Buồng để trống xếp cuối; so sánh kiểu số để B2 đứng trước B12
      thieuTheoPhieu: thieuTheoPhieu.sort((a, b) => {
        if (!a.buongGiam && b.buongGiam) return 1;
        if (a.buongGiam && !b.buongGiam) return -1;
        const theoBuong = a.buongGiam.localeCompare(b.buongGiam, "vi", { numeric: true });
        if (theoBuong !== 0) return theoBuong;
        return a.soPhieu.localeCompare(b.soPhieu, "vi", { numeric: true });
      }),
      theoNgay: [...theoNgay.values()]
        .map((n) => ({
          ...n,
          phieu: [...n.phieu].sort((a, b) =>
            b.ngay.localeCompare(a.ngay) || b.soPhieu.localeCompare(a.soPhieu, "vi", { numeric: true }),
          ),
        }))
        .sort((a, b) => a.ngay.localeCompare(b.ngay)),
      theoHang: [...theoHang.values()]
        .map(({ canPham, phieuIds: _phieuIds, ...h }) => ({
          ...h,
          soCanPham: canPham.size,
          phieu: [...h.phieu].sort((a, b) => b.ngay.localeCompare(a.ngay)),
        }))
        .sort((a, b) => (coDungTien ? b.doanhThu - a.doanhThu : b.soLuong - a.soLuong)),
      theoCanPham: [...theoCanPham.values()]
        .map(({ hang, ...p }) => ({
          ...p,
          soMatHang: hang.size,
          hang: [...hang.values()].sort((a, b) => b.soLuong - a.soLuong),
          phieu: [...p.phieu].sort((a, b) => b.ngay.localeCompare(a.ngay)),
        }))
        .sort((a, b) => (coDungTien ? b.doanhThu - a.doanhThu : b.soLuongHang - a.soLuongHang)),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
