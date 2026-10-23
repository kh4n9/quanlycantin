"use client";

import { useEffect, useState, type ComponentPropsWithRef, type ReactNode } from "react";

/* ----------------------------- Nút -----------------------------
   Nút chính là mực đặc trên giấy; viền mảnh, cạnh hơi vuông như con dấu đóng.
   Đỏ chỉ dành cho việc không hoàn tác được. */

type NutProps = ComponentPropsWithRef<"button"> & {
  kieu?: "chinh" | "phu" | "nguy" | "vien" | "mo";
  co?: "sm" | "md" | "lg";
};

export function Nut({ kieu = "vien", co = "md", className = "", ...rest }: NutProps) {
  const nen = {
    chinh:
      "border-muc bg-muc text-giay-cao shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(11_20_17/0.22)] hover:border-muc-dam hover:bg-muc-dam",
    phu: "border-ke-dam bg-giay text-muc shadow-xs hover:border-muc-mo hover:bg-white",
    nguy: "border-dau bg-dau text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14)] hover:border-dau-dam hover:bg-dau-dam",
    vien: "border-ke-dam bg-white text-muc shadow-xs hover:border-muc-mo hover:bg-giay-cao",
    mo: "border-transparent bg-transparent text-muc-nhat hover:bg-muc/5 hover:text-muc",
  }[kieu];
  const coChu = { sm: "h-8 px-3 text-[13px]", md: "h-9 px-3.5 text-sm", lg: "h-11 px-5 text-[15px]" }[co];
  return (
    <button
      {...rest}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border font-semibold tracking-[-0.005em] transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-muc/45 focus-visible:ring-offset-1 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 ${nen} ${coChu} ${className}`}
    />
  );
}

/* ---------------------------- Nhập liệu ---------------------------- */

const oNhapChung =
  "rounded-md border border-ke-dam bg-white px-3 py-2 text-sm text-muc shadow-[inset_0_1px_2px_rgb(22_32_28/0.04)] placeholder:text-muc-mo outline-none transition focus:border-muc focus:ring-2 focus:ring-muc/20 focus-visible:outline-hidden disabled:bg-giay disabled:text-muc-mo";

/**
 * Mặc định ô nhập rộng hết cỡ, nhưng nếu nơi gọi tự đặt bề rộng (w-36, w-44…)
 * thì bỏ mặc định đi. Không thể để hai lớp w-* chọi nhau: thứ tự class trong
 * thuộc tính không quyết định, thứ tự trong file CSS mới quyết định.
 */
function lopONhap(className: string): string {
  const tuDatBeRong = /(^|\s)w-/.test(className);
  return `${oNhapChung} ${tuDatBeRong ? "" : "w-full"} ${className}`;
}

export function OText({ className = "", ...rest }: ComponentPropsWithRef<"input">) {
  return <input {...rest} className={lopONhap(className)} />;
}

export function OChon({ className = "", children, ...rest }: ComponentPropsWithRef<"select">) {
  return (
    <select {...rest} className={lopONhap(className)}>
      {children}
    </select>
  );
}

export function OVung({ className = "", ...rest }: ComponentPropsWithRef<"textarea">) {
  return <textarea {...rest} className={lopONhap(className)} />;
}

/** Nhãn ô nhập: chữ nhỏ, in hoa, giãn — như dòng in sẵn trên phiếu giấy */
export function ONhan({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <label
      className={`mb-1.5 block font-mono text-[10.5px] font-medium tracking-[0.1em] text-muc-nhat uppercase ${className}`}
    >
      {children}
    </label>
  );
}

/* ----------------------------- Nhãn ----------------------------- */

export function Nhan({
  children,
  sac = "xam",
}: {
  children: ReactNode;
  sac?: "xam" | "xanh" | "vang" | "do" | "luc";
}) {
  const mau = {
    xam: "bg-giay text-muc-nhat border-ke-dam",
    xanh: "bg-muc/6 text-muc border-muc/20",
    vang: "bg-moc-nhat text-moc border-moc/25",
    do: "bg-dau-nhat text-dau border-dau/25",
    luc: "bg-ngoc-nhat text-ngoc border-ngoc/25",
  }[sac];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.04em] whitespace-nowrap ${mau}`}
    >
      {children}
    </span>
  );
}

/* ----------------------------- Thẻ -----------------------------
   Thẻ là một tờ phiếu: viền mảnh, không đổ bóng, dòng tiêu đề ngăn bằng đường
   xé nét đứt. */

