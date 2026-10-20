"use client";

import { useState } from "react";
import { apiClient } from "@/lib/client";
import { useStore } from "@/lib/store";
import { Logo } from "./logo";
import { baoLoi, BieuTuong, Nut, ONhan, OText } from "./ui";

export function ManDangNhap() {
  const { napLai } = useStore();
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [dangGui, setDangGui] = useState(false);
  const [loi, setLoi] = useState("");

  const dangNhap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenDangNhap.trim() || !matKhau) {
      setLoi("Nhập tên đăng nhập và mật khẩu");
      return;
    }
    setDangGui(true);
    setLoi("");
    try {
      await apiClient.dangNhap(tenDangNhap, matKhau);
      await napLai();
    } catch (err) {
      const msg = (err as Error).message;
      setLoi(msg);
      baoLoi(msg);
      setMatKhau("");
    } finally {
      setDangGui(false);
    }
  };

  return (
    <div className="khong-in relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b1526] p-4 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_520px_at_12%_-10%,#1e3a8a_0%,transparent_60%),radial-gradient(760px_480px_at_100%_110%,#1d4ed8_0%,transparent_58%)] opacity-80"
      />

      <div className="hop-noi relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-noi md:grid-cols-[1.05fr_1fr]">
        {/* Cột giới thiệu — chỉ hiện trên màn hình rộng */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-[#0d1b31] via-[#122a52] to-[#1e40af] p-8 text-white md:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:18px_18px]"
          />
          <div className="relative">
            <div className="flex items-center gap-3">
              <Logo className="h-11 w-11 drop-shadow" />
              <div>
                <div className="text-[10px] font-semibold tracking-[0.2em] text-blue-200 uppercase">Căn tin</div>
                <div className="text-sm font-semibold">Quản lý căn tin</div>
              </div>
            </div>

            <h2 className="mt-10 max-w-xs text-[26px] leading-tight font-semibold tracking-tight">
              Bán hàng nhanh,
              <br />
              sổ sách rõ ràng.
            </h2>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-blue-100/80">
              Lập phiếu, kiểm phiếu và theo dõi hàng còn thiếu cho can phạm trong cùng một màn hình.
            </p>
          </div>

          <ul className="relative mt-10 space-y-3 text-[13px] text-blue-50/90">
            {[
              "Lập phiếu bằng bàn phím, không cần rê chuột",
              "Tự điền thông tin can phạm đã mua trước",
              "Báo cáo doanh thu và hàng còn thiếu theo ngày",
            ].map((dong) => (
              <li key={dong} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/15 text-blue-100">
                  <BieuTuong ten="check" className="h-3 w-3" />
                </span>
                {dong}
              </li>
            ))}
          </ul>

          <div className="relative mt-8 border-t border-white/10 pt-4 text-[11px] text-blue-200/70">
            Dành cho cán bộ quản lý căn tin
          </div>
        </aside>

        {/* Cột đăng nhập */}
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <Logo className="h-11 w-11" />
            <div>
              <h1 className="text-[15px] font-semibold text-slate-900">Quản lý căn tin phạm nhân</h1>
              <p className="text-[12px] text-slate-500">Đăng nhập để tiếp tục</p>
            </div>
          </div>

          <div className="hidden md:block">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Đăng nhập</h1>
            <p className="mt-1 text-[13px] text-slate-500">Dùng tài khoản được cấp để vào hệ thống.</p>
          </div>

          <form onSubmit={dangNhap} className="mt-6 flex flex-col gap-4">
            <div>
              <ONhan>Tên đăng nhập</ONhan>
              <OText
                autoFocus
                value={tenDangNhap}
                onChange={(e) => setTenDangNhap(e.target.value)}
                placeholder="admin"
                autoComplete="username"
              />
            </div>

            <div>
              <ONhan>Mật khẩu</ONhan>
              <div className="relative">
                <OText
                  type={hienMatKhau ? "text" : "password"}
                  value={matKhau}
                  onChange={(e) => setMatKhau(e.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setHienMatKhau((v) => !v)}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={hienMatKhau ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  title={hienMatKhau ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    {hienMatKhau ? (
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A9.8 9.8 0 0 1 12 5c5 0 9 4.5 9 7 0 .9-.6 2-1.6 3.1M6.2 6.7C3.9 8.2 3 10.2 3 12c0 2.5 4 7 9 7 1.3 0 2.5-.3 3.6-.8" strokeLinecap="round" strokeLinejoin="round" />
                    ) : (
                      <>
                        <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="2.5" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {loi && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700">
                <BieuTuong ten="canh" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{loi}</span>
              </div>
            )}

            <Nut type="submit" kieu="chinh" co="lg" disabled={dangGui} className="mt-1 w-full">
              {dangGui ? "Đang kiểm tra…" : "Đăng nhập"}
            </Nut>
          </form>

          <p className="mt-5 text-center text-[12px] leading-relaxed text-slate-500">
            Lần đầu sử dụng, đăng nhập bằng tài khoản <b className="text-slate-700">admin</b> với mật khẩu{" "}
            <b className="text-slate-700">admin</b>, rồi đổi mật khẩu ngay.
          </p>
        </div>
      </div>
    </div>
  );
}
