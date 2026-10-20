"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DuLieuPhieu } from "@/lib/client";
import { homNay, so, tien } from "@/lib/format";
import { useStore } from "@/lib/store";
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
  const { datCoDuLieuChuaLuu } = useStore();

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

  const isDirty = useMemo(() => {
    if (suaDoi) {
      if (!banDau) return false;
      const hoTenKhac = hoTen.trim() !== (banDau.hoTen || "");
      const namSinhKhac = (namSinh ? String(namSinh) : "") !== (banDau.namSinh ? String(banDau.namSinh) : "");
      const buongKhac = buongGiam.trim() !== (banDau.buongGiam || "");
      const ghiChuKhac = ghiChu.trim() !== (banDau.ghiChu || "");
      const ngayKhac = ngay !== banDau.ngay;
      if (hoTenKhac || namSinhKhac || buongKhac || ghiChuKhac || ngayKhac) return true;
      if (dsDong.length !== banDau.items.length) return true;
      return dsDong.some((d, idx) => {
        const goc = banDau.items[idx];
        return !goc || d.productId !== goc.productId || d.soLuong !== goc.soLuong || d.donGia !== goc.donGia;
      });
    }
    return (
      hoTen.trim() !== "" ||
      namSinh.trim() !== "" ||
      buongGiam.trim() !== "" ||
      ghiChu.trim() !== "" ||
      dsDong.length > 0
    );
  }, [suaDoi, banDau, hoTen, namSinh, buongGiam, ghiChu, ngay, dsDong]);

  useEffect(() => {
    datCoDuLieuChuaLuu(isDirty);
    return () => datCoDuLieuChuaLuu(false);
  }, [isDirty, datCoDuLieuChuaLuu]);

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
          thieu: 0,
          bu: [],
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

  /** Ô số lượng dùng chung cho bảng trên máy tính và thẻ trên điện thoại */
  const oSoLuong = (d: LineItem, i: number, rong = false) => (
    <div
      className={`flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white shadow-xs ${
        rong ? "w-full" : "inline-flex"
      }`}
    >
      <button
        type="button"
        onClick={() => suaDong(i, { soLuong: Math.max(0, d.soLuong - 1) })}
        disabled={d.soLuong <= 0}
        className={`flex shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 ${
          rong ? "h-9 w-9" : "h-8 w-7"
        }`}
        title="Giảm 1"
      >
        <span className="text-base leading-none font-semibold">−</span>
      </button>
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
          } else if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            suaDong(i, { soLuong: d.soLuong + 1 });
          } else if (e.key === "-") {
            e.preventDefault();
            suaDong(i, { soLuong: Math.max(0, d.soLuong - 1) });
          }
        }}
        className={`border-x border-slate-200 px-1 text-center text-sm font-semibold tabular-nums outline-none focus:bg-blue-50/60 ${
          rong ? "h-9 min-w-0 flex-1" : "h-8 w-12"
        }`}
      />
      <button
        type="button"
        onClick={() => suaDong(i, { soLuong: d.soLuong + 1 })}
        className={`flex shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 ${
          rong ? "h-9 w-9" : "h-8 w-7"
        }`}
        title="Tăng 1"
      >
        <span className="text-base leading-none font-semibold">+</span>
      </button>
    </div>
  );

  const oDonGia = (d: LineItem, i: number, rong = false) => (
    <input
      type="number"
      min={0}
      step={500}
      value={d.donGia}
      onChange={(e) => suaDong(i, { donGia: Number(e.target.value) })}
      onFocus={(e) => e.target.select()}
      placeholder="0"
      className={`rounded-lg border border-slate-300 px-2 text-right text-sm tabular-nums shadow-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 ${
        rong ? "h-9 w-full" : "h-8 w-24"
      }`}
    />
  );

  const nutXoaDong = (d: LineItem, i: number) => (
    <button
      onClick={() => setDsDong((cu) => cu.filter((_, idx) => idx !== i))}
      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
      title="Xoá dòng"
      aria-label={`Xoá ${d.ten}`}
    >
      <BieuTuong ten="xoa" className="h-4 w-4" />
    </button>
  );

  const lamMoi = useCallback((boQuaXacNhan = false) => {
    if (!boQuaXacNhan && isDirty) {
      if (!window.confirm("Bạn có dữ liệu phiếu bán đang nhập chưa lưu. Bạn có chắc muốn xoá để làm mới không?")) {
        return;
      }
    }
    setHoTen("");
    setNamSinh("");
    setBuongGiam("");
    setDsDong([]);
    setGhiChu("");
    setNgay(homNay());
    setTimeout(() => oHoTen.current?.focus(), 50);
  }, [isDirty]);

  const xuLyHuy = useCallback(() => {
    if (isDirty) {
      if (!window.confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn huỷ không?")) {
        return;
      }
    }
    onHuy?.();
  }, [isDirty, onHuy]);

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
      if (!suaDoi) lamMoi(true);
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
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-the">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
              1
            </span>
            <span className="text-[13px] font-semibold tracking-tight text-slate-800">Thông tin can phạm</span>
          </div>
          <span className="hidden text-[11px] text-slate-500 sm:block">
            Gõ tên đã mua trước đây để tự điền năm sinh và buồng giam
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)]">
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
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-the">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
              2
            </span>
            <span className="text-[13px] font-semibold tracking-tight text-slate-800">Thêm mặt hàng</span>
          </div>
          <span className="hidden text-[11px] text-slate-500 sm:block">
            Mẹo: gõ <b className="font-semibold text-slate-600">số lượng + dấu cách + tên hàng</b>, ví dụ “5 mì”.
            Enter để thêm dòng.
          </span>
        </div>
        <ChonHang products={sanPham} onChon={themHang} inputRef={oTimHang} />
      </div>

      {/* --- Danh sách mặt hàng đã chọn --- */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-the">
        {dsDong.length === 0 ? (
          <Trong
            tieuDe="Chưa có mặt hàng nào trên phiếu"
            moTa="Dùng ô “Thêm mặt hàng” ở trên để chọn hàng can phạm mua."
          />
        ) : (
          <>
            {/* Trên điện thoại, mỗi dòng hàng là một thẻ để thao tác đủ số lượng và đơn giá */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {dsDong.map((d, i) => (
                <div key={d.productId} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800">{d.ten}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {d.ma} · {d.donViTinh}
                      </div>
                    </div>
                    {nutXoaDong(d, i)}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <div className="mb-1 text-[11px] font-medium text-slate-500">Số lượng</div>
                      {oSoLuong(d, i, true)}
                    </div>
                    <div>
                      <div className="mb-1 text-[11px] font-medium text-slate-500">Đơn giá</div>
                      {oDonGia(d, i, true)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-[12px]">
                    <span className="text-slate-500">Thành tiền</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{so(d.thanhTien)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mem-cuon hidden max-h-[50vh] min-h-[180px] overflow-auto sm:block">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/95 text-[11px] tracking-wide text-slate-500 uppercase backdrop-blur">
                  <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-semibold">
                    <th className="w-10">#</th>
                    <th className="text-left">Tên mặt hàng</th>
                    <th className="w-16">ĐVT</th>
                    <th className="w-28 text-center">Số lượng</th>
                    <th className="w-28 text-right">Đơn giá</th>
                    <th className="w-32 text-right">Thành tiền</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {dsDong.map((d, i) => (
                    <tr
                      key={d.productId}
                      className="group [&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-2.5 hover:bg-blue-50/40"
                    >
                      <td className="text-center text-[12px] text-slate-400">{i + 1}</td>
                      <td>
                        <div className="font-semibold text-slate-800">{d.ten}</div>
                        <div className="font-mono text-[11px] text-slate-500">{d.ma}</div>
                      </td>
                      <td className="text-center text-slate-600">{d.donViTinh}</td>
                      <td className="text-center">{oSoLuong(d, i)}</td>
                      <td>{oDonGia(d, i)}</td>
                      <td className="text-right font-semibold text-slate-800 tabular-nums">{so(d.thanhTien)}</td>
                      <td className="text-center">{nutXoaDong(d, i)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* --- Thanh tổng kết --- */}
      <div
        className={`rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-the backdrop-blur ${
          trongHopThoai ? "" : "z-10 lg:sticky lg:bottom-0"
        }`}
      >
        <div className="flex flex-wrap items-end gap-x-5 gap-y-4">
          <div className="w-40 shrink-0">
            <ONhan>Ngày bán</ONhan>
            <OText type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} />
          </div>
          <div className="min-w-40 flex-1">
            <ONhan>Ghi chú</ONhan>
            <OText value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Không bắt buộc" />
          </div>

          <div className="flex w-full flex-col gap-3 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
            <div className="text-right">
              <div className="text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">Tổng thu</div>
              {tongTien > 0 ? (
                <div className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {tien(tongTien)}
                </div>
              ) : dsDong.length > 0 ? (
                <div className="mt-1 text-xl font-bold text-slate-500">Chưa ghi giá</div>
              ) : (
                <div className="mt-0.5 text-3xl font-bold tracking-tight text-slate-500 tabular-nums">0 đ</div>
              )}
              <div className="mt-0.5 text-[11px] text-slate-500">
                {dsDong.length} mặt hàng · {so(tongDonVi)} đơn vị
              </div>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              {onHuy ? (
                <Nut co="lg" onClick={xuLyHuy} disabled={dangLuu} className="flex-1 sm:flex-none">
                  Huỷ
                </Nut>
              ) : (
                <Nut co="lg" onClick={() => lamMoi(false)} disabled={dangLuu} className="flex-1 sm:flex-none">
                  Làm mới
                </Nut>
              )}
              <Nut
                kieu="chinh"
                co="lg"
                onClick={() => void luu()}
                disabled={dangLuu}
                className="flex-1 whitespace-nowrap sm:flex-none"
              >
                <BieuTuong ten="check" className="h-4 w-4" />
                {dangLuu ? "Đang lưu…" : (nhanLuu ?? (suaDoi ? "Lưu thay đổi" : "Lưu phiếu"))}
                <span className="ml-1 hidden rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-50 sm:inline">
                  Ctrl+↵
                </span>
              </Nut>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
