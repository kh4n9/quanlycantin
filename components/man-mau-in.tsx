"use client";

import { useEffect, useState } from "react";
import { homNay } from "@/lib/format";
import { DS_BAT_TAT, DS_NHAN, MAU_IN_MAC_DINH, chuanHoaMauIn } from "@/lib/mau-in";
import { useStore } from "@/lib/store";
import type { MauInPhieu, NhanPhieu, Order } from "@/lib/types";
import { MauPhieuBan } from "./print";
import { bao, baoLoi, BieuTuong, Nut, ONhan, OText, The, Trong } from "./ui";

/** Phiếu giả để xem trước mẫu in. */
const DON_MAU: Order = {
  id: "xem-truoc",
  soPhieu: "PB-2026-0001",
  ngay: homNay(),
  hoTen: "Nguyễn Văn A",
  namSinh: 1985,
  buongGiam: "Buồng 1",
  items: [
    { productId: "m1", ma: "MI-001", ten: "Mì tôm Hảo Hảo", donViTinh: "gói", soLuong: 5, donGia: 5000, thanhTien: 25000, thieu: 0, bu: [] },
    { productId: "m2", ma: "NU-001", ten: "Nước ngọt Coca 330ml", donViTinh: "lon", soLuong: 2, donGia: 10000, thanhTien: 20000, thieu: 0, bu: [] },
    { productId: "m3", ma: "VS-005", ten: "Giấy vệ sinh", donViTinh: "cuộn", soLuong: 3, donGia: 7000, thanhTien: 21000, thieu: 0, bu: [] },
  ],
  tongTien: 66000,
  ghiChu: "Mua đầu tháng",
  createdAt: "",
  kiemLuc: "",
  kiemBoi: "",
  kiemGhiChu: "",
  xoaLuc: "",
  xoaBoi: "",
  lyDoXoa: "",
};

