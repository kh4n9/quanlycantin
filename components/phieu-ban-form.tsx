"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DuLieuPhieu } from "@/lib/client";
import { homNay, so, tien } from "@/lib/format";
import type { CanPhamGoiY, LineItem, Order, Product } from "@/lib/types";
import { ChonHang, OTenCanPham } from "./pickers";
import { useInPhieu } from "./print";
import { baoLoi, BieuTuong, Nut, ONhan, OText, Trong } from "./ui";

/**
 * Form lập / sửa phiếu bán.
 *
 * Dùng chung cho màn hình Bán hàng (lập phiếu mới) và hộp thoại sửa phiếu trong
 * màn hình Phiếu bán. Phần gọi form tự lo việc gọi API và xử lý sau khi lưu.
 */
export function PhieuBanForm({
  banDau,
  sanPham,
  goiY,
  onLuu,
  onHuy,
  nhanLuu,
  trongHopThoai = false,
}: {
  banDau?: Order;
  sanPham: Product[];
  goiY: CanPhamGoiY[];
  onLuu: (duLieu: DuLieuPhieu) => Promise<void>;
  onHuy?: () => void;
  nhanLuu?: string;
  trongHopThoai?: boolean;
}) {
  const suaDoi = Boolean(banDau);
  const { dangXem } = useInPhieu();

  const [hoTen, setHoTen] = useState(banDau?.hoTen ?? "");
  const [namSinh, setNamSinh] = useState(banDau?.namSinh ? String(banDau.namSinh) : "");
  const [buongGiam, setBuongGiam] = useState(banDau?.buongGiam ?? "");
  const [ngay, setNgay] = useState(banDau?.ngay ?? homNay());
  const [ghiChu, setGhiChu] = useState(banDau?.ghiChu ?? "");
  const [dsDong, setDsDong] = useState<LineItem[]>(banDau?.items ? [...banDau.items] : []);
  const [dangLuu, setDangLuu] = useState(false);

  const oHoTen = useRef<HTMLInputElement>(null);
  const oNamSinh = useRef<HTMLInputElement>(null);
  const oBuongGiam = useRef<HTMLInputElement>(null);
  const oTimHang = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!suaDoi) setTimeout(() => oHoTen.current?.focus(), 80);
  }, [suaDoi]);

  const tongTien = dsDong.reduce((s, d) => s + d.thanhTien, 0);
  const tongDonVi = dsDong.reduce((s, d) => s + d.soLuong, 0);

  const themHang = useCallback((p: Product, soLuong: number) => {
    setDsDong((cu) => {
      const i = cu.findIndex((d) => d.productId === p.id);
      if (i >= 0) {
        const moi = [...cu];
        const sl = moi[i].soLuong + soLuong;
        moi[i] = { ...moi[i], soLuong: sl, thanhTien: sl * moi[i].donGia };
        return moi;
      }
      return [
        ...cu,
        {
          productId: p.id,
          ma: p.ma,
          ten: p.ten,
          donViTinh: p.donViTinh,
          soLuong,
          donGia: p.giaBan,
          thanhTien: soLuong * p.giaBan,
        },
      ];
    });
  }, []);

  const suaDong = (i: number, thayDoi: Partial<Pick<LineItem, "soLuong" | "donGia">>) => {
    setDsDong((cu) => {
      const moi = [...cu];
      const d = { ...moi[i], ...thayDoi };
      d.soLuong = Math.max(0, Math.round(d.soLuong || 0));
      d.donGia = Math.max(0, Math.round(d.donGia || 0));
      d.thanhTien = d.soLuong * d.donGia;
      moi[i] = d;
      return moi;
    });
  };

  const lamMoi = useCallback(() => {
    setHoTen("");
    setNamSinh("");
    setBuongGiam("");
    setDsDong([]);
    setGhiChu("");
    setNgay(homNay());
    setTimeout(() => oHoTen.current?.focus(), 50);
  }, []);

  const luu = useCallback(async () => {
    if (!hoTen.trim()) {
      baoLoi("Chưa nhập họ tên can phạm");
      oHoTen.current?.focus();
      return;
    }
    if (dsDong.length === 0) {
      baoLoi("Phiếu chưa có mặt hàng nào");
      return;
    }
    setDangLuu(true);
    try {
      await onLuu({
        ngay,
        hoTen: hoTen.trim(),
        namSinh: Number(namSinh) || 0,
        buongGiam: buongGiam.trim(),
        ghiChu,
        items: dsDong.map((d) => ({ productId: d.productId, soLuong: d.soLuong, donGia: d.donGia })),
      });
      if (!suaDoi) lamMoi();
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  }, [hoTen, namSinh, buongGiam, dsDong, ngay, ghiChu, onLuu, suaDoi, lamMoi]);

  // Ctrl+Enter để lưu. Khi cửa sổ xem trước đang mở thì nhường phím này cho
  // cửa sổ đó (dùng để đóng), tránh vừa đóng vừa lưu thêm một phiếu trống.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dangXem) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void luu();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [luu, dangXem]);

  return (
    <div className="flex flex-col gap-3">
      {/* --- Thông tin can phạm, ghi thẳng trên phiếu --- */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <span className="text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
            Thông tin can phạm
          </span>
          <span className="text-[11px] text-slate-400">
            Gõ tên đã mua trước đây để tự điền năm sinh và buồng giam
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_1fr]">
          <div>
            <ONhan>Họ và tên *</ONhan>
            <OTenCanPham
              giaTri={hoTen}
              onDoi={setHoTen}
              goiY={goiY}
              inputRef={oHoTen}
              onChonGoiY={(c) => {
                setHoTen(c.hoTen);
                setNamSinh(c.namSinh ? String(c.namSinh) : "");
                setBuongGiam(c.buongGiam);
                setTimeout(() => oTimHang.current?.focus(), 50);
              }}
              onEnter={() => oNamSinh.current?.focus()}
            />
          </div>
          <div>
            <ONhan>Năm sinh</ONhan>
            <OText
              ref={oNamSinh}
              type="number"
              value={namSinh}
              onChange={(e) => setNamSinh(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  oBuongGiam.current?.focus();
                }
              }}
              placeholder="1985"
            />
          </div>
          <div>
            <ONhan>Buồng giam</ONhan>
            <OText
              ref={oBuongGiam}
              value={buongGiam}
              onChange={(e) => setBuongGiam(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  oTimHang.current?.focus();
                }
              }}
              placeholder="Buồng 3"
            />
          </div>
        </div>
      </div>

      {/* --- Thêm mặt hàng --- */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[12px] font-semibold tracking-wide text-slate-500 uppercase">Thêm mặt hàng</span>
          <span className="text-[11px] text-slate-400">
            Mẹo: gõ <b>số lượng + dấu cách + tên hàng</b>, ví dụ “5 mì”. Enter để thêm dòng.
          </span>
        </div>
        <ChonHang products={sanPham} onChon={themHang} inputRef={oTimHang} />
      </div>

      {/* --- Danh sách mặt hàng đã chọn --- */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="mem-cuon max-h-[42vh] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[12px] text-slate-600">
              <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-2 [&>th]:py-2 [&>th]:font-semibold">
                <th className="w-10">#</th>
                <th className="text-left">Tên mặt hàng</th>
                <th className="w-16">ĐVT</th>
                <th className="w-24">Số lượng</th>
                <th className="w-28 text-right">Đơn giá</th>
                <th className="w-32 text-right">Thành tiền</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {dsDong.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <Trong
                      tieuDe="Chưa có mặt hàng nào trên phiếu"
                      moTa="Dùng ô “Thêm mặt hàng” ở trên để chọn hàng can phạm mua."
                    />
                  </td>
                </tr>
              )}
              {dsDong.map((d, i) => (
                <tr
                  key={d.productId}
                  className="[&>td]:border-b [&>td]:border-slate-100 [&>td]:px-2 [&>td]:py-1.5 hover:bg-slate-50/70"
                >
                  <td className="text-center text-slate-400">{i + 1}</td>
                  <td>
                    <div className="font-medium text-slate-800">{d.ten}</div>
                    <div className="font-mono text-[11px] text-slate-400">{d.ma}</div>
                  </td>
                  <td className="text-center text-slate-600">{d.donViTinh}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={d.soLuong}
                      onChange={(e) => suaDong(i, { soLuong: Number(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          oTimHang.current?.focus();
                        }
                      }}
                      className="h-8 w-20 rounded border border-slate-300 px-2 text-center text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={d.donGia}
                      onChange={(e) => suaDong(i, { donGia: Number(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className="h-8 w-24 rounded border border-slate-300 px-2 text-right text-sm outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </td>
                  <td className="text-right font-semibold text-slate-800">{so(d.thanhTien)}</td>
                  <td className="text-center">
                    <button
                      onClick={() => setDsDong((cu) => cu.filter((_, idx) => idx !== i))}
                      className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      title="Xoá dòng"
                    >
                      <BieuTuong ten="xoa" className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Thanh tổng kết --- */}
      <div
        className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${trongHopThoai ? "" : "sticky bottom-0"}`}
      >
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="w-40">
            <label className="mb-1 block text-[12px] font-medium text-slate-600">Ngày bán</label>
            <OText type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} />
          </div>
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-[12px] font-medium text-slate-600">Ghi chú</label>
            <OText value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Không bắt buộc" />
          </div>

          <div className="ml-auto text-right">
            <div className="text-[12px] text-slate-500">
              {dsDong.length} mặt hàng · {so(tongDonVi)} đơn vị
            </div>
            {tongTien > 0 ? (
              <div className="text-2xl font-bold text-slate-900">{tien(tongTien)}</div>
            ) : dsDong.length > 0 ? (
              <div className="text-2xl font-bold text-slate-300">Chưa ghi giá</div>
            ) : (
              <div className="text-2xl font-bold text-slate-300">0 đ</div>
            )}
          </div>

          <div className="flex gap-2">
            {onHuy ? (
              <Nut co="lg" onClick={onHuy} disabled={dangLuu}>
                Huỷ
              </Nut>
            ) : (
              <Nut co="lg" onClick={lamMoi} disabled={dangLuu}>
                Làm mới
              </Nut>
            )}
            <Nut kieu="chinh" co="lg" onClick={() => void luu()} disabled={dangLuu}>
              <BieuTuong ten="check" className="h-4 w-4" />
              {dangLuu ? "Đang lưu…" : (nhanLuu ?? (suaDoi ? "Lưu thay đổi" : "Lưu phiếu"))}
              <span className="ml-1 rounded bg-blue-600/60 px-1.5 py-0.5 text-[10px] font-normal">Ctrl+↵</span>
            </Nut>
          </div>
        </div>
      </div>
    </div>
  );
}
