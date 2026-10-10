"use client";

import { useEffect, useState } from "react";
import type { BaoCao } from "@/lib/client";
import { homNay } from "@/lib/format";
import {
  DS_BAT_TAT_THIEU,
  DS_KIEU_IN,
  DS_NHAN_THIEU,
  MAU_IN_THIEU_MAC_DINH,
  chuanHoaMauInThieu,
} from "@/lib/mau-in";
import { useStore } from "@/lib/store";
import type { HienThieu, KieuInThieu, MauInThieu, NhanThieu } from "@/lib/types";
import { PhieuThieu } from "./in-thieu";
import { bao, baoLoi, BieuTuong, Nut, ONhan, OText, The } from "./ui";

/** Dữ liệu giả để xem trước mẫu in hàng thiếu. */
const BAOCAO_MAU: BaoCao = {
  tongQuan: {
    doanhThu: 0,
    soPhieu: 3,
    soMatHang: 2,
    soLuongHang: 0,
    soCanPham: 3,
    soPhieuThieu: 3,
    tongLuongThieu: 12,
    coDungTien: false,
  },
  theoNgay: [],
  theoHang: [],
  theoCanPham: [],
  hangThieu: [],
  thieuTheoPhieu: [
    { buongGiam: "B01", soPhieu: "PB-2026-0001", ngay: homNay(), hoTen: "Nguyễn Văn A", ma: "MI-001", ten: "Mì tôm Hảo Hảo", donViTinh: "gói", conThieu: 3, ghiChu: "Nhận buổi chiều" },
    { buongGiam: "B01", soPhieu: "PB-2026-0001", ngay: homNay(), hoTen: "Nguyễn Văn A", ma: "NU-001", ten: "Nước ngọt Coca 330ml", donViTinh: "lon", conThieu: 2, ghiChu: "" },
    { buongGiam: "B01", soPhieu: "PB-2026-0005", ngay: homNay(), hoTen: "Trần Văn B", ma: "MI-001", ten: "Mì tôm Hảo Hảo", donViTinh: "gói", conThieu: 4, ghiChu: "" },
    { buongGiam: "B03", soPhieu: "PB-2026-0009", ngay: homNay(), hoTen: "Lê Văn C", ma: "MI-001", ten: "Mì tôm Hảo Hảo", donViTinh: "gói", conThieu: 3, ghiChu: "" },
  ],
};

