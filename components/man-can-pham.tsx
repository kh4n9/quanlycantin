"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/client";
import { taiExcel } from "@/lib/excel";
import { homNay, khop, ngayVN, so, tien } from "@/lib/format";
import { conThieu } from "@/lib/thieu-hang";
import type { Order } from "@/lib/types";
import { useNap } from "@/lib/use-nap";
import { useInPhieu } from "./print";
import { bao, baoLoi, BieuTuong, HopThoai, Nhan, Nut, OText, Trong } from "./ui";

type MatHangMua = {
  productId: string;
  ma: string;
  ten: string;
  donViTinh: string;
  soLuong: number;
  thanhTien: number;
};

type DongCanPham = {
  key: string;
  hoTen: string;
  namSinh: number;
  buongGiam: string;
  soPhieu: number;
  soLuong: number;
  doanhThu: number;
  lanDau: string;
  lanCuoi: string;
  matHang: MatHangMua[];
  phieu: Order[];
};

type NhomCanPham = Omit<DongCanPham, "matHang"> & {
  matHang: Map<string, MatHangMua>;
};

type KieuSapXep = "gan_nhat" | "chi_tieu" | "so_phieu" | "ten";

function dauThang(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function chuDau(hoTen: string): string {
  return hoTen
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

export function ManCanPham() {
  const { xemTruoc } = useInPhieu();
  const [orders, setOrders] = useState<Order[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [tu, setTu] = useState("");
  const [den, setDen] = useState("");
  const [q, setQ] = useState("");
  const [sapXep, setSapXep] = useState<KieuSapXep>("gan_nhat");
  const [moRong, setMoRong] = useState(false);
  const [chiTiet, setChiTiet] = useState<DongCanPham | null>(null);
  const lanNap = useRef(0);

  const nap = useCallback(async () => {
    const lan = ++lanNap.current;
    setDangTai(true);
    try {
      const thamSo = new URLSearchParams();
      if (tu) thamSo.set("tu", tu);
      if (den) thamSo.set("den", den);
      const kq = await apiClient.orders(thamSo.toString());
      if (lan === lanNap.current) setOrders(kq.orders);
    } catch (e) {
      if (lan === lanNap.current) baoLoi((e as Error).message);
    } finally {
      if (lan === lanNap.current) setDangTai(false);
    }
  }, [tu, den]);

  useNap(nap);

  const coDungTien = useMemo(() => orders.some((o) => o.tongTien > 0), [orders]);

  const ds = useMemo(() => {
    const nhom = new Map<string, NhomCanPham>();
    for (const o of orders) {
      const khoa = o.hoTen.trim().toLowerCase().replace(/\s+/g, " ");
      const p: NhomCanPham = nhom.get(khoa) || {
        key: khoa,
        hoTen: o.hoTen.trim(),
        namSinh: o.namSinh,
        buongGiam: o.buongGiam,
        soPhieu: 0,
        soLuong: 0,
        doanhThu: 0,
        lanDau: o.ngay,
        lanCuoi: o.ngay,
        matHang: new Map<string, MatHangMua>(),
        phieu: [],
      };
      p.soPhieu += 1;
      p.doanhThu += o.tongTien;
      p.phieu.push(o);
      if (!p.lanDau || o.ngay < p.lanDau) p.lanDau = o.ngay;
      if (o.ngay >= p.lanCuoi) {
        p.lanCuoi = o.ngay;
        if (/^\p{Lu}/u.test(o.hoTen.trim()) || !/^\p{Lu}/u.test(p.hoTen)) p.hoTen = o.hoTen.trim();
        if (o.namSinh) p.namSinh = o.namSinh;
        if (o.buongGiam) p.buongGiam = o.buongGiam;
      }
      for (const item of o.items) {
        p.soLuong += item.soLuong;
        const h = p.matHang.get(item.productId) || {
          productId: item.productId,
          ma: item.ma,
          ten: item.ten,
          donViTinh: item.donViTinh,
          soLuong: 0,
          thanhTien: 0,
        };
        h.soLuong += item.soLuong;
        h.thanhTien += item.thanhTien;
        p.matHang.set(item.productId, h);
      }
      nhom.set(khoa, p);
    }
    return [...nhom.values()].map(({ matHang, ...p }) => ({
      ...p,
      matHang: [...matHang.values()].sort((a, b) => b.soLuong - a.soLuong),
    }));
  }, [orders]);

  const dsDangXem = useMemo(() => {
    const ketQua = ds.filter((p) => {
      if (!q.trim()) return true;
      return khop(`${p.hoTen} ${p.buongGiam} ${p.matHang.map((h) => h.ten).join(" ")}`, q);
    });
    return ketQua.sort((a, b) => {
      if (sapXep === "ten") return a.hoTen.localeCompare(b.hoTen, "vi", { numeric: true });
      if (sapXep === "so_phieu") return b.soPhieu - a.soPhieu || a.hoTen.localeCompare(b.hoTen, "vi");
      if (sapXep === "chi_tieu") {
        const giaTri = (p: DongCanPham) => (coDungTien ? p.doanhThu : p.soLuong);
        return giaTri(b) - giaTri(a) || a.hoTen.localeCompare(b.hoTen, "vi");
      }
      return b.lanCuoi.localeCompare(a.lanCuoi) || a.hoTen.localeCompare(b.hoTen, "vi", { numeric: true });
    });
  }, [ds, q, sapXep, coDungTien]);

  const tongQuan = useMemo(() => {
    return {
      soCanPham: ds.length,
      soPhieu: orders.length,
      soLuong: ds.reduce((s, p) => s + p.soLuong, 0),
      doanhThu: ds.reduce((s, p) => s + p.doanhThu, 0),
      muaLai: ds.filter((p) => p.soPhieu > 1).length,
    };
  }, [ds, orders.length]);

  const soMacDinh = 15;
  const dangHien = moRong ? dsDangXem : dsDangXem.slice(0, soMacDinh);
  const conLai = dsDangXem.length - soMacDinh;

  const xuatExcel = async () => {
    if (dsDangXem.length === 0) return;
    try {
      await taiExcel(`can-pham-${homNay()}.xlsx`, [
        {
          ten: "Can pham",
          tieuDe: `Danh sách can phạm mua hàng${
            tu && den
              ? ` từ ${ngayVN(tu)} đến ${ngayVN(den)}`
              : tu
                ? ` từ ${ngayVN(tu)}`
                : den
                  ? ` đến ${ngayVN(den)}`
                  : ""
          }`,
          tieuDeCot: [
            "Họ tên",
            "Năm sinh",
            "Buồng giam",
            "Số phiếu",
            "Số mặt hàng",
            "Lượng hàng",
            "Tổng tiền",
            "Mua lần đầu",
            "Mua gần nhất",
          ],
          dong: dsDangXem.map((p) => [
            p.hoTen,
            p.namSinh || "",
            p.buongGiam,
            p.soPhieu,
            p.matHang.length,
            p.soLuong,
            p.doanhThu,
            ngayVN(p.lanDau),
            ngayVN(p.lanCuoi),
          ]),
          cotTien: [6],
          doRong: [26, 10, 12, 10, 12, 12, 16, 14, 14],
        },
        {
          ten: "Chi tiet",
          tieuDeCot: [
            "Họ tên",
            "Số phiếu",
            "Ngày",
            "Mã hàng",
            "Tên hàng",
            "ĐVT",
            "Số lượng",
            "Thành tiền",
            "Còn thiếu",
          ],
          dong: dsDangXem.flatMap((p) =>
            p.phieu.flatMap((o) =>
              o.items.map((item) => [
                p.hoTen,
                o.soPhieu,
                ngayVN(o.ngay),
                item.ma,
                item.ten,
                item.donViTinh,
                item.soLuong,
                item.thanhTien,
                conThieu(item),
              ]),
            ),
          ),
          cotTien: [7],
          doRong: [26, 15, 12, 14, 32, 10, 12, 16, 12],
        },
      ]);
      bao(`Đã xuất ${so(dsDangXem.length)} can phạm ra Excel`);
    } catch (e) {
      baoLoi((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-the">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 bg-linear-to-r from-slate-50 to-white px-3.5 py-3">
          <div className="mr-2">
            <div className="text-[13.5px] font-semibold tracking-tight text-slate-800">Can phạm mua hàng</div>
            <div className="text-[11px] text-slate-500">Bấm vào dòng để xem lịch sử mua hàng</div>
          </div>
          <div className="flex items-center gap-1.5">
            <OText
              type="date"
              value={tu}
              onChange={(e) => setTu(e.target.value)}
              aria-label="Từ ngày"
              title="Từ ngày"
              className="w-36"
            />
            <span className="text-slate-400">→</span>
            <OText
              type="date"
              value={den}
              onChange={(e) => setDen(e.target.value)}
              aria-label="Đến ngày"
              title="Đến ngày"
              className="w-36"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Nut
              co="sm"
              onClick={() => {
                setTu(homNay());
                setDen(homNay());
              }}
            >
              Hôm nay
            </Nut>
            <Nut
              co="sm"
              onClick={() => {
                setTu(dauThang());
                setDen(homNay());
              }}
            >
              Tháng này
            </Nut>
            <Nut
              co="sm"
              onClick={() => {
                setTu("");
                setDen("");
              }}
            >
              Tất cả
            </Nut>
          </div>
          <div className="relative min-w-52 flex-1">
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400">
              <BieuTuong ten="tim" className="h-4 w-4" />
            </span>
            <OText
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tên, buồng giam hoặc mặt hàng…"
              aria-label="Tìm can phạm hoặc mặt hàng"
              className="pl-8"
            />
          </div>
          <Nut onClick={() => void xuatExcel()} disabled={dsDangXem.length === 0}>
            <BieuTuong ten="tai" /> Excel
          </Nut>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2 text-[11px] text-slate-500">
          <span>
            Đang xem {so(dsDangXem.length)} / {so(ds.length)} can phạm
          </span>
          {dangTai && <span className="font-medium text-blue-700">Đang tải…</span>}
          {(tu || den) && (
            <span>
              Khoảng: {tu ? ngayVN(tu) : "đầu kỳ"} – {den ? ngayVN(den) : "hôm nay"}
            </span>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <TheSoNhanh nhan="Can phạm đã mua" giaTri={so(tongQuan.soCanPham)} icon="nguoi" />
        <TheSoNhanh nhan="Số phiếu" giaTri={so(tongQuan.soPhieu)} icon="phieu" />
        <TheSoNhanh nhan="Lượng hàng" giaTri={so(tongQuan.soLuong)} icon="kho" />
        {coDungTien ? (
          <TheSoNhanh nhan="Tổng tiền" giaTri={tien(tongQuan.doanhThu)} icon="bieu" />
        ) : (
          <TheSoNhanh nhan="Mua lại nhiều lần" giaTri={so(tongQuan.muaLai)} icon="check" />
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-the">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-linear-to-r from-slate-50 to-white px-4 py-3">
          <div>
            <h2 className="text-[13.5px] font-semibold tracking-tight text-slate-800">Danh sách can phạm</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Bấm vào dòng để xem chi tiết và lịch sử mua hàng</p>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-slate-600">
            <span className="whitespace-nowrap">Sắp xếp</span>
            <select
              value={sapXep}
              onChange={(e) => setSapXep(e.target.value as KieuSapXep)}
              className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-[13px] shadow-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            >
              <option value="gan_nhat">Mua gần nhất</option>
              <option value="chi_tieu">{coDungTien ? "Tổng tiền nhiều" : "Số lượng nhiều"}</option>
              <option value="so_phieu">Số phiếu nhiều</option>
              <option value="ten">Tên A–Z</option>
            </select>
          </label>
        </header>

        {dsDangXem.length === 0 ? (
          <Trong tieuDe={dangTai ? "Đang tải danh sách…" : "Không có can phạm nào phù hợp"} />
        ) : (
          <>
            <div className="mem-cuon hidden max-h-[62vh] overflow-auto sm:block">
              <table className="w-full min-w-[940px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] tracking-wide text-slate-500 uppercase">
                  <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                    <th>Can phạm</th>
                    <th className="w-24 text-right">Số phiếu</th>
                    <th className="w-28 text-right">Lượng hàng</th>
                    {coDungTien && <th className="w-32 text-right">Tổng tiền</th>}
                    <th className="w-36">Mua gần nhất</th>
                    <th className="w-32">Mặt hàng</th>
                  </tr>
                </thead>
                <tbody>
                  {dangHien.map((p) => (
                    <tr
                      key={p.key}
                      onClick={() => setChiTiet(p)}
                      className="cursor-pointer transition-colors hover:bg-blue-50/50 [&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-2"
                      title="Bấm để xem chi tiết can phạm"
                    >
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">
                            {chuDau(p.hoTen) || "?"}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800">{p.hoTen}</div>
                            <div className="text-[11px] text-slate-500">
                              {[p.buongGiam, p.namSinh ? `SN ${p.namSinh}` : ""].filter(Boolean).join(" · ") || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-right font-semibold text-slate-700 tabular-nums">{so(p.soPhieu)}</td>
                      <td className="text-right text-slate-600 tabular-nums">{so(p.soLuong)}</td>
                      {coDungTien && (
                        <td className="text-right font-medium text-slate-700 tabular-nums">{tien(p.doanhThu)}</td>
                      )}
                      <td className="whitespace-nowrap text-[12px] text-slate-500">{ngayVN(p.lanCuoi)}</td>
                      <td>
                        <Nhan sac="xanh">{so(p.matHang.length)} mặt hàng</Nhan>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 sm:hidden">
              {dangHien.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setChiTiet(p)}
                  className="flex w-full items-start gap-2.5 p-3 text-left transition-colors hover:bg-blue-50/50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">
                    {chuDau(p.hoTen) || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-800">{p.hoTen}</span>
                        <span className="block text-[11px] text-slate-500">
                          {[p.buongGiam, p.namSinh ? `SN ${p.namSinh}` : ""].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-[12px] font-semibold text-slate-700">
                        {so(p.soPhieu)} phiếu
                      </span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                      <span>{so(p.soLuong)} đơn vị hàng</span>
                      {coDungTien && <span>{tien(p.doanhThu)}</span>}
                      <span>gần nhất {ngayVN(p.lanCuoi)}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {dsDangXem.length > soMacDinh && (
              <button
                type="button"
                onClick={() => setMoRong((v) => !v)}
                aria-expanded={moRong}
                className="flex w-full items-center justify-center gap-1.5 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 text-[12.5px] font-semibold text-blue-700 transition-colors hover:bg-blue-50"
              >
                {moRong ? "Thu gọn danh sách" : `Xem thêm ${so(conLai)} can phạm`}
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 transition-transform ${moRong ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </>
        )}
      </section>

      {chiTiet && (
        <HopChiTietCanPham
          canPham={chiTiet}
          coDungTien={coDungTien}
          dong={() => setChiTiet(null)}
          xemPhieu={(o) => {
            setChiTiet(null);
            xemTruoc(o);
          }}
        />
      )}
    </div>
  );
}

function TheSoNhanh({ nhan, giaTri, icon }: { nhan: string; giaTri: string; icon: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-the">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] font-medium text-slate-500">{nhan}</div>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          <BieuTuong ten={icon} className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-1 text-xl font-bold tracking-tight text-slate-900 tabular-nums">{giaTri}</div>
    </div>
  );
}

function HopChiTietCanPham({
  canPham,
  coDungTien,
  dong,
  xemPhieu,
}: {
  canPham: DongCanPham;
  coDungTien: boolean;
  dong: () => void;
  xemPhieu: (o: Order) => void;
}) {
  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe="Chi tiết can phạm"
      rong="max-w-4xl"
      chanTrang={<Nut onClick={dong}>Đóng</Nut>}
    >
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[13px] font-bold text-blue-700">
              {chuDau(canPham.hoTen) || "?"}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold tracking-tight text-slate-900">{canPham.hoTen}</div>
              <div className="text-[12px] text-slate-500">
                {[canPham.buongGiam, canPham.namSinh ? `SN ${canPham.namSinh}` : ""].filter(Boolean).join(" · ") ||
                  "Chưa có thông tin buồng giam"}
              </div>
            </div>
          </div>
          <Nhan sac="xanh">Mua {so(canPham.soPhieu)} phiếu</Nhan>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <OChiTiet nhan="Số phiếu" giaTri={so(canPham.soPhieu)} />
          <OChiTiet nhan="Lượng hàng" giaTri={`${so(canPham.soLuong)} đơn vị`} />
          <OChiTiet nhan="Mặt hàng" giaTri={so(canPham.matHang.length)} />
          {coDungTien && <OChiTiet nhan="Tổng tiền" giaTri={tien(canPham.doanhThu)} />}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-[12px] text-slate-600">
          Mua lần đầu <b className="font-semibold text-slate-800">{ngayVN(canPham.lanDau)}</b> · gần nhất{" "}
          <b className="font-semibold text-slate-800">{ngayVN(canPham.lanCuoi)}</b>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h4 className="text-[13px] font-semibold text-slate-800">Mặt hàng đã mua</h4>
            <span className="text-[11px] text-slate-500">{so(canPham.matHang.length)} mặt hàng</span>
          </div>
          <div className="mem-cuon max-h-[28vh] overflow-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] tracking-wide text-slate-500 uppercase">
                <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                  <th className="w-28">Mã</th>
                  <th>Mặt hàng</th>
                  <th className="text-right">Số lượng</th>
                  {coDungTien && <th className="text-right">Thành tiền</th>}
                </tr>
              </thead>
              <tbody>
                {canPham.matHang.map((h) => (
                  <tr
                    key={h.productId}
                    className="[&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-1.5"
                  >
                    <td className="font-mono text-[12px] text-slate-500">{h.ma}</td>
                    <td>
                      <div className="font-medium text-slate-800">{h.ten}</div>
                      <div className="text-[11px] text-slate-500">{h.donViTinh}</div>
                    </td>
                    <td className="text-right text-slate-700 tabular-nums">{so(h.soLuong)}</td>
                    {coDungTien && <td className="text-right text-slate-700 tabular-nums">{tien(h.thanhTien)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h4 className="text-[13px] font-semibold text-slate-800">Phiếu đã mua</h4>
            <span className="text-[11px] text-slate-500">Bấm vào phiếu để xem lại</span>
          </div>
          <div className="mem-cuon max-h-[34vh] overflow-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[620px] border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] tracking-wide text-slate-500 uppercase">
                <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                  <th>Ngày</th>
                  <th>Số phiếu</th>
                  <th className="text-center">Mặt hàng</th>
                  <th className="text-right">SL</th>
                  {coDungTien && <th className="text-right">Tổng tiền</th>}
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {canPham.phieu.map((o) => {
                  const tongThieu = o.items.reduce((s, item) => s + conThieu(item), 0);
                  return (
                    <tr
                      key={o.id}
                      onClick={() => xemPhieu(o)}
                      className="cursor-pointer transition-colors hover:bg-blue-50/50 [&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-1.5"
                    >
                      <td className="whitespace-nowrap text-slate-600">{ngayVN(o.ngay)}</td>
                      <td className="font-mono text-[12px] font-semibold text-blue-700">{o.soPhieu}</td>
                      <td className="text-center text-slate-600 tabular-nums">{so(o.items.length)}</td>
                      <td className="text-right text-slate-700 tabular-nums">
                        {so(o.items.reduce((s, item) => s + item.soLuong, 0))}
                      </td>
                      {coDungTien && <td className="text-right text-slate-700 tabular-nums">{tien(o.tongTien)}</td>}
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {tongThieu > 0 && <Nhan sac="vang">Thiếu {so(tongThieu)}</Nhan>}
                          {o.kiemLuc ? <Nhan sac="luc">Đã kiểm</Nhan> : <Nhan>Chưa kiểm</Nhan>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </HopThoai>
  );
}

function OChiTiet({ nhan, giaTri }: { nhan: string; giaTri: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
      <div className="text-[11px] text-slate-500">{nhan}</div>
      <div className="mt-0.5 text-[14px] font-semibold text-slate-900 tabular-nums">{giaTri}</div>
    </div>
  );
}
