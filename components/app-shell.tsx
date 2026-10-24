"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/client";
import { vaiTroCua, type Quyen } from "@/lib/quyen";
import { StoreProvider, useStore } from "@/lib/store";
import { ManBanHang } from "./man-ban-hang";
import { ManBaoCao } from "./man-bao-cao";
import { ManCaiDat } from "./man-cai-dat";
import { ManCanPham } from "./man-can-pham";
import { ManDangNhap } from "./man-dang-nhap";
import { ManKiemPhieu } from "./man-kiem-phieu";
import { ManMatHang } from "./man-mat-hang";
import { ManNhatKy } from "./man-nhat-ky";
import { HopDoiMatKhau, ManTaiKhoan } from "./man-tai-khoan";
import { HopXemTruocPhieu, ManPhieuBan } from "./man-phieu-ban";
import { Logo } from "./logo";
import { PhieuInProvider, useInPhieu } from "./print";
import { useHienDien } from "@/lib/use-hien-dien";
import { bao, BieuTuong, HopThongBao, Nut, Trong } from "./ui";

type Khoa = "ban" | "phieu" | "kiem" | "mathang" | "canpham" | "baocao" | "nhatky" | "taikhoan" | "cai";

type Muc = {
  khoa: Khoa;
  nhan: string;
  tenNgan: string;
  icon: string;
  moTa: string;
  /** Quyền cần có để thấy mục này. Không có nghĩa là ai đăng nhập cũng thấy. */
  quyen?: Quyen;
};

