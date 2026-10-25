"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/lib/client";
import { useStore } from "@/lib/store";
import {
  chuanHoaQuyen,
  DS_QUYEN,
  MO_TA_QUYEN,
  NHOM_QUYEN,
  quyenBatBuocBoi,
  rutGonQuyen,
  TEN_QUYEN,
  VAI_TRO,
  vaiTroCua,
  type Quyen,
  type VaiTro,
} from "@/lib/quyen";
import type { NguoiDungCongKhai } from "@/lib/types";
import { thoiGianTruoc } from "@/lib/format";
import { useNap } from "@/lib/use-nap";
import { bao, baoLoi, BieuTuong, HopThoai, Nhan, Nut, ONhan, OText, Trong } from "./ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

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
  // Mặc định là bộ quyền gọn của vai trò Thu ngân; các quyền nền như xem
  // phiếu / xem can phạm được bật tự động khi lưu.
  quyen: ["ban_hang", "sua_phieu"],
  dangHoatDong: true,
};

/** Ô chọn cả nhóm quyền, có trạng thái nửa chọn khi mới cấp một phần. */
function OTichNhom({
  daChon,
  nuaChon,
  onChange,
}: {
  daChon: boolean;
  nuaChon: boolean;
  onChange: (chon: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = nuaChon;
  }, [nuaChon]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 shrink-0 cursor-pointer accent-muc"
      checked={daChon}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}

/** Nhãn cho biết bộ quyền đang khớp vai trò mẫu nào. */
function NhanVaiTro({ quyen, lon = false }: { quyen: Quyen[]; lon?: boolean }) {
  const vaiTro = vaiTroCua(quyen);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border font-mono font-medium tracking-[0.03em] uppercase whitespace-nowrap ${
        lon ? "px-2 py-1 text-[10.5px]" : "px-1.5 py-0.5 text-[9.5px]"
      } ${vaiTro ? "border-muc/20 bg-muc/6 text-muc" : "border-ke-dam bg-giay text-muc-nhat"}`}
    >
      <BieuTuong ten={vaiTro ? "nguoi" : "cai"} className={lon ? "h-3.5 w-3.5" : "h-3 w-3"} />
      {vaiTro?.ten ?? "Tuỳ chỉnh"}
    </span>
  );
}

/**
 * Quyền được cấp đọc gọn theo bốn nhóm, kèm số quyền từng nhóm — thay cho
 * mười một chip rải kín cột khiến bảng dài và khó so sánh giữa các tài khoản.
 */
function QuyenTheoNhom({ quyen }: { quyen: Quyen[] }) {
  const co = new Set(quyen);
  return (
    <div className="flex flex-wrap gap-1">
      {NHOM_QUYEN.map((n) => {
        const soCo = n.quyen.filter((q) => co.has(q)).length;
        if (soCo === 0) return null;
        return (
          <span
            key={n.nhom}
            title={n.quyen
              .filter((q) => co.has(q))
              .map((q) => TEN_QUYEN[q])
              .join(", ")}
            className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.02em] whitespace-nowrap ${
              soCo === n.quyen.length
                ? "border-muc/20 bg-muc/6 text-muc"
                : "border-ke-dam bg-giay text-muc-nhat"
            }`}
          >
            {n.nhom}
            <b className={soCo === n.quyen.length ? "text-muc" : "text-muc-nhat"}>
              {soCo}/{n.quyen.length}
            </b>
          </span>
        );
      })}
      {quyen.length === 0 && (
        <span className="font-mono text-[10.5px] text-muc-mo">Chưa được cấp quyền nào</span>
      )}
    </div>
  );
}

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
      quyen: rutGonQuyen(nd.quyen),
      dangHoatDong: nd.dangHoatDong,
    });
    setChiTiet(null);
  };

  /* ---------------------- Chọn quyền trong hộp thoại ---------------------- */

  const quyenHieuLuc = useMemo(() => (form ? chuanHoaQuyen(form.quyen) : []), [form]);
  const vaiTroDangChon = useMemo(() => (form ? vaiTroCua(form.quyen) : null), [form]);

  const capNhatQuyen = (moi: Iterable<Quyen>) => {
    if (!form) return;
    const co = new Set(moi);
    // Giữ lại quyền chọn trực tiếp; quyền đi kèm do `chuanHoaQuyen` tự bật.
    setForm({
      ...form,
      quyen: rutGonQuyen(DS_QUYEN.filter((q) => co.has(q))),
    });
  };

  const batTatQuyen = (q: Quyen, bat: boolean) => {
    if (!form) return;
    const co = new Set(form.quyen);
    if (bat) co.add(q);
    else co.delete(q);
    capNhatQuyen(co);
  };

  const batTatNhom = (nhom: Quyen[], bat: boolean) => {
    if (!form) return;
    const co = new Set(form.quyen);
    for (const q of nhom) {
      if (bat) co.add(q);
      else co.delete(q);
    }
    capNhatQuyen(co);
  };

  const chonVaiTro = (vaiTro: VaiTro) => {
    if (!form) return;
    setForm({ ...form, quyen: rutGonQuyen(vaiTro.quyen) });
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
          quyen: chuanHoaQuyen(form.quyen),
          dangHoatDong: form.dangHoatDong,
        });
        bao(`Đã cập nhật tài khoản ${form.tenDangNhap}`);
      } else {
        await apiClient.themTaiKhoan({
          tenDangNhap: form.tenDangNhap.trim().toLowerCase(),
          hoTen: form.hoTen.trim(),
          matKhau: form.matKhau,
          quyen: chuanHoaQuyen(form.quyen),
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
        className="hover:text-dau"
      >
        <BieuTuong ten="xoa" className="h-4 w-4" />
      </Nut>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
      <div className="khia flex flex-wrap items-center gap-2 bg-giay px-3.5 py-3">
        <div className="mr-auto">
          <div className="font-serif text-[15px] leading-tight font-semibold tracking-[-0.01em] text-muc">Tài khoản</div>
          <div className="mt-0.5 text-[11.5px] text-muc-nhat">
            Gán vai trò mẫu hoặc bật/tắt từng quyền cho mỗi tài khoản. Mật khẩu lưu dạng đã băm, không xem lại được.
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
          <div className="divide-y divide-ke/60">
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
                className={`cursor-pointer p-3 transition-colors hover:bg-giay/60 ${
                  nd.dangHoatDong ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="so text-[12px] font-semibold text-muc">{nd.tenDangNhap}</span>
                      {nd.id === toi?.id && <Nhan sac="xanh">bạn</Nhan>}
                    </div>
                    <div className="mt-0.5 font-semibold text-muc">{nd.hoTen}</div>
                    {nd.phaiDoiMatKhau && (
                      <div className="mt-0.5 font-mono text-[9.5px] tracking-[0.02em] text-moc uppercase">
                        chưa đổi mật khẩu
                      </div>
                    )}
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.03em] uppercase ${
                      nd.dangHoatDong
                        ? "border-ngoc/30 bg-ngoc-nhat text-ngoc"
                        : "border-ke-dam bg-giay text-muc-mo"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${nd.dangHoatDong ? "bg-ngoc" : "bg-ke-dam"}`}
                    />
                    {nd.dangHoatDong ? "Hoạt động" : "Đã khoá"}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] tracking-[0.01em]">
                  {dangOnline(nd) ? (
                    <span className="inline-flex items-center gap-1 font-medium text-ngoc">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ngoc" />
                      Trực tuyến
                      {nd.trangDangXem && <span className="font-normal text-muc-nhat">· {nd.trangDangXem}</span>}
                    </span>
                  ) : (
                    <span className="text-muc-mo">
                      {nd.lanHoatDong ? `Truy cập ${thoiGianTruoc(nd.lanHoatDong, bayGio)}` : "Chưa có tín hiệu truy cập"}
                    </span>
                  )}
                  {nd.thietBi && <span className="text-muc-mo/70">· {nd.thietBi}</span>}
                </div>

                <div className="mt-1 font-mono text-[10px] tracking-[0.01em] text-muc-mo">
                  {nd.lanDangNhapCuoi
                    ? `Đăng nhập cuối ${new Date(nd.lanDangNhapCuoi).toLocaleString("vi-VN")}`
                    : "Chưa đăng nhập"}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <NhanVaiTro quyen={nd.quyen} />
                  <span className="so text-[9.5px] text-muc-mo">
                    {nd.quyen.length}/{DS_QUYEN.length} quyền
                  </span>
                </div>
                <div className="mt-1.5">
                  <QuyenTheoNhom quyen={nd.quyen} />
                </div>

                <div className="mt-2 flex justify-end border-t border-ke/60 pt-2">{thaoTacNd(nd)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mem-cuon hidden max-h-[66vh] overflow-auto sm:block">
        <Table className="w-full min-w-[1080px] table-fixed border-collapse text-sm">
          <TableHeader className="sticky top-0 z-10 bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
            <TableRow className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
              <TableHead className="w-[140px]">Tên đăng nhập</TableHead>
              <TableHead className="w-[160px]">Họ tên</TableHead>
              <TableHead>Quyền được cấp</TableHead>
              <TableHead className="w-[120px]">Trạng thái</TableHead>
              <TableHead className="w-[180px]">Đang truy cập</TableHead>
              <TableHead className="w-[140px]">Đăng nhập cuối</TableHead>
              <TableHead className="w-[116px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ds.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Trong tieuDe={dangTai ? "Đang tải…" : "Chưa có tài khoản nào"} />
                </TableCell>
              </TableRow>
            )}
            {ds.map((nd) => (
              <TableRow
                key={nd.id}
                onClick={() => setChiTiet(nd)}
                className={`cursor-pointer transition-colors hover:bg-giay/60 [&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-2.5 [&>td]:align-middle ${
                  nd.dangHoatDong ? "" : "opacity-55"
                }`}
              >
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="so text-[12px] font-medium text-muc">{nd.tenDangNhap}</span>
                    {nd.id === toi?.id && <Nhan sac="xanh">bạn</Nhan>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-muc">{nd.hoTen}</div>
                  {nd.phaiDoiMatKhau && (
                    <div className="mt-0.5 font-mono text-[9.5px] tracking-[0.02em] text-moc uppercase">
                      chưa đổi mật khẩu
                    </div>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <NhanVaiTro quyen={nd.quyen} />
                    <span className="so text-[9.5px] text-muc-mo">
                      {nd.quyen.length}/{DS_QUYEN.length}
                    </span>
                  </div>
                  <QuyenTheoNhom quyen={nd.quyen} />
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.03em] uppercase ${
                      nd.dangHoatDong
                        ? "border-ngoc/30 bg-ngoc-nhat text-ngoc"
                        : "border-ke-dam bg-giay text-muc-mo"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${nd.dangHoatDong ? "bg-ngoc" : "bg-ke-dam"}`} />
                    {nd.dangHoatDong ? "Hoạt động" : "Đã khoá"}
                  </span>
                  {dangOnline(nd) && (
                    <div className="mt-1 inline-flex items-center gap-1 font-mono text-[9.5px] tracking-[0.03em] text-ngoc uppercase">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ngoc" />
                      Trực tuyến
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {dangOnline(nd) ? (
                    <div className="text-[12px] font-semibold text-muc">{nd.trangDangXem || "Đang truy cập"}</div>
                  ) : (
                    <div className="text-[12px] text-muc-nhat">
                      {nd.trangDangXem ? `Lần cuối: ${nd.trangDangXem}` : "Chưa có tín hiệu"}
                    </div>
                  )}
                  <div className="mt-0.5 font-mono text-[10px] tracking-[0.01em] text-muc-mo">
                    {nd.lanHoatDong ? thoiGianTruoc(nd.lanHoatDong, bayGio) : "—"}
                    {nd.thietBi && <span className="text-muc-mo/70"> · {nd.thietBi}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  {nd.lanDangNhapCuoi ? (
                    (() => {
                      const luc = new Date(nd.lanDangNhapCuoi);
                      return (
                        <div className="font-mono text-[10.5px] leading-snug text-muc-nhat">
                          <div className="whitespace-nowrap">{luc.toLocaleDateString("vi-VN")}</div>
                          <div className="so whitespace-nowrap text-muc-mo">{luc.toLocaleTimeString("vi-VN")}</div>
                        </div>
                      );
                    })()
                  ) : (
                    <span className="font-mono text-[10.5px] text-muc-mo">Chưa đăng nhập</span>
                  )}
                </TableCell>
                <TableCell>{thaoTacNd(nd)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
                {form.id && (
                  <p className="mt-1 font-mono text-[10px] tracking-[0.02em] text-muc-mo">
                    Không đổi được tên đăng nhập
                  </p>
                )}
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
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="nhan-muc">Vai trò mẫu</span>
                <span className="font-mono text-[10px] tracking-[0.02em] text-muc-nhat">
                  {vaiTroDangChon
                    ? `Khớp vai trò: ${vaiTroDangChon.ten}`
                    : `Bộ quyền tuỳ chỉnh · ${quyenHieuLuc.length}/${DS_QUYEN.length} quyền`}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {VAI_TRO.map((vaiTro) => {
                  const dangChon = vaiTroDangChon?.ma === vaiTro.ma;
                  return (
                    <button
                      key={vaiTro.ma}
                      type="button"
                      onClick={() => chonVaiTro(vaiTro)}
                      className={`rounded-md border p-2.5 text-left transition ${
                        dangChon
                          ? "border-muc/40 bg-giay"
                          : "border-ke bg-giay-cao hover:border-ke-dam hover:bg-giay/60"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-muc">{vaiTro.ten}</span>
                        {dangChon && (
                          <span className="font-mono text-[9px] tracking-[0.06em] text-muc uppercase">
                            Đang dùng
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muc-nhat">{vaiTro.moTa}</span>
                      <span className="so mt-1 block text-[9.5px] text-muc-mo">{vaiTro.quyen.length} quyền</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="nhan-muc">
                  Quyền chi tiết{" "}
                  <span className="font-normal text-muc-mo">({quyenHieuLuc.length}/{DS_QUYEN.length})</span>
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => capNhatQuyen(DS_QUYEN)}
                    className="font-mono text-[10px] tracking-[0.02em] text-muc underline decoration-ke-dam underline-offset-2 hover:decoration-muc"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => capNhatQuyen([])}
                    className="font-mono text-[10px] tracking-[0.02em] text-muc-nhat underline decoration-ke-dam underline-offset-2 hover:decoration-muc"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {NHOM_QUYEN.map((nhom) => {
                  const soBat = nhom.quyen.filter((q) => quyenHieuLuc.includes(q)).length;
                  const daChon = soBat === nhom.quyen.length;
                  return (
                    <div key={nhom.nhom} className="rounded-md border border-ke bg-giay/40 p-2.5">
                      <label className="mb-1.5 flex cursor-pointer items-center gap-2">
                        <OTichNhom
                          daChon={daChon}
                          nuaChon={soBat > 0 && !daChon}
                          onChange={(chon) => batTatNhom(nhom.quyen, chon)}
                        />
                        <span className="nhan-muc text-muc-nhat">{nhom.nhom}</span>
                        <span className="so ml-auto text-[9.5px] text-muc-mo">
                          {soBat}/{nhom.quyen.length}
                        </span>
                      </label>
                      <div className="flex flex-col gap-0.5">
                        {nhom.quyen.map((q) => {
                          const daBat = quyenHieuLuc.includes(q);
                          const khoaBoi = quyenBatBuocBoi(q, form.quyen);
                          const biKhoa = khoaBoi.length > 0;
                          return (
                            <label
                              key={q}
                              className={`flex items-start gap-2 rounded-sm px-1 py-1 ${
                                biKhoa ? "cursor-default" : "cursor-pointer hover:bg-giay"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 shrink-0 accent-muc disabled:cursor-not-allowed disabled:opacity-60"
                                checked={daBat}
                                disabled={biKhoa}
                                onChange={(e) => batTatQuyen(q, e.target.checked)}
                              />
                              <span className="min-w-0">
                                <span className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-muc">
                                  {TEN_QUYEN[q]}
                                  {biKhoa && (
                                    <span className="rounded-sm border border-ke-dam/70 bg-giay px-1 py-0.5 font-mono text-[9px] tracking-[0.02em] text-muc-mo">
                                      tự động
                                    </span>
                                  )}
                                </span>
                                <span className="block text-[10.5px] text-muc-nhat">
                                  {biKhoa
                                    ? `Bật theo: ${khoaBoi.map((k) => TEN_QUYEN[k]).join(", ")}`
                                    : MO_TA_QUYEN[q]}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-muc"
                checked={form.dangHoatDong}
                onChange={(e) => setForm({ ...form, dangHoatDong: e.target.checked })}
              />
              <span className="text-sm text-muc">
                Cho phép đăng nhập <span className="text-muc-nhat">(bỏ chọn để khoá tài khoản)</span>
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
          <p className="rounded-sm border border-moc/30 border-l-[3px] border-l-moc bg-moc-nhat px-3 py-2 text-[12.5px] text-muc">
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
                <div className="font-serif text-[17px] font-semibold tracking-[-0.01em] text-muc">
                  {chiTiet.hoTen}
                </div>
                <div className="so text-[11.5px] text-muc-nhat">{chiTiet.tenDangNhap}</div>
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

            <div className="grid gap-3 rounded-md border border-ke bg-giay/60 p-3 sm:grid-cols-2">
              <div>
                <div className="nhan-muc">Họ tên</div>
                <div className="mt-0.5 text-[13px] font-semibold text-muc">{chiTiet.hoTen}</div>
              </div>
              <div>
                <div className="nhan-muc">Tên đăng nhập</div>
                <div className="so mt-0.5 text-[12.5px] text-muc">{chiTiet.tenDangNhap}</div>
              </div>
              <div>
                <div className="nhan-muc">Đăng nhập cuối</div>
                <div className="so mt-0.5 text-[12px] text-muc">
                  {chiTiet.lanDangNhapCuoi
                    ? new Date(chiTiet.lanDangNhapCuoi).toLocaleString("vi-VN")
                    : "Chưa đăng nhập lần nào"}
                </div>
              </div>
              <div>
                <div className="nhan-muc">Mật khẩu</div>
                <div className="mt-0.5 text-[13px] text-muc">
                  {chiTiet.phaiDoiMatKhau ? "Đang dùng mật khẩu ban đầu" : "Đã đổi mật khẩu"}
                </div>
              </div>
            </div>

            <div
              className={`rounded-md border p-3 ${
                dangOnline(chiTiet) ? "border-ngoc/30 bg-ngoc-nhat" : "border-ke bg-giay-cao"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    dangOnline(chiTiet) ? "animate-pulse bg-ngoc" : "bg-ke-dam"
                  }`}
                />
                <span className="font-mono text-[10px] font-medium tracking-[0.04em] text-muc uppercase">
                  {dangOnline(chiTiet) ? "Đang truy cập hệ thống" : "Không có tín hiệu truy cập"}
                </span>
              </div>
              <div className="mt-2 grid gap-2 text-[12px] sm:grid-cols-2">
                <div>
                  <span className="text-muc-nhat">Màn hình: </span>
                  <span className="font-medium text-muc">{chiTiet.trangDangXem || "—"}</span>
                </div>
                <div>
                  <span className="text-muc-nhat">Thiết bị: </span>
                  <span className="font-medium text-muc">{chiTiet.thietBi || "—"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muc-nhat">Hoạt động gần nhất: </span>
                  <span className="font-mono text-[10.5px] text-muc">
                    {chiTiet.lanHoatDong
                      ? `${thoiGianTruoc(chiTiet.lanHoatDong, bayGio)} · ${new Date(chiTiet.lanHoatDong).toLocaleString("vi-VN")}`
                      : "Chưa có tín hiệu"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="nhan-muc">Quyền được cấp</span>
                <NhanVaiTro quyen={chiTiet.quyen} lon />
                <span className="so ml-auto text-[9.5px] text-muc-mo">
                  {chiTiet.quyen.length}/{DS_QUYEN.length} quyền
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {NHOM_QUYEN.map((nhom) => (
                  <div key={nhom.nhom} className="rounded-md border border-ke bg-giay/40 p-2.5">
                    <div className="nhan-muc text-muc-nhat">{nhom.nhom}</div>
                    <div className="mt-1 flex flex-col gap-1">
                      {nhom.quyen.map((q) => {
                        const co = chiTiet.quyen.includes(q);
                        return (
                          <div
                            key={q}
                            className={`flex items-center gap-1.5 text-[12px] ${
                              co ? "text-muc" : "text-muc-mo"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                co ? "bg-ngoc" : "bg-ke-dam"
                              }`}
                            />
                            <span className={co ? "font-medium" : ""}>{TEN_QUYEN[q]}</span>
                            {!co && (
                              <span className="font-mono text-[9px] tracking-[0.02em] text-muc-mo">chưa cấp</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
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
          <div className="rounded-sm border border-ke bg-giay px-3 py-2 text-[12.5px] text-muc-nhat">
            Đang đổi mật khẩu cho tài khoản{" "}
            <b className="so font-semibold text-muc">{nguoiDung.tenDangNhap}</b>
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
          <div className="rounded-sm border border-dau/25 border-l-[3px] border-l-dau bg-dau-nhat px-3 py-2 text-[12.5px] text-dau">
            {loi}
            {loi.includes("hiện tại") && (
              <span className="mt-1 block text-dau/85">
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
