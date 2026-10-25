"use client";

import { useState } from "react";
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
import { bao, baoLoi, BieuTuong, Nut, OChon, ONhan, OText, The } from "./ui";

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
  soSanh: null,
  theoNgay: [],
  theoHang: [],
  theoCanPham: [],
  hangThieu: [],
  thieuTheoPhieu: [
    { id: "mau-1", buongGiam: "B01", soPhieu: "PB-2026-0001", ngay: homNay(), hoTen: "Nguyễn Văn A", ma: "MI-001", ten: "Mì tôm Hảo Hảo", donViTinh: "gói", conThieu: 3, ghiChu: "Nhận buổi chiều" },
    { id: "mau-2", buongGiam: "B01", soPhieu: "PB-2026-0001", ngay: homNay(), hoTen: "Nguyễn Văn A", ma: "NU-001", ten: "Nước ngọt Coca 330ml", donViTinh: "lon", conThieu: 2, ghiChu: "" },
    { id: "mau-3", buongGiam: "B01", soPhieu: "PB-2026-0005", ngay: homNay(), hoTen: "Trần Văn B", ma: "MI-001", ten: "Mì tôm Hảo Hảo", donViTinh: "gói", conThieu: 4, ghiChu: "" },
    { id: "mau-4", buongGiam: "B03", soPhieu: "PB-2026-0009", ngay: homNay(), hoTen: "Lê Văn C", ma: "MI-001", ten: "Mì tôm Hảo Hảo", donViTinh: "gói", conThieu: 3, ghiChu: "" },
  ],
};

export function ManMauInThieu() {
  const { settings, capNhatSettings, coQuyen } = useStore();
  const duocSua = coQuyen("sua_cai_dat");

  const [mau, setMau] = useState<MauInThieu>(settings.mauInThieu);
  const [dangLuu, setDangLuu] = useState(false);
  const [xemTruoc, setXemTruoc] = useState(false);

  const doiNhan = (khoa: keyof NhanThieu, giaTri: string) =>
    setMau((m) => ({ ...m, nhan: { ...m.nhan, [khoa]: giaTri } }));
  const doiBat = (khoa: keyof HienThieu, giaTri: boolean) =>
    setMau((m) => ({ ...m, hien: { ...m.hien, [khoa]: giaTri } }));
  const doiChuKy = (i: number, phan: Partial<{ nhan: string; ghiChu: string }>) =>
    setMau((m) => ({ ...m, chuKy: m.chuKy.map((c, idx) => (idx === i ? { ...c, ...phan } : c)) }));

  const luu = async () => {
    setDangLuu(true);
    const chuan = chuanHoaMauInThieu(mau);
    try {
      await capNhatSettings({ mauInThieu: chuan });
      setMau(chuan);
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
      so="03"
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
            <OChon
              value={mau.kieuIn}
              disabled={!duocSua}
              aria-label="Kiểu sắp mục đích khi bấm in"
              onChange={(e) => setMau({ ...mau, kieuIn: e.target.value as KieuInThieu })}
              className="w-full rounded-sm border-ke-dam bg-white px-2.5 text-[13px] text-muc focus:border-muc disabled:bg-giay disabled:text-muc-mo"
            >
              {DS_KIEU_IN.map((k) => (
                <option key={k.khoa} value={k.khoa}>
                  {k.nhan}
                </option>
              ))}
            </OChon>
            {kieuDangChon && <p className="mt-1 text-[11px] text-muc-nhat">{kieuDangChon.moTa}</p>}
          </div>

          <div>
            <div className="nhan-muc mb-1.5">Hiện trên bản in</div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {DS_BAT_TAT_THIEU.map((muc) => (
                <label
                  key={muc.khoa}
                  className="flex cursor-pointer items-start gap-2 rounded-sm px-1 py-1 hover:bg-giay"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-muc"
                    checked={mau.hien[muc.khoa]}
                    disabled={!duocSua}
                    onChange={(e) => doiBat(muc.khoa, e.target.checked)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-muc">{muc.nhan}</span>
                    {muc.moTa && <span className="block text-[11px] text-muc-nhat">{muc.moTa}</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="nhan-muc mb-1.5">Chữ hiện trên bản in</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {DS_NHAN_THIEU.map((n) => (
                <div key={n.khoa}>
                  <label className="mb-0.5 block text-[11px] text-muc-nhat">{n.nhan}</label>
                  <OText value={mau.nhan[n.khoa]} onChange={(e) => doiNhan(n.khoa, e.target.value)} disabled={!duocSua} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="nhan-muc">Chữ ký cuối bản in</span>
              <div className="flex items-center gap-2">
                <label className="text-[12px] text-muc-nhat">Số chữ ký mỗi hàng</label>
                <OChon
                  value={mau.soCotChuKy}
                  disabled={!duocSua}
                  aria-label="Số chữ ký mỗi hàng"
                  onChange={(e) => setMau({ ...mau, soCotChuKy: Number(e.target.value) })}
                  className="h-8 rounded-sm border-ke-dam bg-white px-2 font-mono text-[12px] text-muc focus:border-muc disabled:bg-giay"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </OChon>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {mau.chuKy.map((c, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="mb-0.5 block text-[11px] text-muc-nhat">Tên ô chữ ký {i + 1}</label>
                    <OText value={c.nhan} onChange={(e) => doiChuKy(i, { nhan: e.target.value })} disabled={!duocSua} />
                  </div>
                  <div className="flex-1">
                    <label className="mb-0.5 block text-[11px] text-muc-nhat">Dòng phụ</label>
                    <OText value={c.ghiChu} onChange={(e) => doiChuKy(i, { ghiChu: e.target.value })} disabled={!duocSua} />
                  </div>
                  <Nut
                    kieu="mo"
                    co="sm"
                    onClick={() => setMau((m) => ({ ...m, chuKy: m.chuKy.filter((_, idx) => idx !== i) }))}
                    disabled={!duocSua || mau.chuKy.length <= 0}
                    title="Bỏ ô chữ ký này"
                    className="hover:text-dau"
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
          <div className="nhan-muc mb-1.5">Xem trước</div>
          <div className="mem-cuon max-h-[36rem] overflow-auto rounded-sm border border-ke-dam bg-white p-3 shadow-[inset_0_1px_3px_rgb(22_32_28/0.05)]">
            <div style={{ transform: "scale(0.55)", transformOrigin: "top left", width: "182%" }}>
              <PhieuThieu du={BAOCAO_MAU} settings={settings} tu={homNay()} den={homNay()} mau={mau} />
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-muc-nhat">Bản in khổ A4. Bấm “Xem trước” để xem bản in đầy đủ.</p>
        </div>
      </div>

      {xemTruoc && (
        <div className="khong-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-muc/45 p-4 pt-10">
          <div className="hop-noi w-full max-w-4xl rounded-lg border border-ke bg-white shadow-noi">
            <header className="flex items-center justify-between border-b border-ke px-4 py-3">
              <h3 className="font-serif text-[15px] font-semibold text-muc">Xem trước phiếu trả đồ thiếu</h3>
              <Nut co="sm" onClick={() => setXemTruoc(false)}>
                Đóng
              </Nut>
            </header>
            <div className="mem-cuon max-h-[76vh] overflow-auto bg-giay p-5">
              <div className="mx-auto w-[794px] max-w-full bg-white px-[45px] py-9 shadow-the ring-1 ring-ke/70">
                <PhieuThieu du={BAOCAO_MAU} settings={settings} tu={homNay()} den={homNay()} mau={mau} />
              </div>
            </div>
          </div>
        </div>
      )}
    </The>
  );
}
