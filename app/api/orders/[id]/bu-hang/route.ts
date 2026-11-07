import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { ghiBuHang, khoiTao, suaLanBuHang, timPhieuBan, xoaLanBuHang } from "@/lib/db";
import { so } from "@/lib/format";
import { ghiNhatKy } from "@/lib/nhat-ky-server";

export const dynamic = "force-dynamic";

/** Số lượng đã bù của một dòng hàng. */
const daBu = (o: { bu?: { soLuong: number }[] }) => (o.bu ?? []).reduce((t, b) => t + b.soLuong, 0);

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

/**
 * Sửa một lần bù đã ghi nhầm.
 *
 * `viTri` là chỉ số trong danh sách lần bù của dòng hàng — cùng thứ tự mà giao
 * diện đang hiển thị, nên sửa đúng dòng người dùng đang thấy.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("sua_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const body = await req.json();
    const productId = String(body.productId ?? "");
    const viTri = Number(body.viTri);
    const soLuong = Math.round(Number(body.soLuong) || 0);
    const ngay = String(body.ngay || new Date().toISOString().slice(0, 10));
    const ghiChu = String(body.ghiChu ?? "").trim();

    const truoc = await timPhieuBan(id);
    if (!truoc) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });

    const dong = truoc.items.find((i) => i.productId === productId);
    const cu = dong?.bu?.[viTri];
    if (!dong || !cu) {
      return NextResponse.json({ error: "Không tìm thấy lần bù cần sửa" }, { status: 404 });
    }

    const phieu = await suaLanBuHang(id, productId, viTri, { soLuong, ngay, ghiChu });
    if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });

    const thayDoi = [
      ...(soLuong !== cu.soLuong
        ? [
            {
              truong: `${dong.ten} · số lượng`,
              truoc: `${so(cu.soLuong)} ${dong.donViTinh}`,
              sau: `${so(soLuong)} ${dong.donViTinh}`,
            },
          ]
        : []),
      ...(ngay !== cu.ngay
        ? [{ truong: `${dong.ten} · ngày bù`, truoc: cu.ngay, sau: ngay }]
        : []),
      ...(ghiChu !== (cu.ghiChu ?? "")
        ? [{ truong: `${dong.ten} · ghi chú`, truoc: cu.ghiChu || "—", sau: ghiChu || "—" }]
        : []),
    ];

    await ghiNhatKy(kq.nd, {
      hanhDong: "Sửa lần bù hàng",
      loai: "phieu",
      doiTuongId: id,
      doiTuong: `Phiếu ${phieu.soPhieu}`,
      moTa: `${phieu.hoTen} · ${dong.ten}: bù ${so(cu.soLuong)} → ${so(soLuong)} ${dong.donViTinh}`,
      thayDoi,
    });
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Xoá một lần bù đã ghi nhầm (hàng không thực sự được bù). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("sua_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const productId = String(body.productId ?? "");
    const viTri = Number(body.viTri);

    const truoc = await timPhieuBan(id);
    if (!truoc) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });

    const dong = truoc.items.find((i) => i.productId === productId);
    const cu = dong?.bu?.[viTri];
    if (!dong || !cu) {
      return NextResponse.json({ error: "Không tìm thấy lần bù cần xoá" }, { status: 404 });
    }

    const phieu = await xoaLanBuHang(id, productId, viTri);
    if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });

    await ghiNhatKy(kq.nd, {
      hanhDong: "Xoá lần bù hàng",
      loai: "phieu",
      doiTuongId: id,
      doiTuong: `Phiếu ${phieu.soPhieu}`,
      moTa: `${phieu.hoTen} · xoá lần bù ${so(cu.soLuong)} ${dong.donViTinh} của ${dong.ten}`,
      thayDoi: [
        {
          truong: `${dong.ten} · số lượng bù`,
          truoc: `${so(cu.soLuong)} ${dong.donViTinh}`,
          sau: `0 ${dong.donViTinh}`,
        },
      ],
    });
    return NextResponse.json({ order: phieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
