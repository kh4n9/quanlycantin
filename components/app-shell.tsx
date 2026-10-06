"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/client";
import type { Quyen } from "@/lib/quyen";
import { StoreProvider, useStore } from "@/lib/store";
import { ManBanHang } from "./man-ban-hang";
import { ManBaoCao } from "./man-bao-cao";
import { ManCaiDat } from "./man-cai-dat";
import { ManDangNhap } from "./man-dang-nhap";
import { ManKiemPhieu } from "./man-kiem-phieu";
import { ManMatHang } from "./man-mat-hang";
import { HopDoiMatKhau, ManTaiKhoan } from "./man-tai-khoan";
import { HopXemTruocPhieu, ManPhieuBan } from "./man-phieu-ban";
import { PhieuInProvider, useInPhieu } from "./print";
import { bao, BieuTuong, HopThongBao, Nut, Trong } from "./ui";

type Khoa = "ban" | "phieu" | "kiem" | "mathang" | "baocao" | "taikhoan" | "cai";

type Muc = {
  khoa: Khoa;
  nhan: string;
  icon: string;
  moTa: string;
  /** Quyền cần có để thấy mục này. Không có nghĩa là ai đăng nhập cũng thấy. */
  quyen?: Quyen;
};

const MUC: Muc[] = [
  { khoa: "ban", nhan: "Bán hàng", icon: "ban", moTa: "Lập phiếu bán: nhập can phạm và số lượng hàng", quyen: "ban_hang" },
  { khoa: "phieu", nhan: "Phiếu bán", icon: "phieu", moTa: "Tra cứu, xem lại và in phiếu đã lập", quyen: "xem_phieu" },
  {
    khoa: "kiem",
    nhan: "Kiểm phiếu",
    icon: "check",
    moTa: "Rà soát lại số lượng từng phiếu, đánh dấu đã kiểm",
    quyen: "kiem_phieu",
  },
  { khoa: "mathang", nhan: "Mặt hàng", icon: "kho", moTa: "Danh mục mặt hàng, giá bán, tắt/bật bán", quyen: "quan_ly_mat_hang" },
  { khoa: "baocao", nhan: "Báo cáo", icon: "bieu", moTa: "Số phiếu, mặt hàng và can phạm mua nhiều", quyen: "xem_bao_cao" },
  { khoa: "taikhoan", nhan: "Tài khoản", icon: "nguoi", moTa: "Tạo tài khoản, phân quyền, đặt lại mật khẩu", quyen: "quan_ly_tai_khoan" },
  { khoa: "cai", nhan: "Cài đặt", icon: "cai", moTa: "Thông tin đơn vị, sao lưu và dữ liệu" },
];

