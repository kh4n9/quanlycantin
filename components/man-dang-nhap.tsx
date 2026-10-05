"use client";

import { useState } from "react";
import { apiClient } from "@/lib/client";
import { useStore } from "@/lib/store";
import { baoLoi, BieuTuong, Nut, ONhan, OText } from "./ui";

export function ManDangNhap() {
  const { napLai } = useStore();
  const [tenDangNhap, setTenDangNhap] = useState("");
  const [matKhau, setMatKhau] = useState("");
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
    <div className="khong-in flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
            <BieuTuong ten="phieu" className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold text-white">Quản lý căn tin phạm nhân</h1>
          <p className="text-[13px] text-slate-400">Đăng nhập để tiếp tục</p>
        </div>

        <form
          onSubmit={dangNhap}
          className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-white p-4 shadow-xl"
        >
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
            <OText
              type="password"
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
            />
          </div>

          {loi && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
              {loi}
            </div>
          )}

          <Nut type="submit" kieu="chinh" co="lg" disabled={dangGui} className="mt-1 w-full">
            {dangGui ? "Đang kiểm tra…" : "Đăng nhập"}
          </Nut>
        </form>

        <p className="mt-4 text-center text-[12px] leading-relaxed text-slate-400">
          Lần đầu sử dụng, đăng nhập bằng tài khoản <b className="text-slate-300">admin</b> với mật khẩu{" "}
          <b className="text-slate-300">admin</b>, rồi đổi mật khẩu ngay.
        </p>
      </div>
    </div>
  );
}
