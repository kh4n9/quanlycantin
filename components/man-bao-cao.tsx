"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, type BaoCao } from "@/lib/client";
import { taiCsv } from "@/lib/csv";
import { homNay, ngayVN, so, tien } from "@/lib/format";
import { baoLoi, BieuTuong, Nut, Trong } from "./ui";

/** Màu duy nhất cho chuỗi dữ liệu — đã kiểm bằng scripts/validate_palette.js */
const MAU_DUONG = "#2563eb";

function dauThang(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function luiNgay(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ManBaoCao() {
  const [tu, setTu] = useState(dauThang());
  const [den, setDen] = useState(homNay());
  const [du, setDu] = useState<BaoCao | null>(null);
  const [dangTai, setDangTai] = useState(true);

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      setDu(await apiClient.baoCao(tu, den));
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangTai(false);
    }
  }, [tu, den]);

  useEffect(() => {
    void nap();
  }, [nap]);

  const datNhanh = (kieu: "homnay" | "7ngay" | "thangnay" | "thangtruoc") => {
    const d = new Date();
    if (kieu === "homnay") {
      setTu(homNay());
      setDen(homNay());
    } else if (kieu === "7ngay") {
      setTu(luiNgay(6));
      setDen(homNay());
    } else if (kieu === "thangnay") {
      setTu(dauThang(d));
      setDen(homNay());
    } else {
      const truoc = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const cuoi = new Date(d.getFullYear(), d.getMonth(), 0);
      const p = (n: number) => String(n).padStart(2, "0");
      setTu(`${truoc.getFullYear()}-${p(truoc.getMonth() + 1)}-01`);
      setDen(`${cuoi.getFullYear()}-${p(cuoi.getMonth() + 1)}-${p(cuoi.getDate())}`);
    }
  };

  const xuatCsv = () => {
    if (!du) return;
    const dong: (string | number)[][] = [];
    dong.push(["TỔNG QUAN"]);
    dong.push(["Số phiếu bán", du.tongQuan.soPhieu]);
    dong.push(["Số lượng hàng đã bán", du.tongQuan.soLuongHang]);
    dong.push(["Số mặt hàng", du.tongQuan.soMatHang]);
    if (du.tongQuan.coDungTien) dong.push(["Doanh thu", du.tongQuan.doanhThu]);
    dong.push([]);
    dong.push(["THEO NGÀY"]);
    dong.push(["Ngày", "Số phiếu", "Doanh thu"]);
    for (const n of du.theoNgay) dong.push([ngayVN(n.ngay), n.soPhieu, n.doanhThu]);
    dong.push([]);
    dong.push(["MẶT HÀNG ĐÃ BÁN"]);
    dong.push(["Mã", "Tên mặt hàng", "ĐVT", "Số lượng", "Doanh thu"]);
    for (const h of du.theoHang) dong.push([h.ma, h.ten, h.donViTinh, h.soLuong, h.doanhThu]);
    dong.push([]);
    dong.push(["CAN PHẠM MUA HÀNG"]);
    dong.push(["Họ tên", "Năm sinh", "Buồng giam", "Số phiếu", "Số lượng hàng", "Doanh thu"]);
    for (const p of du.theoCanPham) {
      dong.push([p.hoTen, p.namSinh, p.buongGiam, p.soPhieu, p.soLuongHang, p.doanhThu]);
    }
    taiCsv(`bao-cao_${tu}_${den}`, ["Báo cáo bán hàng căn tin", `${ngayVN(tu)} - ${ngayVN(den)}`], dong);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Bộ lọc — một hàng phía trên các biểu đồ */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <span className="mr-1 text-sm font-semibold text-slate-800">Khoảng thời gian</span>
        {(
          [
            ["homnay", "Hôm nay"],
            ["7ngay", "7 ngày"],
            ["thangnay", "Tháng này"],
            ["thangtruoc", "Tháng trước"],
          ] as const
        ).map(([k, nhan]) => (
          <Nut key={k} co="sm" onClick={() => datNhanh(k)}>
            {nhan}
          </Nut>
        ))}
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
        <Nut onClick={xuatCsv} disabled={!du} className="ml-auto">
          <BieuTuong ten="tai" /> Xuất Excel
        </Nut>
      </div>

      {dangTai && !du ? (
        <div className="rounded-lg border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 shadow-sm">
          Đang tổng hợp số liệu…
        </div>
      ) : !du || du.tongQuan.soPhieu === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <Trong
            tieuDe="Chưa có phiếu bán nào trong khoảng thời gian này"
            moTa="Chọn khoảng ngày khác, hoặc lập phiếu bán ở màn hình Bán hàng."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile nhan="Số phiếu bán" giaTri={so(du.tongQuan.soPhieu)} chinh />
            <Tile nhan="Số lượng hàng đã bán" giaTri={so(du.tongQuan.soLuongHang)} phu="tổng số đơn vị hàng" />
            <Tile nhan="Số mặt hàng khác nhau" giaTri={so(du.tongQuan.soMatHang)} />
            {du.tongQuan.coDungTien ? (
              <Tile nhan="Doanh thu" giaTri={tien(du.tongQuan.doanhThu)} />
            ) : (
              <Tile nhan="Số can phạm đã mua" giaTri={so(du.tongQuan.soCanPham)} />
            )}
          </div>

          <BieuDoTheoNgay data={du.theoNgay} dungTien={du.tongQuan.coDungTien} />

          <BangXepHang
            tieuDe="Mặt hàng đã bán"
            phuDe={du.tongQuan.coDungTien ? "Xếp theo doanh thu" : "Xếp theo số lượng đã bán"}
            cot="Số lượng"
            hang={du.theoHang.map((h) => ({
              id: h.productId,
              ma: h.ma,
              ten: h.ten,
              soLuong: h.soLuong,
              donVi: h.donViTinh,
              giaTri: du.tongQuan.coDungTien ? h.doanhThu : h.soLuong,
              hienThi: du.tongQuan.coDungTien ? so(h.doanhThu) : so(h.soLuong),
            }))}
            nhanGiaTri="Doanh thu"
          />

          <BangXepHang
            tieuDe="Can phạm mua hàng"
            phuDe={du.tongQuan.coDungTien ? "Xếp theo tổng tiền mua" : "Xếp theo số lượng hàng đã mua"}
            cot="Số phiếu"
            hang={du.theoCanPham.map((p) => ({
              id: p.hoTen,
              ma: p.namSinh ? `SN ${p.namSinh}` : "",
              ten: p.hoTen,
              phu: p.buongGiam,
              soLuong: p.soPhieu,
              donVi: "phiếu",
              giaTri: du.tongQuan.coDungTien ? p.doanhThu : p.soLuongHang,
              hienThi: du.tongQuan.coDungTien ? so(p.doanhThu) : so(p.soLuongHang),
            }))}
            nhanGiaTri="Tổng tiền"
          />
        </>
      )}
    </div>
  );
}