export function ManMauIn() {
  const { settings, capNhatSettings, coQuyen } = useStore();
  const duocSua = coQuyen("sua_cai_dat");

  const [mau, setMau] = useState<MauInPhieu>(settings.mauIn);
  const [dangLuu, setDangLuu] = useState(false);
  const [moXemTruoc, setMoXemTruoc] = useState(false);

  useEffect(() => {
    setMau(settings.mauIn);
  }, [settings.mauIn]);

  const doiNhan = (khoa: keyof NhanPhieu, giaTri: string) =>
    setMau((m) => ({ ...m, nhan: { ...m.nhan, [khoa]: giaTri } }));

  const doiBat = (khoa: keyof MauInPhieu["hien"], giaTri: boolean) =>
    setMau((m) => ({ ...m, hien: { ...m.hien, [khoa]: giaTri } }));

  const doiChuKy = (i: number, phan: Partial<{ nhan: string; ghiChu: string }>) =>
    setMau((m) => ({ ...m, chuKy: m.chuKy.map((c, idx) => (idx === i ? { ...c, ...phan } : c)) }));

  const themChuKy = () =>
    setMau((m) => ({ ...m, chuKy: [...m.chuKy, { nhan: "Người ký", ghiChu: "(Ký, ghi rõ họ tên)" }] }));

  const boChuKy = (i: number) => setMau((m) => ({ ...m, chuKy: m.chuKy.filter((_, idx) => idx !== i) }));

  const luu = async () => {
    setDangLuu(true);
    try {
      await capNhatSettings({ mauIn: chuanHoaMauIn(mau) });
      bao("Đã lưu mẫu phiếu in");
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  };

  const khoiPhuc = () => {
    if (!window.confirm("Khôi phục mẫu phiếu in về mặc định ban đầu?")) return;
    setMau(MAU_IN_MAC_DINH);
  };

  const coTien = mau.hien.cotThanhTien;
  const matTien = !mau.hien.cotDonGia && !mau.hien.cotThanhTien;

  return (
    <The
      tieuDe="Mẫu phiếu in"
      phuDe="Bật/tắt và sửa chữ hiện trên phiếu bán in ra"
      hanhDong={
        <>
          <Nut co="sm" onClick={() => setMoXemTruoc(true)}>
            <BieuTuong ten="in" className="h-4 w-4" /> Xem trước
          </Nut>
          <Nut co="sm" onClick={khoiPhuc} disabled={!duocSua}>
            Khôi phục mặc định
          </Nut>
          <Nut kieu="chinh" co="sm" onClick={() => void luu()} disabled={dangLuu || !duocSua}>
            {dangLuu ? "Đang lưu…" : "Lưu mẫu in"}
          </Nut>
        </>
      }
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_20rem]">
        {/* ------------------------------ Điều khiển ------------------------------ */}
        <div className="flex flex-col gap-4">
          <div>
            <ONhan>Tiêu đề phiếu</ONhan>
            <OText
              value={mau.tieuDe}
              onChange={(e) => setMau({ ...mau, tieuDe: e.target.value })}
              disabled={!duocSua}
              placeholder="Phiếu bán hàng"
            />
          </div>

          <div>
            <div className="mb-1.5 text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
              Hiện trên phiếu
            </div>
            {matTien && (
              <div className="mb-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] text-blue-800">
                Đang tắt cả đơn giá lẫn thành tiền — phiếu in ra chỉ còn mặt hàng và số lượng.
              </div>
            )}
            <div className="grid gap-1.5 sm:grid-cols-2">
              {DS_BAT_TAT.map((muc) => {
                // Bằng chữ và cột thành tiền phụ thuộc nhau, khoá lại cho khỏi vô nghĩa
                const khoaPhuThuoc = muc.khoa === "bangChu" && !coTien;
                return (
                  <label
                    key={muc.khoa}
                    className={`flex items-start gap-2 rounded px-1 py-1 ${
                      khoaPhuThuoc ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-blue-700"
                      checked={mau.hien[muc.khoa]}
                      disabled={!duocSua || khoaPhuThuoc}
                      onChange={(e) => doiBat(muc.khoa, e.target.checked)}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-slate-800">{muc.nhan}</span>
                      {muc.moTa && <span className="block text-[11px] text-slate-500">{muc.moTa}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
              Chữ hiện trên phiếu
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {DS_NHAN.map((n) => (
                <div key={n.khoa}>
                  <label className="mb-0.5 block text-[11px] text-slate-500">{n.nhan}</label>
                  <OText
                    value={mau.nhan[n.khoa]}
                    onChange={(e) => doiNhan(n.khoa, e.target.value)}
                    disabled={!duocSua}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
                Chữ ký cuối phiếu
              </span>
              <div className="flex items-center gap-2">
                <label className="text-[12px] text-slate-600">Số chữ ký mỗi hàng</label>
                <select
                  value={mau.soCotChuKy}
                  disabled={!duocSua}
                  onChange={(e) => setMau({ ...mau, soCotChuKy: Number(e.target.value) })}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {mau.chuKy.map((c, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-0.5 block text-[11px] text-slate-500">Tên ô chữ ký {i + 1}</label>
                    <OText
                      value={c.nhan}
                      onChange={(e) => doiChuKy(i, { nhan: e.target.value })}
                      disabled={!duocSua}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-0.5 block text-[11px] text-slate-500">Dòng phụ dưới chữ ký</label>
                    <OText
                      value={c.ghiChu}
                      onChange={(e) => doiChuKy(i, { ghiChu: e.target.value })}
                      disabled={!duocSua}
                    />
                  </div>
                  <Nut
                    kieu="mo"
                    co="sm"
                    onClick={() => boChuKy(i)}
                    disabled={!duocSua || mau.chuKy.length <= 1}
                    title="Bỏ ô chữ ký này"
                    className="hover:text-rose-600"
                  >
                    <BieuTuong ten="xoa" className="h-4 w-4" />
                  </Nut>
                </div>
              ))}
              <div>
                <Nut co="sm" onClick={themChuKy} disabled={!duocSua || mau.chuKy.length >= 8}>
                  <BieuTuong ten="them" className="h-4 w-4" /> Thêm chữ ký
                </Nut>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------ Xem trước ------------------------------ */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-1.5 text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
            Xem trước
          </div>
          <div className="mem-cuon max-h-[38rem] overflow-auto rounded-md border border-slate-300 bg-white p-3 shadow-inner">
            <div style={{ transform: "scale(0.62)", transformOrigin: "top left", width: "161%" }}>
              <MauPhieuBan order={DON_MAU} settings={settings} mau={mau} />
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Phiếu mẫu in trên khổ A4. Bấm “Xem trước” để xem đúng cỡ thật.
          </p>
        </div>
      </div>

      {/* Xem trước đúng cỡ, in thử được luôn */}
      {moXemTruoc && (
        <div className="khong-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 pt-10">
          <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">Xem trước mẫu phiếu in</h3>
              <Nut co="sm" onClick={() => setMoXemTruoc(false)}>
                Đóng
              </Nut>
            </header>
            <div className="mem-cuon max-h-[75vh] overflow-auto p-6">
              {settings.tenDonVi ? (
                <MauPhieuBan order={DON_MAU} settings={settings} mau={mau} />
              ) : (
                <Trong
                  tieuDe="Chưa đặt tên đơn vị"
                  moTa="Vào thẻ “Thông tin đơn vị” để nhập tên đơn vị in ở đầu phiếu."
                />
              )}
            </div>
          </div>
        </div>
      )}
    </The>
  );
}
