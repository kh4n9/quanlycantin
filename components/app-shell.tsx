"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/client";
import type { Quyen } from "@/lib/quyen";
import { StoreProvider, useStore } from "@/lib/store";
import { ManBanHang } from "./man-ban-hang";
import { ManBaoCao } from "./man-bao-cao";
import { ManCaiDat } from "./man-cai-dat";
import { ManCanPham } from "./man-can-pham";
import { ManDangNhap } from "./man-dang-nhap";
import { ManKiemPhieu } from "./man-kiem-phieu";
import { ManMatHang } from "./man-mat-hang";
import { HopDoiMatKhau, ManTaiKhoan } from "./man-tai-khoan";
import { HopXemTruocPhieu, ManPhieuBan } from "./man-phieu-ban";
import { Logo } from "./logo";
import { PhieuInProvider, useInPhieu } from "./print";
import { useHienDien } from "@/lib/use-hien-dien";
import { bao, BieuTuong, HopThongBao, Nut, Trong } from "./ui";

type Khoa = "ban" | "phieu" | "kiem" | "mathang" | "canpham" | "baocao" | "taikhoan" | "cai";

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
  {
    khoa: "canpham",
    nhan: "Can phạm",
    icon: "nguoi",
    moTa: "Tra cứu can phạm đã mua hàng, lịch sử và mặt hàng thường mua",
    quyen: "xem_can_pham",
  },
  { khoa: "baocao", nhan: "Báo cáo", icon: "bieu", moTa: "Số phiếu, mặt hàng và can phạm mua nhiều", quyen: "xem_bao_cao" },
  { khoa: "taikhoan", nhan: "Tài khoản", icon: "nguoi", moTa: "Tạo tài khoản, phân quyền, đặt lại mật khẩu", quyen: "quan_ly_tai_khoan" },
  {
    khoa: "cai",
    nhan: "Cài đặt",
    icon: "cai",
    moTa: "Thông tin đơn vị, sao lưu, thùng rác và dữ liệu",
    quyen: "sua_cai_dat",
  },
];

