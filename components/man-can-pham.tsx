"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/client";
import { taiExcel } from "@/lib/excel";
import { homNay, khop, ngayVN, so, tien } from "@/lib/format";
import { conThieu } from "@/lib/thieu-hang";
import type { Order } from "@/lib/types";
import { useNap } from "@/lib/use-nap";
import { HopChiTietPhieu } from "./hop-chi-tiet-phieu";
import { bao, baoLoi, BieuTuong, HopThoai, Nhan, Nut, OChonKhoang, OKhoangNgay, OTim, TheSo, Trong } from "./ui";

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [tu, setTu] = useState("");
  const [den, setDen] = useState("");
  const [q, setQ] = useState("");
  const [sapXep, setSapXep] = useState<KieuSapXep>("gan_nhat");
  const [moRong, setMoRong] = useState(false);
  const [chiTiet, setChiTiet] = useState<DongCanPham | null>(null);
  const [phieuDangXem, setPhieuDangXem] = useState<Order | null>(null);
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

  // Khoảng ngày đang áp dụng khớp mục chọn nhanh nào (để phím gạt sáng đúng ô)
  const preset: "" | "hom_nay" | "thang_nay" | "tat_ca" =
    !tu && !den ? "tat_ca" : tu === homNay() && den === homNay() ? "hom_nay" : tu === dauThang() && den === homNay() ? "thang_nay" : "";

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
    <div className="space-y-3">
      <section className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
        <div className="khia bg-giay px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-serif text-[15px] leading-tight font-semibold tracking-[-0.01em] text-muc">
                Can phạm mua hàng
              </div>
              <div className="mt-0.5 text-[11.5px] text-muc-nhat">Bấm vào dòng để xem lịch sử mua hàng</div>
            </div>
            <Nut onClick={() => void xuatExcel()} disabled={dsDangXem.length === 0}>
              <BieuTuong ten="tai" /> Excel
            </Nut>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <OChonKhoang
              giaTri={preset}
              onDoi={(k) => {
                if (k === "hom_nay") {
                  setTu(homNay());
                  setDen(homNay());
                } else if (k === "thang_nay") {
                  setTu(dauThang());
                  setDen(homNay());
                } else {
                  setTu("");
                  setDen("");
                }
              }}
              chon={[
                { khoa: "hom_nay", nhan: "Hôm nay" },
                { khoa: "thang_nay", nhan: "Tháng này" },
                { khoa: "tat_ca", nhan: "Tất cả" },
              ]}
            />
            <OKhoangNgay tu={tu} den={den} onTu={setTu} onDen={setDen} />
            <OTim
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm tên, buồng giam hoặc mặt hàng…"
              aria-label="Tìm can phạm hoặc mặt hàng"
              className="min-w-52"
            />
            <span className="ml-auto font-mono text-[9.5px] tracking-[0.03em] text-muc-mo uppercase">
              {dangTai ? (
                <span className="font-semibold text-muc normal-case">Đang tải…</span>
              ) : (
                <>
                  {so(dsDangXem.length)} / {so(ds.length)} can phạm
                </>
              )}
              {(tu || den) && (
                <span className="ml-2 normal-case">
                  {tu ? ngayVN(tu) : "đầu kỳ"} – {den ? ngayVN(den) : "hôm nay"}
                </span>
              )}
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <TheSo nhan="Can phạm đã mua" giaTri={so(tongQuan.soCanPham)} icon="nguoi" />
        <TheSo nhan="Số phiếu" giaTri={so(tongQuan.soPhieu)} icon="phieu" />
        <TheSo nhan="Lượng hàng" giaTri={so(tongQuan.soLuong)} icon="kho" />
        {coDungTien ? (
          <TheSo nhan="Tổng tiền" giaTri={tien(tongQuan.doanhThu)} icon="bieu" />
        ) : (
          <TheSo nhan="Mua lại nhiều lần" giaTri={so(tongQuan.muaLai)} icon="check" />
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
        <header className="khia flex flex-wrap items-center justify-between gap-2 bg-giay px-4 py-3">
          <div>
            <h2 className="font-serif text-[15px] leading-tight font-semibold tracking-[-0.01em] text-muc">
              Danh sách can phạm
            </h2>
            <p className="mt-0.5 text-[11.5px] text-muc-nhat">Bấm vào dòng để xem chi tiết và lịch sử mua hàng</p>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-muc-nhat">
            <span className="whitespace-nowrap">Sắp xếp</span>
            <select
              value={sapXep}
              onChange={(e) => setSapXep(e.target.value as KieuSapXep)}
              className="h-8 rounded-md border border-ke-dam bg-giay-cao px-2 text-[13px] shadow-xs outline-none transition focus:border-muc"
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
                <thead className="sticky top-0 z-10 bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
                  <tr className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
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
                      className="cursor-pointer transition-colors hover:bg-giay/60 [&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-2.5"
                      title="Bấm để xem chi tiết can phạm"
                    >
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-ke-dam bg-giay font-mono text-[10px] font-semibold text-muc-nhat">
                            {chuDau(p.hoTen) || "?"}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-muc">{p.hoTen}</div>
                            <div className="font-mono text-[10.5px] tracking-[0.02em] text-muc-mo">
                              {[p.buongGiam, p.namSinh ? `SN ${p.namSinh}` : ""].filter(Boolean).join(" · ") || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="so text-right font-semibold text-muc">{so(p.soPhieu)}</td>
                      <td className="so text-right text-muc-nhat">{so(p.soLuong)}</td>
                      {coDungTien && (
                        <td className="so text-right font-medium text-muc">{tien(p.doanhThu)}</td>
                      )}
                      <td className="whitespace-nowrap font-mono text-[11px] tracking-[0.02em] text-muc-nhat">
                        {ngayVN(p.lanCuoi)}
                      </td>
                      <td>
                        <Nhan sac="xanh">{so(p.matHang.length)} mặt hàng</Nhan>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-ke/60 sm:hidden">
              {dangHien.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setChiTiet(p)}
                  className="flex w-full items-start gap-2.5 p-3 text-left transition-colors hover:bg-giay/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-ke-dam bg-giay font-mono text-[11px] font-semibold text-muc-nhat">
                    {chuDau(p.hoTen) || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block font-semibold text-muc">{p.hoTen}</span>
                        <span className="block font-mono text-[10px] tracking-[0.01em] text-muc-mo">
                          {[p.buongGiam, p.namSinh ? `SN ${p.namSinh}` : ""].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                      <span className="so shrink-0 text-right text-[10.5px] font-semibold text-muc">
                        {so(p.soPhieu)} phiếu
                      </span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] tracking-[0.01em] text-muc-mo">
                      <span>{so(p.soLuong)} đơn vị hàng</span>
                      {coDungTien && <span className="so">{tien(p.doanhThu)}</span>}
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
                className="flex w-full items-center justify-center gap-1.5 border-t border-ke bg-giay px-4 py-2.5 font-mono text-[10px] font-medium tracking-[0.04em] text-muc uppercase transition-colors hover:bg-giay-cao"
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
            setPhieuDangXem(o);
          }}
        />
      )}

      <HopChiTietPhieu
        key={phieuDangXem?.id ?? "dong"}
        orderId={phieuDangXem?.id ?? null}
        banDau={phieuDangXem}
        onDong={() => setPhieuDangXem(null)}
        onThayDoi={(o) => {
          setOrders((cu) => cu.map((x) => (x.id === o.id ? o : x)));
          setPhieuDangXem(o);
        }}
      />
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-ke-dam bg-giay font-mono text-[12px] font-semibold text-muc-nhat">
              {chuDau(canPham.hoTen) || "?"}
            </span>
            <div className="min-w-0">
              <div className="truncate font-serif text-[17px] font-semibold tracking-[-0.01em] text-muc">
                {canPham.hoTen}
              </div>
              <div className="font-mono text-[10.5px] tracking-[0.02em] text-muc-mo">
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

        <div className="rounded-md border border-ke bg-giay px-3 py-2 font-mono text-[10.5px] tracking-[0.02em] text-muc-nhat">
          Mua lần đầu <b className="font-semibold text-muc">{ngayVN(canPham.lanDau)}</b> · gần nhất{" "}
          <b className="font-semibold text-muc">{ngayVN(canPham.lanCuoi)}</b>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h4 className="nhan-muc">Mặt hàng đã mua</h4>
            <span className="so text-[10.5px] text-muc-mo">{so(canPham.matHang.length)} mặt hàng</span>
          </div>
          <div className="mem-cuon max-h-[28vh] overflow-auto rounded-md border border-ke">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
                <tr className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
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
                    className="[&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-1.5"
                  >
                    <td className="so text-[11.5px] text-muc-mo">{h.ma}</td>
                    <td>
                      <div className="font-medium text-muc">{h.ten}</div>
                      <div className="text-[10.5px] text-muc-mo">{h.donViTinh}</div>
                    </td>
                    <td className="so text-right text-muc">{so(h.soLuong)}</td>
                    {coDungTien && <td className="so text-right text-muc">{tien(h.thanhTien)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h4 className="nhan-muc">Phiếu đã mua</h4>
            <span className="text-[10.5px] text-muc-mo">Bấm vào phiếu để xem lại</span>
          </div>
          <div className="mem-cuon max-h-[34vh] overflow-auto rounded-md border border-ke">
            <table className="w-full min-w-[620px] border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
                <tr className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
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
                      className="cursor-pointer transition-colors hover:bg-giay/60 [&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-2"
                    >
                      <td className="whitespace-nowrap font-mono text-[11px] text-muc-nhat">{ngayVN(o.ngay)}</td>
                      <td className="so text-[11.5px] font-semibold text-muc">{o.soPhieu}</td>
                      <td className="so text-center text-muc-nhat">{so(o.items.length)}</td>
                      <td className="so text-right text-muc">
                        {so(o.items.reduce((s, item) => s + item.soLuong, 0))}
                      </td>
                      {coDungTien && <td className="so text-right text-muc">{tien(o.tongTien)}</td>}
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
    <div className="rounded-md border border-ke bg-giay px-3 py-2">
      <div className="font-mono text-[9.5px] tracking-[0.1em] text-muc-mo uppercase">{nhan}</div>
      <div className="so mt-1 text-[14px] font-semibold text-muc">{giaTri}</div>
    </div>
  );
}
