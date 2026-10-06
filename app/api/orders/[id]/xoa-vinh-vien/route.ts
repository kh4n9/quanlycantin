import { NextResponse } from "next/server";
import { yeuCau } from "@/lib/auth";
import { khoiTao, timPhieuBan, xoaVinhVienPhieuBan } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Xoá hẳn phiếu khỏi cơ sở dữ liệu. Chỉ dùng được với phiếu đang trong thùng rác. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await khoiTao();
    const kq = await yeuCau("xoa_phieu");
    if ("res" in kq) return kq.res;

    const { id } = await params;
    const phieu = await timPhieuBan(id);
    if (!phieu) return NextResponse.json({ error: "Không tìm thấy phiếu bán" }, { status: 404 });
    if (!phieu.xoaLuc) {
      return NextResponse.json(
        { error: "Phiếu này chưa nằm trong thùng rác. Hãy chuyển vào thùng rác trước." },
        { status: 400 },
      );
    }

    await xoaVinhVienPhieuBan(id);
    return NextResponse.json({ ok: true, soPhieu: phieu.soPhieu });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