function Tile({ nhan, giaTri, phu, chinh = false }: { nhan: string; giaTri: string; phu?: string; chinh?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
      <div className="text-[12px] text-slate-500">{nhan}</div>
      <div className={`mt-1 font-bold text-slate-900 ${chinh ? "text-2xl" : "text-xl"}`}>{giaTri}</div>
      {phu && <div className="mt-0.5 text-[11px] text-slate-500">{phu}</div>}
    </div>
  );
}

/* --------------------------- Biểu đồ theo ngày --------------------------- */

type DiemNgay = { ngay: string; soPhieu: number; doanhThu: number };

function BieuDoTheoNgay({ data, dungTien }: { data: DiemNgay[]; dungTien: boolean }) {
  const [tro, setTro] = useState<number | null>(null);
  const giaTri = (d: DiemNgay) => (dungTien ? d.doanhThu : d.soPhieu);

  const { caoNhat, moc, buocNhan } = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => (dungTien ? d.doanhThu : d.soPhieu)));
    const donVi = Math.pow(10, Math.floor(Math.log10(max)));
    const tran = max <= 5 ? max : Math.ceil(max / donVi) * donVi;
    return {
      caoNhat: tran,
      moc: [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(tran * t)),
      buocNhan: Math.max(1, Math.ceil(data.length / 8)),
    };
  }, [data, dungTien]);

  const tong = data.reduce((s, d) => s + giaTri(d), 0);
  const ngayCaoNhat = data.reduce((a, b) => (giaTri(b) > giaTri(a) ? b : a), data[0]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            {dungTien ? "Doanh thu theo ngày" : "Số phiếu bán theo ngày"}
          </h2>
          <p className="text-[11px] text-slate-500">
            Tổng {dungTien ? tien(tong) : `${so(tong)} phiếu`} · cao nhất {ngayVN(ngayCaoNhat?.ngay ?? "")} (
            {dungTien ? tien(giaTri(ngayCaoNhat)) : `${so(giaTri(ngayCaoNhat))} phiếu`})
          </p>
        </div>
        <span className="text-[11px] text-slate-400">Đưa chuột lên cột để xem chi tiết ngày</span>
      </header>

      <div className="flex gap-3 px-4 pt-4 pb-3">
        <div className="flex h-[220px] w-20 shrink-0 flex-col justify-between text-right text-[10px] text-slate-400">
          {[...moc].reverse().map((m) => (
            <span key={m} className="-translate-y-1/2 tabular-nums">
              {so(m)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="relative h-[220px]">
            <div className="absolute inset-0 flex flex-col justify-between">
              {moc.map((m, i) => (
                <div key={m} className={`h-px w-full ${i === moc.length - 1 ? "bg-slate-300" : "bg-slate-100"}`} />
              ))}
            </div>

            <div className="absolute inset-0 flex items-end" style={{ gap: 2 }}>
              {data.map((d, i) => {
                const phanTram = (giaTri(d) / caoNhat) * 100;
                const dangTro = tro === i;
                return (
                  <div
                    key={d.ngay}
                    className="relative flex h-full flex-1 cursor-default items-end"
                    onMouseEnter={() => setTro(i)}
                    onMouseLeave={() => setTro(null)}
                    tabIndex={0}
                    onFocus={() => setTro(i)}
                    onBlur={() => setTro(null)}
                  >
                    <div
                      className="mx-auto w-full transition-opacity"
                      style={{
                        height: `${Math.max(phanTram, giaTri(d) > 0 ? 1.5 : 0)}%`,
                        maxWidth: 52,
                        background: MAU_DUONG,
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                        opacity: tro === null || dangTro ? 1 : 0.45,
                      }}
                    />
                    {dangTro && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-44 -translate-x-1/2 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] shadow-lg">
                        <div className="font-semibold text-slate-800">{ngayVN(d.ngay)}</div>
                        <div className="mt-1 flex justify-between gap-3 text-slate-600">
                          <span>Số phiếu</span>
                          <b className="tabular-nums text-slate-900">{so(d.soPhieu)}</b>
                        </div>
                        {dungTien && (
                          <div className="flex justify-between gap-3 text-slate-600">
                            <span>Doanh thu</span>
                            <span className="tabular-nums">{so(d.doanhThu)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-1 flex" style={{ gap: 2 }}>
            {data.map((d, i) => (
              <div key={d.ngay} className="min-w-0 flex-1 text-center text-[10px] whitespace-nowrap text-slate-400">
                {i % buocNhan === 0 || i === data.length - 1 ? d.ngay.slice(8, 10) : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Bảng xếp hạng ------------------------------ */

type DongXepHang = {
  id: string;
  ma: string;
  ten: string;
  phu?: string;
  soLuong: number;
  donVi: string;
  giaTri: number;
  hienThi: string;
};

function BangXepHang({
  tieuDe,
  phuDe,
  cot,
  hang,
  nhanGiaTri,
}: {
  tieuDe: string;
  phuDe: string;
  cot: string;
  hang: DongXepHang[];
  nhanGiaTri: string;
}) {
  if (hang.length === 0) return null;
  const lonNhat = Math.max(1, ...hang.map((h) => h.giaTri));
  const hienThi = hang.slice(0, 15);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-baseline justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{tieuDe}</h2>
          <p className="text-[11px] text-slate-500">{phuDe}</p>
        </div>
        <span className="text-[11px] text-slate-400">
          Hiện {hienThi.length} / {hang.length}
        </span>
      </header>
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-[12px] text-slate-600">
          <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-semibold">
            <th className="w-10">#</th>
            <th className="w-32">Mã</th>
            <th>Tên</th>
            <th className="w-28 text-right">{cot}</th>
            <th className="w-56 text-right">{nhanGiaTri}</th>
          </tr>
        </thead>
        <tbody>
          {hienThi.map((h, i) => (
            <tr key={h.id} className="[&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-1.5">
              <td className="text-center text-[12px] text-slate-400">{i + 1}</td>
              <td className="font-mono text-[12px] text-slate-500">{h.ma}</td>
              <td>
                <div className="font-medium text-slate-800">{h.ten}</div>
                {h.phu && <div className="text-[11px] text-slate-400">{h.phu}</div>}
              </td>
              <td className="text-right text-slate-600 tabular-nums">
                {so(h.soLuong)} {h.donVi}
              </td>
              <td>
                <div className="flex items-center justify-end gap-2">
                  {/* Độ dài cột mã hoá độ lớn; con số vẫn hiện đầy đủ */}
                  <div className="h-2 w-28 overflow-hidden rounded-sm bg-slate-100">
                    <div
                      className="h-full rounded-sm"
                      style={{ width: `${(h.giaTri / lonNhat) * 100}%`, background: MAU_DUONG }}
                    />
                  </div>
                  <span className="w-20 text-right font-semibold text-slate-800 tabular-nums">{h.hienThi}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
