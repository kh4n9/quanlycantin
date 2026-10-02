"use client";

import { useCallback, useEffect, useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { PhieuInProvider, useInPhieu } from "./print";
import { ManBanHang } from "./man-ban-hang";
import { ManBaoCao } from "./man-bao-cao";
import { ManCaiDat } from "./man-cai-dat";
import { ManMatHang } from "./man-mat-hang";
import { HopXemTruocPhieu, ManPhieuBan } from "./man-phieu-ban";
import { BieuTuong, HopThongBao } from "./ui";

type Khoa = "ban" | "phieu" | "mathang" | "bieu" | "cai";

const MUC: { khoa: Khoa; nhan: string; icon: string; moTa: string }[] = [
  { khoa: "ban", nhan: "Bán hàng", icon: "ban", moTa: "Lập phiếu bán: nhập can phạm và số lượng hàng" },
  { khoa: "phieu", nhan: "Phiếu bán", icon: "phieu", moTa: "Tra cứu, xem lại và in phiếu đã lập" },
  { khoa: "mathang", nhan: "Mặt hàng", icon: "kho", moTa: "Danh mục mặt hàng và giá bán" },
  { khoa: "bieu", nhan: "Báo cáo", icon: "bieu", moTa: "Số phiếu, mặt hàng và can phạm mua nhiều" },
  { khoa: "cai", nhan: "Cài đặt", icon: "cai", moTa: "Thông tin đơn vị, sao lưu và dữ liệu mẫu" },
];

export function AppShell() {
  return (
    <StoreProvider>
      <PhieuInProvider>
        <Khung />
      </PhieuInProvider>
    </StoreProvider>
  );
}

function Khung() {
  const [muc, setMuc] = useState<Khoa>("ban");
  const { settings } = useStore();
  const { dangXem, dongXemTruoc } = useInPhieu();

  // Mở trang thì đọc mục từ hash; chỉ ghi hash khi người dùng bấm chuyển mục.
  // (Không ghi hash trong effect: StrictMode chạy effect hai lần sẽ ghi đè hash
  //  trước khi effect đọc kịp chạy, làm mất mục đang mở.)
  useEffect(() => {
    const doc = () => {
      const h = window.location.hash.slice(1) as Khoa;
      if (MUC.some((m) => m.khoa === h)) {
        setMuc(h);
        dongXemTruoc();
      }
    };
    doc();
    window.addEventListener("hashchange", doc);
    return () => window.removeEventListener("hashchange", doc);
  }, [dongXemTruoc]);

  const chonMuc = useCallback(
    (k: Khoa) => {
      setMuc(k);
      // Đổi mục thì đóng luôn hộp thoại xem trước phiếu đang mở
      dongXemTruoc();
      if (window.location.hash.slice(1) !== k) {
        window.history.replaceState(null, "", `#${k}`);
      }
    },
    [dongXemTruoc],
  );

  // Alt + 1…6 chuyển nhanh giữa các mục
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const so = Number(e.key);
      if (so >= 1 && so <= MUC.length) {
        e.preventDefault();
        chonMuc(MUC[so - 1].khoa);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chonMuc]);

  const dangChon = MUC.find((m) => m.khoa === muc)!;

  return (
    <>
      <div className="khong-in flex h-screen flex-col bg-[#eef2f6] lg:flex-row">
        <aside className="flex shrink-0 flex-col border-slate-200 bg-slate-900 text-slate-300 lg:w-60 lg:border-r">
          <div className="flex items-center gap-2.5 px-4 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
              <BieuTuong ten="phieu" className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">Quản lý căn tin</div>
              <div className="truncate text-[11px] text-slate-400">{settings.tenDonVi || "Căn tin phạm nhân"}</div>
            </div>
          </div>

          <nav className="mem-cuon flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-1 lg:flex-col lg:overflow-x-visible lg:pb-0">
            {MUC.map((m, i) => {
              const chon = m.khoa === muc;
              return (
                <button
                  key={m.khoa}
                  onClick={() => chonMuc(m.khoa)}
                  title={m.moTa}
                  className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition lg:w-full ${
                    chon ? "bg-blue-600 font-medium text-white" : "hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <BieuTuong ten={m.icon} className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{m.nhan}</span>
                  <span
                    className={`ml-auto hidden text-[10px] lg:inline ${chon ? "text-blue-200" : "text-slate-500"}`}
                  >
                    Alt+{i + 1}
                  </span>
                </button>
              );
            })}
          </nav>

        </aside>

        <main className="mem-cuon flex min-w-0 flex-1 flex-col overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur">
            <h1 className="text-base font-semibold text-slate-900">{dangChon.nhan}</h1>
            <p className="text-[12px] text-slate-500">{dangChon.moTa}</p>
          </header>

          <div className="flex-1 p-4">
            {muc === "ban" && <ManBanHang />}
            {muc === "phieu" && <ManPhieuBan onSangBanHang={() => chonMuc("ban")} />}
            {muc === "mathang" && <ManMatHang />}
            {muc === "bieu" && <ManBaoCao />}
            {muc === "cai" && <ManCaiDat />}
          </div>
        </main>
      </div>

      {/* Hộp thoại và thông báo — cũng thuộc phần không in */}
      {dangXem !== null && <HopXemTruocPhieu />}
      <HopThongBao />
    </>
  );
}
