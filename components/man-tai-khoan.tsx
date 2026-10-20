"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/client";
import { useStore } from "@/lib/store";
import { MO_TA_QUYEN, NHOM_QUYEN, QUYEN_DAY_DU, TEN_QUYEN, type Quyen } from "@/lib/quyen";
import type { NguoiDungCongKhai } from "@/lib/types";
import { thoiGianTruoc } from "@/lib/format";
import { useNap } from "@/lib/use-nap";
import { bao, baoLoi, BieuTuong, HopThoai, Nhan, Nut, ONhan, OText, Trong } from "./ui";

/** Tín hiệu cũ hơn khoảng này được coi là đã rời trang. */
const HAN_HIEN_DIEN_MS = 2 * 60 * 1000;

type FormTK = {
  id?: string;
  tenDangNhap: string;
  hoTen: string;
  matKhau: string;
  quyen: Quyen[];
  dangHoatDong: boolean;
};

const formTrong: FormTK = {
  tenDangNhap: "",
  hoTen: "",
  matKhau: "",
  quyen: ["xem_phieu", "ban_hang"],
  dangHoatDong: true,
};

export function ManTaiKhoan() {
  const { nguoiDung: toi, napLai } = useStore();
  const [ds, setDs] = useState<NguoiDungCongKhai[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [form, setForm] = useState<FormTK | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [datLai, setDatLai] = useState<NguoiDungCongKhai | null>(null);
  const [matKhauMoi, setMatKhauMoi] = useState("");
  const [chiTiet, setChiTiet] = useState<NguoiDungCongKhai | null>(null);
  const [bayGio, setBayGio] = useState(() => Date.now());

  // Cập nhật đồng hồ và làm mới tín hiệu truy cập mà không chớp trạng thái tải.
  useEffect(() => {
    let huy = false;
    const lamMoi = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const kq = await apiClient.dsTaiKhoan();
        if (huy) return;
        setDs(kq.nguoiDung);
        setChiTiet((cu) => (cu ? (kq.nguoiDung.find((nd) => nd.id === cu.id) ?? cu) : null));
      } catch {
        // Bỏ qua lỗi mạng khi làm mới nền.
      }
    };
    const dongHo = window.setInterval(() => {
      setBayGio(Date.now());
      void lamMoi();
    }, 30_000);
    return () => {
      huy = true;
      window.clearInterval(dongHo);
    };
  }, []);

  const dangOnline = (nd: NguoiDungCongKhai) => {
    if (!nd.lanHoatDong) return false;
    const luc = Date.parse(nd.lanHoatDong);
    return Number.isFinite(luc) && bayGio - luc <= HAN_HIEN_DIEN_MS;
  };

  const moSua = (nd: NguoiDungCongKhai) => {
    setForm({
      id: nd.id,
      tenDangNhap: nd.tenDangNhap,
      hoTen: nd.hoTen,
      matKhau: "",
      quyen: [...nd.quyen],
      dangHoatDong: nd.dangHoatDong,
    });
    setChiTiet(null);
  };

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      setDs((await apiClient.dsTaiKhoan()).nguoiDung);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangTai(false);
    }
  }, []);

  useNap(nap);

  const luu = async () => {
    if (!form) return;
    if (!form.hoTen.trim()) {
      baoLoi("Chưa nhập họ tên");
      return;
    }
    if (!form.id) {
      if (!/^[a-z0-9._-]{3,32}$/.test(form.tenDangNhap.trim().toLowerCase())) {
        baoLoi("Tên đăng nhập chỉ gồm chữ thường, số và . _ - (3–32 ký tự)");
        return;
      }
      if (form.matKhau.length < 6) {
        baoLoi("Mật khẩu phải có ít nhất 6 ký tự");
        return;
      }
    }
    setDangLuu(true);
    try {
      if (form.id) {
        await apiClient.suaTaiKhoan(form.id, {
          hoTen: form.hoTen.trim(),
          quyen: form.quyen,
          dangHoatDong: form.dangHoatDong,
        });
        bao(`Đã cập nhật tài khoản ${form.tenDangNhap}`);
      } else {
        await apiClient.themTaiKhoan({
          tenDangNhap: form.tenDangNhap.trim().toLowerCase(),
          hoTen: form.hoTen.trim(),
          matKhau: form.matKhau,
          quyen: form.quyen,
          dangHoatDong: form.dangHoatDong,
        });
        bao(`Đã tạo tài khoản ${form.tenDangNhap.trim().toLowerCase()}`);
      }
      setForm(null);
      await nap();
      await napLai();
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  };

  const luuDatLai = async () => {
    if (!datLai) return;
    if (matKhauMoi.length < 6) {
      baoLoi("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    setDangLuu(true);
    try {
      await apiClient.suaTaiKhoan(datLai.id, { matKhauMoi });
      bao(`Đã đặt lại mật khẩu cho ${datLai.tenDangNhap}. Người dùng sẽ được nhắc đổi khi đăng nhập.`);
      setDatLai(null);
      setMatKhauMoi("");
      await nap();
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  };

  const xoa = async (nd: NguoiDungCongKhai) => {
    if (!window.confirm(`Xoá tài khoản “${nd.tenDangNhap}” của ${nd.hoTen}?`)) return;
    try {
      const kq = await apiClient.xoaTaiKhoan(nd.id);
      bao(`Đã xoá tài khoản ${kq.hoTen}`);
      await nap();
    } catch (e) {
      baoLoi((e as Error).message);
    }
  };

  /** Cụm nút thao tác dùng chung cho bảng trên máy tính và danh sách thẻ trên điện thoại */
  const thaoTacNd = (nd: NguoiDungCongKhai) => (
    <div
      className="flex items-center justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <Nut
        kieu="mo"
        co="sm"
        title="Đặt lại mật khẩu"
        onClick={() => {
          setDatLai(nd);
          setMatKhauMoi("");
        }}
      >
        <BieuTuong ten="cai" className="h-4 w-4" />
      </Nut>
      <Nut kieu="mo" co="sm" title="Sửa họ tên, quyền, trạng thái" onClick={() => moSua(nd)}>
        <BieuTuong ten="sua" className="h-4 w-4" />
      </Nut>
      <Nut
        kieu="mo"
        co="sm"
        title="Xoá tài khoản"
        onClick={() => void xoa(nd)}
        className="hover:text-rose-600"
      >
        <BieuTuong ten="xoa" className="h-4 w-4" />
      </Nut>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-the">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-3 py-2.5">
        <div className="mr-auto">
          <div className="text-sm font-semibold text-slate-800">Tài khoản</div>
          <div className="text-[11px] text-slate-500">
            Bật/tắt từng quyền cho mỗi tài khoản. Mật khẩu lưu dạng đã băm, không xem lại được.
          </div>
        </div>
        <Nut kieu="chinh" onClick={() => setForm({ ...formTrong })}>
          <BieuTuong ten="them" /> Thêm tài khoản
        </Nut>
      </div>

      {/* Trên điện thoại, danh sách tài khoản dùng thẻ để quyền không bị cắt */}
      <div className="sm:hidden">
        {ds.length === 0 ? (
          <Trong tieuDe={dangTai ? "Đang tải…" : "Chưa có tài khoản nào"} />
        ) : (
          <div className="divide-y divide-slate-100">
            {ds.map((nd) => (
              <div
                key={nd.id}
                role="button"
                tabIndex={0}
                onClick={() => setChiTiet(nd)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setChiTiet(nd);
                  }
                }}
                className={`cursor-pointer p-3 transition-colors hover:bg-slate-50 ${
                  nd.dangHoatDong ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[13px] font-semibold text-slate-800">{nd.tenDangNhap}</span>
                      {nd.id === toi?.id && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                          bạn
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-medium text-slate-800">{nd.hoTen}</div>
                    {nd.phaiDoiMatKhau && (
                      <div className="text-[11px] text-amber-600">Chưa đổi mật khẩu ban đầu</div>
                    )}
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      nd.dangHoatDong
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${nd.dangHoatDong ? "bg-emerald-500" : "bg-slate-400"}`}
                    />
                    {nd.dangHoatDong ? "Hoạt động" : "Đã khoá"}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                  {dangOnline(nd) ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Đang truy cập
                      {nd.trangDangXem && <span className="font-normal text-slate-600">· {nd.trangDangXem}</span>}
                    </span>
                  ) : (
                    <span className="text-slate-500">
                      {nd.lanHoatDong ? `Truy cập ${thoiGianTruoc(nd.lanHoatDong, bayGio)}` : "Chưa có tín hiệu truy cập"}
                    </span>
                  )}
                  {nd.thietBi && <span className="text-slate-400">· {nd.thietBi}</span>}
                </div>

                <div className="mt-1 text-[11px] text-slate-500">
                  {nd.lanDangNhapCuoi
                    ? `Đăng nhập cuối ${new Date(nd.lanDangNhapCuoi).toLocaleString("vi-VN")}`
                    : "Chưa đăng nhập"}
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {nd.quyen.length === 0 ? (
                    <span className="text-[11px] text-slate-500">Chưa được cấp quyền nào</span>
                  ) : (
                    nd.quyen.map((q) => (
                      <span
                        key={q}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600"
                      >
                        {TEN_QUYEN[q]}
                      </span>
                    ))
                  )}
                </div>

                <div className="mt-2 flex justify-end border-t border-slate-100 pt-2">{thaoTacNd(nd)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mem-cuon hidden max-h-[66vh] overflow-auto sm:block">
        <table className="w-full min-w-[1240px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[12px] text-slate-600">
            <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
              <th className="w-40">Tên đăng nhập</th>
              <th className="w-48">Họ tên</th>
              <th>Quyền được cấp</th>
              <th className="w-28">Trạng thái</th>
              <th className="w-64">Đang truy cập</th>
              <th className="w-36">Đăng nhập cuối</th>
              <th className="w-28" />
            </tr>
          </thead>
          <tbody>
            {ds.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <Trong tieuDe={dangTai ? "Đang tải…" : "Chưa có tài khoản nào"} />
                </td>
              </tr>
            )}
            {ds.map((nd) => (
              <tr
                key={nd.id}
                onClick={() => setChiTiet(nd)}
                className={`cursor-pointer align-top transition-colors hover:bg-slate-50 [&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-2 ${
                  nd.dangHoatDong ? "" : "opacity-55"
                }`}
              >
                <td className="font-mono text-[13px] text-slate-700">
                  {nd.tenDangNhap}
                  {nd.id === toi?.id && (
                    <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                      bạn
                    </span>
                  )}
                </td>
                <td className="font-medium text-slate-800">
                  {nd.hoTen}
                  {nd.phaiDoiMatKhau && (
                    <div className="text-[11px] font-normal text-amber-600">Chưa đổi mật khẩu ban đầu</div>
                  )}
                </td>
                <td>
                  {nd.quyen.length === 0 ? (
                    <span className="text-[12px] text-slate-500">Chưa được cấp quyền nào</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {nd.quyen.map((q) => (
                        <span
                          key={q}
                          className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600"
                        >
                          {TEN_QUYEN[q]}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      nd.dangHoatDong
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-300 bg-slate-100 text-slate-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${nd.dangHoatDong ? "bg-emerald-500" : "bg-slate-400"}`}
                    />
                    {nd.dangHoatDong ? "Hoạt động" : "Đã khoá"}
                  </span>
                  {dangOnline(nd) && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Đang truy cập
                    </div>
                  )}
                </td>
                <td>
                  {dangOnline(nd) ? (
                    <div className="text-[12px] font-medium text-slate-800">{nd.trangDangXem || "Đang truy cập"}</div>
                  ) : (
                    <div className="text-[12px] text-slate-500">
                      {nd.trangDangXem ? `Lần cuối: ${nd.trangDangXem}` : "Chưa có tín hiệu"}
                    </div>
                  )}
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {nd.lanHoatDong ? thoiGianTruoc(nd.lanHoatDong, bayGio) : "—"}
                    {nd.thietBi && <span className="text-slate-400"> · {nd.thietBi}</span>}
                  </div>
                </td>
                <td className="text-[12px] text-slate-500">
                  {nd.lanDangNhapCuoi ? new Date(nd.lanDangNhapCuoi).toLocaleString("vi-VN") : "Chưa đăng nhập"}
                </td>
                <td>{thaoTacNd(nd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Thêm / sửa tài khoản --- */}
      <HopThoai
        mo={form !== null}
        dong={() => setForm(null)}
        tieuDe={form?.id ? `Sửa tài khoản ${form.tenDangNhap}` : "Thêm tài khoản"}
        rong="max-w-2xl"
        chanTrang={
          <>
            <Nut onClick={() => setForm(null)} disabled={dangLuu}>
              Huỷ
            </Nut>
            <Nut kieu="chinh" onClick={() => void luu()} disabled={dangLuu}>
              {dangLuu ? "Đang lưu…" : "Lưu tài khoản"}
            </Nut>
          </>
        }
      >
        {form && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <ONhan>Tên đăng nhập *</ONhan>
                <OText
                  autoFocus={!form.id}
                  value={form.tenDangNhap}
                  disabled={Boolean(form.id)}
                  onChange={(e) => setForm({ ...form, tenDangNhap: e.target.value })}
                  placeholder="canbo1"
                  className="font-mono"
                />
                {form.id && <p className="mt-1 text-[11px] text-slate-500">Không đổi được tên đăng nhập</p>}
              </div>
              <div>
                <ONhan>Họ tên *</ONhan>
                <OText
                  autoFocus={Boolean(form.id)}
                  value={form.hoTen}
                  onChange={(e) => setForm({ ...form, hoTen: e.target.value })}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              {!form.id && (
                <div className="col-span-2">
                  <ONhan>Mật khẩu ban đầu * (ít nhất 6 ký tự)</ONhan>
                  <OText
                    type="text"
                    value={form.matKhau}
                    onChange={(e) => setForm({ ...form, matKhau: e.target.value })}
                    placeholder="Người dùng sẽ được nhắc đổi khi đăng nhập"
                  />
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
                  Quyền được cấp
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, quyen: [...QUYEN_DAY_DU] })}
                    className="text-[12px] font-medium text-blue-700 hover:underline"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, quyen: [] })}
                    className="text-[12px] font-medium text-slate-500 hover:underline"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
              <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2">
                {NHOM_QUYEN.map((nhom) => (
                  <div key={nhom.nhom}>
                    <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                      {nhom.nhom}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {nhom.quyen.map((q) => (
                        <label
                          key={q}
                          className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 hover:bg-white"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 shrink-0 accent-blue-700"
                            checked={form.quyen.includes(q)}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                quyen: e.target.checked
                                  ? QUYEN_DAY_DU.filter((x) => x === q || form.quyen.includes(x))
                                  : form.quyen.filter((x) => x !== q),
                              })
                            }
                          />
                          <span className="min-w-0">
                            <span className="block text-[13px] font-medium text-slate-800">{TEN_QUYEN[q]}</span>
                            <span className="block text-[11px] text-slate-500">{MO_TA_QUYEN[q]}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-700"
                checked={form.dangHoatDong}
                onChange={(e) => setForm({ ...form, dangHoatDong: e.target.checked })}
              />
              <span className="text-sm text-slate-700">
                Cho phép đăng nhập <span className="text-slate-500">(bỏ chọn để khoá tài khoản)</span>
              </span>
            </label>
          </div>
        )}
      </HopThoai>

      {/* --- Đặt lại mật khẩu --- */}
      <HopThoai
        mo={datLai !== null}
        dong={() => setDatLai(null)}
        tieuDe={datLai ? `Đặt lại mật khẩu cho ${datLai.tenDangNhap}` : ""}
        chanTrang={
          <>
            <Nut onClick={() => setDatLai(null)} disabled={dangLuu}>
              Huỷ
            </Nut>
            <Nut kieu="chinh" onClick={() => void luuDatLai()} disabled={dangLuu}>
              {dangLuu ? "Đang lưu…" : "Đặt lại mật khẩu"}
            </Nut>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
            Mật khẩu cũ không xem lại được. Đặt mật khẩu mới rồi gửi cho người dùng; họ sẽ được nhắc đổi khi đăng
            nhập.
          </p>
          <div>
            <ONhan>Mật khẩu mới (ít nhất 6 ký tự)</ONhan>
            <OText autoFocus value={matKhauMoi} onChange={(e) => setMatKhauMoi(e.target.value)} />
          </div>
        </div>
      </HopThoai>

      {/* --- Chi tiết tài khoản và trạng thái truy cập --- */}
      <HopThoai
        mo={chiTiet !== null}
        dong={() => setChiTiet(null)}
        tieuDe={chiTiet ? `Tài khoản ${chiTiet.tenDangNhap}` : ""}
        rong="max-w-2xl"
        chanTrang={
          <>
            <Nut onClick={() => setChiTiet(null)}>Đóng</Nut>
            {chiTiet && (
              <Nut kieu="chinh" onClick={() => moSua(chiTiet)}>
                <BieuTuong ten="sua" className="h-4 w-4" /> Sửa tài khoản
              </Nut>
            )}
          </>
        }
      >
        {chiTiet && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[16px] font-semibold tracking-tight text-slate-900">{chiTiet.hoTen}</div>
                <div className="font-mono text-[12px] text-slate-500">{chiTiet.tenDangNhap}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Nhan sac={chiTiet.dangHoatDong ? "luc" : "xam"}>
                  {chiTiet.dangHoatDong ? "Được phép đăng nhập" : "Đã khoá"}
                </Nhan>
                <Nhan sac={dangOnline(chiTiet) ? "luc" : "xam"}>
                  {dangOnline(chiTiet) ? "Đang truy cập" : "Không trực tuyến"}
                </Nhan>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Họ tên</div>
                <div className="mt-0.5 text-[13px] font-medium text-slate-800">{chiTiet.hoTen}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Tên đăng nhập</div>
                <div className="mt-0.5 font-mono text-[13px] text-slate-800">{chiTiet.tenDangNhap}</div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Đăng nhập cuối</div>
                <div className="mt-0.5 text-[13px] text-slate-800">
                  {chiTiet.lanDangNhapCuoi
                    ? new Date(chiTiet.lanDangNhapCuoi).toLocaleString("vi-VN")
                    : "Chưa đăng nhập lần nào"}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Mật khẩu</div>
                <div className="mt-0.5 text-[13px] text-slate-800">
                  {chiTiet.phaiDoiMatKhau ? "Đang dùng mật khẩu ban đầu" : "Đã đổi mật khẩu"}
                </div>
              </div>
            </div>

            <div
              className={`rounded-xl border p-3 ${
                dangOnline(chiTiet) ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    dangOnline(chiTiet) ? "animate-pulse bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <span className="text-[13px] font-semibold text-slate-800">
                  {dangOnline(chiTiet) ? "Đang truy cập hệ thống" : "Không có tín hiệu truy cập"}
                </span>
              </div>
              <div className="mt-2 grid gap-2 text-[12px] sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">Màn hình: </span>
                  <span className="font-medium text-slate-800">{chiTiet.trangDangXem || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500">Thiết bị: </span>
                  <span className="font-medium text-slate-800">{chiTiet.thietBi || "—"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Hoạt động gần nhất: </span>
                  <span className="font-medium text-slate-800">
                    {chiTiet.lanHoatDong
                      ? `${thoiGianTruoc(chiTiet.lanHoatDong, bayGio)} · ${new Date(chiTiet.lanHoatDong).toLocaleString("vi-VN")}`
                      : "Chưa có tín hiệu"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                Quyền được cấp
              </div>
              {chiTiet.quyen.length === 0 ? (
                <span className="text-[12px] text-slate-500">Chưa được cấp quyền nào</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {chiTiet.quyen.map((q) => (
                    <span
                      key={q}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] text-slate-700"
                    >
                      {TEN_QUYEN[q]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </HopThoai>
    </div>
  );
}

/**
 * Hộp thoại đổi mật khẩu của chính người đang đăng nhập.
 *
 * Khung ứng dụng chỉ dựng hộp thoại khi mở (xem app-shell) nên mỗi lần mở là một
 * lần mount mới, state tự trắng. Nếu giữ hộp thoại thường trực, ô "mật khẩu hiện
 * tại" sẽ còn chữ gõ dở từ lần trước — mà ô mật khẩu hiện dấu chấm nên người dùng
 * không nhìn ra, dẫn tới báo sai mật khẩu một cách vô cớ.
 */
export function HopDoiMatKhau({ mo, dong }: { mo: boolean; dong: () => void }) {
  const { napLai, nguoiDung } = useStore();
  const [matKhauCu, setMatKhauCu] = useState("");
  const [matKhauMoi, setMatKhauMoi] = useState("");
  const [nhapLai, setNhapLai] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState("");

  const doi = async () => {
    setLoi("");
    if (matKhauMoi.length < 6) {
      setLoi("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (matKhauMoi !== nhapLai) {
      setLoi("Nhập lại mật khẩu mới không khớp");
      return;
    }
    setDangLuu(true);
    try {
      await apiClient.doiMatKhau(matKhauCu, matKhauMoi);
      bao("Đã đổi mật khẩu");
      setMatKhauCu("");
      setMatKhauMoi("");
      setNhapLai("");
      await napLai();
      dong();
    } catch (e) {
      const msg = (e as Error).message;
      setLoi(msg);
      // Sai mật khẩu hiện tại thì xoá ô đó, buộc gõ lại từ đầu cho chắc
      if (msg.includes("hiện tại")) setMatKhauCu("");
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <HopThoai
      mo={mo}
      dong={dong}
      tieuDe="Đổi mật khẩu"
      chanTrang={
        <>
          <Nut onClick={dong} disabled={dangLuu}>
            Huỷ
          </Nut>
          <Nut kieu="chinh" onClick={() => void doi()} disabled={dangLuu}>
            {dangLuu ? "Đang lưu…" : "Đổi mật khẩu"}
          </Nut>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {nguoiDung && (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
            Đang đổi mật khẩu cho tài khoản{" "}
            <b className="font-mono text-slate-900">{nguoiDung.tenDangNhap}</b>
            {nguoiDung.hoTen ? ` — ${nguoiDung.hoTen}` : ""}
          </div>
        )}

        <div>
          <ONhan>Mật khẩu hiện tại</ONhan>
          <OText
            autoFocus
            type="password"
            value={matKhauCu}
            onChange={(e) => setMatKhauCu(e.target.value)}
            // Đây là ô đổi mật khẩu, không phải ô đăng nhập: tắt tự động điền để
            // trình duyệt không chèn mật khẩu cũ đã lưu vào.
            autoComplete="off"
          />
        </div>
        <div>
          <ONhan>Mật khẩu mới (ít nhất 6 ký tự)</ONhan>
          <OText
            type="password"
            value={matKhauMoi}
            onChange={(e) => setMatKhauMoi(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div>
          <ONhan>Nhập lại mật khẩu mới</ONhan>
          <OText
            type="password"
            value={nhapLai}
            onChange={(e) => setNhapLai(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {loi && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            {loi}
            {loi.includes("hiện tại") && (
              <span className="mt-1 block text-rose-600/90">
                Ô mật khẩu hiện tại đã được xoá. Gõ lại thật chậm, chú ý không để dấu cách ở đầu
                hoặc cuối.
              </span>
            )}
          </div>
        )}
      </div>
    </HopThoai>
  );
}
