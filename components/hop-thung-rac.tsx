"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/client";
import { khop, ngayVN, so } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Order } from "@/lib/types";
import { bao, baoLoi, BieuTuong, HopThoai, Nut, OText, Trong } from "./ui";

/** Hộp thoại quản lý phiếu bán đã chuyển vào thùng rác. */
export function HopThungRac({
  mo,
  dong,
  onThayDoi,
}: {
  mo: boolean;
  dong: () => void;
  /** Gọi sau khi phục hồi hoặc xoá vĩnh viễn để màn hình ngoài tải lại */
  onThayDoi: () => void;
}) {
  const { coQuyen } = useStore();
  const duocXoa = coQuyen("xoa_phieu");
  const [ds, setDs] = useState<Order[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [dangChay, setDangChay] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [soNgayGiu, setSoNgayGiu] = useState(0);

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      const kq = await apiClient.thungRac();
      setDs(kq.orders);
      setSoNgayGiu(kq.soNgayGiuThungRac);
      if (kq.daXoaTuDong > 0) {
        bao(`Đã tự xoá vĩnh viễn ${so(kq.daXoaTuDong)} phiếu quá hạn lưu trong thùng rác`);
      }
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangTai(false);
    }
  }, []);

  /** Số ngày còn lại trước khi phiếu bị tự xoá. null nếu không bật tự xoá. */
  const conLaiBaoNhieuNgay = (o: Order): number | null => {
    if (soNgayGiu <= 0 || !o.xoaLuc) return null;
    const daQua = Math.floor((Date.now() - new Date(o.xoaLuc).getTime()) / 86_400_000);
    return Math.max(0, soNgayGiu - daQua);
  };

  // Mở lại thì bắt đầu với ô tìm kiếm trống
  useEffect(() => {
    if (!mo) return;
    setQ("");
    void nap();
  }, [mo, nap]);

  const hienThi = useMemo(
    () =>
      q
        ? ds.filter(
            (o) =>
              khop(o.soPhieu, q) || khop(o.hoTen, q) || khop(o.buongGiam, q) || khop(o.lyDoXoa, q),
          )
        : ds,
    [ds, q],
  );

  const phucHoi = async (o: Order) => {
    setDangChay(o.id);
    try {
      await apiClient.phucHoiPhieuBan(o.id);
      bao(`Đã phục hồi phiếu ${o.soPhieu}`);
      await nap();
      onThayDoi();
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangChay(null);
    }
  };

  const xoaVinhVien = async (o: Order) => {
    if (
      !window.confirm(
        `Xoá VĨNH VIỄN phiếu ${o.soPhieu} của ${o.hoTen}?\n\nThao tác này không thể hoàn tác.`,
      )
    ) {
      return;
    }
    setDangChay(o.id);
    try {
      await apiClient.xoaVinhVienPhieuBan(o.id);
      bao(`Đã xoá vĩnh viễn phiếu ${o.soPhieu}`);
      await nap();
      onThayDoi();
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangChay(null);
    }
  };

  return (
    <HopThoai
      mo={mo}
      dong={dong}
      tieuDe={`Thùng rác${ds.length ? ` (${so(ds.length)})` : ""}`}
      rong="max-w-5xl"
      chanTrang={<Nut onClick={dong}>Đóng</Nut>}
    >
      <div className="flex flex-col gap-2">
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
          Phiếu ở đây đã bị bỏ khỏi danh sách và mọi báo cáo, nhưng dữ liệu vẫn còn nguyên. Phục hồi được bất cứ
          lúc nào. Chỉ <b>xoá vĩnh viễn</b> mới không lấy lại được.
          {soNgayGiu > 0 && (
            <>
              {" "}
              Phiếu nằm đây quá <b>{so(soNgayGiu)} ngày</b> sẽ tự bị xoá vĩnh viễn (đặt lại ở mục Cài đặt).
            </>
          )}
        </p>

        {ds.length > 0 && (
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400">
              <BieuTuong ten="tim" className="h-4 w-4" />
            </span>
            <OText
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo số phiếu, họ tên, buồng giam hoặc lý do xoá…"
              className="pl-8"
            />
            {q && (
              <span className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[12px] text-slate-500">
                {so(hienThi.length)} / {so(ds.length)}
              </span>
            )}
          </div>
        )}

        {dangTai ? (
          <p className="py-8 text-center text-sm text-slate-500">Đang tải…</p>
        ) : ds.length === 0 ? (
          <Trong tieuDe="Thùng rác đang trống" moTa="Các phiếu bị xoá sẽ được giữ ở đây để phục hồi khi cần." />
        ) : hienThi.length === 0 ? (
          <Trong
            tieuDe={`Không có phiếu nào khớp “${q}”`}
            moTa="Thử từ khoá khác, hoặc xoá ô tìm kiếm để xem tất cả."
          />
        ) : (
          <div className="mem-cuon max-h-[54vh] overflow-auto rounded-md border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[12px] text-slate-600">
                <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
                  <th className="w-28">Số phiếu</th>
                  <th className="w-24">Ngày bán</th>
                  <th>Can phạm</th>
                  <th className="w-14 text-center">Món</th>
                  <th className="w-24 text-right">Tổng tiền</th>
                  <th>Lý do xoá</th>
                  <th className="w-32">Đã xoá</th>
                  <th className="w-28" />
                </tr>
              </thead>
              <tbody>
                {hienThi.map((o) => (
                  <tr
                    key={o.id}
                    className={`align-top [&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-2 ${
                      dangChay === o.id ? "opacity-50" : ""
                    }`}
                  >
                    <td className="font-mono text-[12px] font-medium text-slate-600 line-through">{o.soPhieu}</td>
                    <td className="text-slate-600">{ngayVN(o.ngay)}</td>
                    <td>
                      <div className="font-medium text-slate-800">{o.hoTen}</div>
                      <div className="text-[11px] text-slate-500">
                        {o.namSinh ? `SN ${o.namSinh}` : "—"} · {o.buongGiam || "—"}
                      </div>
                    </td>
                    <td className="text-center text-slate-600">{o.items.length}</td>
                    <td className="text-right text-slate-700 tabular-nums">
                      {o.tongTien > 0 ? so(o.tongTien) : "—"}
                    </td>
                    <td className="text-[12px]">
                      {o.lyDoXoa ? (
                        <span className="text-slate-700">{o.lyDoXoa}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="text-[12px] text-slate-500">
                      {o.xoaLuc
                        ? new Date(o.xoaLuc).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                      {o.xoaBoi ? <div className="text-[11px] text-slate-400">bởi {o.xoaBoi}</div> : null}
                      {(() => {
                        const con = conLaiBaoNhieuNgay(o);
                        if (con === null) return null;
                        return (
                          <div className={`text-[11px] ${con <= 3 ? "font-medium text-rose-600" : "text-slate-400"}`}>
                            {con === 0 ? "sắp bị xoá" : `còn ${con} ngày`}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {duocXoa ? (
                          <>
                            <Nut
                              co="sm"
                              onClick={() => void phucHoi(o)}
                              disabled={dangChay === o.id}
                              title="Đưa phiếu trở lại danh sách"
                              className="whitespace-nowrap"
                            >
                              Phục hồi
                            </Nut>
                            <Nut
                              kieu="mo"
                              co="sm"
                              onClick={() => void xoaVinhVien(o)}
                              disabled={dangChay === o.id}
                              title="Xoá hẳn, không lấy lại được"
                              className="hover:text-rose-500"
                            >
                              <BieuTuong ten="xoa" className="h-4 w-4" />
                            </Nut>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400">Không có quyền</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </HopThoai>
  );
}
