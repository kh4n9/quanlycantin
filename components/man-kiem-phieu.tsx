"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/client";
import { homNay, khop, ngayVN, so } from "@/lib/format";
import { useStore } from "@/lib/store";
import { conThieu, phieuConThieu } from "@/lib/thieu-hang";
import type { LineItem, Order } from "@/lib/types";
import { useNap } from "@/lib/use-nap";
import { HopChiTietPhieu } from "./hop-chi-tiet-phieu";
import { HopThieuHang } from "./hop-thieu-hang";
import { bao, baoLoi, BieuTuong, Nut, OChon, OChonKhoang, OKhoangNgay, OText, OTim, Trong } from "./ui";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./ui/table";

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

  // Chỉ lưu id phiếu đang xem; phiếu và danh sách dòng suy ra từ danh sách đã lọc.
  // Nhờ vậy khi danh sách tải xong hoặc bộ lọc đổi, mục đầu tiên tự được chọn mà
  // không phải đồng bộ state bằng effect.
  const [dangChonId, setDangChonId] = useState<string | null>(null);
  const [sua, setSua] = useState<{ id: string; dong: LineItem[] } | null>(null);
  const [ghiChuSua, setGhiChuSua] = useState<{ id: string; value: string } | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [moThieu, setMoThieu] = useState(false);
  const [phieuChiTiet, setPhieuChiTiet] = useState<Order | null>(null);

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

  useNap(nap);

  const hienThi = useMemo(() => {
    let d = ds;
    if (loc === "chua_kiem") d = d.filter((o) => !o.kiemLuc);
    if (loc === "da_kiem") d = d.filter((o) => o.kiemLuc);
    if (q) d = d.filter((o) => khop(o.soPhieu, q) || khop(o.hoTen, q) || khop(o.buongGiam, q));
    return d;
  }, [ds, loc, q]);

  // Phiếu đang xem: giữ lựa chọn nếu còn trong danh sách, không thì lấy phiếu đầu
  const dangChon = hienThi.find((o) => o.id === dangChonId) ?? hienThi[0] ?? null;
  // Dòng đang sửa và ghi chú chỉ có hiệu lực cho đúng phiếu đang xem
  const dsDong = useMemo(
    () => (sua && dangChon && sua.id === dangChon.id ? sua.dong : (dangChon?.items ?? [])),
    [sua, dangChon],
  );
  const ghiChu =
    ghiChuSua && dangChon && ghiChuSua.id === dangChon.id
      ? ghiChuSua.value
      : (dangChon?.kiemGhiChu ?? "");

  const tienDo = useMemo(() => {
    const daKiem = ds.filter((o) => o.kiemLuc).length;
    return { daKiem, tong: ds.length, con: ds.length - daKiem };
  }, [ds]);

  function chonPhieu(o: Order) {
    setDangChonId(o.id);
    setSua(null);
    setGhiChuSua(null);
  }

  const suaDong = (i: number, soLuong: number) => {
    const moi = [...dsDong];
    const d = { ...moi[i] };
    d.soLuong = Math.max(0, Math.round(soLuong || 0));
    d.thanhTien = d.soLuong * d.donGia;
    moi[i] = d;
    setSua({ id: dangChon?.id ?? "", dong: moi });
  };

  const coThayDoi = useMemo(() => {
    if (!dangChon) return false;
    if (dsDong.length !== dangChon.items.length) return true;
    return dsDong.some((d, i) => d.soLuong !== dangChon.items[i]?.soLuong);
  }, [dsDong, dangChon]);

  const tongSauSua = dsDong.reduce((s, d) => s + d.thanhTien, 0);
  const tongThieu = dangChon ? phieuConThieu(dangChon) : 0;

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
      setDangChonId(kq.order.id);
      setGhiChuSua(null);
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

  // Phím gạt khoảng ngày sáng đúng ô đang áp dụng
  const preset: "" | "homnay" | "7ngay" | "thangnay" =
    tu === homNay() && den === homNay()
      ? "homnay"
      : tu === luiNgay(6) && den === homNay()
        ? "7ngay"
        : tu === dauThang() && den === homNay()
          ? "thangnay"
          : "";

  const phanTram = tienDo.tong ? Math.round((tienDo.daKiem / tienDo.tong) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* --- Bộ lọc và tiến độ --- */}
      <div className="rounded-lg border border-ke bg-giay-cao px-3.5 py-3 shadow-the">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-serif text-[15px] font-semibold tracking-[-0.01em] text-muc">Kiểm phiếu</span>
          <OChonKhoang
            giaTri={preset}
            onDoi={datNhanh}
            chon={[
              { khoa: "homnay", nhan: "Hôm nay" },
              { khoa: "7ngay", nhan: "7 ngày" },
              { khoa: "thangnay", nhan: "Tháng này" },
            ]}
          />
          <OKhoangNgay tu={tu} den={den} onTu={setTu} onDen={setDen} />
          <OTim
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm số phiếu, họ tên…"
            aria-label="Tìm phiếu để kiểm"
            className="min-w-48"
          />
          <OChon
            value={loc}
            onChange={(e) => setLoc(e.target.value as LocKiem)}
            aria-label="Lọc theo trạng thái kiểm"
            className="h-9 w-44 border-ke-dam bg-white px-2 text-[13px] text-muc shadow-xs focus:border-muc focus:ring-2 focus:ring-muc/20"
          >
            <option value="chua_kiem">Chưa kiểm ({tienDo.con})</option>
            <option value="da_kiem">Đã kiểm ({tienDo.daKiem})</option>
            <option value="tat_ca">Tất cả ({tienDo.tong})</option>
          </OChon>
        </div>

        {tienDo.tong > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-ke/70">
              <div className="h-full rounded-sm bg-ngoc transition-all" style={{ width: `${phanTram}%` }} />
            </div>
            <span className="shrink-0 font-mono text-[10.5px] tracking-[0.03em] text-muc-nhat uppercase">
              Đã kiểm <b className="text-muc">{so(tienDo.daKiem)}</b> / {so(tienDo.tong)} phiếu
              {tienDo.con > 0 ? ` · còn ${so(tienDo.con)}` : " · đã kiểm hết"}
            </span>
          </div>
        )}
      </div>

      {tienDo.tong === 0 && !dangTai ? (
        <div className="rounded-lg border border-ke bg-giay-cao shadow-the">
          <Trong
            tieuDe="Không có phiếu nào trong khoảng ngày này"
            moTa="Chọn khoảng ngày khác để bắt đầu kiểm."
          />
        </div>
      ) : (
        <div className="grid min-h-0 min-w-0 gap-3 lg:grid-cols-[20rem_1fr]">
          {/* --- Danh sách phiếu --- */}
          <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
            <div className="nhan-muc flex items-center justify-between border-b border-dashed border-ke bg-giay px-3 py-2">
              <span>Danh sách</span>
              <span className="so text-muc">{so(hienThi.length)}</span>
            </div>
            <div className="mem-cuon max-h-[calc(100vh-230px)] min-h-[350px] overflow-y-auto">
              {hienThi.length === 0 && (
                <p className="px-3 py-6 text-center font-mono text-[10.5px] tracking-[0.02em] text-muc-mo">
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
                    className={`flex w-full items-start gap-2.5 border-b border-ke/60 border-l-2 px-3 py-2.5 text-left transition ${
                      dangXem
                        ? "border-l-dau bg-giay"
                        : "border-l-transparent hover:bg-giay/60"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[9px] font-bold ${
                        !o.kiemLuc
                          ? "border-ke-dam text-transparent"
                          : coSaiSot
                            ? "border-moc bg-moc text-giay-cao"
                            : "border-ngoc bg-ngoc text-giay-cao"
                      }`}
                      title={!o.kiemLuc ? "Chưa kiểm" : coSaiSot ? "Đã kiểm, có ghi chú sai sót" : "Đã kiểm"}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="so block text-[11.5px] font-medium text-muc">{o.soPhieu}</span>
                      <span className="mt-0.5 block truncate text-[13px] font-semibold text-muc">{o.hoTen}</span>
                      <span className="mt-0.5 block font-mono text-[10.5px] tracking-[0.02em] text-muc-nhat">
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
            <div className="flex min-w-0 flex-col gap-3">
              <div className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-dashed border-ke bg-giay px-4 py-2.5">
                  <div>
                    <div className="so text-[12px] font-semibold text-muc">{dangChon.soPhieu}</div>
                    <div className="mt-0.5 font-mono text-[10px] tracking-[0.03em] text-muc-mo uppercase">
                      Ngày bán {ngayVN(dangChon.ngay)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-serif text-[15px] font-semibold text-muc">{dangChon.hoTen}</div>
                    <div className="mt-0.5 text-[11px] text-muc-nhat">
                      SN {dangChon.namSinh || "—"} · {dangChon.buongGiam || "—"}
                    </div>
                  </div>
                  {dangChon.kiemLuc ? (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[10px] font-medium tracking-[0.04em] uppercase ${
                        dangChon.kiemGhiChu
                          ? "border-moc/30 bg-moc-nhat text-moc"
                          : "border-ngoc/30 bg-ngoc-nhat text-ngoc"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          dangChon.kiemGhiChu ? "bg-moc" : "bg-ngoc"
                        }`}
                      />
                      {dangChon.kiemGhiChu ? "Đã kiểm — có sai sót" : "Đã kiểm"}
                      {dangChon.kiemBoi ? ` · ${dangChon.kiemBoi}` : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-ke-dam bg-giay-cao px-2 py-1 font-mono text-[10px] font-medium tracking-[0.04em] text-muc-nhat uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-ke-dam" />
                      Chưa kiểm
                    </span>
                  )}
                  {tongThieu > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-moc/30 bg-moc-nhat px-2 py-1 font-mono text-[10px] font-medium tracking-[0.04em] text-moc uppercase">
                      <BieuTuong ten="canh" className="h-3.5 w-3.5" />
                      Còn thiếu {so(tongThieu)} đơn vị
                    </span>
                  )}
                </div>

                <div className="mem-cuon max-h-[calc(100vh-340px)] min-h-[220px] overflow-auto">
                  <Table className="w-full min-w-[860px] border-collapse text-sm">
                    <TableHeader className="sticky top-0 z-10 bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
                      <TableRow className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                        <TableHead className="w-10">#</TableHead>
                        <TableHead className="text-left">Tên mặt hàng</TableHead>
                        <TableHead className="w-16">ĐVT</TableHead>
                        <TableHead className="w-28 text-center">Số lượng</TableHead>
                        <TableHead className="w-24 text-right">Còn thiếu</TableHead>
                        <TableHead className="w-28 text-right">Đơn giá</TableHead>
                        <TableHead className="w-32 text-right">Thành tiền</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dsDong.map((d, i) => {
                        const goc = dangChon.items[i];
                        const lech = goc && d.soLuong !== goc.soLuong;
                        return (
                          <TableRow
                            key={d.productId}
                            className={`[&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-1.5 ${
                              lech ? "bg-moc-nhat/60" : ""
                            }`}
                          >
                            <TableCell className="text-center font-mono text-[10.5px] text-muc-mo">{i + 1}</TableCell>
                            <TableCell className="font-medium text-muc">
                              {d.ten}
                              {lech && (
                                <span className="ml-2 font-mono text-[10px] font-normal tracking-[0.02em] text-moc">
                                  sổ ghi {so(goc.soLuong)} → sửa thành {so(d.soLuong)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-[12.5px] text-muc-nhat">{d.donViTinh}</TableCell>
                            <TableCell className="text-center">
                              {duocSua ? (
                                <div className="inline-flex items-center rounded-sm border border-ke-dam bg-giay-cao shadow-xs">
                                  <button
                                    type="button"
                                    onClick={() => suaDong(i, Math.max(0, d.soLuong - 1))}
                                    disabled={d.soLuong <= 0}
                                    className="flex h-7 w-6 items-center justify-center text-muc-nhat hover:bg-giay hover:text-muc disabled:cursor-not-allowed disabled:opacity-30"
                                    title="Giảm 1"
                                  >
                                    <span className="text-base font-semibold leading-none">−</span>
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    value={d.soLuong}
                                    onChange={(e) => suaDong(i, Number(e.target.value))}
                                    onFocus={(e) => e.target.select()}
                                    onKeyDown={(e) => {
                                      if (e.key === "+" || e.key === "=") {
                                        e.preventDefault();
                                        suaDong(i, d.soLuong + 1);
                                      } else if (e.key === "-") {
                                        e.preventDefault();
                                        suaDong(i, Math.max(0, d.soLuong - 1));
                                      }
                                    }}
                                    className={`so h-7 w-12 border-x border-ke px-1 text-center text-[13px] font-semibold outline-none focus:bg-giay ${
                                      lech ? "border-moc/40 bg-moc-nhat font-bold text-moc" : "text-muc"
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => suaDong(i, d.soLuong + 1)}
                                    className="flex h-7 w-6 items-center justify-center text-muc-nhat hover:bg-giay hover:text-muc"
                                    title="Tăng 1"
                                  >
                                    <span className="text-base font-semibold leading-none">+</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="so block text-center text-[13px] text-muc">{so(d.soLuong)}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {goc && conThieu(goc) > 0 ? (
                                <span className="so inline-block rounded-sm border border-moc/30 bg-moc-nhat px-1.5 py-0.5 text-[11px] font-semibold text-moc">
                                  {so(conThieu(goc))}
                                </span>
                              ) : (
                                <span className="so text-[12.5px] text-muc-mo">—</span>
                              )}
                            </TableCell>
                            <TableCell className="so text-right text-[12.5px] text-muc-nhat">{so(d.donGia)}</TableCell>
                            <TableCell className="so text-right text-[13px] font-semibold text-muc">{so(d.thanhTien)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter className="bg-giay">
                      <TableRow className="[&>td]:border-t [&>td]:border-ke [&>td]:px-3 [&>td]:py-2.5">
                        <TableCell colSpan={6} className="nhan-muc text-right">
                          Tổng cộng
                        </TableCell>
                        <TableCell className="so text-right text-[15px] font-semibold text-muc">
                          {tongSauSua > 0 ? so(tongSauSua) : "—"}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>

              {/* --- Ghi chú và hành động --- */}
              <div className="rounded-lg border border-ke bg-giay-cao p-3.5 shadow-the">
                <div className="mb-2 flex flex-wrap items-end gap-3">
                  <div className="min-w-64 flex-1">
                    <label className="nhan-muc mb-1.5 block">Ghi chú kiểm — ghi lại sai sót nếu có</label>
                    <OText
                      value={ghiChu}
                      onChange={(e) => setGhiChuSua({ id: dangChon.id, value: e.target.value })}
                      placeholder="Ví dụ: sổ ghi 5 gói, thực tế 4 gói"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tongThieu > 0 && duocSua && (
                      <Nut
                        co="lg"
                        onClick={() => setMoThieu(true)}
                        disabled={dangLuu || coThayDoi}
                        title={
                          coThayDoi
                            ? "Lưu số lượng đã sửa trước khi bù hàng"
                            : "Ghi nhận hàng đã bù cho phiếu này"
                        }
                      >
                        <BieuTuong ten="canh" className="h-4 w-4" /> Bù hàng thiếu
                      </Nut>
                    )}
                    <Nut
                      co="lg"
                      onClick={() => setPhieuChiTiet(dangChon)}
                      disabled={coThayDoi}
                      title={
                        coThayDoi
                          ? "Lưu số lượng đã sửa trước khi mở chi tiết"
                          : "Xem chi tiết đầy đủ, bù hàng hoặc chỉnh sửa phiếu"
                      }
                    >
                      <BieuTuong ten="phieu" className="h-4 w-4" /> Chi tiết &amp; sửa
                    </Nut>
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
                      <span className="ml-1 rounded-sm bg-white/15 px-1.5 py-0.5 font-mono text-[9.5px] font-normal tracking-[0.02em]">
                        Ctrl+↵
                      </span>
                    </Nut>
                  </div>
                </div>

                {coThayDoi && (
                  <div className="flex items-start gap-2 rounded-sm border border-moc/30 border-l-[3px] border-l-moc bg-moc-nhat px-3 py-2 text-[12px] text-muc">
                    <BieuTuong ten="canh" className="mt-0.5 h-4 w-4 shrink-0 text-moc" />
                    <span>
                      {duocSua ? (
                        <>
                          Số lượng đã sửa, tiền tính lại thành <b className="so font-semibold">{so(tongSauSua)}</b>. Bấm
                          “Đúng, tiếp theo” để lưu và đánh dấu đã kiểm.
                        </>
                      ) : (
                        <>Tài khoản của bạn không có quyền sửa phiếu, chỉ đánh dấu kiểm được.</>
                      )}
                    </span>
                  </div>
                )}
                {!coThayDoi && dangChon.kiemLuc && ghiChu !== dangChon.kiemGhiChu && (
                  <div className="rounded-md border border-dashed border-ke-dam bg-giay px-3 py-2 font-mono text-[10.5px] tracking-[0.02em] text-muc-nhat">
                    Ghi chú đã thay đổi — bấm “Lưu &amp; tiếp theo” để cập nhật.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-ke bg-giay-cao shadow-the">
              <Trong
                tieuDe="Đã kiểm hết phiếu trong khoảng này"
                moTa="Đổi bộ lọc sang “Đã kiểm” hoặc “Tất cả” để xem lại, hoặc chọn khoảng ngày khác."
              />
            </div>
          )}
        </div>
      )}

      {moThieu && dangChon && (
        <HopThieuHang
          key={dangChon.id}
          phieu={dangChon}
          dong={() => setMoThieu(false)}
          onLuu={(o) => setDs((cu) => cu.map((x) => (x.id === o.id ? o : x)))}
        />
      )}

      <HopChiTietPhieu
        key={phieuChiTiet?.id ?? "dong"}
        orderId={phieuChiTiet?.id ?? null}
        banDau={phieuChiTiet}
        onDong={() => setPhieuChiTiet(null)}
        onThayDoi={(o) => {
          setDs((cu) => cu.map((x) => (x.id === o.id ? o : x)));
          setPhieuChiTiet(o);
        }}
      />
    </div>
  );
}
