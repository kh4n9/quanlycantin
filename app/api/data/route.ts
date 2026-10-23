import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, xoaHetDuLieu } from "@/lib/db";
import { so } from "@/lib/format";
import { ghiNhatKy } from "@/lib/nhat-ky-server";

export const dynamic = "force-dynamic";

/** Xoá sạch mặt hàng và phiếu bán. Giữ lại tài khoản và thông tin đơn vị. */
export async function DELETE() {
  try {
    await khoiTao();
    const kq = await yeuCau("sua_cai_dat");
    if ("res" in kq) return kq.res;

    const kqXoa = await xoaHetDuLieu();
    await ghiNhatKy(kq.nd, {
      hanhDong: "Xoá toàn bộ dữ liệu",
      loai: "cai_dat",
      doiTuong: "Mặt hàng và phiếu bán",
      moTa: `Đã xoá ${so(kqXoa.soHang)} mặt hàng và ${so(kqXoa.soPhieu)} phiếu bán; giữ lại tài khoản, cài đặt và nhật ký`,
    });
    return NextResponse.json({ ok: true, ...kqXoa });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
