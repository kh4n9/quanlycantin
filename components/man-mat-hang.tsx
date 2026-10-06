"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/client";
import { taiExcel } from "@/lib/excel";
import { khop, so } from "@/lib/format";
import type { Product } from "@/lib/types";
import { bao, baoLoi, BieuTuong, HopThoai, Nut, OChon, ONhan, OText, Trong } from "./ui";

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

export function ManMatHang() {
  const [products, setProducts] = useState<Product[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [q, setQ] = useState("");
  const [nhom, setNhom] = useState("");
  const [trangThai, setTrangThai] = useState<"tat_ca" | "dang_ban" | "tam_dung">("tat_ca");
  const [form, setForm] = useState<FormHang | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [dangDoi, setDangDoi] = useState<string | null>(null);

  const napLai = useCallback(async () => {
    try {
      setProducts((await apiClient.products()).products);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    void napLai();
  }, [napLai]);

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

  const xuatExcel = () => {
    void taiExcel("danh-muc-mat-hang", {
      ten: "Mặt hàng",
      tieuDeCot: ["Mã", "Tên mặt hàng", "Nhóm hàng", "ĐVT", "Giá bán", "Trạng thái", "Ghi chú"],
      dong: danhSach.map((p) => [
        p.ma,
        p.ten,
        p.nhom,
        p.donViTinh,
        p.giaBan,
        p.dangDung ? "Đang bán" : "Tạm dừng bán",
        p.ghiChu,
      ]),
      cotTien: [4],
      doRong: [14, 32, 16, 10, 14, 16, 26],
    }).catch((e) => baoLoi((e as Error).message));
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-3 py-2.5">
        <div className="relative min-w-64 flex-1">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400">
            <BieuTuong ten="tim" className="h-4 w-4" />
          </span>
          <OText
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã hoặc tên mặt hàng…"
            className="pl-8"
          />
        </div>
        <OChon value={nhom} onChange={(e) => setNhom(e.target.value)} className="w-44">
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
          className="w-40"
        >
          <option value="tat_ca">Tất cả trạng thái</option>
          <option value="dang_ban">Đang bán</option>
          <option value="tam_dung">Tạm dừng bán{soTamDung ? ` (${soTamDung})` : ""}</option>
        </OChon>
        <Nut onClick={xuatExcel} disabled={danhSach.length === 0}>
          <BieuTuong ten="tai" /> Excel
        </Nut>
        <Nut kieu="chinh" onClick={() => setForm({ ...formTrong })}>
          <BieuTuong ten="them" /> Thêm mặt hàng
        </Nut>
      </div>

      <div className="mem-cuon max-h-[66vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[12px] text-slate-600">
            <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
              <th className="w-28">Mã</th>
              <th>Tên mặt hàng</th>
              <th className="w-28">Nhóm</th>
              <th className="w-20">ĐVT</th>
              <th className="w-28 text-right">Giá bán</th>
              <th className="w-32">Trạng thái</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody>
            {danhSach.length === 0 && (
              <tr>
                <td colSpan={7}>
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
            {danhSach.map((p) => (
              <tr
                key={p.id}
                className={`[&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-2 hover:bg-slate-50/70 ${
                  !p.dangDung ? "opacity-50" : ""
                }`}
              >
                <td className="font-mono text-[12px] text-slate-500">{p.ma}</td>
                <td>
                  <div className="font-medium text-slate-800">{p.ten}</div>
                  {p.ghiChu && <div className="text-[11px] text-slate-400">{p.ghiChu}</div>}
                </td>
                <td className="text-slate-600">{p.nhom}</td>
                <td className="text-slate-600">{p.donViTinh}</td>
                <td className="text-right font-medium text-slate-700">{p.giaBan > 0 ? so(p.giaBan) : "—"}</td>
                <td>
                  <button
                    onClick={() => void doiTrangThai(p)}
                    disabled={dangDoi === p.id}
                    title={p.dangDung ? "Bấm để tạm dừng bán" : "Bấm để mở bán lại"}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition disabled:opacity-50 ${
                      p.dangDung
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${p.dangDung ? "bg-emerald-500" : "bg-slate-400"}`}
                    />
                    {dangDoi === p.id ? "Đang lưu…" : p.dangDung ? "Đang bán" : "Tạm dừng"}
                  </button>
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <Nut
                      kieu="mo"
                      co="sm"
                      title="Sửa"
                      onClick={() =>
                        setForm({
                          id: p.id,
                          ma: p.ma,
                          ten: p.ten,
                          nhom: p.nhom,
                          donViTinh: p.donViTinh,
                          giaBan: String(p.giaBan),
                          ghiChu: p.ghiChu,
                        })
                      }
                    >
                      <BieuTuong ten="sua" className="h-4 w-4" />
                    </Nut>
                    <Nut kieu="mo" co="sm" onClick={() => void xoa(p)} title="Xoá" className="hover:text-rose-600">
                      <BieuTuong ten="xoa" className="h-4 w-4" />
                    </Nut>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
