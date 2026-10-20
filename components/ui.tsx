"use client";

import { useEffect, useState, type ComponentPropsWithRef, type ReactNode } from "react";

/* ----------------------------- Nút ----------------------------- */

type NutProps = ComponentPropsWithRef<"button"> & {
  kieu?: "chinh" | "phu" | "nguy" | "vien" | "mo";
  co?: "sm" | "md" | "lg";
};

export function Nut({ kieu = "vien", co = "md", className = "", ...rest }: NutProps) {
  const nen = {
    chinh: "border-blue-700 bg-blue-700 text-white shadow-sm hover:border-blue-800 hover:bg-blue-800 hover:shadow",
    phu: "border-slate-800 bg-slate-800 text-white shadow-sm hover:border-slate-900 hover:bg-slate-900 hover:shadow",
    nguy: "border-rose-600 bg-rose-600 text-white shadow-sm hover:border-rose-700 hover:bg-rose-700 hover:shadow",
    vien: "border-slate-300 bg-white text-slate-700 shadow-xs hover:border-slate-400 hover:bg-slate-50",
    mo: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  }[kieu];
  const coChu = { sm: "h-8 px-3 text-[13px]", md: "h-9 px-3.5 text-sm", lg: "h-11 px-5 text-[15px]" }[co];
  return (
    <button
      {...rest}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 ${nen} ${coChu} ${className}`}
    />
  );
}

/* ---------------------------- Nhập liệu ---------------------------- */

const oNhapChung =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400";

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

export function ONhan({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <label className={`mb-1.5 block text-[12px] font-semibold text-slate-600 ${className}`}>{children}</label>
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
    xam: "bg-slate-100 text-slate-700 border-slate-200",
    xanh: "bg-blue-50 text-blue-700 border-blue-200",
    vang: "bg-amber-50 text-amber-800 border-amber-200",
    do: "bg-rose-50 text-rose-700 border-rose-200",
    luc: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }[sac];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${mau}`}
    >
      {children}
    </span>
  );
}

/* ----------------------------- Thẻ ----------------------------- */

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
    <section className={`overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-the ${className}`}>
      {(tieuDe || hanhDong) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-linear-to-r from-slate-50 to-white px-4 py-3">
          <div className="min-w-0">
            {tieuDe && <h2 className="truncate text-[13.5px] font-semibold tracking-tight text-slate-800">{tieuDe}</h2>}
            {phuDe && <p className="mt-0.5 truncate text-[12px] text-slate-500">{phuDe}</p>}
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
    <div className="khong-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 pt-12 backdrop-blur-[2px]">
      <div className={`hop-noi w-full ${rong} rounded-2xl border border-slate-200 bg-white shadow-noi`}>
        <header className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3.5">
          <h3 className="text-[15px] font-semibold tracking-tight text-slate-800">{tieuDe}</h3>
          <button
            onClick={dong}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className="px-5 py-4">{children}</div>
        {chanTrang && (
          <footer className="flex items-center justify-end gap-2 border-t border-slate-200/80 bg-slate-50/80 px-5 py-3">
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
    luc: "border-emerald-200 border-l-emerald-500 bg-white text-emerald-900",
    do: "border-rose-200 border-l-rose-500 bg-white text-rose-900",
    xanh: "border-blue-200 border-l-blue-500 bg-white text-blue-900",
  };
  const icon = { luc: "check", do: "canh", xanh: "check" } as const;
  const iconMau = { luc: "text-emerald-600", do: "text-rose-600", xanh: "text-blue-600" };

  return (
    <div className="khong-in pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {ds.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`truot-vao pointer-events-auto flex items-start gap-2.5 rounded-xl border border-l-4 px-3.5 py-3 text-[13px] font-medium shadow-lg ${mau[t.sac]}`}
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
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3.5 text-slate-400">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M3 7h18v13H3zM3 7l2-3h14l2 3M9 12h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-700">{tieuDe}</p>
      {moTa && <p className="max-w-md text-[13px] leading-relaxed text-slate-500">{moTa}</p>}
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
