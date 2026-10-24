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
    <div className="khong-in relative flex min-h-screen items-center justify-center overflow-hidden bg-giay p-4 sm:p-6">
      {/* Nền giấy kẻ dòng, rất nhạt — chỉ để mặt phẳng không trơn như màn hình */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45 [background-image:repeating-linear-gradient(180deg,transparent_0_33px,#dde1d6_33px_34px)]"
      />
      {/* Lề đỏ của vở kẻ dòng: một vạch dọc duy nhất, giữ chỗ cho gáy vở */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-10 w-px bg-dau/15 sm:left-16" />

      <div className="hop-noi relative grid w-full max-w-5xl overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-noi md:grid-cols-[1.05fr_1fr]">
        {/* Cột giới thiệu — chỉ hiện trên màn hình rộng */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-muc p-9 text-giay/70 md:flex md:border-r md:border-giay/15">
          {/* Vân chấm mờ, như giấy in bảo an */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:16px_16px]"
          />

          <div className="relative flex items-center gap-3">
            <Logo className="h-11 w-11" />
            <div>
              <div className="font-mono text-[9.5px] tracking-[0.18em] text-giay/45 uppercase">Sổ cấp phát</div>
              <div className="mt-1 font-serif text-[15px] leading-tight font-semibold text-giay-cao">
                Quản lý căn tin
              </div>
            </div>
          </div>

          <div className="relative mt-10">
            <div className="font-mono text-[9.5px] tracking-[0.18em] text-giay/40 uppercase">Ghi nhận tại quầy</div>
            <h2 className="mt-3 font-serif text-[32px] leading-[1.16] font-semibold tracking-[-0.025em] text-giay-cao">
              Mỗi phiếu một dòng sổ,
              <br />
              mỗi đồng đều rõ.
            </h2>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-giay/55">
              Lập phiếu, in phiếu và đối soát hàng còn thiếu cho can phạm trong cùng một chỗ.
            </p>
          </div>

          <ul className="relative mt-10 space-y-2.5 border-t border-white/10 pt-5 text-[12.5px] text-giay/60">
            {[
              "Lập phiếu bằng bàn phím, không cần rê chuột",
              "Tự điền thông tin can phạm đã mua trước",
              "Báo cáo doanh thu và hàng còn thiếu theo ngày",
            ].map((dong) => (
              <li key={dong} className="flex items-baseline gap-2.5">
                <span aria-hidden className="h-px w-3 shrink-0 translate-y-[-2px] bg-dau" />
                {dong}
              </li>
            ))}
          </ul>
        </aside>

        {/* Cột đăng nhập */}
        <div className="flex flex-col justify-center p-6 sm:p-8 md:p-10">
          <div className="mb-7 flex items-center gap-3 md:hidden">
            <Logo className="h-11 w-11" />
            <div>
              <div className="font-mono text-[9px] tracking-[0.18em] text-muc-mo uppercase">Sổ cấp phát</div>
              <h1 className="mt-0.5 font-serif text-[16px] leading-tight font-semibold text-muc">
                Quản lý căn tin phạm nhân
              </h1>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="font-mono text-[9.5px] tracking-[0.18em] text-muc-mo uppercase">Đăng nhập</div>
            <h1 className="mt-2 font-serif text-[27px] leading-tight font-semibold tracking-[-0.02em] text-muc">
              Vào hệ thống
            </h1>
            <p className="mt-1.5 text-[13px] text-muc-nhat">Dùng tài khoản được cấp để tiếp tục.</p>
          </div>

          <form onSubmit={dangNhap} className="mt-7 flex flex-col gap-4">
            <div>
              <ONhan>Tên đăng nhập</ONhan>
              <OText
                autoFocus
                value={tenDangNhap}
                onChange={(e) => setTenDangNhap(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                aria-label="Tên đăng nhập"
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
                  aria-label="Mật khẩu"
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setHienMatKhau((v) => !v)}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-sm p-1.5 text-muc-mo transition hover:bg-muc/6 hover:text-muc"
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
              <div role="alert" className="flex items-start gap-2 rounded-md border border-dau/25 border-l-[3px] border-l-dau bg-dau-nhat px-3 py-2.5 text-[13px] text-dau">
                <BieuTuong ten="canh" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{loi}</span>
              </div>
            )}

            <Nut type="submit" kieu="chinh" co="lg" disabled={dangGui} className="mt-1 w-full">
              {dangGui ? "Đang kiểm tra…" : "Đăng nhập"}
            </Nut>
          </form>

          <div className="mt-6 border-t border-ke pt-4 text-[12px] leading-relaxed text-muc-nhat">
            Lần đầu sử dụng, đăng nhập bằng tài khoản{" "}
            <b className="font-mono font-medium text-muc">admin</b> với mật khẩu{" "}
            <b className="font-mono font-medium text-muc">admin</b>, rồi đổi mật khẩu ngay.
          </div>
        </div>
      </div>
    </div>
  );
}
