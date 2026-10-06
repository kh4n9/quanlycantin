"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, type DuLieuPhieu } from "@/lib/client";
import { taiExcel } from "@/lib/excel";
import { homNay, khop, ngayVN, so, tien } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { CanPhamGoiY, Order, Product } from "@/lib/types";
import { PhieuBanForm } from "./phieu-ban-form";
import { MauPhieuBan, useInPhieu } from "./print";
import { bao, baoLoi, BieuTuong, HopThoai, Nut, OText, Trong } from "./ui";

function dauThang(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function ManPhieuBan({ onSangBanHang }: { onSangBanHang: () => void }) {
  const { xemTruoc } = useInPhieu();
  const { coQuyen } = useStore();
  const duocSua = coQuyen("sua_phieu");
  const duocXoa = coQuyen("xoa_phieu");
  const duocBan = coQuyen("ban_hang");
  const [ds, setDs] = useState<Order[]>([]);
  const [tu, setTu] = useState(dauThang());
  const [den, setDen] = useState(homNay());
  const [q, setQ] = useState("");
  const [dangTai, setDangTai] = useState(true);
  const [dangSua, setDangSua] = useState<Order | null>(null);

  // Dữ liệu cho form sửa phiếu
  const [sanPham, setSanPham] = useState<Product[]>([]);
  const [goiY, setGoiY] = useState<CanPhamGoiY[]>([]);

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      const thamSo = new URLSearchParams();
      if (tu) thamSo.set("tu", tu);
      if (den) thamSo.set("den", den);
      setDs((await apiClient.orders(thamSo.toString())).orders);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangTai(false);
    }
  }, [tu, den]);

  useEffect(() => {
    void nap();
  }, [nap]);

  useEffect(() => {
    Promise.all([apiClient.products(), apiClient.canPham()])
      .then(([sp, cp]) => {
        setSanPham(sp.products);
        setGoiY(cp.canPham);
      })
      .catch(() => {
        /* chỉ cần khi bấm sửa, lỗi ở đây không chặn màn hình */
      });
  }, []);

  const hienThi = useMemo(
    () => (q ? ds.filter((o) => khop(o.soPhieu, q) || khop(o.hoTen, q) || khop(o.buongGiam, q)) : ds),
    [ds, q],
  );
  const tongTien = hienThi.reduce((s, o) => s + o.tongTien, 0);
  const coTien = hienThi.some((o) => o.tongTien > 0);

  const luuSua = useCallback(
    async (duLieu: DuLieuPhieu) => {
      if (!dangSua) return;
      const kq = await apiClient.suaPhieuBan(dangSua.id, duLieu);
      bao(`Đã cập nhật phiếu ${kq.order.soPhieu}`);
      setDangSua(null);
      await nap();
    },
    [dangSua, nap],
  );

  const xoa = async (o: Order) => {
    if (!window.confirm(`Xoá phiếu ${o.soPhieu} của ${o.hoTen}?`)) return;
    try {
      await apiClient.xoaPhieuBan(o.id);
      bao(`Đã xoá phiếu ${o.soPhieu}`);
      await nap();
    } catch (e) {
      baoLoi((e as Error).message);
    }
  };

  const xuatExcel = () => {
    // Mỗi dòng hàng của phiếu là một dòng trong file để lọc và tổng hợp được
    const dong = hienThi.flatMap((o) =>
      o.items.map((i) => [
        o.soPhieu,
        ngayVN(o.ngay),
        o.hoTen,
        o.namSinh || null,
        o.buongGiam,
        i.ten,
        i.donViTinh,
        i.soLuong,
        i.donGia,
        i.thanhTien,
        o.kiemLuc ? (o.kiemGhiChu ? "Đã kiểm — có sai sót" : "Đã kiểm") : "Chưa kiểm",
        o.kiemGhiChu,
      ]),
    );
    void taiExcel(`phieu-ban_${tu}_${den}`, {
      ten: "Phiếu bán",
      tieuDe: `Danh sách phiếu bán từ ${ngayVN(tu)} đến ${ngayVN(den)}`,
      tieuDeCot: [
        "Số phiếu", "Ngày", "Họ tên", "Năm sinh", "Buồng giam",
        "Mặt hàng", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền",
        "Trạng thái kiểm", "Ghi chú kiểm",
      ],
      dong,
      cotTien: [8, 9],
      doRong: [16, 12, 26, 10, 12, 26, 8, 10, 12, 14, 20, 26],
    }).catch((e) => baoLoi((e as Error).message));
  };

  return (
    <>
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-3 py-2.5">
        <div className="mr-2">
          <div className="text-sm font-semibold text-slate-800">Phiếu bán</div>
          <div className="text-[11px] text-slate-500">Bấm vào dòng để xem và in lại phiếu</div>
        </div>
        <div className="flex items-center gap-1.5">
          <OText type="date" value={tu} onChange={(e) => setTu(e.target.value)} className="w-36" />
          <span className="text-slate-400">→</span>
          <OText type="date" value={den} onChange={(e) => setDen(e.target.value)} className="w-36" />
        </div>
        <div className="relative min-w-52 flex-1">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400">
            <BieuTuong ten="tim" className="h-4 w-4" />
          </span>
          <OText
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm số phiếu, họ tên, buồng giam…"
            className="pl-8"
          />
        </div>
        <Nut onClick={xuatExcel} disabled={hienThi.length === 0}>
          <BieuTuong ten="tai" /> Excel
        </Nut>
        {duocBan && (
          <Nut kieu="chinh" onClick={onSangBanHang}>
            <BieuTuong ten="them" /> Lập phiếu bán
          </Nut>
        )}
      </div>

      <div className="mem-cuon max-h-[64vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[12px] text-slate-600">
            <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
              <th className="w-36">Số phiếu</th>
              <th className="w-28">Ngày</th>
              <th>Can phạm</th>
              <th className="w-32">Buồng giam</th>
              <th className="w-24 text-center">Mặt hàng</th>
              <th className="w-32 text-right">Tổng tiền</th>
              <th className="w-32" />
            </tr>
          </thead>
          <tbody>
            {hienThi.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <Trong
                    tieuDe={dangTai ? "Đang tải…" : "Không có phiếu nào trong khoảng ngày này"}
                    moTa={dangTai ? undefined : "Đổi khoảng ngày hoặc từ khoá tìm kiếm để xem phiếu khác."}
                  />
                </td>
              </tr>
            )}
            {hienThi.map((o) => (
              <tr
                key={o.id}
                onClick={() => xemTruoc(o)}
                className="cursor-pointer [&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-2 hover:bg-blue-50/50"
              >
                <td className="font-mono text-[12px] font-medium text-blue-700">{o.soPhieu}</td>
                <td className="text-slate-600">{ngayVN(o.ngay)}</td>
                <td>
                  <div className="font-medium text-slate-800">{o.hoTen}</div>
                  <div className="text-[11px] text-slate-500">
                    {o.namSinh ? `SN ${o.namSinh}` : "Chưa rõ năm sinh"}
                  </div>
                </td>
                <td className="text-slate-600">{o.buongGiam || "—"}</td>
                <td className="text-center text-slate-600">{o.items.length}</td>
                <td className="text-right font-semibold text-slate-800">
                  {o.tongTien > 0 ? so(o.tongTien) : "—"}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {duocSua && (
                      <Nut kieu="mo" co="sm" onClick={() => setDangSua(o)} title="Sửa phiếu">
                        <BieuTuong ten="sua" className="h-4 w-4" />
                      </Nut>
                    )}
                    <Nut kieu="mo" co="sm" onClick={() => xemTruoc(o)} title="Xem và in phiếu">
                      <BieuTuong ten="in" className="h-4 w-4" />
                    </Nut>
                    {duocXoa && (
                      <Nut
                        kieu="mo"
                        co="sm"
                        onClick={() => void xoa(o)}
                        title="Xoá phiếu"
                        className="hover:text-rose-600"
                      >
                        <BieuTuong ten="xoa" className="h-4 w-4" />
                      </Nut>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {hienThi.length > 0 && (
            <tfoot className="sticky bottom-0 bg-slate-50">
              <tr className="[&>td]:border-t [&>td]:border-slate-200 [&>td]:px-3 [&>td]:py-2">
                <td colSpan={4} className="text-[12px] font-medium text-slate-600">
                  Tổng {so(hienThi.length)} phiếu
                </td>
                <td className="text-center text-[12px] text-slate-600">
                  {so(hienThi.reduce((s, o) => s + o.items.reduce((a, i) => a + i.soLuong, 0), 0))} đơn vị
                </td>
                <td className="text-right text-base font-bold text-slate-900">{coTien ? tien(tongTien) : "—"}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>

      {/* --- Hộp thoại sửa phiếu --- */}
      <HopThoai
        mo={dangSua !== null}
        dong={() => setDangSua(null)}
        tieuDe={dangSua ? `Sửa phiếu ${dangSua.soPhieu}` : ""}
        rong="max-w-5xl"
      >
        {dangSua && (
          <PhieuBanForm
            banDau={dangSua}
            sanPham={sanPham}
            goiY={goiY}
            onLuu={luuSua}
            onHuy={() => setDangSua(null)}
            trongHopThoai
          />
        )}
      </HopThoai>
    </>
  );
}

/* ------------------------ Xem trước & in phiếu ------------------------ */

export function HopXemTruocPhieu() {
  const { dangXem, dongXemTruoc, inPhieu } = useInPhieu();
  const { settings } = useStore();

  // Ctrl+Enter để đóng nhanh, khỏi phải với chuột
  useEffect(() => {
    if (!dangXem) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        dongXemTruoc();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dangXem, dongXemTruoc]);

  return (
    <HopThoai
      mo={dangXem !== null}
      dong={dongXemTruoc}
      tieuDe={dangXem ? `Phiếu bán ${dangXem.soPhieu}` : ""}
      rong="max-w-3xl"
      chanTrang={
        <>
          <Nut onClick={dongXemTruoc}>
            Đóng
            <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-normal text-slate-600">
              Ctrl+↵
            </span>
          </Nut>
          <Nut
            kieu="chinh"
            onClick={() => {
              if (dangXem) inPhieu(dangXem);
            }}
          >
            <BieuTuong ten="in" /> In phiếu
          </Nut>
        </>
      }
    >
      <div className="mem-cuon max-h-[68vh] overflow-auto rounded border border-slate-200 bg-white p-6">
        {dangXem && <MauPhieuBan order={dangXem} settings={settings} />}
      </div>
    </HopThoai>
  );
}