export function ManMauInThieu() {
  const { settings, capNhatSettings, coQuyen } = useStore();
  const duocSua = coQuyen("sua_cai_dat");

  const [mau, setMau] = useState<MauInThieu>(settings.mauInThieu);
  const [dangLuu, setDangLuu] = useState(false);
  const [xemTruoc, setXemTruoc] = useState(false);

  useEffect(() => {
    setMau(settings.mauInThieu);
  }, [settings.mauInThieu]);

  const doiNhan = (khoa: keyof NhanThieu, giaTri: string) =>
    setMau((m) => ({ ...m, nhan: { ...m.nhan, [khoa]: giaTri } }));
  const doiBat = (khoa: keyof HienThieu, giaTri: boolean) =>
    setMau((m) => ({ ...m, hien: { ...m.hien, [khoa]: giaTri } }));
  const doiChuKy = (i: number, phan: Partial<{ nhan: string; ghiChu: string }>) =>
    setMau((m) => ({ ...m, chuKy: m.chuKy.map((c, idx) => (idx === i ? { ...c, ...phan } : c)) }));

  const luu = async () => {
    setDangLuu(true);
    try {
      await capNhatSettings({ mauInThieu: chuanHoaMauInThieu(mau) });
      bao("Đã lưu mẫu phiếu trả đồ thiếu");
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  };

  const khoiPhuc = () => {
    if (!window.confirm("Khôi phục mẫu phiếu trả đồ thiếu về mặc định?")) return;
    setMau(MAU_IN_THIEU_MAC_DINH);
  };

  const kieuDangChon = DS_KIEU_IN.find((k) => k.khoa === mau.kieuIn);

  return (
    <The
      tieuDe="Mẫu phiếu trả đồ thiếu"
      phuDe="Bản in danh sách hàng còn thiếu để đi phát cho can phạm"
      hanhDong={
        <>
          <Nut co="sm" onClick={() => setXemTruoc(true)}>
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
        <div className="flex flex-col gap-4">
          <div>
            <ONhan>Tiêu đề</ONhan>
            <OText
              value={mau.tieuDe}
              onChange={(e) => setMau({ ...mau, tieuDe: e.target.value })}
              disabled={!duocSua}
              placeholder="Danh sách hàng còn thiếu"
            />
          </div>

          <div>
            <ONhan>Kiểu sắp mặc định khi bấm in</ONhan>
            <select
              value={mau.kieuIn}
              disabled={!duocSua}
              onChange={(e) => setMau({ ...mau, kieuIn: e.target.value as KieuInThieu })}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              {DS_KIEU_IN.map((k) => (
                <option key={k.khoa} value={k.khoa}>
                  {k.nhan}
                </option>
              ))}
            </select>
            {kieuDangChon && <p className="mt-1 text-[11px] text-slate-500">{kieuDangChon.moTa}</p>}
          </div>

          <div>
            <div className="mb-1.5 text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
              Hiện trên bản in
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {DS_BAT_TAT_THIEU.map((muc) => (
                <label
                  key={muc.khoa}
                  className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-blue-700"
                    checked={mau.hien[muc.khoa]}
                    disabled={!duocSua}
                    onChange={(e) => doiBat(muc.khoa, e.target.checked)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-slate-800">{muc.nhan}</span>
                    {muc.moTa && <span className="block text-[11px] text-slate-500">{muc.moTa}</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
              Chữ hiện trên bản in
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {DS_NHAN_THIEU.map((n) => (
                <div key={n.khoa}>
                  <label className="mb-0.5 block text-[11px] text-slate-500">{n.nhan}</label>
                  <OText value={mau.nhan[n.khoa]} onChange={(e) => doiNhan(n.khoa, e.target.value)} disabled={!duocSua} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
                Chữ ký cuối bản in
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
                    <OText value={c.nhan} onChange={(e) => doiChuKy(i, { nhan: e.target.value })} disabled={!duocSua} />
                  </div>
                  <div className="flex-1">
                    <label className="mb-0.5 block text-[11px] text-slate-500">Dòng phụ</label>
                    <OText value={c.ghiChu} onChange={(e) => doiChuKy(i, { ghiChu: e.target.value })} disabled={!duocSua} />
                  </div>
                  <Nut
                    kieu="mo"
                    co="sm"
                    onClick={() => setMau((m) => ({ ...m, chuKy: m.chuKy.filter((_, idx) => idx !== i) }))}
                    disabled={!duocSua || mau.chuKy.length <= 0}
                    title="Bỏ ô chữ ký này"
                    className="hover:text-rose-600"
                  >
                    <BieuTuong ten="xoa" className="h-4 w-4" />
                  </Nut>
                </div>
              ))}
              <div>
                <Nut
                  co="sm"
                  onClick={() =>
                    setMau((m) => ({ ...m, chuKy: [...m.chuKy, { nhan: "Người ký", ghiChu: "(Ký, ghi rõ họ tên)" }] }))
                  }
                  disabled={!duocSua || mau.chuKy.length >= 6}
                >
                  <BieuTuong ten="them" className="h-4 w-4" /> Thêm chữ ký
                </Nut>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-1.5 text-[12px] font-semibold tracking-wide text-slate-500 uppercase">Xem trước</div>
          <div className="mem-cuon max-h-[36rem] overflow-auto rounded-md border border-slate-300 bg-white p-3 shadow-inner">
            <div style={{ transform: "scale(0.55)", transformOrigin: "top left", width: "182%" }}>
              <PhieuThieu du={BAOCAO_MAU} settings={settings} tu={homNay()} den={homNay()} mau={mau} />
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">Bản in khổ A4. Bấm “Xem trước” để xem đúng cỡ.</p>
        </div>
      </div>

      {xemTruoc && (
        <div className="khong-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 pt-10">
          <div className="w-full max-w-4xl rounded-lg border border-slate-200 bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800">Xem trước phiếu trả đồ thiếu</h3>
              <Nut co="sm" onClick={() => setXemTruoc(false)}>
                Đóng
              </Nut>
            </header>
            <div className="mem-cuon max-h-[76vh] overflow-auto p-6">
              <PhieuThieu du={BAOCAO_MAU} settings={settings} tu={homNay()} den={homNay()} mau={mau} />
            </div>
          </div>
        </div>
      )}
    </The>
  );
}