export function The({
  tieuDe,
  phuDe,
  hanhDong,
  children,
  className = "",
  thanClassName = "",
}: {
  tieuDe?: ReactNode;
  phuDe?: ReactNode;
  hanhDong?: ReactNode;
  children: ReactNode;
  className?: string;
  thanClassName?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the ${className}`}>
      {(tieuDe || hanhDong) && (
        <header className="khia flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            {tieuDe && (
              <h2 className="truncate font-serif text-[15px] leading-tight font-semibold tracking-[-0.01em] text-muc">
                {tieuDe}
              </h2>
            )}
            {phuDe && <p className="mt-1 truncate text-[12px] text-muc-nhat">{phuDe}</p>}
          </div>
          {hanhDong && <div className="flex max-w-full flex-wrap items-center justify-end gap-2">{hanhDong}</div>}
        </header>
      )}
      <div className={thanClassName}>{children}</div>
    </section>
  );
}

/* ---------------------------- Hộp thoại ---------------------------- */

export function HopThoai({
  mo,
  dong,
  tieuDe,
  children,
  chanTrang,
  rong = "max-w-lg",
}: {
  mo: boolean;
  dong: () => void;
  tieuDe: ReactNode;
  children: ReactNode;
  chanTrang?: ReactNode;
  rong?: string;
}) {
  useEffect(() => {
    if (!mo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dong();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mo, dong]);

  if (!mo) return null;
  return (
    <div className="khong-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-muc/45 p-4 pt-12 backdrop-blur-[3px]">
      <div className={`hop-noi w-full ${rong} rounded-lg border border-ke-dam bg-giay-cao shadow-noi`}>
        <header className="khia flex items-center justify-between px-5 py-3.5">
          <h3 className="font-serif text-[16px] leading-tight font-semibold tracking-[-0.01em] text-muc">{tieuDe}</h3>
          <button
            onClick={dong}
            className="rounded-md p-1.5 text-muc-mo transition hover:bg-muc/6 hover:text-muc"
            aria-label="Đóng"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {chanTrang && (
          <footer className="flex items-center justify-end gap-2 border-t border-ke bg-giay px-5 py-3">
            {chanTrang}
          </footer>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- Thông báo ---------------------------- */

type TinNhan = { id: number; noiDung: string; sac: "luc" | "do" | "xanh" };

let phatTin: ((t: Omit<TinNhan, "id">) => void) | null = null;

export function bao(msg: string, sac: TinNhan["sac"] = "luc") {
  phatTin?.({ noiDung: msg, sac });
}

export function baoLoi(msg: string) {
  phatTin?.({ noiDung: msg, sac: "do" });
}

export function HopThongBao() {
  const [ds, setDs] = useState<TinNhan[]>([]);

  useEffect(() => {
    phatTin = (t) => {
      const id = Date.now() + Math.random();
      setDs((cu) => [...cu, { ...t, id }]);
      setTimeout(() => setDs((cu) => cu.filter((x) => x.id !== id)), 3200);
    };
    return () => {
      phatTin = null;
    };
  }, []);

  const mau = {
    luc: "border-ke border-l-ngoc text-muc",
    do: "border-ke border-l-dau text-muc",
    xanh: "border-ke border-l-muc text-muc",
  };
  const icon = { luc: "check", do: "canh", xanh: "check" } as const;
  const iconMau = { luc: "text-ngoc", do: "text-dau", xanh: "text-muc" };

  return (
    <div className="khong-in pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {ds.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`truot-vao pointer-events-auto flex items-start gap-2.5 rounded-md border border-l-[3px] bg-giay-cao px-3.5 py-3 text-[13px] font-medium shadow-noi ${mau[t.sac]}`}
        >
          <BieuTuong ten={icon[t.sac]} className={`mt-0.5 h-4 w-4 shrink-0 ${iconMau[t.sac]}`} />
          <span className="leading-snug">{t.noiDung}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------- Trạng thái rỗng ---------------------------- */

export function Trong({
  tieuDe,
  moTa,
  hanhDong,
}: {
  tieuDe: string;
  moTa?: string;
  hanhDong?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-14 text-center">
      <div className="rounded-lg border border-dashed border-ke-dam bg-giay p-3.5 text-muc-mo">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 7h18v13H3zM3 7l2-3h14l2 3M9 12h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="font-serif text-[15px] font-semibold text-muc">{tieuDe}</p>
      {moTa && <p className="max-w-md text-[13px] leading-relaxed text-muc-nhat">{moTa}</p>}
      {hanhDong && <div className="mt-1.5">{hanhDong}</div>}
    </div>
  );
}

/* ---------------------------- Biểu tượng ---------------------------- */

const DUONG_DAN: Record<string, string> = {
  ban: "M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6",
  phieu: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
  kho: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  nhap: "M12 3v12m0 0 4-4m-4 4-4-4M4 19h16",
  xuat: "M12 21V9m0 0 4 4m-4-4-4 4M4 5h16",
  nguoi: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  bieu: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  cai: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 3V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  khoa: "M6 11V7a6 6 0 0 1 12 0v4M5 11h14v10H5zM12 15v3",
  in: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  tim: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
  them: "M12 5v14M5 12h14",
  xoa: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  sua: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  tai: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  canh: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  check: "M20 6 9 17l-5-5",
  lich: "M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  lammoi: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  xem: "M9 18l6-6-6-6",
};

export function BieuTuong({ ten, className = "h-4 w-4" }: { ten: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={DUONG_DAN[ten] || DUONG_DAN.kho} />
    </svg>
  );
}