function Khung() {
  const { nguoiDung, dangKhoiDong, loi, coQuyen } = useStore();
  const [muc, setMuc] = useState<Khoa>("ban");
  const [doiMatKhau, setDoiMatKhau] = useState(false);
  const { dangXem, dongXemTruoc } = useInPhieu();

  const mucChoPhep = useMemo(() => MUC.filter((m) => !m.quyen || coQuyen(m.quyen)), [coQuyen]);

  const chonMuc = useCallback(
    (k: Khoa) => {
      setMuc(k);
      dongXemTruoc();
      if (window.location.hash.slice(1) !== k) {
        window.history.replaceState(null, "", `#${k}`);
      }
    },
    [dongXemTruoc],
  );

  // Mở trang thì đọc mục từ hash; chỉ ghi hash khi người dùng bấm chuyển mục.
  // (Không ghi hash trong effect: StrictMode chạy effect hai lần sẽ ghi đè hash
  //  trước khi effect đọc kịp chạy, làm mất mục đang mở.)
  useEffect(() => {
    const doc = () => {
      const h = window.location.hash.slice(1) as Khoa;
      if (MUC.some((m) => m.khoa === h)) {
        setMuc(h);
        dongXemTruoc();
      }
    };
    doc();
    window.addEventListener("hashchange", doc);
    return () => window.removeEventListener("hashchange", doc);
  }, [dongXemTruoc]);

  // Mục đang mở bị mất quyền (đổi quyền, hoặc mở bằng hash không hợp lệ) thì nhảy về mục đầu tiên được phép
  useEffect(() => {
    if (mucChoPhep.length > 0 && !mucChoPhep.some((m) => m.khoa === muc)) {
      setMuc(mucChoPhep[0].khoa);
    }
  }, [mucChoPhep, muc]);

  // Alt + 1…6 chuyển nhanh giữa các mục đang thấy
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const so = Number(e.key);
      if (so >= 1 && so <= mucChoPhep.length) {
        e.preventDefault();
        chonMuc(mucChoPhep[so - 1].khoa);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mucChoPhep, chonMuc]);

  const dangXuat = useCallback(async () => {
    try {
      await apiClient.dangXuat();
      window.location.reload();
    } catch {
      bao("Không đăng xuất được, thử lại");
    }
  }, []);

  if (dangKhoiDong) {
    return (
      <div className="khong-in flex min-h-screen items-center justify-center bg-slate-900 text-slate-400">
        Đang tải…
      </div>
    );
  }

  if (loi) {
    return (
      <div className="khong-in flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md rounded-lg border border-rose-800 bg-rose-950/60 p-4 text-sm text-rose-200">
          <div className="mb-1 font-semibold text-rose-100">Không kết nối được máy chủ dữ liệu</div>
          <p className="leading-relaxed">{loi}</p>
          <p className="mt-2 text-rose-300/80">
            Kiểm tra lại <code className="rounded bg-black/30 px-1">MONGODB_URI</code> trong file{" "}
            <code className="rounded bg-black/30 px-1">.env</code> và kết nối mạng.
          </p>
        </div>
      </div>
    );
  }

  if (!nguoiDung) {
    return (
      <>
        <ManDangNhap />
        <HopThongBao />
      </>
    );
  }

  const dangChon = MUC.find((m) => m.khoa === muc);

  return (
    <>
      <div className="khong-in flex h-screen flex-col bg-[#eef2f6] lg:flex-row">
        <aside className="flex shrink-0 flex-col border-slate-200 bg-slate-900 text-slate-300 lg:w-60 lg:border-r">
          <div className="flex items-center gap-2.5 px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
              <BieuTuong ten="phieu" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">Quản lý căn tin</div>
              <div className="truncate text-[11px] text-slate-400">{nguoiDung.hoTen}</div>
            </div>
          </div>

          <nav className="mem-cuon flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-1 lg:flex-col lg:overflow-x-visible lg:pb-0">
            {mucChoPhep.map((m, i) => {
              const chon = m.khoa === muc;
              return (
                <button
                  key={m.khoa}
                  onClick={() => chonMuc(m.khoa)}
                  title={m.moTa}
                  className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition lg:w-full ${
                    chon ? "bg-blue-600 font-medium text-white" : "hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <BieuTuong ten={m.icon} className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{m.nhan}</span>
                  <span
                    className={`ml-auto hidden text-[10px] lg:inline ${chon ? "text-blue-200" : "text-slate-500"}`}
                  >
                    Alt+{i + 1}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="flex flex-col gap-1.5 border-t border-slate-800 px-2 py-3">
            <button
              onClick={() => setDoiMatKhau(true)}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-[13px] text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <BieuTuong ten="cai" className="h-4 w-4" /> Đổi mật khẩu
            </button>
            <button
              onClick={() => void dangXuat()}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-[13px] text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <BieuTuong ten="xuat" className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </aside>

        <main className="mem-cuon flex min-w-0 flex-1 flex-col overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur">
            <h1 className="text-base font-semibold text-slate-900">{dangChon?.nhan ?? "Căn tin"}</h1>
            <p className="text-[12px] text-slate-500">{dangChon?.moTa}</p>
          </header>

          {nguoiDung.phaiDoiMatKhau && (
            <div className="mx-4 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
              <BieuTuong ten="canh" className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                Tài khoản của bạn đang dùng mật khẩu ban đầu. Nên đổi ngay để bảo đảm an toàn.
              </span>
              <Nut co="sm" kieu="chinh" onClick={() => setDoiMatKhau(true)}>
                Đổi mật khẩu
              </Nut>
            </div>
          )}

          <div className="flex-1 p-4">
            {mucChoPhep.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <Trong
                  tieuDe="Tài khoản chưa được cấp quyền nào"
                  moTa="Liên hệ quản trị viên để được cấp quyền sử dụng."
                />
              </div>
            ) : (
              <>
                {muc === "ban" && coQuyen("ban_hang") && <ManBanHang />}
                {muc === "phieu" && coQuyen("xem_phieu") && <ManPhieuBan onSangBanHang={() => chonMuc("ban")} />}
                {muc === "kiem" && coQuyen("kiem_phieu") && <ManKiemPhieu />}
                {muc === "mathang" && coQuyen("quan_ly_mat_hang") && <ManMatHang />}
                {muc === "baocao" && coQuyen("xem_bao_cao") && <ManBaoCao />}
                {muc === "taikhoan" && coQuyen("quan_ly_tai_khoan") && <ManTaiKhoan />}
                {muc === "cai" && <ManCaiDat />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Hộp thoại và thông báo — cũng thuộc phần không in */}
      {dangXem !== null && <HopXemTruocPhieu />}
      <HopDoiMatKhau mo={doiMatKhau} dong={() => setDoiMatKhau(false)} />
      <HopThongBao />
    </>
  );
}

export function AppShell() {
  return (
    <StoreProvider>
      <PhieuInProvider>
        <Khung />
      </PhieuInProvider>
    </StoreProvider>
  );
}
