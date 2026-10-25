"use client";

import { useCallback, useMemo, useState } from "react";
import { apiClient } from "@/lib/client";
import { khop, ngayVN, so } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useNap } from "@/lib/use-nap";
import type { Order } from "@/lib/types";
import { useInPhieu } from "./print";
import { bao, baoLoi, BieuTuong, HopThoai, Nut, OText, Trong } from "./ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

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
  const { xemTruoc } = useInPhieu();
  const duocXoa = coQuyen("xoa_phieu");
  const [ds, setDs] = useState<Order[]>([]);
  const [dangTai, setDangTai] = useState(false);
  const [dangChay, setDangChay] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [soNgayGiu, setSoNgayGiu] = useState(0);
  // Mốc "bây giờ" chốt lúc tải dữ liệu — không gọi Date.now() trong lúc render
  const [bayGio, setBayGio] = useState(0);

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      const kq = await apiClient.thungRac();
      setDs(kq.orders);
      setSoNgayGiu(kq.soNgayGiuThungRac);
      setBayGio(Date.now());
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
    if (soNgayGiu <= 0 || !o.xoaLuc || !bayGio) return null;
    const daQua = Math.floor((bayGio - new Date(o.xoaLuc).getTime()) / 86_400_000);
    return Math.max(0, soNgayGiu - daQua);
  };

  // Hộp thoại chỉ dựng khi mở nên mỗi lần mở là một lần nạp mới, ô tìm kiếm trống
  useNap(nap);

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
        <p className="rounded-sm border border-ke border-l-[3px] border-l-ke-dam bg-giay px-3 py-2 text-[12px] text-muc-nhat">
          Phiếu ở đây đã bị bỏ khỏi danh sách và mọi báo cáo, nhưng dữ liệu vẫn còn nguyên. Phục hồi được bất cứ
          lúc nào. Chỉ <b className="font-semibold text-muc">xoá vĩnh viễn</b> mới không lấy lại được.
          {soNgayGiu > 0 && (
            <>
              {" "}
              Phiếu nằm đây quá <b className="font-semibold text-muc">{so(soNgayGiu)} ngày</b> sẽ tự bị xoá vĩnh viễn
              (đặt lại ở mục Cài đặt).
            </>
          )}
        </p>

        {ds.length > 0 && (
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muc-mo">
              <BieuTuong ten="tim" className="h-4 w-4" />
            </span>
            <OText
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo số phiếu, họ tên, buồng giam hoặc lý do xoá…"
              className="pl-8"
            />
            {q && (
              <span className="so absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px] text-muc-mo">
                {so(hienThi.length)} / {so(ds.length)}
              </span>
            )}
          </div>
        )}

        {dangTai ? (
          <p className="py-8 text-center font-mono text-[11px] tracking-[0.02em] text-muc-mo">Đang tải…</p>
        ) : ds.length === 0 ? (
          <Trong tieuDe="Thùng rác đang trống" moTa="Các phiếu bị xoá sẽ được giữ ở đây để phục hồi khi cần." />
        ) : hienThi.length === 0 ? (
          <Trong
            tieuDe={`Không có phiếu nào khớp “${q}”`}
            moTa="Thử từ khoá khác, hoặc xoá ô tìm kiếm để xem tất cả."
          />
        ) : (
          <div className="mem-cuon max-h-[54vh] overflow-auto rounded-sm border border-ke">
            <Table className="w-full min-w-[720px] border-collapse text-sm">
              <TableHeader className="sticky top-0 z-10 bg-giay font-mono text-[9.5px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
                <TableRow className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                  <TableHead className="w-28">Số phiếu</TableHead>
                  <TableHead className="w-24">Ngày bán</TableHead>
                  <TableHead>Can phạm</TableHead>
                  <TableHead className="w-14 text-center">Món</TableHead>
                  <TableHead className="w-24 text-right">Tổng tiền</TableHead>
                  <TableHead>Lý do xoá</TableHead>
                  <TableHead className="w-32">Đã xoá</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {hienThi.map((o) => (
                  <TableRow
                    key={o.id}
                    onClick={() => xemTruoc(o)}
                    className={`cursor-pointer transition-colors hover:bg-giay/60 [&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-2 [&>td]:align-middle ${
                      dangChay === o.id ? "opacity-50" : ""
                    }`}
                    title="Bấm để xem lại phiếu"
                  >
                    <TableCell className="so text-[11px] font-medium text-muc-mo line-through">{o.soPhieu}</TableCell>
                    <TableCell className="so text-[11px] text-muc-nhat">{ngayVN(o.ngay)}</TableCell>
                    <TableCell>
                      <div className="font-semibold text-muc">{o.hoTen}</div>
                      <div className="font-mono text-[10px] tracking-[0.01em] text-muc-mo">
                        {o.namSinh ? `SN ${o.namSinh}` : "—"} · {o.buongGiam || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="so text-center text-[12px] text-muc-nhat">{o.items.length}</TableCell>
                    <TableCell className="so text-right text-[12px] text-muc">
                      {o.tongTien > 0 ? so(o.tongTien) : "—"}
                    </TableCell>
                    <TableCell className="text-[12px]">
                      {o.lyDoXoa ? (
                        <span className="text-muc-nhat">{o.lyDoXoa}</span>
                      ) : (
                        <span className="text-muc-mo">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="so text-[10.5px] text-muc-nhat">
                        {o.xoaLuc
                          ? new Date(o.xoaLuc).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
                          : "—"}
                      </div>
                      {o.xoaBoi ? (
                        <div className="font-mono text-[9.5px] tracking-[0.01em] text-muc-mo">bởi {o.xoaBoi}</div>
                      ) : null}
                      {(() => {
                        const con = conLaiBaoNhieuNgay(o);
                        if (con === null) return null;
                        return (
                          <div
                            className={`font-mono text-[9.5px] tracking-[0.02em] uppercase ${
                              con <= 3 ? "font-semibold text-dau" : "text-muc-mo"
                            }`}
                          >
                            {con === 0 ? "sắp bị xoá" : `còn ${con} ngày`}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                              className="hover:text-dau"
                            >
                              <BieuTuong ten="xoa" className="h-4 w-4" />
                            </Nut>
                          </>
                        ) : (
                          <span className="font-mono text-[9.5px] tracking-[0.02em] text-muc-mo uppercase">
                            Không có quyền
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </HopThoai>
  );
}
