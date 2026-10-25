"use client";

import { useState } from "react";
import { homNay } from "@/lib/format";
import { DS_BAT_TAT, DS_NHAN, MAU_IN_MAC_DINH, chuanHoaMauIn } from "@/lib/mau-in";
import { useStore } from "@/lib/store";
import type { MauInPhieu, NhanPhieu, Order } from "@/lib/types";
import { MauPhieuBan } from "./print";
import { bao, baoLoi, BieuTuong, Nut, OChon, ONhan, OText, The, Trong } from "./ui";

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
    const chuan = chuanHoaMauIn(mau);
    try {
      await capNhatSettings({ mauIn: chuan });
      setMau(chuan);
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
      so="02"
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
            <div className="nhan-muc mb-1.5">Hiện trên phiếu</div>
            {matTien && (
              <div className="mb-2 rounded-sm border border-moc/30 border-l-[3px] border-l-moc bg-moc-nhat px-3 py-2 text-[12px] text-muc">
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
                    className={`flex items-start gap-2 rounded-sm px-1 py-1 ${
                      khoaPhuThuoc ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:bg-giay"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-muc"
                      checked={mau.hien[muc.khoa]}
                      disabled={!duocSua || khoaPhuThuoc}
                      onChange={(e) => doiBat(muc.khoa, e.target.checked)}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-muc">{muc.nhan}</span>
                      {muc.moTa && <span className="block text-[11px] text-muc-nhat">{muc.moTa}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <div className="nhan-muc mb-1.5">Chữ hiện trên phiếu</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {DS_NHAN.map((n) => (
                <div key={n.khoa}>
                  <label className="mb-0.5 block text-[11px] text-muc-nhat">{n.nhan}</label>
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
              <span className="nhan-muc">Chữ ký cuối phiếu</span>
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
                    <OText
                      value={c.nhan}
                      onChange={(e) => doiChuKy(i, { nhan: e.target.value })}
                      disabled={!duocSua}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-0.5 block text-[11px] text-muc-nhat">Dòng phụ dưới chữ ký</label>
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
                    className="hover:text-dau"
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
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <span className="nhan-muc">Xem trước</span>
            <span className="font-mono text-[9.5px] tracking-[0.03em] text-muc-mo uppercase">A4 · bản nháp</span>
          </div>
          <div className="mem-cuon max-h-[38rem] overflow-auto rounded-sm border border-ke-dam bg-giay p-3 shadow-[inset_0_1px_3px_rgb(19_30_25/0.05)]">
            <div className="bg-white px-4 py-5 shadow-the ring-1 ring-ke/60" lang="vi">
              <div style={{ transform: "scale(0.68)", transformOrigin: "top left", width: "147%" }}>
                <MauPhieuBan order={DON_MAU} settings={settings} mau={mau} />
              </div>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-muc-nhat">
            Phiếu mẫu in trên khổ A4. Bấm “Xem trước” để xem bản in đầy đủ.
          </p>
        </div>
      </div>

      {/* Xem trước đúng cỡ, in thử được luôn */}
      {moXemTruoc && (
        <div className="khong-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-muc/45 p-4 pt-10">
          <div className="hop-noi w-full max-w-3xl rounded-lg border border-ke bg-white shadow-noi">
            <header className="flex items-center justify-between border-b border-ke px-4 py-3">
              <h3 className="font-serif text-[15px] font-semibold text-muc">Xem trước mẫu phiếu in</h3>
              <Nut co="sm" onClick={() => setMoXemTruoc(false)}>
                Đóng
              </Nut>
            </header>
            <div className="mem-cuon max-h-[75vh] overflow-auto bg-giay p-5">
              <div className="mx-auto w-[794px] max-w-full bg-white px-[45px] py-9 shadow-the ring-1 ring-ke/70">
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
        </div>
      )}
    </The>
  );
}
