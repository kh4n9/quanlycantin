"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/client";
import { taiExcel } from "@/lib/excel";
import { homNay, khop, ngayVN, so, tien } from "@/lib/format";
import { useQuyen } from "@/lib/store";
import type { Order, Product } from "@/lib/types";
import { useNap } from "@/lib/use-nap";
import { bao, baoLoi, BieuTuong, HopThoai, Nhan, Nut, OChon, ONhan, OText, Trong } from "./ui";

const NHOM_GOI_Y = [
  "Thực phẩm",
  "Đồ uống",
  "Bánh kẹo",
  "Sữa",
  "Gia vị",
  "Thuốc lá",
  "Đồ dùng",
  "May mặc",
  "Y tế",
  "Khác",
];

/** Ngày đầu tháng hiện tại, dạng YYYY-MM-DD. */
function dauThang(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`;
}

type FormHang = {
  id?: string;
  ma: string;
  ten: string;
  nhom: string;
  donViTinh: string;
  giaBan: string;
  ghiChu: string;
};

const formTrong: FormHang = { ma: "", ten: "", nhom: "Thực phẩm", donViTinh: "cái", giaBan: "", ghiChu: "" };

/** Số đã bán của một mặt hàng trong khoảng ngày đang chọn. */
type BanCuaHang = {
  soLuong: number;
  doanhThu: number;
  /** Các phiếu có mặt hàng này, để đếm số phiếu mà không cộng trùng. */
  phieu: Set<string>;
};

export function ManMatHang() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [chiTiet, setChiTiet] = useState<Product | null>(null);
  const [q, setQ] = useState("");
  const [nhom, setNhom] = useState("");
  const [trangThai, setTrangThai] = useState<"tat_ca" | "dang_ban" | "tam_dung">("tat_ca");
  const [form, setForm] = useState<FormHang | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [dangDoi, setDangDoi] = useState<string | null>(null);

  const xemDuocPhieu = useQuyen()("xem_phieu");

  // Khoảng ngày dùng cho số liệu bán, mặc định là tháng này cho dễ nhìn.
  const [tu, setTu] = useState(dauThang);
  const [den, setDen] = useState(homNay);
  const [donHang, setDonHang] = useState<Order[]>([]);
  const [dangTaiDon, setDangTaiDon] = useState(xemDuocPhieu);
  const [loiDon, setLoiDon] = useState("");

  const napLai = useCallback(async () => {
    try {
      setProducts((await apiClient.products()).products);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangTai(false);
    }
  }, []);

  useNap(napLai);

  // Số liệu bán lấy từ phiếu trong khoảng ngày đang chọn. Tài khoản không có
  // quyền xem phiếu thì bỏ qua, để trang mặt hàng vẫn dùng được bình thường.
  useEffect(() => {
    if (!xemDuocPhieu) return;
    let huy = false;
    (async () => {
      setDangTaiDon(true);
      try {
        const thamSo = new URLSearchParams();
        if (tu) thamSo.set("tu", tu);
        if (den) thamSo.set("den", den);
        const kq = await apiClient.orders(thamSo.toString());
        if (huy) return;
        setDonHang(kq.orders);
        setLoiDon("");
      } catch (e) {
        if (huy) return;
        setDonHang([]);
        setLoiDon((e as Error).message);
      } finally {
        if (!huy) setDangTaiDon(false);
      }
    })();
    return () => {
      huy = true;
    };
  }, [tu, den, xemDuocPhieu]);

  const dsNhom = useMemo(
    () => [...new Set(products.map((p) => p.nhom).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")),
    [products],
  );

  const danhSach = useMemo(() => {
    let ds = products;
    if (q) ds = ds.filter((p) => khop(p.ma, q) || khop(p.ten, q));
    if (nhom) ds = ds.filter((p) => p.nhom === nhom);
    if (trangThai === "dang_ban") ds = ds.filter((p) => p.dangDung);
    if (trangThai === "tam_dung") ds = ds.filter((p) => !p.dangDung);
    return ds;
  }, [products, q, nhom, trangThai]);

  const soTamDung = useMemo(() => products.filter((p) => !p.dangDung).length, [products]);

  /** Cộng dồn số lượng và doanh thu theo từng mặt hàng. */
  const banTheoHang = useMemo(() => {
    const m = new Map<string, BanCuaHang>();
    for (const o of donHang) {
      for (const it of o.items) {
        const cu = m.get(it.productId) ?? { soLuong: 0, doanhThu: 0, phieu: new Set<string>() };
        cu.soLuong += it.soLuong;
        cu.doanhThu += it.thanhTien;
        cu.phieu.add(o.id);
        m.set(it.productId, cu);
      }
    }
    return m;
  }, [donHang]);

  /** Kho ứng dụng có dùng đến tiền hay chỉ quản lý số lượng. */
  const coDungTien = useMemo(
    () => products.some((p) => p.giaBan > 0) || donHang.some((o) => o.tongTien > 0),
    [products, donHang],
  );

  /** Tổng của đúng những mặt hàng đang hiện trong danh sách, theo khoảng ngày. */
  const tongDangXem = useMemo(() => {
    let soLuong = 0;
    let doanhThu = 0;
    let soHang = 0;
    const phieu = new Set<string>();
    for (const p of danhSach) {
      const ban = banTheoHang.get(p.id);
      if (!ban) continue;
      soHang += 1;
      soLuong += ban.soLuong;
      doanhThu += ban.doanhThu;
      for (const id of ban.phieu) phieu.add(id);
    }
    return { soLuong, doanhThu, soHang, soPhieu: phieu.size };
  }, [danhSach, banTheoHang]);

  const banCuaChiTiet = chiTiet ? banTheoHang.get(chiTiet.id) : undefined;

  const homNayStr = homNay();
  const dauThangStr = dauThang();
  const khoangNhan = tu && den ? `${ngayVN(tu)} – ${ngayVN(den)}` : tu ? `từ ${ngayVN(tu)}` : "tất cả các ngày";
  const preset = !tu && !den ? "tat_ca" : tu === homNayStr && den === homNayStr ? "hom_nay" : tu === dauThangStr && den === homNayStr ? "thang_nay" : "";

  // Trong lúc tải lần đầu, hiện dấu … thay cho số 0 để khỏi gây hiểu nhầm.
  const choSoLieu = dangTaiDon && donHang.length === 0;

  /** Bật / tạm dừng bán một mặt hàng. */
  const doiTrangThai = async (p: Product) => {
    setDangDoi(p.id);
    try {
      const kq = await apiClient.suaHang(p.id, { dangDung: !p.dangDung });
      bao(
        kq.product.dangDung
          ? `Đã mở bán lại “${kq.product.ten}”`
          : `Đã tạm dừng bán “${kq.product.ten}”`,
      );
      await napLai();
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangDoi(null);
    }
  };

  const luu = async () => {
    if (!form) return;
    if (!form.ten.trim()) {
      baoLoi("Chưa nhập tên mặt hàng");
      return;
    }
    setDangLuu(true);
    try {
      const duLieu = {
        ma: form.ma.trim(),
        ten: form.ten.trim(),
        nhom: form.nhom.trim() || "Khác",
        donViTinh: form.donViTinh.trim() || "cái",
        giaBan: Number(form.giaBan) || 0,
        ghiChu: form.ghiChu,
      };
      if (form.id) {
        await apiClient.suaHang(form.id, duLieu);
        bao(`Đã cập nhật “${duLieu.ten}”`);
      } else {
        await apiClient.themHang(duLieu);
        bao(`Đã thêm mặt hàng “${duLieu.ten}”`);
      }
      setForm(null);
      await napLai();
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  };

  const xoa = async (p: Product) => {
    if (!window.confirm(`Xoá mặt hàng “${p.ten}”?`)) return;
    try {
      const kq = await apiClient.xoaHang(p.id);
      bao(kq.daAn ? `“${kq.ten}” đã lên phiếu bán nên được chuyển sang ngừng dùng` : `Đã xoá “${kq.ten}”`);
      await napLai();
    } catch (e) {
      baoLoi((e as Error).message);
    }
  };

  /** Nút bật/tạm dừng bán dùng chung cho bảng và thẻ trên điện thoại */
  const nutTrangThai = (p: Product) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        void doiTrangThai(p);
      }}
      disabled={dangDoi === p.id}
      title={p.dangDung ? "Bấm để tạm dừng bán" : "Bấm để mở bán lại"}
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.03em] uppercase transition disabled:opacity-50 ${
        p.dangDung
          ? "border-ngoc/30 bg-ngoc-nhat text-ngoc hover:bg-ngoc-nhat/70"
          : "border-ke-dam bg-giay text-muc-mo hover:bg-ke/40"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${p.dangDung ? "bg-ngoc" : "bg-ke-dam"}`} />
      {dangDoi === p.id ? "Đang lưu…" : p.dangDung ? "Đang bán" : "Tạm dừng"}
    </button>
  );

  const moSua = (p: Product) => {
    setChiTiet(null);
    setForm({
      id: p.id,
      ma: p.ma,
      ten: p.ten,
      nhom: p.nhom,
      donViTinh: p.donViTinh,
      giaBan: String(p.giaBan),
      ghiChu: p.ghiChu,
    });
  };

  const thaoTacHang = (p: Product) => (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      <Nut kieu="mo" co="sm" title="Sửa" onClick={() => moSua(p)}>
        <BieuTuong ten="sua" className="h-4 w-4" />
      </Nut>
      <Nut kieu="mo" co="sm" onClick={() => void xoa(p)} title="Xoá" className="hover:text-dau">
        <BieuTuong ten="xoa" className="h-4 w-4" />
      </Nut>
    </div>
  );

  const xuatExcel = () => {
    const tieuDeCot = ["Mã", "Tên mặt hàng", "Nhóm hàng", "ĐVT", "Giá bán"];
    if (xemDuocPhieu) {
      tieuDeCot.push("Đã bán");
      if (coDungTien) tieuDeCot.push("Doanh thu");
    }
    tieuDeCot.push("Trạng thái", "Ghi chú");

    const dong = danhSach.map((p) => {
      const ban = banTheoHang.get(p.id);
      const r: (string | number)[] = [p.ma, p.ten, p.nhom, p.donViTinh, p.giaBan];
      if (xemDuocPhieu) {
        r.push(ban?.soLuong ?? 0);
        if (coDungTien) r.push(ban?.doanhThu ?? 0);
      }
      r.push(p.dangDung ? "Đang bán" : "Tạm dừng bán", p.ghiChu);
      return r;
    });

    const cotTien = [4];
    if (xemDuocPhieu && coDungTien) cotTien.push(6);

    const doRong = [14, 32, 16, 10, 14];
    if (xemDuocPhieu) {
      doRong.push(12);
      if (coDungTien) doRong.push(16);
    }
    doRong.push(16, 26);

    void taiExcel("danh-muc-mat-hang", {
      ten: "Mặt hàng",
      tieuDeCot,
      dong,
      cotTien,
      doRong,
    }).catch((e) => baoLoi((e as Error).message));
  };

  const soCot = 7 + (xemDuocPhieu ? 1 : 0) + (xemDuocPhieu && coDungTien ? 1 : 0);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
        <div className="border-b border-dashed border-ke bg-giay px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-serif text-[15px] leading-tight font-semibold tracking-[-0.01em] text-muc">
                Danh mục mặt hàng
              </div>
              <div className="mt-0.5 text-[11.5px] text-muc-nhat">
                Bấm vào một dòng để xem chi tiết{xemDuocPhieu ? " và số lượng đã bán" : ""}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Nut onClick={xuatExcel} disabled={danhSach.length === 0}>
                <BieuTuong ten="tai" /> Excel
              </Nut>
              <Nut kieu="chinh" onClick={() => setForm({ ...formTrong })}>
                <BieuTuong ten="them" /> Thêm mặt hàng
              </Nut>
            </div>
          </div>

          {xemDuocPhieu && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="nhan-muc w-full sm:mr-1 sm:w-auto">Bán trong kỳ</span>
              <OText
                type="date"
                value={tu}
                onChange={(e) => setTu(e.target.value)}
                aria-label="Từ ngày"
                title="Từ ngày"
                className="w-36"
              />
              <span className="text-muc-mo">→</span>
              <OText
                type="date"
                value={den}
                onChange={(e) => setDen(e.target.value)}
                aria-label="Đến ngày"
                title="Đến ngày"
                className="w-36"
              />
              <Nut
                co="sm"
                kieu={preset === "hom_nay" ? "phu" : "mo"}
                onClick={() => {
                  setTu(homNayStr);
                  setDen(homNayStr);
                }}
              >
                Hôm nay
              </Nut>
              <Nut
                co="sm"
                kieu={preset === "thang_nay" ? "phu" : "mo"}
                onClick={() => {
                  setTu(dauThangStr);
                  setDen(homNayStr);
                }}
              >
                Tháng này
              </Nut>
              <Nut
                co="sm"
                kieu={preset === "tat_ca" ? "phu" : "mo"}
                onClick={() => {
                  setTu("");
                  setDen("");
                }}
              >
                Tất cả
              </Nut>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <div className="relative min-w-64 flex-1">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muc-mo">
                <BieuTuong ten="tim" className="h-4 w-4" />
              </span>
              <OText
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo mã hoặc tên mặt hàng…"
                aria-label="Tìm mặt hàng"
                className="pl-8"
              />
            </div>
            <OChon
              value={nhom}
              onChange={(e) => setNhom(e.target.value)}
              aria-label="Lọc theo nhóm hàng"
              className="w-44"
            >
              <option value="">Tất cả nhóm hàng</option>
              {dsNhom.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </OChon>
            <OChon
              value={trangThai}
              onChange={(e) => setTrangThai(e.target.value as typeof trangThai)}
              aria-label="Lọc theo trạng thái"
              className="w-40"
            >
              <option value="tat_ca">Tất cả trạng thái</option>
              <option value="dang_ban">Đang bán</option>
              <option value="tam_dung">Tạm dừng bán{soTamDung ? ` (${soTamDung})` : ""}</option>
            </OChon>
          </div>

          <div className="-mx-3.5 mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ke/60 px-3.5 pt-2 font-mono text-[9.5px] tracking-[0.03em] text-muc-mo uppercase">
            <span>
              Đang xem {so(danhSach.length)} / {so(products.length)} mặt hàng
            </span>
            {xemDuocPhieu && <span className="normal-case">Bán trong kỳ: {khoangNhan}</span>}
            {dangTai && <span className="font-semibold text-muc">Đang tải danh mục…</span>}
            {xemDuocPhieu && dangTaiDon && <span className="font-semibold text-muc">Đang tải số liệu bán…</span>}
            {xemDuocPhieu && tu && den && tu > den && (
              <span className="normal-case text-dau">Khoảng ngày đang ngược (từ sau đến)</span>
            )}
            {!xemDuocPhieu && (
              <span className="normal-case">Cần quyền xem phiếu bán để hiện số đã bán</span>
            )}
            {loiDon && <span className="normal-case text-dau">Lỗi số liệu bán: {loiDon}</span>}
          </div>
        </div>
      </section>

      {xemDuocPhieu && (
        <section className={`grid grid-cols-2 gap-2.5 ${coDungTien ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
          <TheSo
            nhan="Lượng hàng đã bán"
            giaTri={choSoLieu ? "…" : so(tongDangXem.soLuong)}
            icon="kho"
          />
          {coDungTien && (
            <TheSo nhan="Doanh thu" giaTri={choSoLieu ? "…" : tien(tongDangXem.doanhThu)} icon="bieu" />
          )}
          <TheSo
            nhan="Mặt hàng có bán"
            giaTri={choSoLieu ? "…" : `${so(tongDangXem.soHang)} / ${so(danhSach.length)}`}
            icon="check"
          />
          <TheSo nhan="Số phiếu" giaTri={choSoLieu ? "…" : so(tongDangXem.soPhieu)} icon="phieu" />
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
        {/* Trên điện thoại, danh mục dùng thẻ để không phải cuộn ngang */}
        <div className="sm:hidden">
          {danhSach.length === 0 ? (
            <Trong
              tieuDe={dangTai ? "Đang tải dữ liệu…" : "Chưa có mặt hàng nào"}
              moTa={dangTai ? undefined : "Thêm mặt hàng mới, hoặc nạp danh mục mẫu trong Cài đặt."}
              hanhDong={
                dangTai ? undefined : (
                  <Nut kieu="chinh" onClick={() => setForm({ ...formTrong })}>
                    Thêm mặt hàng
                  </Nut>
                )
              }
            />
          ) : (
            <div className="divide-y divide-ke/60">
              {danhSach.map((p) => {
                const ban = banTheoHang.get(p.id);
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setChiTiet(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setChiTiet(p);
                      }
                    }}
                    className={`cursor-pointer p-3 transition-colors hover:bg-giay/60 ${
                      !p.dangDung ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-muc">{p.ten}</div>
                        <div className="font-mono text-[10.5px] tracking-[0.01em] text-muc-mo">{p.ma}</div>
                      </div>
                      <div className="so shrink-0 text-right text-[14px] font-semibold text-muc">
                        {p.giaBan > 0 ? so(p.giaBan) : "—"}
                      </div>
                    </div>
                    {p.ghiChu && <div className="mt-0.5 text-[11px] text-muc-nhat">{p.ghiChu}</div>}
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-[10px] tracking-[0.01em] text-muc-mo">
                      <span>{p.nhom}</span>
                      <span>ĐVT {p.donViTinh}</span>
                    </div>
                    {xemDuocPhieu && (
                      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="nhan-muc">Đã bán</span>
                        <span className="so text-[12.5px] font-semibold text-muc">
                          {ban ? `${so(ban.soLuong)} ${p.donViTinh}` : "—"}
                        </span>
                        {coDungTien && ban && ban.doanhThu > 0 && (
                          <span className="so text-[11px] text-muc-nhat">· {tien(ban.doanhThu)}</span>
                        )}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2 border-t border-ke/60 pt-2">
                      {nutTrangThai(p)}
                      {thaoTacHang(p)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mem-cuon hidden max-h-[66vh] overflow-auto sm:block">
          <table
            className={`w-full ${coDungTien && xemDuocPhieu ? "min-w-[1000px]" : "min-w-[880px]"} table-fixed border-collapse text-sm`}
          >
            <thead className="sticky top-0 z-10 bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
              <tr className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
                <th className="w-24">Mã</th>
                <th>Tên mặt hàng</th>
                <th className="w-28">Nhóm</th>
                <th className="w-16">ĐVT</th>
                <th className="w-28 text-right">Giá bán</th>
                {xemDuocPhieu && (
                  <th
                    className="w-28 text-right"
                    title="Tổng số lượng bán trên các phiếu trong khoảng ngày đang chọn"
                  >
                    Đã bán
                  </th>
                )}
                {xemDuocPhieu && coDungTien && (
                  <th className="w-32 text-right" title="Doanh thu của mặt hàng trong khoảng ngày đang chọn">
                    Doanh thu
                  </th>
                )}
                <th className="w-32">Trạng thái</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {danhSach.length === 0 && (
                <tr>
                  <td colSpan={soCot}>
                    <Trong
                      tieuDe={dangTai ? "Đang tải dữ liệu…" : "Chưa có mặt hàng nào"}
                      moTa={dangTai ? undefined : "Thêm mặt hàng mới, hoặc nạp danh mục mẫu trong Cài đặt."}
                      hanhDong={
                        dangTai ? undefined : (
                          <Nut kieu="chinh" onClick={() => setForm({ ...formTrong })}>
                            Thêm mặt hàng
                          </Nut>
                        )
                      }
                    />
                  </td>
                </tr>
              )}
              {danhSach.map((p) => {
                const ban = banTheoHang.get(p.id);
                return (
                  <tr
                    key={p.id}
                    onClick={() => setChiTiet(p)}
                    className={`cursor-pointer [&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-2.5 transition-colors hover:bg-giay/60 ${
                      !p.dangDung ? "opacity-50" : ""
                    }`}
                  >
                    <td className="so text-[11.5px] text-muc-mo">{p.ma}</td>
                    <td>
                      <div className="font-semibold text-muc">{p.ten}</div>
                      {p.ghiChu && <div className="text-[11px] text-muc-mo">{p.ghiChu}</div>}
                    </td>
                    <td className="text-[13px] text-muc-nhat">{p.nhom}</td>
                    <td className="text-[13px] text-muc-nhat">{p.donViTinh}</td>
                    <td className="so text-right text-[13px] font-medium text-muc">
                      {p.giaBan > 0 ? so(p.giaBan) : "—"}
                    </td>
                    {xemDuocPhieu && (
                      <td className="so text-right text-[13px] font-medium">
                        {ban ? (
                          <span className="text-muc">
                            {so(ban.soLuong)}
                            <span className="ml-1 text-[10px] font-normal text-muc-mo">{p.donViTinh}</span>
                          </span>
                        ) : (
                          <span className="text-muc-mo">—</span>
                        )}
                      </td>
                    )}
                    {xemDuocPhieu && coDungTien && (
                      <td className="so text-right text-[13px] text-muc-nhat">
                        {ban && ban.doanhThu > 0 ? so(ban.doanhThu) : "—"}
                      </td>
                    )}
                    <td>{nutTrangThai(p)}</td>
                    <td>{thaoTacHang(p)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- Chi tiết mặt hàng --- */}
      <HopThoai
        mo={chiTiet !== null}
        dong={() => setChiTiet(null)}
        tieuDe="Chi tiết mặt hàng"
        rong="max-w-lg"
        chanTrang={
          <>
            <Nut onClick={() => setChiTiet(null)}>Đóng</Nut>
            {chiTiet && (
              <Nut kieu="chinh" onClick={() => moSua(chiTiet)}>
                <BieuTuong ten="sua" className="h-4 w-4" /> Sửa mặt hàng
              </Nut>
            )}
          </>
        }
      >
        {chiTiet && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-ke-dam bg-giay text-muc-nhat">
                  <BieuTuong ten="kho" />
                </span>
                <div className="min-w-0">
                  <div className="font-serif text-[16px] font-semibold tracking-[-0.01em] text-muc">{chiTiet.ten}</div>
                  <div className="so text-[10.5px] text-muc-mo">{chiTiet.ma}</div>
                </div>
              </div>
              <Nhan sac={chiTiet.dangDung ? "luc" : "xam"}>
                {chiTiet.dangDung ? "Đang bán" : "Tạm dừng bán"}
              </Nhan>
            </div>

            {xemDuocPhieu && (
              <div className="rounded-sm border border-ke bg-giay/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <div className="nhan-muc">Bán trong kỳ</div>
                  <div className="so text-[9.5px] tracking-[0.02em] text-muc-mo">{khoangNhan}</div>
                </div>
                <div
                  className={`mt-2 grid divide-x divide-ke/70 ${coDungTien ? "grid-cols-3" : "grid-cols-2"}`}
                >
                  <div className="pr-3">
                    <div className="so text-[16px] font-semibold text-muc">
                      {so(banCuaChiTiet?.soLuong ?? 0)}
                      <span className="ml-1 text-[10px] font-normal text-muc-mo">{chiTiet.donViTinh}</span>
                    </div>
                    <div className="text-[10.5px] text-muc-mo">đã bán</div>
                  </div>
                  {coDungTien && (
                    <div className="px-3">
                      <div className="so text-[16px] font-semibold text-muc">
                        {so(banCuaChiTiet?.doanhThu ?? 0)}
                      </div>
                      <div className="text-[10.5px] text-muc-mo">doanh thu (đ)</div>
                    </div>
                  )}
                  <div className="pl-3">
                    <div className="so text-[16px] font-semibold text-muc">{so(banCuaChiTiet?.phieu.size ?? 0)}</div>
                    <div className="text-[10.5px] text-muc-mo">số phiếu</div>
                  </div>
                </div>
                {!banCuaChiTiet && !dangTaiDon && (
                  <div className="mt-1.5 text-[11px] text-muc-mo">
                    Chưa bán mặt hàng này trong khoảng ngày đang chọn.
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 rounded-sm border border-ke bg-giay/60 p-3 text-[13px]">
              <div>
                <div className="nhan-muc">Nhóm hàng</div>
                <div className="mt-0.5 font-medium text-muc">{chiTiet.nhom || "Khác"}</div>
              </div>
              <div>
                <div className="nhan-muc">Đơn vị tính</div>
                <div className="mt-0.5 font-medium text-muc">{chiTiet.donViTinh}</div>
              </div>
              <div>
                <div className="nhan-muc">Giá bán</div>
                <div className="so mt-0.5 font-semibold text-muc">
                  {chiTiet.giaBan > 0 ? `${so(chiTiet.giaBan)} đ` : "Chưa đặt giá"}
                </div>
              </div>
              <div>
                <div className="nhan-muc">Ngày tạo</div>
                <div className="so mt-0.5 text-[11px] text-muc-nhat">
                  {chiTiet.createdAt ? new Date(chiTiet.createdAt).toLocaleString("vi-VN") : "—"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="nhan-muc">Ghi chú</div>
                <div className="mt-0.5 whitespace-pre-wrap text-muc-nhat">{chiTiet.ghiChu || "—"}</div>
              </div>
            </div>
          </div>
        )}
      </HopThoai>

      <HopThoai
        mo={form !== null}
        dong={() => setForm(null)}
        tieuDe={form?.id ? "Sửa mặt hàng" : "Thêm mặt hàng"}
        rong="max-w-xl"
        chanTrang={
          <>
            <Nut onClick={() => setForm(null)} disabled={dangLuu}>
              Huỷ
            </Nut>
            <Nut kieu="chinh" onClick={() => void luu()} disabled={dangLuu}>
              {dangLuu ? "Đang lưu…" : "Lưu mặt hàng"}
            </Nut>
          </>
        }
      >
        {form && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <ONhan>Tên mặt hàng *</ONhan>
              <OText
                autoFocus
                value={form.ten}
                onChange={(e) => setForm({ ...form, ten: e.target.value })}
                placeholder="Ví dụ: Mì tôm Hảo Hảo"
              />
            </div>
            <div>
              <ONhan>Nhóm hàng</ONhan>
              <input
                list="ds-nhom"
                value={form.nhom}
                onChange={(e) => setForm({ ...form, nhom: e.target.value })}
                className="w-full rounded-sm border border-ke-dam bg-white px-2.5 py-1.5 text-sm text-muc outline-none transition focus:border-muc"
              />
              <datalist id="ds-nhom">
                {[...new Set([...NHOM_GOI_Y, ...dsNhom])].map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
            <div>
              <ONhan>Đơn vị tính</ONhan>
              <OText
                value={form.donViTinh}
                onChange={(e) => setForm({ ...form, donViTinh: e.target.value })}
                placeholder="gói, chai, kg…"
              />
            </div>
            <div>
              <ONhan>Mã mặt hàng</ONhan>
              <OText
                value={form.ma}
                onChange={(e) => setForm({ ...form, ma: e.target.value })}
                placeholder="Để trống sẽ tự sinh theo tên"
              />
            </div>
            <div>
              <ONhan>Giá bán (đ)</ONhan>
              <OText
                type="number"
                value={form.giaBan}
                onChange={(e) => setForm({ ...form, giaBan: e.target.value })}
                placeholder="Để 0 nếu không dùng đến tiền"
              />
            </div>
            <div className="col-span-2">
              <ONhan>Ghi chú</ONhan>
              <OText
                value={form.ghiChu}
                onChange={(e) => setForm({ ...form, ghiChu: e.target.value })}
                placeholder="Không bắt buộc"
              />
            </div>
          </div>
        )}
      </HopThoai>
    </div>
  );
}

function TheSo({ nhan, giaTri, icon }: { nhan: string; giaTri: string; icon: string }) {
  return (
    <div className="rounded-lg border border-ke bg-giay-cao px-4 py-3 shadow-the">
      <div className="flex items-center justify-between gap-2">
        <div className="nhan-muc">{nhan}</div>
        <span className="flex h-7 w-7 items-center justify-center rounded-sm border border-ke bg-giay text-muc-mo">
          <BieuTuong ten={icon} className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="so mt-1.5 text-[19px] font-semibold tracking-tight text-muc">{giaTri}</div>
    </div>
  );
}