function Khung() {
  const { nguoiDung, dangKhoiDong, loi, coQuyen, coDuLieuChuaLuu } = useStore();
  const [muc, setMuc] = useState<Khoa>("ban");
  const [doiMatKhau, setDoiMatKhau] = useState(false);
  const [thuGonSidebar, setThuGonSidebar] = useState(false);
  const { dangXem, dongXemTruoc } = useInPhieu();

  const mucChoPhep = useMemo(() => MUC.filter((m) => !m.quyen || coQuyen(m.quyen)), [coQuyen]);

  // Mục đang mở có thể mất quyền (đổi quyền, hoặc mở bằng hash không hợp lệ).
  // Suy ra mục hợp lệ ngay khi render thay vì đồng bộ lại bằng effect.
  const mucHienTai =
    mucChoPhep.length === 0 || mucChoPhep.some((m) => m.khoa === muc) ? muc : mucChoPhep[0].khoa;

  // Báo màn hình đang mở để màn Tài khoản biết ai đang truy cập và đang ở đâu.
  useHienDien(nguoiDung ?? null, MUC.find((m) => m.khoa === mucHienTai)?.nhan ?? "");

  const chonMuc = useCallback(
    (k: Khoa) => {
      if (k !== mucHienTai && coDuLieuChuaLuu) {
        const ok = window.confirm(
          "Bạn có dữ liệu phiếu bán đang nhập dở chưa lưu. Bạn có chắc muốn chuyển sang màn hình khác không?",
        );
        if (!ok) return;
      }
      setMuc(k);
      dongXemTruoc();
      if (window.location.hash.slice(1) !== k) {
        window.history.replaceState(null, "", `#${k}`);
      }
    },
    [mucHienTai, coDuLieuChuaLuu, dongXemTruoc],
  );

  // Mở trang thì đọc mục từ hash; chỉ ghi hash khi người dùng bấm chuyển mục.
  // (Không ghi hash trong effect: StrictMode chạy effect hai lần sẽ ghi đè hash
  //  trước khi effect đọc kịp chạy, làm mất mục đang mở.)
  useEffect(() => {
    const doc = () => {
      const h = window.location.hash.slice(1) as Khoa;
      if (MUC.some((m) => m.khoa === h)) {
        if (h !== mucHienTai && coDuLieuChuaLuu) {
          const ok = window.confirm(
            "Bạn có dữ liệu phiếu bán đang nhập dở chưa lưu. Bạn có chắc muốn chuyển màn hình không?",
          );
          if (!ok) {
            window.history.replaceState(null, "", `#${mucHienTai}`);
            return;
          }
        }
        setMuc(h);
        dongXemTruoc();
      }
    };
    doc();
    window.addEventListener("hashchange", doc);
    return () => window.removeEventListener("hashchange", doc);
  }, [mucHienTai, coDuLieuChuaLuu, dongXemTruoc]);

  // Nhắc nhở người dùng khi cố tải lại trang hoặc đóng tab lúc có dữ liệu chưa lưu
  useEffect(() => {
    if (!coDuLieuChuaLuu) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [coDuLieuChuaLuu]);

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
      <div className="khong-in flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b1526] text-slate-400">
        <Logo className="h-12 w-12 opacity-90" />
        <div className="flex items-center gap-2 text-[13px]">
          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-blue-400" />
          Đang tải dữ liệu…
        </div>
      </div>
    );
  }

  if (loi) {
    return (
      <div className="khong-in flex min-h-screen items-center justify-center bg-[#0b1526] p-4">
        <div className="hop-noi max-w-md rounded-2xl border border-rose-900/60 bg-rose-950/50 p-5 text-sm text-rose-200 shadow-noi">
          <div className="mb-1.5 font-semibold text-rose-100">Không kết nối được máy chủ dữ liệu</div>
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

  const dangChon = MUC.find((m) => m.khoa === mucHienTai);
  const chuDau = nguoiDung.hoTen
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((tu) => tu.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <>
      <div className="khong-in flex h-screen flex-col bg-transparent lg:flex-row">
        <aside
          className={`flex shrink-0 flex-col border-white/5 bg-[#0b1526] text-slate-300 shadow-[8px_0_30px_-24px_rgba(2,6,23,.9)] transition-[width] duration-200 lg:border-r ${
            thuGonSidebar ? "lg:w-[4.5rem]" : "lg:w-64"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-3 lg:px-4 lg:py-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <Logo className="h-9 w-9 shrink-0 drop-shadow" />
              {!thuGonSidebar && (
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold tracking-tight text-white">Quản lý căn tin</div>
                  <div className="truncate text-[11px] text-slate-400">{nguoiDung.hoTen}</div>
                </div>
              )}
            </div>

            {/* Nút thu gọn / mở rộng menu trên desktop */}
            <button
              type="button"
              onClick={() => setThuGonSidebar((v) => !v)}
              className="hidden rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:flex"
              title={thuGonSidebar ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                {thuGonSidebar ? (
                  <path d="M13 5l7 7-7 7M5 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M11 19l-7-7 7-7M19 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </button>

            {/* Thao tác nhanh cho màn hình nhỏ / split view (< lg) */}
            <div className="flex items-center gap-1 lg:hidden">
              <button
                onClick={() => setDoiMatKhau(true)}
                className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                title="Đổi mật khẩu"
              >
                <BieuTuong ten="khoa" className="h-4 w-4" />
              </button>
              <button
                onClick={() => void dangXuat()}
                className="rounded p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                title="Đăng xuất"
              >
                <BieuTuong ten="xuat" className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!thuGonSidebar && (
            <div className="hidden px-4 pt-4 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase lg:block">
              Điều hướng
            </div>
          )}

          <nav className="mem-cuon flex gap-1 overflow-x-auto px-2.5 py-2 lg:flex-1 lg:flex-col lg:gap-0.5 lg:overflow-x-visible lg:pb-3">
            {mucChoPhep.map((m, i) => {
              const chon = m.khoa === mucHienTai;
              return (
                <button
                  key={m.khoa}
                  onClick={() => chonMuc(m.khoa)}
                  title={thuGonSidebar ? `${m.nhan}: ${m.moTa}` : m.moTa}
                  aria-current={chon ? "page" : undefined}
                  className={`relative flex shrink-0 items-center gap-2.5 rounded-lg text-left text-[13px] transition-colors lg:w-full ${
                    thuGonSidebar ? "lg:justify-center lg:px-2 lg:py-2.5" : "px-2.5 py-2"
                  } ${
                    chon
                      ? "bg-blue-500/15 font-semibold text-white ring-1 ring-blue-400/20"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {chon && !thuGonSidebar && (
                    <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-blue-400" aria-hidden />
                  )}
                  <BieuTuong
                    ten={m.icon}
                    className={`h-4 w-4 shrink-0 ${chon ? "text-blue-300" : "text-slate-500"}`}
                  />
                  {!thuGonSidebar && <span className="whitespace-nowrap">{m.nhan}</span>}
                  {!thuGonSidebar && (
                    <span
                      className={`ml-auto hidden rounded px-1.5 py-0.5 text-[10px] font-medium lg:inline ${
                        chon ? "bg-white/10 text-slate-300" : "text-slate-600"
                      }`}
                    >
                      Alt+{i + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="hidden flex-col gap-1 border-t border-white/5 px-2.5 py-3 lg:flex">
            {!thuGonSidebar && (
              <div className="mb-1 flex items-center gap-2.5 rounded-xl bg-white/5 px-2.5 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[11px] font-bold text-blue-200 ring-1 ring-blue-400/30">
                  {chuDau || "?"}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-slate-100">{nguoiDung.hoTen}</div>
                  <div className="truncate text-[10px] text-slate-400">Đang đăng nhập</div>
                </div>
              </div>
            )}
            <button
              onClick={() => setDoiMatKhau(true)}
              title="Đổi mật khẩu"
              className={`flex items-center gap-2 rounded-lg py-2 text-left text-[12.5px] text-slate-400 transition-colors hover:bg-white/5 hover:text-white ${
                thuGonSidebar ? "justify-center px-1" : "px-2.5"
              }`}
            >
              <BieuTuong ten="khoa" className="h-4 w-4 shrink-0" />
              {!thuGonSidebar && <span>Đổi mật khẩu</span>}
            </button>
            <button
              onClick={() => void dangXuat()}
              title="Đăng xuất"
              className={`flex items-center gap-2 rounded-lg py-2 text-left text-[12.5px] text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-200 ${
                thuGonSidebar ? "justify-center px-1" : "px-2.5"
              }`}
            >
              <BieuTuong ten="xuat" className="h-4 w-4 shrink-0" />
              {!thuGonSidebar && <span>Đăng xuất</span>}
            </button>
          </div>
        </aside>

        <main className="mem-cuon flex min-w-0 flex-1 flex-col overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 px-4 py-3 backdrop-blur-md lg:px-6">
            <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-[17px] font-semibold tracking-tight text-slate-900">
                  {dangChon?.nhan ?? "Căn tin"}
                </h1>
                <p className="mt-0.5 truncate text-[12px] text-slate-500">{dangChon?.moTa}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pr-3 pl-1 shadow-xs sm:flex">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {chuDau || "?"}
                  </div>
                  <div className="text-[11px] leading-tight">
                    <div className="font-semibold text-slate-800">{nguoiDung.hoTen}</div>
                    <div className="text-[10px] text-slate-500">Đang đăng nhập</div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {nguoiDung.phaiDoiMatKhau && (
            <div className="mx-auto mt-3 flex w-[calc(100%-2rem)] max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3.5 py-2.5 text-[13px] text-amber-800 shadow-xs lg:w-[calc(100%-3rem)]">
              <BieuTuong ten="canh" className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                Tài khoản của bạn đang dùng mật khẩu ban đầu. Nên đổi ngay để bảo đảm an toàn.
              </span>
              <Nut co="sm" kieu="chinh" onClick={() => setDoiMatKhau(true)}>
                Đổi mật khẩu
              </Nut>
            </div>
          )}

          <div className="flex-1 px-4 py-4 lg:px-6 lg:py-5">
            <div className="mx-auto w-full max-w-[1600px]">
              {mucChoPhep.length === 0 ? (
                <div className="rounded-xl border border-slate-200/80 bg-white shadow-the">
                  <Trong
                    tieuDe="Tài khoản chưa được cấp quyền nào"
                    moTa="Liên hệ quản trị viên để được cấp quyền sử dụng."
                  />
                </div>
              ) : (
                <>
                  {mucHienTai === "ban" && coQuyen("ban_hang") && <ManBanHang />}
                  {mucHienTai === "phieu" && coQuyen("xem_phieu") && (
                    <ManPhieuBan onSangBanHang={() => chonMuc("ban")} />
                  )}
                  {mucHienTai === "kiem" && coQuyen("kiem_phieu") && <ManKiemPhieu />}
                  {mucHienTai === "mathang" && coQuyen("quan_ly_mat_hang") && <ManMatHang />}
                  {mucHienTai === "canpham" && coQuyen("xem_can_pham") && <ManCanPham />}
                  {mucHienTai === "baocao" && coQuyen("xem_bao_cao") && <ManBaoCao />}
                  {mucHienTai === "taikhoan" && coQuyen("quan_ly_tai_khoan") && <ManTaiKhoan />}
                  {mucHienTai === "cai" && coQuyen("sua_cai_dat") && <ManCaiDat />}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Hộp thoại và thông báo — cũng thuộc phần không in */}
      {dangXem !== null && <HopXemTruocPhieu />}
      {doiMatKhau && <HopDoiMatKhau mo dong={() => setDoiMatKhau(false)} />}
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
