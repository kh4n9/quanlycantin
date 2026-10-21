"use client";

import { useCallback, useMemo, useState } from "react";
import { apiClient } from "@/lib/client";
import { taiExcel } from "@/lib/excel";
import { khop, so } from "@/lib/format";
import type { Product } from "@/lib/types";
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
  const [chiTiet, setChiTiet] = useState<Product | null>(null);
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

  useNap(napLai);

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
    <div className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
      <div className="flex flex-wrap items-center gap-2 border-b border-dashed border-ke bg-giay px-3.5 py-3">
        <div className="relative min-w-64 flex-1">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muc-mo">
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
            {danhSach.map((p) => (
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
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] tracking-[0.01em] text-muc-mo">
                  <span>{p.nhom}</span>
                  <span>ĐVT {p.donViTinh}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-ke/60 pt-2">
                  {nutTrangThai(p)}
                  {thaoTacHang(p)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mem-cuon hidden max-h-[66vh] overflow-auto sm:block">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
            <tr className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
              <th className="w-24">Mã</th>
              <th>Tên mặt hàng</th>
              <th className="w-32">Nhóm</th>
              <th className="w-16">ĐVT</th>
              <th className="w-28 text-right">Giá bán</th>
              <th className="w-32">Trạng thái</th>
              <th className="w-24" />
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
                <td>{nutTrangThai(p)}</td>
                <td>{thaoTacHang(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
