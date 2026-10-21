"use client";

import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as PhimReact,
  type RefObject,
} from "react";
import { khop, tien } from "@/lib/format";
import type { CanPhamGoiY, Product } from "@/lib/types";

/** Tách tiền tố số lượng: "5 mì tôm" -> { soLuong: 5, tuKhoa: "mì tôm" } */
export function tachSoLuong(chuoi: string): { soLuong: number | null; tuKhoa: string } {
  const m = chuoi.match(/^(\d+)\s+(.+)$/);
  if (m) return { soLuong: Number(m[1]), tuKhoa: m[2].trim() };
  return { soLuong: null, tuKhoa: chuoi.trim() };
}

/**
 * Phím tắt dùng chung cho các ô tìm kiếm có danh sách gợi ý.
 *
 * `choPhepChon` quyết định Enter có thêm mục đang chọn hay không. Phải kiểm tra
 * cả điều kiện này lẫn bỏ qua tổ hợp Ctrl/Alt, nếu không thì:
 *  - ô tìm kiếm trống vẫn "chọn" mục đầu danh sách dù người dùng không chọn gì;
 *  - Ctrl+Enter (phím lưu phiếu của form) bị ô tìm kiếm hiểu thành Enter và
 *    tự thêm một mặt hàng vào phiếu.
 *
 * Hàm chỉ chạy trong sự kiện bàn phím (không dựng handler lúc render) để không
 * đọc ref/state trong thân render.
 */
function xuLyPhimO(
  e: PhimReact,
  viTri: number,
  setViTri: (n: number) => void,
  soKetQua: number,
  chon: (i: number) => void,
  dong: () => void,
  choPhepChon: boolean,
) {
  // Nhường các tổ hợp có phím điều khiển cho phím tắt của form
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    setViTri(Math.min(viTri + 1, soKetQua - 1));
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    setViTri(Math.max(viTri - 1, 0));
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (choPhepChon && soKetQua > 0) chon(viTri);
    else dong();
  } else if (e.key === "Escape") {
    e.preventDefault();
    dong();
  }
}

const lopOTim =
  "h-11 w-full rounded-sm border border-ke-dam bg-white pr-3 pl-9 text-[15px] text-muc shadow-xs placeholder:text-muc-mo outline-none transition focus:border-muc";

const ICON_TIM = (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3" strokeLinecap="round" />
  </svg>
);

/* ============================ Chọn mặt hàng ============================ */

