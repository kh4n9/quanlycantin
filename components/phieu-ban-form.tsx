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
      className={`flex items-center overflow-hidden rounded-md border border-ke-dam bg-white shadow-xs ${
        rong ? "w-full" : "inline-flex"
      }`}
    >
      <button
        type="button"
        onClick={() => suaDong(i, { soLuong: Math.max(0, d.soLuong - 1) })}
        disabled={d.soLuong <= 0}
        className={`flex shrink-0 items-center justify-center text-muc-nhat transition hover:bg-giay hover:text-muc disabled:cursor-not-allowed disabled:opacity-30 ${
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
        className={`border-x border-ke px-1 text-center font-mono text-[12.5px] font-semibold tabular-nums outline-none focus:bg-giay ${
          rong ? "h-9 min-w-0 flex-1" : "h-8 w-12"
        }`}
      />
      <button
        type="button"
        onClick={() => suaDong(i, { soLuong: d.soLuong + 1 })}
        className={`flex shrink-0 items-center justify-center text-muc-nhat transition hover:bg-giay hover:text-muc ${
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
      className={`rounded-sm border border-ke-dam px-2 text-right font-mono text-[13px] tabular-nums shadow-[inset_0_1px_2px_rgb(22_32_28/0.04)] outline-none transition focus:border-muc ${
        rong ? "h-9 w-full" : "h-8 w-24"
      }`}
    />
  );

  const nutXoaDong = (d: LineItem, i: number) => (
    <button
      onClick={() => setDsDong((cu) => cu.filter((_, idx) => idx !== i))}
      className="rounded-sm p-1.5 text-muc-mo transition hover:bg-dau-nhat hover:text-dau"
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
      <section className="rounded-lg border border-ke bg-giay-cao shadow-the">
        <header className="khia flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="so text-[10.5px] text-muc-mo">01</span>
            <h2 className="font-serif text-[15px] font-semibold tracking-[-0.01em] text-muc">Thông tin can phạm</h2>
          </div>
          <span className="hidden text-[11.5px] text-muc-nhat sm:block">
            Gõ tên đã mua trước đây để tự điền năm sinh và buồng giam
          </span>
        </header>
        <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)]">
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
      </section>

      {/* --- Thêm mặt hàng --- */}
      <section className="rounded-lg border border-ke bg-giay-cao shadow-the">
        <header className="khia flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="so text-[10.5px] text-muc-mo">02</span>
            <h2 className="font-serif text-[15px] font-semibold tracking-[-0.01em] text-muc">Thêm mặt hàng</h2>
          </div>
          <span className="hidden text-[11.5px] text-muc-nhat sm:block">
            Mẹo: gõ <b className="font-mono font-medium text-muc">số lượng + dấu cách + tên hàng</b>, ví dụ “5 mì”.
            Enter để thêm dòng.
          </span>
        </header>
        <div className="p-4">
          <ChonHang products={sanPham} onChon={themHang} inputRef={oTimHang} />
        </div>
      </section>

      {/* --- Danh sách mặt hàng đã chọn --- */}
      <div className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
        <header className="khia flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="so text-[10.5px] text-muc-mo">03</span>
            <h2 className="font-serif text-[15px] font-semibold tracking-[-0.01em] text-muc">Mặt hàng trên phiếu</h2>
          </div>
          <span className="so text-[10.5px] text-muc-mo">{dsDong.length} dòng</span>
        </header>
        {dsDong.length === 0 ? (
          <Trong
            tieuDe="Chưa có mặt hàng nào trên phiếu"
            moTa="Dùng ô “Thêm mặt hàng” ở trên để chọn hàng can phạm mua."
          />
        ) : (
          <>
            {/* Trên điện thoại, mỗi dòng hàng là một thẻ để thao tác đủ số lượng và đơn giá */}
            <div className="divide-y divide-ke/60 sm:hidden">
              {dsDong.map((d, i) => (
                <div key={d.productId} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-muc">{d.ten}</div>
                      <div className="font-mono text-[10.5px] text-muc-mo">
                        {d.ma} · {d.donViTinh}
                      </div>
                    </div>
                    {nutXoaDong(d, i)}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <div className="nhan-muc mb-1">Số lượng</div>
                      {oSoLuong(d, i, true)}
                    </div>
                    <div>
                      <div className="nhan-muc mb-1">Đơn giá</div>
                      {oDonGia(d, i, true)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-[12px]">
                    <span className="text-muc-nhat">Thành tiền</span>
                    <span className="so font-semibold text-muc">{so(d.thanhTien)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mem-cuon hidden max-h-[50vh] min-h-[180px] overflow-auto sm:block">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
                  <tr className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
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
                      className="group [&>td]:border-b [&>td]:border-ke/70 [&>td]:px-3 [&>td]:py-2.5 hover:bg-giay/70"
                    >
                      <td className="so text-center text-[10.5px] text-muc-mo">{i + 1}</td>
                      <td>
                        <div className="font-semibold text-muc">{d.ten}</div>
                        <div className="font-mono text-[10.5px] text-muc-mo">{d.ma}</div>
                      </td>
                      <td className="text-center text-[12px] text-muc-nhat">{d.donViTinh}</td>
                      <td className="text-center">{oSoLuong(d, i)}</td>
                      <td>{oDonGia(d, i)}</td>
                      <td className="so text-right font-semibold text-muc">{so(d.thanhTien)}</td>
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
        className={`overflow-hidden rounded-lg border border-ke bg-giay-cao/95 shadow-the backdrop-blur ${
          trongHopThoai ? "" : "z-10 lg:sticky lg:bottom-0"
        }`}
      >
        <div className="flex flex-wrap items-end gap-x-5 gap-y-4 p-4">
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
              <div className="nhan-muc">Tổng thu</div>
              {tongTien > 0 ? (
                <div className="so mt-1.5 text-[30px] leading-none font-semibold text-muc">{tien(tongTien)}</div>
              ) : dsDong.length > 0 ? (
                <div className="mt-2 font-serif text-xl font-semibold text-muc-nhat">Chưa ghi giá</div>
              ) : (
                <div className="so mt-1.5 text-[30px] leading-none font-semibold text-muc-mo">0 đ</div>
              )}
              <div className="mt-2 font-mono text-[10.5px] tracking-[0.04em] text-muc-mo">
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
                <span className="ml-1 hidden rounded-sm bg-white/12 px-1.5 py-0.5 font-mono text-[9.5px] font-medium text-giay/75 sm:inline">
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
