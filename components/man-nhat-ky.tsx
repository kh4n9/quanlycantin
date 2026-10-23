"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/client";
import { taiExcel } from "@/lib/excel";
import { homNay, ngayVN, so } from "@/lib/format";
import { NHAN_LOAI_NHAT_KY, type LoaiNhatKy, type NhatKy } from "@/lib/nhat-ky";
import { bao, baoLoi, BieuTuong, HopThoai, Nhan, Nut, OChon, OText, Trong } from "./ui";

function ngayCach(soNgay: number): string {
  const d = new Date();
  d.setDate(d.getDate() - soNgay);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dauThang(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`;
}

function gio(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function ngayGio(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function chuDau(hoTen: string): string {
  return (
    (hoTen || "?")
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((tu) => tu.charAt(0))
      .join("")
      .toUpperCase() || "?"
  );
}

const SAC_LOAI: Record<LoaiNhatKy, "xam" | "xanh" | "vang" | "do" | "luc"> = {
  phieu: "xanh",
  mat_hang: "luc",
  tai_khoan: "vang",
  cai_dat: "do",
  dang_nhap: "xam",
};

export function ManNhatKy() {
  const [tu, setTu] = useState(() => ngayCach(6));
  const [den, setDen] = useState(homNay);
  const [loai, setLoai] = useState("");
  const [q, setQ] = useState("");
  const [qDung, setQDung] = useState("");
  const [trang, setTrang] = useState(1);
  const [lanTai, setLanTai] = useState(0);

  const [nhatKy, setNhatKy] = useState<NhatKy[]>([]);
  const [tong, setTong] = useState(0);
  const [soTrang, setSoTrang] = useState(1);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");
  const [chiTiet, setChiTiet] = useState<NhatKy | null>(null);

  // Gõ tìm kiếm thì chờ một nhịp ngắn rồi mới gọi API.
  useEffect(() => {
    const hen = setTimeout(() => {
      setQDung(q);
      setTrang(1);
    }, 250);
    return () => clearTimeout(hen);
  }, [q]);

  const thamSo = useMemo(() => {
    const p = new URLSearchParams();
    if (tu) p.set("tu", tu);
    if (den) p.set("den", den);
    if (loai) p.set("loai", loai);
    if (qDung) p.set("q", qDung);
    p.set("trang", String(trang));
    return p.toString();
  }, [tu, den, loai, qDung, trang]);

  useEffect(() => {
    let huy = false;
    (async () => {
      setDangTai(true);
      try {
        const kq = await apiClient.nhatKy(thamSo);
        if (huy) return;
        setNhatKy(kq.nhatKy);
        setTong(kq.tong);
        setSoTrang(kq.soTrang);
        setLoi("");
      } catch (e) {
        if (huy) return;
        setNhatKy([]);
        setTong(0);
        setSoTrang(1);
        setLoi((e as Error).message);
      } finally {
        if (!huy) setDangTai(false);
      }
    })();
    return () => {
      huy = true;
    };
  }, [thamSo, lanTai]);

  const hn = homNay();
  const thangNay = dauThang();
  const bayNgay = ngayCach(6);
  const preset =
    !tu && !den
      ? "tat_ca"
      : tu === hn && den === hn
        ? "hom_nay"
        : tu === bayNgay && den === hn
          ? "bay_ngay"
          : tu === thangNay && den === hn
            ? "thang_nay"
            : "";
  const khoangNhan = tu && den ? `${ngayVN(tu)} – ${ngayVN(den)}` : tu ? `từ ${ngayVN(tu)}` : "tất cả các ngày";

  const datKhoang = (t: string, d: string) => {
    setTu(t);
    setDen(d);
    setTrang(1);
  };

  const xuatExcel = async () => {
    try {
      const p = new URLSearchParams();
      if (tu) p.set("tu", tu);
      if (den) p.set("den", den);
      if (loai) p.set("loai", loai);
      if (qDung) p.set("q", qDung);
      p.set("trang", "1");
      p.set("coTrang", "500");

      const kq = await apiClient.nhatKy(p.toString());
      if (!kq.nhatKy.length) {
        bao("Không có thao tác nào để xuất");
        return;
      }
      await taiExcel("nhat-ky-hoat-dong", {
        ten: "Nhật ký",
        tieuDeCot: [
          "Thời gian",
          "Người thực hiện",
          "Tên đăng nhập",
          "Thao tác",
          "Loại",
          "Đối tượng",
          "Mô tả",
          "Thay đổi",
        ],
        dong: kq.nhatKy.map((n) => [
          ngayGio(n.luc),
          n.hoTen || "Không rõ",
          n.tenDangNhap,
          n.hanhDong,
          NHAN_LOAI_NHAT_KY[n.loai] ?? n.loai,
          n.doiTuong,
          n.moTa,
          n.thayDoi.map((x) => `${x.truong}: ${x.truoc} → ${x.sau}`).join("; "),
        ]),
        doRong: [20, 24, 18, 24, 18, 30, 48, 64],
      });
      bao(
        kq.tong > kq.nhatKy.length
          ? `Đã xuất ${so(kq.nhatKy.length)} thao tác gần nhất (còn ${so(kq.tong - kq.nhatKy.length)} thao tác cũ hơn)`
          : `Đã xuất ${so(kq.nhatKy.length)} thao tác`,
      );
    } catch (e) {
      baoLoi((e as Error).message);
    }
  };

  const trong = (
    <Trong
      tieuDe={loi ? "Không tải được nhật ký" : dangTai ? "Đang tải nhật ký…" : "Chưa có thao tác nào"}
      moTa={
        loi ||
        (dangTai
          ? undefined
          : "Thử đổi khoảng ngày hoặc bộ lọc. Mọi thao tác thêm, sửa, xoá trên hệ thống sẽ được ghi lại ở đây.")
      }
    />
  );

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
        <div className="border-b border-dashed border-ke bg-giay px-3.5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-serif text-[15px] leading-tight font-semibold tracking-[-0.01em] text-muc">
                Sổ nhật ký hoạt động
              </div>
              <div className="mt-0.5 text-[11.5px] text-muc-nhat">
                Ai đã làm gì, khi nào — bấm vào một dòng để xem chi tiết
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Nut onClick={() => setLanTai((x) => x + 1)} disabled={dangTai}>
                <BieuTuong ten="lammoi" /> Làm mới
              </Nut>
              <Nut onClick={() => void xuatExcel()} disabled={tong === 0}>
                <BieuTuong ten="tai" /> Excel
              </Nut>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="nhan-muc w-full sm:mr-1 sm:w-auto">Khoảng ngày</span>
            <OText
              type="date"
              value={tu}
              onChange={(e) => {
                setTu(e.target.value);
                setTrang(1);
              }}
              aria-label="Từ ngày"
              title="Từ ngày"
              className="w-36"
            />
            <span className="text-muc-mo">→</span>
            <OText
              type="date"
              value={den}
              onChange={(e) => {
                setDen(e.target.value);
                setTrang(1);
              }}
              aria-label="Đến ngày"
              title="Đến ngày"
              className="w-36"
            />
            <div className="flex flex-wrap items-center gap-1">
              <NutKy active={preset === "hom_nay"} onClick={() => datKhoang(hn, hn)}>
                Hôm nay
              </NutKy>
              <NutKy active={preset === "bay_ngay"} onClick={() => datKhoang(bayNgay, hn)}>
                7 ngày
              </NutKy>
              <NutKy active={preset === "thang_nay"} onClick={() => datKhoang(thangNay, hn)}>
                Tháng này
              </NutKy>
              <NutKy active={preset === "tat_ca"} onClick={() => datKhoang("", "")}>
                Tất cả
              </NutKy>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <div className="relative min-w-64 flex-1">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muc-mo">
                <BieuTuong ten="tim" className="h-4 w-4" />
              </span>
              <OText
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm theo người, đối tượng hoặc nội dung…"
                aria-label="Tìm trong nhật ký"
                className="pl-8"
              />
            </div>
            <OChon
              value={loai}
              onChange={(e) => {
                setLoai(e.target.value);
                setTrang(1);
              }}
              aria-label="Lọc theo loại thao tác"
              className="w-48"
            >
              <option value="">Tất cả loại thao tác</option>
              {Object.entries(NHAN_LOAI_NHAT_KY).map(([k, ten]) => (
                <option key={k} value={k}>
                  {ten}
                </option>
              ))}
            </OChon>
          </div>

          <div className="-mx-3.5 mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ke/60 px-3.5 pt-2 font-mono text-[9.5px] tracking-[0.03em] text-muc-mo uppercase">
            <span>
              Đang xem {so(nhatKy.length)} / {so(tong)} thao tác
            </span>
            <span className="normal-case">Khoảng: {khoangNhan}</span>
            {dangTai && <span className="font-semibold text-muc">Đang tải nhật ký…</span>}
            {tu && den && tu > den && (
              <span className="normal-case text-dau">Khoảng ngày đang ngược (từ sau đến)</span>
            )}
            {loi && <span className="normal-case text-dau">Lỗi: {loi}</span>}
          </div>
        </div>

        {/* Trên điện thoại, nhật ký dùng thẻ để không phải cuộn ngang */}
        <div className="sm:hidden">
          {nhatKy.length === 0 ? (
            trong
          ) : (
            <div className="divide-y divide-ke/60">
              {nhatKy.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setChiTiet(n)}
                  className="block w-full p-3 text-left transition-colors hover:bg-giay/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-muc">{n.hoTen || "Không rõ"}</div>
                      <div className="truncate font-mono text-[10.5px] text-muc-mo">
                        {n.tenDangNhap || "không rõ tài khoản"}
                      </div>
                    </div>
                    <div className="so shrink-0 text-right text-[10.5px] text-muc-mo">
                      <div>{gio(n.luc)}</div>
                      <div className="text-[10px]">{ngayVN(n.ngay)}</div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Nhan sac={SAC_LOAI[n.loai]}>{n.hanhDong}</Nhan>
                    {n.doiTuong && (
                      <span className="truncate font-mono text-[10.5px] text-muc-nhat">{n.doiTuong}</span>
                    )}
                  </div>
                  {n.moTa && <div className="mt-1 line-clamp-2 text-[12px] text-muc-nhat">{n.moTa}</div>}
                  {n.thayDoi.length > 0 && (
                    <div className="mt-1 font-mono text-[10px] tracking-[0.02em] text-muc-mo">
                      {so(n.thayDoi.length)} thay đổi · bấm để xem
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mem-cuon hidden max-h-[68vh] overflow-auto sm:block">
          <table className="w-full min-w-[880px] table-fixed border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
              <tr className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
                <th className="w-24">Lúc</th>
                <th className="w-40">Người thực hiện</th>
                <th className="w-40">Thao tác</th>
                <th className="w-44">Đối tượng</th>
                <th>Mô tả</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {nhatKy.length === 0 && (
                <tr>
                  <td colSpan={6}>{trong}</td>
                </tr>
              )}
              {nhatKy.map((n) => (
                <tr
                  key={n.id}
                  onClick={() => setChiTiet(n)}
                  className="cursor-pointer [&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-2.5 transition-colors hover:bg-giay/60"
                >
                  <td className="so text-[11px] text-muc-nhat">
                    <div className="text-[12px] font-medium text-muc">{gio(n.luc)}</div>
                    <div className="text-[10px]">{ngayVN(n.ngay)}</div>
                  </td>
                  <td>
                    <div className="truncate font-medium text-muc">{n.hoTen || "Không rõ"}</div>
                    <div className="truncate font-mono text-[10px] text-muc-mo">{n.tenDangNhap || "—"}</div>
                  </td>
                  <td>
                    <Nhan sac={SAC_LOAI[n.loai]}>{n.hanhDong}</Nhan>
                  </td>
                  <td className="truncate font-mono text-[11px] text-muc-nhat">{n.doiTuong || "—"}</td>
                  <td className="text-[12.5px] text-muc-nhat">
                    <div className="line-clamp-2">{n.moTa || "—"}</div>
                    {n.thayDoi.length > 0 && (
                      <div className="mt-0.5 font-mono text-[10px] text-muc-mo">
                        {so(n.thayDoi.length)} thay đổi
                      </div>
                    )}
                  </td>
                  <td className="text-right text-muc-mo">
                    <BieuTuong ten="xem" className="h-4 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ke bg-giay px-3.5 py-2.5">
          <span className="font-mono text-[9.5px] tracking-[0.03em] text-muc-mo uppercase">
            Trang {so(trang)} / {so(soTrang)} · {so(tong)} thao tác
          </span>
          <div className="flex items-center gap-1.5">
            <Nut co="sm" disabled={trang <= 1 || dangTai} onClick={() => setTrang((t) => Math.max(1, t - 1))}>
              Trang trước
            </Nut>
            <Nut
              co="sm"
              disabled={trang >= soTrang || dangTai}
              onClick={() => setTrang((t) => Math.min(soTrang, t + 1))}
            >
              Trang sau
            </Nut>
          </div>
        </div>
      </section>

      <HopThoai
        mo={chiTiet !== null}
        dong={() => setChiTiet(null)}
        tieuDe="Chi tiết thao tác"
        rong="max-w-xl"
        chanTrang={<Nut onClick={() => setChiTiet(null)}>Đóng</Nut>}
      >
        {chiTiet && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-ke-dam bg-giay font-mono text-[11px] font-semibold text-muc">
                  {chuDau(chiTiet.hoTen)}
                </span>
                <div className="min-w-0">
                  <div className="font-serif text-[16px] font-semibold tracking-[-0.01em] text-muc">
                    {chiTiet.hoTen || "Không rõ"}
                  </div>
                  <div className="so text-[10.5px] text-muc-mo">{chiTiet.tenDangNhap || "—"}</div>
                </div>
              </div>
              <Nhan sac={SAC_LOAI[chiTiet.loai]}>{NHAN_LOAI_NHAT_KY[chiTiet.loai]}</Nhan>
            </div>

            <div className="rounded-sm border border-ke bg-giay/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <div className="nhan-muc">Thao tác</div>
                <div className="so text-[9.5px] text-muc-mo">{ngayGio(chiTiet.luc)}</div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Nhan sac={SAC_LOAI[chiTiet.loai]}>{chiTiet.hanhDong}</Nhan>
                {chiTiet.doiTuong && (
                  <span className="font-mono text-[11.5px] text-muc-nhat">{chiTiet.doiTuong}</span>
                )}
              </div>
              {chiTiet.moTa && <div className="mt-2 text-[12.5px] leading-relaxed text-muc-nhat">{chiTiet.moTa}</div>}
            </div>

            {chiTiet.thayDoi.length > 0 ? (
              <div>
                <div className="nhan-muc mb-1.5">Thay đổi</div>
                <div className="divide-y divide-ke/60 overflow-hidden rounded-sm border border-ke">
                  {chiTiet.thayDoi.map((x, i) => (
                    <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-2 text-[12px]">
                      <span className="font-medium text-muc">{x.truong}:</span>
                      <span className="text-muc-mo line-through">{x.truoc}</span>
                      <span className="text-muc-mo">→</span>
                      <span className="font-semibold text-muc">{x.sau}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-[12px] text-muc-mo">Thao tác này không có thay đổi chi tiết.</div>
            )}

            {chiTiet.doiTuongId && (
              <div className="so text-[10px] tracking-[0.02em] text-muc-mo">Mã đối tượng: {chiTiet.doiTuongId}</div>
            )}
          </div>
        )}
      </HopThoai>
    </div>
  );
}

/** Chip lọc ngày: nhỏ, gọn để bốn lựa chọn vẫn nằm chung một hàng trên điện thoại. */
function NutKy({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center justify-center rounded-sm border px-2 font-mono text-[10.5px] font-medium tracking-[0.03em] uppercase transition ${
        active
          ? "border-muc bg-muc text-giay-cao"
          : "border-ke-dam bg-white text-muc-nhat hover:border-muc-mo hover:text-muc"
      }`}
    >
      {children}
    </button>
  );
}
