import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, layCaiDat, luuCaiDat } from "@/lib/db";
import { so } from "@/lib/format";
import { chuanHoaMauIn, chuanHoaMauInThieu } from "@/lib/mau-in";
import { soSanhTruong } from "@/lib/nhat-ky";
import { ghiNhatKy } from "@/lib/nhat-ky-server";
import type { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await khoiTao();
    const kq = await yeuCau();
    if ("res" in kq) return kq.res;
    return NextResponse.json({ settings: await layCaiDat() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await khoiTao();
    const kq = await yeuCau("sua_cai_dat");
    if ("res" in kq) return kq.res;

    const body = await req.json();
    const patch: Partial<Settings> = {};
    if (body.tenDonVi !== undefined) patch.tenDonVi = String(body.tenDonVi);
    if (body.diaChi !== undefined) patch.diaChi = String(body.diaChi);
    if (body.nguoiLapPhieu !== undefined) patch.nguoiLapPhieu = String(body.nguoiLapPhieu);
    if (body.soNgayGiuThungRac !== undefined) {
      patch.soNgayGiuThungRac = Math.max(0, Math.round(Number(body.soNgayGiuThungRac) || 0));
    }
    if (body.mauIn !== undefined) patch.mauIn = chuanHoaMauIn(body.mauIn);
    if (body.mauInThieu !== undefined) patch.mauInThieu = chuanHoaMauInThieu(body.mauInThieu);

    const truoc = await layCaiDat();
    const sau = await luuCaiDat(patch);
    const thayDoi = soSanhTruong(
      truoc as unknown as Record<string, unknown>,
      sau as unknown as Record<string, unknown>,
      {
        tenDonVi: "Tên đơn vị",
        diaChi: "Địa chỉ",
        nguoiLapPhieu: "Người lập phiếu",
        soNgayGiuThungRac: "Số ngày giữ thùng rác",
      },
      {
        soNgayGiuThungRac: (v) => (Number(v) > 0 ? `${so(Number(v))} ngày` : "Giữ mãi"),
      },
    );
    if (JSON.stringify(truoc.mauIn) !== JSON.stringify(sau.mauIn)) {
      thayDoi.push({ truong: "Mẫu in phiếu bán", truoc: "—", sau: "Đã cập nhật" });
    }
    if (JSON.stringify(truoc.mauInThieu) !== JSON.stringify(sau.mauInThieu)) {
      thayDoi.push({ truong: "Mẫu in phiếu thiếu", truoc: "—", sau: "Đã cập nhật" });
    }

    await ghiNhatKy(kq.nd, {
      hanhDong: "Sửa cài đặt",
      loai: "cai_dat",
      doiTuongId: "don_vi",
      doiTuong: sau.tenDonVi || "Thông tin đơn vị",
      moTa: `Cập nhật ${so(thayDoi.length)} mục`,
      thayDoi,
    });
    return NextResponse.json({ settings: sau });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
