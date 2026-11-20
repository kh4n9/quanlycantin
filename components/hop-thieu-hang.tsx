"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/client";
import { homNay, ngayVN, so, tenPhieu } from "@/lib/format";
import { conThieu, daBu } from "@/lib/thieu-hang";
import type { BuHang, Order } from "@/lib/types";
import { bao, baoLoi, BieuTuong, HopThoai, Nhan, Nut, ONhan, OText } from "./ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

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
  // Hộp thoại chỉ được dựng khi có phiếu (xem ManPhieuBan) và được key theo id
  // phiếu, nên state khởi tạo theo `phieu` là đủ; mở phiếu khác sẽ remount.
  const [cheDo, setCheDo] = useState<CheDo>(() =>
    phieu?.items.some((i) => conThieu(i) > 0) ? "bu" : "thieu",
  );
  const [dsThieu, setDsThieu] = useState<Record<string, string>>(() =>
    phieu ? Object.fromEntries(phieu.items.map((i) => [i.productId, String(i.thieu ?? 0)])) : {},
  );
  const [dsBu, setDsBu] = useState<Record<string, string>>({});
  const [ngayBu, setNgayBu] = useState(homNay());
  const [ghiChuBu, setGhiChuBu] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  /** Lần bù đang sửa (dòng hàng + chỉ số trong danh sách lần bù). */
  const [dangSuaLanBu, setDangSuaLanBu] = useState<{ productId: string; viTri: number } | null>(null);
  const [suaSoLuong, setSuaSoLuong] = useState("");
  const [suaNgay, setSuaNgay] = useState("");
  const [suaGhiChu, setSuaGhiChu] = useState("");
  const [dangXuLyLanBu, setDangXuLyLanBu] = useState(false);

  const tongConThieu = useMemo(
    () => (phieu ? phieu.items.reduce((s, i) => s + conThieu(i), 0) : 0),
    [phieu],
  );

  // Mọi hook phải nằm TRÊN dòng thoát sớm bên dưới. Đặt hook sau `if (!phieu)
  // return null` thì lúc hộp thoại đóng sẽ chạy ít hook hơn lúc mở, React báo
  // "Rendered more hooks than during the previous render" và màn hình trắng.
  const luuThieu = useCallback(async () => {
    if (!phieu) return;
    setDangLuu(true);
    try {
      const thieu: Record<string, number> = {};
      for (const i of phieu.items) thieu[i.productId] = Number(dsThieu[i.productId]) || 0;
      const kq = await apiClient.ghiThieuHang(phieu.id, thieu);
      const con = kq.order.items.reduce((s, i) => s + conThieu(i), 0);
      bao(
        con > 0
          ? `Đã ghi phiếu ${tenPhieu(kq.order)} còn thiếu ${so(con)} đơn vị hàng`
          : `Phiếu ${tenPhieu(kq.order)} đã giao đủ`,
      );
      onLuu(kq.order);
      // Lưu xong là xong việc với phiếu này — đóng luôn cho đỡ phải bấm thêm
      dong();
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  }, [phieu, dsThieu, onLuu, dong]);

  const luuBu = useCallback(async () => {
    if (!phieu) return;
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
          ? `Đã bù hàng cho phiếu ${tenPhieu(kq.order)}, còn thiếu ${so(con)} đơn vị`
          : `Đã bù đủ hàng cho phiếu ${tenPhieu(kq.order)}`,
      );
      onLuu(kq.order);
      setDsBu({});
      setGhiChuBu("");
      dong();
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  }, [phieu, dsBu, ngayBu, ghiChuBu, onLuu, dong]);

  /** Mở form sửa tại chỗ cho một lần bù đã ghi. */
  const moSuaLanBu = (productId: string, viTri: number, b: BuHang) => {
    setDangSuaLanBu({ productId, viTri });
    setSuaSoLuong(String(b.soLuong));
    setSuaNgay(b.ngay || homNay());
    setSuaGhiChu(b.ghiChu ?? "");
  };

  const luuSuaLanBu = async () => {
    if (!phieu || !dangSuaLanBu) return;
    const n = Number(suaSoLuong);
    if (!Number.isInteger(n) || n < 1) {
      baoLoi("Số lượng bù phải là số nguyên từ 1 trở lên");
      return;
    }
    setDangXuLyLanBu(true);
    try {
      const kq = await apiClient.suaLanBuHang(
        phieu.id,
        dangSuaLanBu.productId,
        dangSuaLanBu.viTri,
        n,
        suaNgay || homNay(),
        suaGhiChu.trim(),
      );
      bao(`Đã sửa lần bù hàng của phiếu ${tenPhieu(kq.order)}`);
      setDangSuaLanBu(null);
      onLuu(kq.order);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangXuLyLanBu(false);
    }
  };

  const xoaLanBu = async (i: { productId: string; ten: string; donViTinh: string }, viTri: number, b: BuHang) => {
    if (!phieu) return;
    const ok = window.confirm(
      `Xoá lần bù ${so(b.soLuong)} ${i.donViTinh} ngày ${ngayVN(b.ngay)} của “${i.ten}”?\n` +
        "Số lượng này sẽ trở lại phần còn thiếu của phiếu.",
    );
    if (!ok) return;
    setDangXuLyLanBu(true);
    try {
      const kq = await apiClient.xoaLanBuHang(phieu.id, i.productId, viTri);
      bao(`Đã xoá lần bù hàng của phiếu ${tenPhieu(kq.order)}`);
      if (dangSuaLanBu?.productId === i.productId && dangSuaLanBu.viTri === viTri) {
        setDangSuaLanBu(null);
      }
      onLuu(kq.order);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangXuLyLanBu(false);
    }
  };

  // Ctrl+Enter lưu theo đúng thao tác của tab đang mở
  useEffect(() => {
    if (!phieu) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (dangLuu) return;
        if (cheDo === "thieu") void luuThieu();
        else void luuBu();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phieu, cheDo, dangLuu, luuThieu, luuBu]);

  if (!phieu) return null;

  const coGiDeBu = phieu.items.some((i) => conThieu(i) > 0);

  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe={`Hàng thiếu — phiếu ${tenPhieu(phieu)}`}
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
              <span className="ml-1 rounded-sm border border-giay-cao/25 px-1.5 py-0.5 font-mono text-[9.5px] font-normal tracking-[0.02em]">
                Ctrl+↵
              </span>
            </Nut>
          ) : (
            <Nut kieu="chinh" onClick={() => void luuBu()} disabled={dangLuu || !coGiDeBu}>
              <BieuTuong ten="check" className="h-4 w-4" />
              {dangLuu ? "Đang lưu…" : "Xác nhận bù hàng"}
              <span className="ml-1 rounded-sm border border-giay-cao/25 px-1.5 py-0.5 font-mono text-[9.5px] font-normal tracking-[0.02em]">
                Ctrl+↵
              </span>
            </Nut>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-sm border border-ke bg-giay px-3 py-2 text-[12.5px]">
          <span className="font-semibold text-muc">{phieu.hoTen}</span>
          <span className="font-mono text-[10.5px] tracking-[0.01em] text-muc-nhat">
            {phieu.namSinh ? `SN ${phieu.namSinh}` : "—"} · {phieu.buongGiam || "—"}
          </span>
          <span className="font-mono text-[10.5px] tracking-[0.01em] text-muc-nhat">
            Ngày bán {ngayVN(phieu.ngay)}
          </span>
          {tongConThieu > 0 ? (
            <span className="ml-auto">
              <Nhan sac="vang">Còn thiếu {so(tongConThieu)} đơn vị</Nhan>
            </span>
          ) : (
            <span className="ml-auto">
              <Nhan sac="luc">Đã giao đủ</Nhan>
            </span>
          )}
        </div>

        {/* Chọn chế độ */}
        <div className="flex gap-1 rounded-sm border border-ke bg-giay p-1">
          {(
            [
              ["thieu", "Ghi hàng thiếu"],
              ["bu", "Bù hàng"],
            ] as const
          ).map(([k, nhan]) => (
            <button
              key={k}
              onClick={() => setCheDo(k)}
              className={`flex-1 rounded-sm px-3 py-1.5 font-mono text-[10.5px] tracking-[0.04em] uppercase transition ${
                cheDo === k
                  ? "bg-muc text-giay-cao"
                  : "text-muc-nhat hover:bg-muc/5 hover:text-muc"
              }`}
            >
              {nhan}
            </button>
          ))}
        </div>

        {cheDo === "thieu" && (
          <p className="text-[12px] text-muc-nhat">
            Ghi số lượng chưa giao được cho can phạm vì chưa có hàng. Để 0 nếu đã giao đủ. Lưu xong hộp thoại
            tự đóng.
          </p>
        )}
        {cheDo === "bu" && (
          <p className="text-[12px] text-muc-nhat">
            {coGiDeBu
              ? "Nhập số lượng bù cho lần giao này. Chỉ nhập được tối đa bằng số còn thiếu."
              : "Phiếu này hiện không còn thiếu mặt hàng nào."}
          </p>
        )}

        <div className="mem-cuon max-h-[42vh] overflow-auto rounded-sm border border-ke">
          <Table className="w-full min-w-[620px] border-collapse text-sm">
            <TableHeader className="sticky top-0 z-10 bg-giay font-mono text-[9.5px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
              <TableRow className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                <TableHead className="text-left">Mặt hàng</TableHead>
                <TableHead className="w-16">ĐVT</TableHead>
                <TableHead className="w-20 text-center">Trên phiếu</TableHead>
                <TableHead className="w-20 text-center">Đã bù</TableHead>
                <TableHead className="w-20 text-center">Còn thiếu</TableHead>
                <TableHead className="w-32 text-center">{cheDo === "thieu" ? "Ghi thiếu" : "Bù lần này"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phieu.items.map((i) => {
                const con = conThieu(i);
                // Khi bù hàng chỉ hiện những mặt hàng còn thiếu
                if (cheDo === "bu" && con <= 0) return null;
                return (
                  <TableRow key={i.productId} className="[&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-1.5">
                    <TableCell className="font-medium text-muc">{i.ten}</TableCell>
                    <TableCell className="text-center text-[12px] text-muc-nhat">{i.donViTinh}</TableCell>
                    <TableCell className="so text-center text-[12.5px] text-muc-nhat">{so(i.soLuong)}</TableCell>
                    <TableCell className="so text-center text-[12.5px] text-muc-nhat">{daBu(i) || "—"}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          con > 0
                            ? "inline-block min-w-10 rounded-sm border border-moc/30 bg-moc-nhat px-1.5 py-0.5 font-mono text-[12px] font-semibold text-moc"
                            : "so text-[12.5px] text-muc-mo"
                        }
                      >
                        {con || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {cheDo === "thieu" ? (
                        <input
                          type="number"
                          min={0}
                          max={i.soLuong}
                          value={dsThieu[i.productId] ?? "0"}
                          onChange={(e) => setDsThieu({ ...dsThieu, [i.productId]: e.target.value })}
                          onFocus={(e) => e.target.select()}
                          className="h-8 w-20 rounded-sm border border-ke-dam bg-white px-2 text-center font-mono text-[12.5px] text-muc outline-none focus:border-muc"
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
                          className="h-8 w-20 rounded-sm border border-ke-dam bg-white px-2 text-center font-mono text-[12.5px] text-muc outline-none placeholder:text-muc-mo focus:border-muc"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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

        {/* Lịch sử bù hàng — sửa/xoá được vì có thể đã bù nhầm */}
        {phieu.items.some((i) => (i.bu ?? []).length > 0) && (
          <div>
            <div className="nhan-muc mb-1.5">Đã bù những gì</div>
            <div className="flex flex-col gap-1">
              {phieu.items.flatMap((i) =>
                (i.bu ?? []).map((b, idx) => {
                  const dangSuaDay =
                    dangSuaLanBu?.productId === i.productId && dangSuaLanBu.viTri === idx;

                  if (dangSuaDay) {
                    // Lần bù này cộng với các lần khác không được vượt quá số đã ghi thiếu.
                    const toiDa = conThieu(i) + (Number(b.soLuong) || 0);
                    return (
                      <div
                        key={`${i.productId}-${idx}`}
                        className="rounded-sm border border-muc/35 bg-giay px-3 py-2 shadow-the"
                      >
                        <div className="flex flex-wrap items-center gap-x-3 text-[12px]">
                          <span className="font-medium text-muc">{i.ten}</span>
                          <span className="font-mono text-[10.5px] text-muc-nhat">
                            đang sửa lần bù {ngayVN(b.ngay)}
                          </span>
                          <span className="ml-auto font-mono text-[10.5px] text-muc-mo">
                            tối đa {so(toiDa)} {i.donViTinh}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[7rem_9.5rem_1fr]">
                          <label className="block">
                            <span className="nhan-muc">Số lượng ({i.donViTinh})</span>
                            <OText
                              type="number"
                              min={1}
                              max={toiDa}
                              value={suaSoLuong}
                              onChange={(e) => setSuaSoLuong(e.target.value)}
                              onFocus={(e) => e.target.select()}
                            />
                          </label>
                          <label className="block">
                            <span className="nhan-muc">Ngày bù</span>
                            <OText
                              type="date"
                              value={suaNgay}
                              onChange={(e) => setSuaNgay(e.target.value)}
                            />
                          </label>
                          <label className="block">
                            <span className="nhan-muc">Ghi chú</span>
                            <OText
                              value={suaGhiChu}
                              onChange={(e) => setSuaGhiChu(e.target.value)}
                              placeholder="Ví dụ: hàng về đợt 2"
                            />
                          </label>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Nut
                            co="sm"
                            kieu="chinh"
                            onClick={() => void luuSuaLanBu()}
                            disabled={dangXuLyLanBu}
                          >
                            <BieuTuong ten="check" className="h-3.5 w-3.5" />
                            {dangXuLyLanBu ? "Đang lưu…" : "Lưu thay đổi"}
                          </Nut>
                          <Nut co="sm" onClick={() => setDangSuaLanBu(null)} disabled={dangXuLyLanBu}>
                            Huỷ
                          </Nut>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${i.productId}-${idx}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-ke bg-giay px-3 py-1.5 text-[12px]"
                    >
                      <span className="font-medium text-muc">{i.ten}</span>
                      <span className="font-mono text-[11px] text-ngoc">
                        bù {so(b.soLuong)} {i.donViTinh}
                      </span>
                      <span className="font-mono text-[10.5px] text-muc-nhat">{ngayVN(b.ngay)}</span>
                      {b.ghiChu && <span className="text-muc-nhat">· {b.ghiChu}</span>}
                      <span className="ml-auto flex items-center gap-1.5">
                        {b.boi && <span className="text-[11px] text-muc-mo">bởi {b.boi}</span>}
                        <Nut
                          co="sm"
                          kieu="mo"
                          className="h-7 px-2 text-[11.5px]"
                          onClick={() => moSuaLanBu(i.productId, idx, b)}
                          disabled={dangXuLyLanBu || Boolean(dangSuaLanBu)}
                          title="Sửa lần bù này"
                        >
                          <BieuTuong ten="sua" className="h-3.5 w-3.5" />
                          Sửa
                        </Nut>
                        <Nut
                          co="sm"
                          kieu="mo"
                          className="h-7 px-2 text-[11.5px] text-dau hover:bg-dau/6"
                          onClick={() => void xoaLanBu(i, idx, b)}
                          disabled={dangXuLyLanBu || Boolean(dangSuaLanBu)}
                          title="Xoá lần bù này"
                        >
                          <BieuTuong ten="xoa" className="h-3.5 w-3.5" />
                          Xoá
                        </Nut>
                      </span>
                    </div>
                  );
                }),
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-muc-mo">
              Bù nhầm thì bấm Sửa để chỉnh số lượng, ngày hoặc ghi chú; Xoá để trả phần hàng đó về mục còn thiếu.
            </p>
          </div>
        )}
      </div>
    </HopThoai>
  );
}
