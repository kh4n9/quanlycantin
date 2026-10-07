"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/client";
import { homNay, ngayVN, so } from "@/lib/format";
import { conThieu, daBu } from "@/lib/thieu-hang";
import type { Order } from "@/lib/types";
import { bao, baoLoi, BieuTuong, HopThoai, Nut, ONhan, OText } from "./ui";

type CheDo = "thieu" | "bu";

/**
 * Hộp thoại ghi hàng thiếu và bù hàng cho một phiếu bán.
 *
 * Hai chế độ: ghi số lượng còn nợ can phạm, và ghi một lần bù khi hàng về.
 */
export function HopThieuHang({
  phieu,
  dong,
  onLuu,
}: {
  phieu: Order | null;
  dong: () => void;
  onLuu: (o: Order) => void;
}) {
  const [cheDo, setCheDo] = useState<CheDo>("thieu");
  const [dsThieu, setDsThieu] = useState<Record<string, string>>({});
  const [dsBu, setDsBu] = useState<Record<string, string>>({});
  const [ngayBu, setNgayBu] = useState(homNay());
  const [ghiChuBu, setGhiChuBu] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  // Mở phiếu khác thì nạp lại từ đầu, không giữ số đã gõ của phiếu trước
  useEffect(() => {
    if (!phieu) return;
    setCheDo(phieu.items.some((i) => conThieu(i) > 0) ? "bu" : "thieu");
    setDsThieu(Object.fromEntries(phieu.items.map((i) => [i.productId, String(i.thieu ?? 0)])));
    setDsBu({});
    setNgayBu(homNay());
    setGhiChuBu("");
  }, [phieu]);

  const tongConThieu = useMemo(
    () => (phieu ? phieu.items.reduce((s, i) => s + conThieu(i), 0) : 0),
    [phieu],
  );

  if (!phieu) return null;

  const luuThieu = async () => {
    setDangLuu(true);
    try {
      const thieu: Record<string, number> = {};
      for (const i of phieu.items) thieu[i.productId] = Number(dsThieu[i.productId]) || 0;
      const kq = await apiClient.ghiThieuHang(phieu.id, thieu);
      const con = kq.order.items.reduce((s, i) => s + conThieu(i), 0);
      bao(
        con > 0
          ? `Đã ghi phiếu ${kq.order.soPhieu} còn thiếu ${so(con)} đơn vị hàng`
          : `Phiếu ${kq.order.soPhieu} đã giao đủ`,
      );
      onLuu(kq.order);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  };

  const luuBu = async () => {
    const bu: Record<string, number> = {};
    for (const i of phieu.items) {
      const n = Number(dsBu[i.productId]) || 0;
      if (n > 0) bu[i.productId] = n;
    }
    if (Object.keys(bu).length === 0) {
      baoLoi("Chưa nhập số lượng bù cho mặt hàng nào");
      return;
    }
    setDangLuu(true);
    try {
      const kq = await apiClient.ghiBuHang(phieu.id, bu, ngayBu, ghiChuBu.trim());
      const con = kq.order.items.reduce((s, i) => s + conThieu(i), 0);
      bao(
        con > 0
          ? `Đã bù hàng cho phiếu ${kq.order.soPhieu}, còn thiếu ${so(con)} đơn vị`
          : `Đã bù đủ hàng cho phiếu ${kq.order.soPhieu}`,
      );
      onLuu(kq.order);
      setDsBu({});
      setGhiChuBu("");
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  };

  const coGiDeBu = phieu.items.some((i) => conThieu(i) > 0);

  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe={`Hàng thiếu — phiếu ${phieu.soPhieu}`}
      rong="max-w-3xl"
      chanTrang={
        <>
          <Nut onClick={dong} disabled={dangLuu}>
            Đóng
          </Nut>
          {cheDo === "thieu" ? (
            <Nut kieu="chinh" onClick={() => void luuThieu()} disabled={dangLuu}>
              <BieuTuong ten="check" className="h-4 w-4" />
              {dangLuu ? "Đang lưu…" : "Lưu số lượng thiếu"}
            </Nut>
          ) : (
            <Nut kieu="chinh" onClick={() => void luuBu()} disabled={dangLuu || !coGiDeBu}>
              <BieuTuong ten="check" className="h-4 w-4" />
              {dangLuu ? "Đang lưu…" : "Xác nhận bù hàng"}
            </Nut>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[13px]">
          <span className="font-medium text-slate-800">{phieu.hoTen}</span>
          <span className="text-slate-500">
            {phieu.namSinh ? `SN ${phieu.namSinh}` : "—"} · {phieu.buongGiam || "—"}
          </span>
          <span className="text-slate-500">Ngày bán {ngayVN(phieu.ngay)}</span>
          {tongConThieu > 0 ? (
            <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
              Còn thiếu {so(tongConThieu)} đơn vị
            </span>
          ) : (
            <span className="ml-auto rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
              Đã giao đủ
            </span>
          )}
        </div>

        {/* Chọn chế độ */}
        <div className="flex gap-1 rounded-md bg-slate-100 p-1">
          {(
            [
              ["thieu", "Ghi hàng thiếu"],
              ["bu", "Bù hàng"],
            ] as const
          ).map(([k, nhan]) => (
            <button
              key={k}
              onClick={() => setCheDo(k)}
              className={`flex-1 rounded px-3 py-1.5 text-[13px] font-medium transition ${
                cheDo === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {nhan}
            </button>
          ))}
        </div>

        {cheDo === "thieu" && (
          <p className="text-[12px] text-slate-500">
            Ghi số lượng chưa giao được cho can phạm vì chưa có hàng. Để 0 nếu đã giao đủ.
          </p>
        )}
        {cheDo === "bu" && (
          <p className="text-[12px] text-slate-500">
            {coGiDeBu
              ? "Nhập số lượng bù cho lần giao này. Chỉ nhập được tối đa bằng số còn thiếu."
              : "Phiếu này hiện không còn thiếu mặt hàng nào."}
          </p>
        )}

        <div className="mem-cuon max-h-[42vh] overflow-auto rounded-md border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[12px] text-slate-600">
              <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-2 [&>th]:font-semibold">
                <th className="text-left">Mặt hàng</th>
                <th className="w-16">ĐVT</th>
                <th className="w-20 text-center">Trên phiếu</th>
                <th className="w-20 text-center">Đã bù</th>
                <th className="w-20 text-center">Còn thiếu</th>
                <th className="w-32 text-center">{cheDo === "thieu" ? "Ghi thiếu" : "Bù lần này"}</th>
              </tr>
            </thead>
            <tbody>
              {phieu.items.map((i) => {
                const con = conThieu(i);
                // Khi bù hàng chỉ hiện những mặt hàng còn thiếu
                if (cheDo === "bu" && con <= 0) return null;
                return (
                  <tr key={i.productId} className="[&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-1.5">
                    <td className="font-medium text-slate-800">{i.ten}</td>
                    <td className="text-center text-slate-600">{i.donViTinh}</td>
                    <td className="text-center tabular-nums text-slate-600">{so(i.soLuong)}</td>
                    <td className="text-center tabular-nums text-slate-600">{daBu(i) || "—"}</td>
                    <td className="text-center">
                      <span
                        className={`inline-block min-w-10 rounded px-1.5 py-0.5 tabular-nums ${
                          con > 0 ? "bg-amber-50 font-semibold text-amber-700" : "text-slate-400"
                        }`}
                      >
                        {con || "—"}
                      </span>
                    </td>
                    <td className="text-center">
                      {cheDo === "thieu" ? (
                        <input
                          type="number"
                          min={0}
                          max={i.soLuong}
                          value={dsThieu[i.productId] ?? "0"}
                          onChange={(e) => setDsThieu({ ...dsThieu, [i.productId]: e.target.value })}
                          onFocus={(e) => e.target.select()}
                          className="h-8 w-20 rounded border border-slate-300 px-2 text-center text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      ) : (
                        <input
                          type="number"
                          min={0}
                          max={con}
                          value={dsBu[i.productId] ?? ""}
                          onChange={(e) => setDsBu({ ...dsBu, [i.productId]: e.target.value })}
                          onFocus={(e) => e.target.select()}
                          placeholder="0"
                          className="h-8 w-20 rounded border border-slate-300 px-2 text-center text-sm outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {cheDo === "bu" && coGiDeBu && (
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <div>
              <ONhan>Ngày bù</ONhan>
              <OText type="date" value={ngayBu} onChange={(e) => setNgayBu(e.target.value)} />
            </div>
            <div>
              <ONhan>Ghi chú</ONhan>
              <OText
                value={ghiChuBu}
                onChange={(e) => setGhiChuBu(e.target.value)}
                placeholder="Ví dụ: hàng về đợt 2"
              />
            </div>
            <div className="sm:col-span-2">
              <Nut
                co="sm"
                onClick={() =>
                  setDsBu(
                    Object.fromEntries(phieu.items.filter((i) => conThieu(i) > 0).map((i) => [i.productId, String(conThieu(i))])),
                  )
                }
              >
                Điền bù hết phần còn thiếu
              </Nut>
            </div>
          </div>
        )}

        {/* Lịch sử bù hàng */}
        {phieu.items.some((i) => (i.bu ?? []).length > 0) && (
          <div>
            <div className="mb-1.5 text-[12px] font-semibold tracking-wide text-slate-500 uppercase">
              Đã bù những gì
            </div>
            <div className="flex flex-col gap-1">
              {phieu.items.flatMap((i) =>
                (i.bu ?? []).map((b, idx) => (
                  <div
                    key={`${i.productId}-${idx}`}
                    className="flex flex-wrap items-center gap-x-3 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px]"
                  >
                    <span className="font-medium text-slate-800">{i.ten}</span>
                    <span className="text-emerald-700">
                      bù {so(b.soLuong)} {i.donViTinh}
                    </span>
                    <span className="text-slate-500">{ngayVN(b.ngay)}</span>
                    {b.ghiChu && <span className="text-slate-500">· {b.ghiChu}</span>}
                    {b.boi && <span className="ml-auto text-slate-400">bởi {b.boi}</span>}
                  </div>
                )),
              )}
            </div>
          </div>
        )}
      </div>
    </HopThoai>
  );
}