const MUC: Muc[] = [
  {
    khoa: "ban",
    nhan: "Bán hàng",
    tenNgan: "Bán hàng",
    icon: "ban",
    moTa: "Lập phiếu bán: nhập can phạm và số lượng hàng",
    quyen: "ban_hang",
  },
  {
    khoa: "phieu",
    nhan: "Phiếu bán",
    tenNgan: "Phiếu",
    icon: "phieu",
    moTa: "Tra cứu, xem lại và in phiếu đã lập",
    quyen: "xem_phieu",
  },
  {
    khoa: "kiem",
    nhan: "Kiểm phiếu",
    tenNgan: "Kiểm",
    icon: "check",
    moTa: "Rà soát lại số lượng từng phiếu, đánh dấu đã kiểm",
    quyen: "kiem_phieu",
  },
  {
    khoa: "mathang",
    nhan: "Mặt hàng",
    tenNgan: "Mặt hàng",
    icon: "kho",
    moTa: "Danh mục mặt hàng, giá bán, tắt/bật bán",
    quyen: "quan_ly_mat_hang",
  },
  {
    khoa: "canpham",
    nhan: "Can phạm",
    tenNgan: "Can phạm",
    icon: "nguoi",
    moTa: "Tra cứu can phạm đã mua hàng, lịch sử và mặt hàng thường mua",
    quyen: "xem_can_pham",
  },
  {
    khoa: "baocao",
    nhan: "Báo cáo",
    tenNgan: "Báo cáo",
    icon: "bieu",
    moTa: "Số phiếu, mặt hàng và can phạm mua nhiều",
    quyen: "xem_bao_cao",
  },
  {
    khoa: "nhatky",
    nhan: "Nhật ký",
    tenNgan: "Nhật ký",
    icon: "lich",
    moTa: "Lịch sử thao tác: ai đã thêm, sửa, xoá và khi nào",
    quyen: "xem_nhat_ky",
  },
  {
    khoa: "taikhoan",
    nhan: "Tài khoản",
    tenNgan: "Tài khoản",
    icon: "nguoi",
    moTa: "Tạo tài khoản, phân quyền, đặt lại mật khẩu",
    quyen: "quan_ly_tai_khoan",
  },
  {
    khoa: "cai",
    nhan: "Cài đặt",
    tenNgan: "Cài đặt",
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
  const mucHienTai = mucChoPhep.length === 0 || mucChoPhep.some((m) => m.khoa === muc) ? muc : mucChoPhep[0].khoa;

  // Báo màn hình đang mở để màn Tài khoản biết ai đang truy cập và đang ở đâu.
  useHienDien(nguoiDung ?? null, MUC.find((m) => m.khoa === mucHienTai)?.nhan ?? "");

  // Mỗi tờ sổ mở ra từ đầu trang: đổi mục mà giữ vị trí cuộn cũ thì người dùng
  // rơi vào giữa một màn hình khác.
  const cuonLenDau = useCallback(() => {
    document.getElementById("khung-noi-dung")?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, []);

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
      cuonLenDau();
      if (window.location.hash.slice(1) !== k) {
        window.history.replaceState(null, "", `#${k}`);
      }
    },
    [mucHienTai, coDuLieuChuaLuu, dongXemTruoc, cuonLenDau],
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
        cuonLenDau();
      }
    };
    doc();
    window.addEventListener("hashchange", doc);
    return () => window.removeEventListener("hashchange", doc);
  }, [mucHienTai, coDuLieuChuaLuu, dongXemTruoc, cuonLenDau]);

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

  // Alt + 1…9 chuyển nhanh giữa các mục đang thấy
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
      <div className="khong-in flex min-h-screen flex-col items-center justify-center gap-5 bg-muc text-giay/60">
        <Logo className="h-12 w-12 opacity-90" />
        <div className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.16em] uppercase">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-dau" />
          Đang mở sổ dữ liệu…
        </div>
      </div>
    );
  }

  if (loi) {
    return (
      <div className="khong-in flex min-h-screen items-center justify-center bg-giay p-4">
        <div className="hop-noi max-w-md rounded-lg border border-ke bg-giay-cao p-5 text-sm text-muc shadow-noi">
          <div className="nhan-muc text-dau">Không kết nối được máy chủ dữ liệu</div>
          <p className="mt-2 leading-relaxed">{loi}</p>
          <p className="mt-2 text-muc-nhat">
            Kiểm tra lại{" "}
            <code className="rounded-sm border border-ke bg-giay px-1 font-mono text-[12px]">MONGODB_URI</code> trong file{" "}
            <code className="rounded-sm border border-ke bg-giay px-1 font-mono text-[12px]">.env</code> và kết nối mạng.
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
  const vaiTro = vaiTroCua(nguoiDung.quyen)?.ten ?? "Quyền tuỳ chỉnh";
  const viTriMuc = mucChoPhep.findIndex((m) => m.khoa === mucHienTai) + 1;

  return (
    <>
      <div className="khong-in flex h-screen flex-col bg-transparent lg:flex-row">
        {/* ---------------- Gáy sổ: thanh mục lục dọc ---------------- */}
        <aside
          className={`bang-muc flex shrink-0 flex-col bg-muc text-giay/70 transition-[width] duration-200 lg:border-r lg:border-black/30 ${
            thuGonSidebar ? "lg:w-[4.75rem]" : "lg:w-64"
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 lg:py-4 ${
              thuGonSidebar ? "lg:px-2" : "lg:px-4"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <Logo className="h-8 w-8 shrink-0 lg:h-9 lg:w-9" />
              {!thuGonSidebar && (
                <div className="min-w-0">
                  <div className="truncate font-serif text-[14px] leading-tight font-semibold text-giay-cao">
                    Quản lý căn tin
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[9px] tracking-[0.18em] text-giay/40 uppercase lg:mt-1 lg:text-[9.5px]">
                    Sổ cấp phát
                  </div>
                </div>
              )}
            </div>

            {/* Nút thu gọn / mở rộng menu trên desktop */}
            <button
              type="button"
              onClick={() => setThuGonSidebar((v) => !v)}
              className="hidden rounded-md p-1 text-giay/40 transition hover:bg-white/8 hover:text-giay lg:flex"
              title={thuGonSidebar ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
              aria-label={thuGonSidebar ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
            >
              <BieuTuong ten={thuGonSidebar ? "tiep" : "trang"} className="h-4 w-4" />
            </button>

            {/* Thao tác nhanh cho màn hình nhỏ / split view (< lg) */}
            <div className="flex items-center gap-1 lg:hidden">
              <button
                onClick={() => setDoiMatKhau(true)}
                className="rounded-md p-1.5 text-giay/50 transition hover:bg-white/8 hover:text-giay"
                title="Đổi mật khẩu"
                aria-label="Đổi mật khẩu"
              >
                <BieuTuong ten="khoa" className="h-4 w-4" />
              </button>
              <button
                onClick={() => void dangXuat()}
                className="rounded-md p-1.5 text-giay/50 transition hover:bg-white/8 hover:text-giay"
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <BieuTuong ten="xuat" className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Trên desktop mục lục là thanh dọc; dưới lg nó thu thành một dải
              biểu tượng (vì các tab ở đầu trang đã đủ dùng để chuyển mục). */}
          <div className="hidden px-4 pt-4 pb-2 font-mono text-[9.5px] tracking-[0.18em] text-giay/35 uppercase lg:block">
            {!thuGonSidebar && "Mục lục"}
          </div>

          <nav className="mem-cuon flex gap-1 overflow-x-auto px-2 py-1.5 lg:flex-1 lg:flex-col lg:gap-1 lg:overflow-x-visible lg:px-2.5 lg:py-2 lg:pb-3">
            {mucChoPhep.map((m, i) => {
              const chon = m.khoa === mucHienTai;
              return (
                <button
                  key={m.khoa}
                  onClick={() => chonMuc(m.khoa)}
                  title={`${m.nhan} — ${m.moTa} (Alt+${i + 1})`}
                  aria-current={chon ? "page" : undefined}
                  aria-label={m.nhan}
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center gap-2.5 rounded-md text-left text-[13px] transition-colors lg:h-auto lg:w-full lg:justify-start lg:gap-2.5 lg:py-2 ${
                    thuGonSidebar ? "lg:justify-center lg:px-2 lg:py-2.5" : "lg:px-2.5"
                  } ${
                    chon
                      ? "bg-giay-cao text-muc shadow-[0_1px_2px_rgb(0_0_0/0.35)] lg:font-semibold"
                      : "text-giay/60 hover:bg-white/6 hover:text-giay"
                  }`}
                >
                  {chon && !thuGonSidebar && (
                    <span
                      className="absolute inset-y-2 left-0 hidden w-[2px] rounded-full bg-dau lg:block"
                      aria-hidden
                    />
                  )}
                  <span
                    className={`so hidden w-5 shrink-0 text-[10px] lg:block ${chon ? "text-dau" : "text-giay/30"}`}
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <BieuTuong ten={m.icon} className={`h-4 w-4 shrink-0 ${chon ? "text-muc" : "text-giay/40"}`} />
                  <span className="hidden min-w-0 flex-1 truncate whitespace-nowrap lg:inline">
                    {!thuGonSidebar && m.nhan}
                  </span>
                  <span
                    className={`hidden shrink-0 font-mono text-[9.5px] tracking-wider whitespace-nowrap lg:inline ${
                      chon ? "text-muc-mo" : "text-giay/25"
                    } ${thuGonSidebar ? "lg:hidden" : ""}`}
                  >
                    Alt {i + 1}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="hidden flex-col gap-1 border-t border-white/10 px-2.5 py-3 lg:flex">
            {!thuGonSidebar && (
              <div className="mb-1 flex items-center gap-2.5 rounded-sm bg-white/5 px-2.5 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-giay/25 font-mono text-[10.5px] font-semibold tracking-[0.02em] text-giay-cao">
                  {chuDau || "?"}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-giay-cao">{nguoiDung.hoTen}</div>
                  <div className="truncate font-mono text-[9.5px] tracking-[0.12em] text-giay/55 uppercase">{vaiTro}</div>
                </div>
              </div>
            )}
            <button
              onClick={() => setDoiMatKhau(true)}
              title="Đổi mật khẩu"
              className={`flex items-center gap-2 rounded-md py-2 text-left text-[12.5px] text-giay/55 transition-colors hover:bg-white/6 hover:text-giay ${
                thuGonSidebar ? "justify-center px-1" : "px-2.5"
              }`}
            >
              <BieuTuong ten="khoa" className="h-4 w-4 shrink-0" />
              {!thuGonSidebar && <span>Đổi mật khẩu</span>}
            </button>
            <button
              onClick={() => void dangXuat()}
              title="Đăng xuất"
              className={`flex items-center gap-2 rounded-sm py-2 text-left text-[12.5px] text-giay/55 transition-colors hover:bg-dau/20 hover:text-giay ${
                thuGonSidebar ? "justify-center px-1" : "px-2.5"
              }`}
            >
              <BieuTuong ten="xuat" className="h-4 w-4 shrink-0" />
              {!thuGonSidebar && <span>Đăng xuất</span>}
            </button>
          </div>
        </aside>

        {/* ---------------- Tờ sổ đang mở ---------------- */}
        <main
          id="khung-noi-dung"
          className="mem-cuon flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain"
        >
          <header className="sticky top-0 z-20 border-b border-ke bg-giay/88 backdrop-blur-md">
            {/* Dòng nhãn + người dùng */}
            <div className="flex items-center justify-between gap-4 px-4 pt-2.5 pb-2 lg:px-7">
              <div className="flex min-w-0 items-baseline gap-2.5 font-mono text-[9.5px] tracking-[0.16em] text-muc-mo uppercase">
                <span className="hidden truncate sm:inline">Sổ cấp phát</span>
                <span aria-hidden className="hidden text-ke-dam sm:inline">
                  ·
                </span>
                <span className="so shrink-0 text-muc-nhat">
                  Tờ {String(viTriMuc).padStart(2, "0")}/{String(mucChoPhep.length).padStart(2, "0")}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                <div className="hidden text-right sm:block">
                  <div className="truncate text-[12px] leading-tight font-semibold text-muc">{nguoiDung.hoTen}</div>
                  <div className="mt-0.5 font-mono text-[9px] tracking-[0.12em] text-muc-mo uppercase">{vaiTro}</div>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-muc/30 bg-giay font-mono text-[10px] font-semibold tracking-[0.02em] text-muc">
                  {chuDau || "?"}
                </div>
              </div>
            </div>

            {/* Dải tab như mép các tờ sổ: tờ đang mở là tờ nối liền với trang */}
            <nav
              aria-label="Mục của sổ"
              className="mem-cuon -mb-px flex gap-0.5 overflow-x-auto px-4 lg:px-7"
            >
              {mucChoPhep.map((m, i) => {
                const chon = m.khoa === mucHienTai;
                return (
                  <button
                    key={m.khoa}
                    onClick={() => chonMuc(m.khoa)}
                    aria-current={chon ? "page" : undefined}
                    title={`${m.nhan} — ${m.moTa} (Alt+${i + 1})`}
                    className={`group relative -mb-px flex shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-2 text-[12.5px] transition-colors ${
                      chon
                        ? "z-10 border-ke bg-giay-cao font-semibold text-muc"
                        : "border-transparent text-muc-nhat hover:bg-white/50 hover:text-muc"
                    }`}
                  >
                    {/* "Gáy" của tờ đang mở: vạch đỏ trên mép tab, như dấu đánh dấu trang đang đọc */}
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 top-0 h-[2px] rounded-full ${chon ? "bg-dau" : "bg-transparent"}`}
                    />
                    <BieuTuong
                      ten={m.icon}
                      className={`h-3.5 w-3.5 shrink-0 ${chon ? "text-muc" : "text-muc-mo group-hover:text-muc-nhat"}`}
                    />
                    <span className={chon ? "" : "hidden sm:inline"}>{m.tenNgan}</span>
                  </button>
                );
              })}
            </nav>
          </header>

          <div className="flex-1 px-4 py-4 lg:px-7 lg:py-5">
            <div className="mx-auto w-full max-w-[1600px]">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate font-serif text-[23px] leading-tight font-semibold tracking-[-0.02em] text-muc">
                    {dangChon?.nhan ?? "Căn tin"}
                  </h1>
                  <p className="mt-1 truncate text-[12.5px] text-muc-nhat">{dangChon?.moTa}</p>
                </div>
                <div className="hidden items-center gap-1.5 font-mono text-[9.5px] tracking-[0.14em] text-muc-mo uppercase md:flex">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ngoc" />
                  Đã kết nối sổ
                </div>
              </div>

              {nguoiDung.phaiDoiMatKhau && (
                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-moc/25 border-l-[3px] border-l-moc bg-moc-nhat px-3.5 py-2.5 text-[13px] text-muc shadow-xs">
                  <BieuTuong ten="canh" className="h-4 w-4 shrink-0 text-moc" />
                  <span className="flex-1">
                    Tài khoản của bạn đang dùng mật khẩu ban đầu. Nên đổi ngay để bảo đảm an toàn.
                  </span>
                  <Nut co="sm" kieu="chinh" onClick={() => setDoiMatKhau(true)}>
                    Đổi mật khẩu
                  </Nut>
                </div>
              )}

              {mucChoPhep.length === 0 ? (
                <div className="rounded-lg border border-ke bg-giay-cao shadow-the">
                  <Trong
                    icon="khoa"
                    tieuDe="Tài khoản chưa được cấp quyền nào"
                    moTa="Liên hệ quản trị viên để được cấp quyền sử dụng."
                  />
                </div>
              ) : (
                // key theo mục: mỗi lần mở tờ mới thì nội dung trượt lên như lật trang
                <div key={mucHienTai} className="mo-to">
                  {mucHienTai === "ban" && coQuyen("ban_hang") && <ManBanHang />}
                  {mucHienTai === "phieu" && coQuyen("xem_phieu") && <ManPhieuBan onSangBanHang={() => chonMuc("ban")} />}
                  {mucHienTai === "kiem" && coQuyen("kiem_phieu") && <ManKiemPhieu />}
                  {mucHienTai === "mathang" && coQuyen("quan_ly_mat_hang") && <ManMatHang />}
                  {mucHienTai === "canpham" && coQuyen("xem_can_pham") && <ManCanPham />}
                  {mucHienTai === "baocao" && coQuyen("xem_bao_cao") && <ManBaoCao />}
                  {mucHienTai === "nhatky" && coQuyen("xem_nhat_ky") && <ManNhatKy />}
                  {mucHienTai === "taikhoan" && coQuyen("quan_ly_tai_khoan") && <ManTaiKhoan />}
                  {mucHienTai === "cai" && coQuyen("sua_cai_dat") && <ManCaiDat />}
                </div>
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