export function ChonHang({
  products,
  onChon,
  placeholder = "Gõ tên mặt hàng… (ví dụ: 5 mì)",
  inputRef,
}: {
  products: Product[];
  onChon: (p: Product, soLuong: number) => void;
  placeholder?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const [q, setQ] = useState("");
  const [mo, setMo] = useState(false);
  const [viTri, setViTri] = useState(0);
  const noiBo = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? noiBo;

  const { soLuong, tuKhoa } = tachSoLuong(q);

  // Danh sách gợi ý rất nhỏ (≤40 dòng) nên lọc trực tiếp khi render là đủ nhanh;
  // React Compiler tự quyết định có memo hay không.
  const ketQua = products
    .filter((p) => p.dangDung && (khop(p.ma, tuKhoa) || khop(p.ten, tuKhoa)))
    .sort((a, b) => a.ten.localeCompare(b.ten, "vi"))
    .slice(0, 40);

  const chon = (i: number) => {
    const p = ketQua[i];
    if (!p) return;
    onChon(p, soLuong ?? 1);
    setQ("");
    setViTri(0);
    setMo(false);
    ref.current?.focus();
  };

  // Chỉ cho Enter thêm hàng khi danh sách gợi ý đang mở và người dùng đã gõ từ khoá
  const onKey = (e: PhimReact) =>
    xuLyPhimO(
      e,
      viTri,
      setViTri,
      ketQua.length,
      chon,
      () => {
        setMo(false);
        setQ("");
        setViTri(0);
      },
      mo && tuKhoa.length > 0,
    );

  return (
    <div className="relative">
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muc-mo">
          {ICON_TIM}
        </span>
        <input
          ref={ref}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setViTri(0);
            setMo(true);
          }}
          onFocus={() => setMo(true)}
          // Bấm lại vào ô đang focus không phát sinh sự kiện focus — xem chú thích
          // ở ô lọc theo món.
          onClick={() => setMo(true)}
          onBlur={() => setTimeout(() => setMo(false), 150)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className={`${lopOTim} pr-24`}
        />
        {soLuong !== null && (
          <span className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm border border-muc/20 bg-muc/5 px-2 py-0.5 font-mono text-[10.5px] font-semibold tracking-[0.02em] text-muc">
            SL {soLuong}
          </span>
        )}
      </div>

      {mo && ketQua.length > 0 && (
        <ul className="mem-cuon absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-sm border border-ke bg-giay-cao py-1 shadow-noi">
          {ketQua.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chon(i)}
                onMouseEnter={() => setViTri(i)}
                className={`flex w-full items-center gap-3 border-b border-ke/40 px-3 py-2 text-left transition last:border-b-0 ${
                  i === viTri ? "bg-giay" : "hover:bg-giay/60"
                }`}
              >
                <span className="so w-20 shrink-0 truncate text-[10.5px] text-muc-mo">{p.ma}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-muc">{p.ten}</span>
                  <span className="block font-mono text-[10px] tracking-[0.01em] text-muc-mo">
                    {p.nhom} · {p.donViTinh}
                  </span>
                </span>
                <span className="so shrink-0 text-[12px] font-semibold text-muc">
                  {p.giaBan > 0 ? tien(p.giaBan) : "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {mo && tuKhoa.length > 0 && ketQua.length === 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-sm border border-ke bg-giay-cao px-3 py-3 text-[12.5px] text-muc-nhat shadow-noi">
          Không tìm thấy mặt hàng nào khớp “{tuKhoa}”.
        </div>
      )}
    </div>
  );
}

/* ============================ Lọc theo món ============================ */

/**
 * Ô chọn một mặt hàng để lọc danh sách phiếu.
 * Khác `ChonHang` ở chỗ không quan tâm số lượng — chỉ chọn đúng một món.
 */
export function ChonMonLoc({
  products,
  daChon,
  onChon,
  onBo,
}: {
  products: Product[];
  daChon: Product | null;
  onChon: (p: Product) => void;
  onBo: () => void;
}) {
  const [q, setQ] = useState("");
  const [mo, setMo] = useState(false);
  const [viTri, setViTri] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  const ketQua = useMemo(
    () => products.filter((p) => khop(p.ma, q) || khop(p.ten, q)).slice(0, 30),
    [products, q],
  );

  const chon = (i: number) => {
    const p = ketQua[i];
    if (!p) return;
    onChon(p);
    setQ("");
    setViTri(0);
    setMo(false);
  };

  const onKey = (e: PhimReact) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setViTri(Math.min(viTri + 1, ketQua.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setViTri(Math.max(viTri - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (mo && q.length > 0 && ketQua.length > 0) chon(viTri);
      else setMo(false);
    } else if (e.key === "Escape") {
      setMo(false);
      setQ("");
      setViTri(0);
    }
  };

  // Đã chọn món rồi thì hiện chip, bấm × để bỏ lọc
  if (daChon) {
    return (
      <div className="flex h-9 items-center gap-1.5 rounded-sm border border-ke-dam bg-giay px-2 text-[13px]">
        <span className="font-mono text-[9.5px] tracking-[0.05em] text-muc-mo uppercase">Món</span>
        <span className="max-w-52 truncate font-medium text-muc">{daChon.ten}</span>
        <button
          onClick={onBo}
          className="rounded-sm p-0.5 text-muc-nhat transition hover:bg-muc/5 hover:text-muc"
          title="Bỏ lọc theo món này"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muc-mo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <input
        ref={ref}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setMo(true);
        }}
        onFocus={() => setMo(true)}
        // Bấm lại vào ô đang được focus thì trình duyệt không phát sự kiện focus
        // nữa, nên sau khi Esc đóng danh sách sẽ không mở lại được nếu chỉ dựa
        // vào onFocus. Mở luôn khi bấm chuột.
        onClick={() => setMo(true)}
        onBlur={() => setTimeout(() => setMo(false), 150)}
        onKeyDown={onKey}
        placeholder="Lọc theo món hàng…"
        title="Chỉ liệt kê những món có bán trong khoảng ngày đang xem"
        className="h-9 w-52 rounded-sm border border-ke-dam bg-white pr-2 pl-8 text-[13px] text-muc shadow-xs placeholder:text-muc-mo outline-none transition focus:border-muc"
      />

      {mo && ketQua.length > 0 && (
        <ul className="mem-cuon absolute z-30 mt-1 max-h-72 w-72 overflow-y-auto rounded-sm border border-ke bg-giay-cao py-1 shadow-noi">
          {ketQua.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chon(i)}
                onMouseEnter={() => setViTri(i)}
                className={`flex w-full items-center gap-2 border-b border-ke/40 px-3 py-2 text-left transition last:border-b-0 ${
                  i === viTri ? "bg-giay" : "hover:bg-giay/60"
                }`}
              >
                <span className="so w-16 shrink-0 truncate text-[10px] text-muc-mo">{p.ma}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-muc">{p.ten}</span>
                {!p.dangDung && (
                  <span className="shrink-0 font-mono text-[9px] tracking-[0.03em] text-muc-mo uppercase">
                    ngừng bán
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {mo && q.length > 0 && ketQua.length === 0 && (
        <div className="absolute z-30 mt-1 w-72 rounded-sm border border-ke bg-giay-cao px-3 py-3 text-[12.5px] text-muc-nhat shadow-noi">
          Không có món nào khớp “{q}”.
        </div>
      )}
    </div>
  );
}

/* =========================== Họ tên can phạm =========================== */

/**
 * Ô nhập họ tên can phạm. Gợi ý lấy từ các phiếu bán đã lập trước đó — chọn
 * một gợi ý sẽ tự điền luôn năm sinh và buồng giam. Không có danh mục can phạm
 * riêng nên vẫn gõ được tên mới hoàn toàn.
 */
export function OTenCanPham({
  giaTri,
  onDoi,
  goiY,
  onChonGoiY,
  inputRef,
  onEnter,
}: {
  giaTri: string;
  onDoi: (v: string) => void;
  goiY: CanPhamGoiY[];
  onChonGoiY: (cp: CanPhamGoiY) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  onEnter?: () => void;
}) {
  const [mo, setMo] = useState(false);
  const [viTri, setViTri] = useState(0);
  const noiBo = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? noiBo;

  const ketQua = useMemo(() => goiY.filter((c) => khop(c.hoTen, giaTri)).slice(0, 12), [goiY, giaTri]);

  const chon = (i: number) => {
    const c = ketQua[i];
    if (!c) return;
    onChonGoiY(c);
    setViTri(0);
    setMo(false);
  };

  const onKey = (e: PhimReact) => {
    // Nhường tổ hợp có phím điều khiển cho phím tắt của form (Ctrl+Enter lưu phiếu)
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "ArrowDown" && ketQua.length > 0) {
      e.preventDefault();
      setMo(true);
      setViTri(Math.min(viTri + 1, ketQua.length - 1));
    } else if (e.key === "ArrowUp" && ketQua.length > 0) {
      e.preventDefault();
      setViTri(Math.max(viTri - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Chỉ điền khi đang mở gợi ý, đã gõ tên, và mục đang chọn khác tên vừa gõ.
      // Không kiểm tra "đã gõ tên" thì bấm Enter ở ô trống sẽ tự điền tên người
      // mua trước đó.
      const chonDuoc =
        mo && giaTri.trim().length > 0 && ketQua[viTri] && ketQua[viTri].hoTen !== giaTri.trim();
      if (chonDuoc) chon(viTri);
      else {
        setMo(false);
        onEnter?.();
      }
    } else if (e.key === "Escape") {
      setMo(false);
    }
  };

  const hienBang = mo && ketQua.length > 0;

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muc-mo">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
        </svg>
      </span>
      <input
        ref={ref}
        value={giaTri}
        onChange={(e) => {
          onDoi(e.target.value);
          setViTri(0);
          setMo(true);
        }}
        onFocus={() => setMo(true)}
        // Bấm lại vào ô đang focus không phát sinh sự kiện focus — xem chú thích
        // ở ô lọc theo món.
        onClick={() => setMo(true)}
        onBlur={() => setTimeout(() => setMo(false), 150)}
        onKeyDown={onKey}
        placeholder="Gõ họ tên can phạm…"
        className={lopOTim}
      />

      {hienBang && (
        <ul className="mem-cuon absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-sm border border-ke bg-giay-cao py-1 shadow-noi">
          <li className="nhan-muc border-b border-ke/60 px-3 py-1.5">
            Đã mua trước đây — chọn để điền luôn năm sinh, buồng giam
          </li>
          {ketQua.map((c, i) => (
            <li key={`${c.hoTen}-${c.buongGiam}-${c.namSinh}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chon(i)}
                onMouseEnter={() => setViTri(i)}
                className={`flex w-full items-center gap-3 border-b border-ke/40 px-3 py-2 text-left transition last:border-b-0 ${
                  i === viTri ? "bg-giay" : "hover:bg-giay/60"
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-muc">{c.hoTen}</span>
                <span className="shrink-0 font-mono text-[10px] tracking-[0.01em] text-muc-nhat">
                  {c.namSinh ? `SN ${c.namSinh}` : "Chưa rõ năm sinh"}
                  {c.buongGiam ? ` · ${c.buongGiam}` : ""}
                </span>
                <span className="so shrink-0 rounded-sm border border-ke-dam bg-giay px-1.5 py-0.5 text-[9.5px] text-muc-nhat">
                  {c.soLan} lần
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
