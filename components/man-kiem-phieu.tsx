"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/client";
import { homNay, khop, ngayVN, so } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { LineItem, Order } from "@/lib/types";
import { bao, baoLoi, BieuTuong, Nut, OText, Trong } from "./ui";

type LocKiem = "chua_kiem" | "da_kiem" | "tat_ca";

function dauThang(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function luiNgay(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ManKiemPhieu() {
  const { coQuyen } = useStore();
  const duocSua = coQuyen("sua_phieu");

  const [tu, setTu] = useState(homNay());
  const [den, setDen] = useState(homNay());
  const [loc, setLoc] = useState<LocKiem>("chua_kiem");
  const [q, setQ] = useState("");
  const [ds, setDs] = useState<Order[]>([]);
  const [dangTai, setDangTai] = useState(true);

  const [dangChon, setDangChon] = useState<Order | null>(null);
  const [dsDong, setDsDong] = useState<LineItem[]>([]);
  const [ghiChu, setGhiChu] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      const thamSo = new URLSearchParams({ tu, den });
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

  const hienThi = useMemo(() => {
    let d = ds;
    if (loc === "chua_kiem") d = d.filter((o) => !o.kiemLuc);
    if (loc === "da_kiem") d = d.filter((o) => o.kiemLuc);
    if (q) d = d.filter((o) => khop(o.soPhieu, q) || khop(o.hoTen, q) || khop(o.buongGiam, q));
    return d;
  }, [ds, loc, q]);

  const tienDo = useMemo(() => {
    const daKiem = ds.filter((o) => o.kiemLuc).length;
    return { daKiem, tong: ds.length, con: ds.length - daKiem };
  }, [ds]);

  // Tự chọn phiếu đầu tiên khi danh sách vừa tải hoặc phiếu đang chọn không còn trong danh sách
  useEffect(() => {
    if (hienThi.length === 0) {
      setDangChon(null);
      return;
    }
    if (!dangChon || !hienThi.some((o) => o.id === dangChon.id)) {
      chonPhieu(hienThi[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hienThi]);

  function chonPhieu(o: Order) {
    setDangChon(o);
    setDsDong(o.items.map((i) => ({ ...i })));
    setGhiChu(o.kiemGhiChu);
  }

  const suaDong = (i: number, soLuong: number) => {
    setDsDong((cu) => {
      const moi = [...cu];
      const d = { ...moi[i] };
      d.soLuong = Math.max(0, Math.round(soLuong || 0));
      d.thanhTien = d.soLuong * d.donGia;
      moi[i] = d;
      return moi;
    });
  };

  const coThayDoi = useMemo(() => {
    if (!dangChon) return false;
    if (dsDong.length !== dangChon.items.length) return true;
    return dsDong.some((d, i) => d.soLuong !== dangChon.items[i]?.soLuong);
  }, [dsDong, dangChon]);

  const tongSauSua = dsDong.reduce((s, d) => s + d.thanhTien, 0);

  /** Xác nhận phiếu hiện tại rồi nhảy sang phiếu kế tiếp còn chờ kiểm. */
  const xacNhan = useCallback(
    async (tiepTuc = true) => {
      if (!dangChon) return;
      setDangLuu(true);
      try {
        // Sửa số lượng trước (nếu có thay đổi và có quyền sửa)
        if (coThayDoi && duocSua) {
          await apiClient.suaPhieuBan(dangChon.id, {
            items: dsDong.map((d) => ({ productId: d.productId, soLuong: d.soLuong, donGia: d.donGia })),
          });
        }
        const kq = await apiClient.danhDauDaKiem(dangChon.id, ghiChu.trim());

        setDs((cu) => cu.map((o) => (o.id === kq.order.id ? kq.order : o)));
        if (coThayDoi && duocSua) bao(`Đã sửa số lượng và kiểm xong phiếu ${kq.order.soPhieu}`);
        else bao(`Đã kiểm phiếu ${kq.order.soPhieu}`);

        if (tiepTuc) {
          const viTri = hienThi.findIndex((o) => o.id === dangChon.id);
          const keTiep = hienThi.slice(viTri + 1).find((o) => !o.kiemLuc);
          if (keTiep) chonPhieu(keTiep);
        }
      } catch (e) {
        baoLoi((e as Error).message);
      } finally {
        setDangLuu(false);
      }
    },
    [dangChon, coThayDoi, duocSua, dsDong, ghiChu, hienThi],
  );

  const boKiem = async () => {
    if (!dangChon) return;
    setDangLuu(true);
    try {
      const kq = await apiClient.boDanhDauKiem(dangChon.id);
      setDs((cu) => cu.map((o) => (o.id === kq.order.id ? kq.order : o)));
      setDangChon(kq.order);
      setGhiChu(kq.order.kiemGhiChu);
      bao(`Đã bỏ đánh dấu kiểm phiếu ${kq.order.soPhieu}`);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  };

  /** Bỏ qua, sang phiếu kế tiếp mà không đánh dấu gì. */
  const boQua = () => {
    if (!dangChon) return;
    const viTri = hienThi.findIndex((o) => o.id === dangChon.id);
    const keTiep = hienThi[viTri + 1];
    if (keTiep) chonPhieu(keTiep);
  };

  // Ctrl+Enter: xác nhận và sang phiếu kế tiếp
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void xacNhan(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [xacNhan]);

  const datNhanh = (kieu: "homnay" | "7ngay" | "thangnay") => {
    if (kieu === "homnay") {
      setTu(homNay());
      setDen(homNay());
    } else if (kieu === "7ngay") {
      setTu(luiNgay(6));
      setDen(homNay());
    } else {
      setTu(dauThang());
      setDen(homNay());
    }
  };

  const phanTram = tienDo.tong ? Math.round((tienDo.daKiem / tienDo.tong) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* --- Bộ lọc và tiến độ --- */}
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-semibold text-slate-800">Kiểm phiếu</span>
          <Nut co="sm" onClick={() => datNhanh("homnay")}>
            Hôm nay
          </Nut>
          <Nut co="sm" onClick={() => datNhanh("7ngay")}>
            7 ngày
          </Nut>
          <Nut co="sm" onClick={() => datNhanh("thangnay")}>
            Tháng này
          </Nut>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={tu}
              onChange={(e) => setTu(e.target.value)}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={den}
              onChange={(e) => setDen(e.target.value)}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <OText
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm số phiếu, họ tên…"
            className="w-52"
          />
          <select
            value={loc}
            onChange={(e) => setLoc(e.target.value as LocKiem)}
            className="h-9 w-40 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            <option value="chua_kiem">Chưa kiểm ({tienDo.con})</option>
            <option value="da_kiem">Đã kiểm ({tienDo.daKiem})</option>
            <option value="tat_ca">Tất cả ({tienDo.tong})</option>
          </select>
        </div>

        {tienDo.tong > 0 && (
          <div className="mt-2.5 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${phanTram}%` }}
              />
            </div>
            <span className="shrink-0 text-[12px] text-slate-600">
              Đã kiểm <b className="text-slate-900">{so(tienDo.daKiem)}</b> / {so(tienDo.tong)} phiếu
              {tienDo.con > 0 ? ` · còn ${so(tienDo.con)}` : " · đã kiểm hết"}
            </span>
          </div>
        )}
      </div>

      {tienDo.tong === 0 && !dangTai ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <Trong
            tieuDe="Không có phiếu nào trong khoảng ngày này"
            moTa="Chọn khoảng ngày khác để bắt đầu kiểm."
          />
        </div>
      ) : (
        <div className="grid min-h-0 gap-3 lg:grid-cols-[20rem_1fr]">
          {/* --- Danh sách phiếu --- */}
          <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/70 px-3 py-2 text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
              Danh sách ({so(hienThi.length)})
            </div>
            <div className="mem-cuon max-h-[62vh] overflow-y-auto">
              {hienThi.length === 0 && (
                <p className="px-3 py-6 text-center text-[13px] text-slate-500">
                  Không còn phiếu nào khớp bộ lọc.
                </p>
              )}
              {hienThi.map((o) => {
                const dangXem = o.id === dangChon?.id;
                const coSaiSot = Boolean(o.kiemGhiChu);
                return (
                  <button
                    key={o.id}
                    onClick={() => chonPhieu(o)}
                    className={`flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2 text-left transition ${
                      dangXem ? "bg-blue-50 ring-1 ring-blue-200 ring-inset" : "hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        !o.kiemLuc
                          ? "border border-slate-300 text-transparent"
                          : coSaiSot
                            ? "bg-amber-500 text-white"
                            : "bg-emerald-500 text-white"
                      }`}
                      title={!o.kiemLuc ? "Chưa kiểm" : coSaiSot ? "Đã kiểm, có ghi chú sai sót" : "Đã kiểm"}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[12px] font-medium text-blue-700">{o.soPhieu}</span>
                      <span className="block truncate text-[13px] font-medium text-slate-800">{o.hoTen}</span>
                      <span className="block text-[11px] text-slate-500">
                        {o.buongGiam || "—"} · {o.items.length} món
                        {o.tongTien > 0 ? ` · ${so(o.tongTien)}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* --- Chi tiết phiếu đang kiểm --- */}
          {dangChon ? (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
                  <div>
                    <div className="font-mono text-sm font-semibold text-blue-700">{dangChon.soPhieu}</div>
                    <div className="text-[11px] text-slate-500">Ngày bán {ngayVN(dangChon.ngay)}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{dangChon.hoTen}</div>
                    <div className="text-[11px] text-slate-500">
                      SN {dangChon.namSinh || "—"} · {dangChon.buongGiam || "—"}
                    </div>
                  </div>
                  {dangChon.kiemLuc ? (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium ${
                        dangChon.kiemGhiChu
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          dangChon.kiemGhiChu ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                      {dangChon.kiemGhiChu ? "Đã kiểm — có sai sót" : "Đã kiểm"}
                      {dangChon.kiemBoi ? ` · ${dangChon.kiemBoi}` : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Chưa kiểm
                    </span>
                  )}
                </div>

                <div className="mem-cuon max-h-[42vh] overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[12px] text-slate-600">
                      <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold">
                        <th className="w-10">#</th>
                        <th className="text-left">Tên mặt hàng</th>
                        <th className="w-16">ĐVT</th>
                        <th className="w-28">Số lượng</th>
                        <th className="w-28 text-right">Đơn giá</th>
                        <th className="w-32 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dsDong.map((d, i) => {
                        const goc = dangChon.items[i];
                        const lech = goc && d.soLuong !== goc.soLuong;
                        return (
                          <tr
                            key={d.productId}
                            className={`[&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-1.5 ${
                              lech ? "bg-amber-50/70" : ""
                            }`}
                          >
                            <td className="text-center text-slate-400">{i + 1}</td>
                            <td className="font-medium text-slate-800">
                              {d.ten}
                              {lech && (
                                <span className="ml-2 text-[11px] font-normal text-amber-700">
                                  sổ ghi {so(goc.soLuong)} → sửa thành {so(d.soLuong)}
                                </span>
                              )}
                            </td>
                            <td className="text-center text-slate-600">{d.donViTinh}</td>
                            <td>
                              {duocSua ? (
                                <input
                                  type="number"
                                  min={0}
                                  value={d.soLuong}
                                  onChange={(e) => suaDong(i, Number(e.target.value))}
                                  onFocus={(e) => e.target.select()}
                                  className={`h-8 w-20 rounded border px-2 text-center text-sm outline-none focus:ring-2 focus:ring-blue-100 ${
                                    lech ? "border-amber-400 bg-white font-semibold" : "border-slate-300"
                                  }`}
                                />
                              ) : (
                                <span className="block text-center tabular-nums">{so(d.soLuong)}</span>
                              )}
                            </td>
                            <td className="text-right text-slate-600 tabular-nums">{so(d.donGia)}</td>
                            <td className="text-right font-semibold text-slate-800 tabular-nums">{so(d.thanhTien)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr className="[&>td]:border-t [&>td]:border-slate-200 [&>td]:px-3 [&>td]:py-2">
                        <td colSpan={5} className="text-right text-[12px] font-medium text-slate-600">
                          TỔNG CỘNG
                        </td>
                        <td className="text-right text-base font-bold text-slate-900 tabular-nums">
                          {tongSauSua > 0 ? so(tongSauSua) : "—"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* --- Ghi chú và hành động --- */}
              <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 flex flex-wrap items-end gap-3">
                  <div className="min-w-64 flex-1">
                    <label className="mb-1 block text-[12px] font-medium text-slate-600">
                      Ghi chú kiểm — ghi lại sai sót nếu có
                    </label>
                    <OText
                      value={ghiChu}
                      onChange={(e) => setGhiChu(e.target.value)}
                      placeholder="Ví dụ: sổ ghi 5 gói, thực tế 4 gói"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dangChon.kiemLuc && (
                      <Nut co="lg" onClick={() => void boKiem()} disabled={dangLuu}>
                        Bỏ đánh dấu
                      </Nut>
                    )}
                    <Nut co="lg" onClick={boQua} disabled={dangLuu}>
                      Bỏ qua
                    </Nut>
                    <Nut kieu="chinh" co="lg" onClick={() => void xacNhan(true)} disabled={dangLuu}>
                      <BieuTuong ten="check" className="h-4 w-4" />
                      {dangLuu ? "Đang lưu…" : dangChon.kiemLuc ? "Lưu & tiếp theo" : "Đúng, tiếp theo"}
                      <span className="ml-1 rounded bg-blue-600/60 px-1.5 py-0.5 text-[10px] font-normal">
                        Ctrl+↵
                      </span>
                    </Nut>
                  </div>
                </div>

                {coThayDoi && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                    <BieuTuong ten="canh" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {duocSua ? (
                        <>
                          Số lượng đã sửa, tiền tính lại thành <b>{so(tongSauSua)}</b>. Bấm “Đúng, tiếp theo” để
                          lưu và đánh dấu đã kiểm.
                        </>
                      ) : (
                        <>Tài khoản của bạn không có quyền sửa phiếu, chỉ đánh dấu kiểm được.</>
                      )}
                    </span>
                  </div>
                )}
                {!coThayDoi && dangChon.kiemLuc && ghiChu !== dangChon.kiemGhiChu && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                    Ghi chú đã thay đổi — bấm “Lưu &amp; tiếp theo” để cập nhật.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <Trong
                tieuDe="Đã kiểm hết phiếu trong khoảng này"
                moTa="Đổi bộ lọc sang “Đã kiểm” hoặc “Tất cả” để xem lại, hoặc chọn khoảng ngày khác."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
