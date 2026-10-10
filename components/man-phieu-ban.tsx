"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, type DuLieuPhieu } from "@/lib/client";
import { taiExcel } from "@/lib/excel";
import { homNay, khop, ngayVN, so, tien } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { CanPhamGoiY, Order, Product } from "@/lib/types";
import { HopThieuHang } from "./hop-thieu-hang";
import { ChonMonLoc } from "./pickers";
import { HopThungRac } from "./hop-thung-rac";
import { PhieuBanForm } from "./phieu-ban-form";
import { conThieu, daBu, phieuConThieu } from "@/lib/thieu-hang";
import { MauPhieuBan, useInPhieu } from "./print";
import { bao, baoLoi, BieuTuong, HopThoai, Nut, ONhan, OText, OVung, Trong } from "./ui";

function dauThang(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function ManPhieuBan({ onSangBanHang }: { onSangBanHang: () => void }) {
  const { xemTruoc } = useInPhieu();
  const { coQuyen } = useStore();
  const duocSua = coQuyen("sua_phieu");
  const duocXoa = coQuyen("xoa_phieu");
  const duocBan = coQuyen("ban_hang");
  const [ds, setDs] = useState<Order[]>([]);
  const [tu, setTu] = useState(dauThang());
  const [den, setDen] = useState(homNay());
  const [q, setQ] = useState("");
  const [dangTai, setDangTai] = useState(true);
  const [dangSua, setDangSua] = useState<Order | null>(null);
  const [moThungRac, setMoThungRac] = useState(false);
  const [soThungRac, setSoThungRac] = useState(0);
  const [dangXoa, setDangXoa] = useState<Order | null>(null);
  const [lyDoXoa, setLyDoXoa] = useState("");
  const [dangXoaLuu, setDangXoaLuu] = useState(false);
  const [phieuThieu, setPhieuThieu] = useState<Order | null>(null);
  const [chiThieuHang, setChiThieuHang] = useState(false);
  const [monLoc, setMonLoc] = useState<Product | null>(null);

  // Dữ liệu cho form sửa phiếu
  const [sanPham, setSanPham] = useState<Product[]>([]);
  const [goiY, setGoiY] = useState<CanPhamGoiY[]>([]);

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      const thamSo = new URLSearchParams();
      if (tu) thamSo.set("tu", tu);
      if (den) thamSo.set("den", den);
      setDs((await apiClient.orders(thamSo.toString())).orders);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangTai(false);
    }
  }, [tu, den]);

  useEffect(() => {
    void nap();
  }, [nap]);

  /** Chỉ lấy số lượng để hiện trên nút, không cần nội dung */
  const demThungRac = useCallback(async () => {
    if (!duocXoa) return;
    try {
      setSoThungRac((await apiClient.thungRac()).orders.length);
    } catch {
      /* chỉ là con số hiển thị, lỗi ở đây không chặn màn hình */
    }
  }, [duocXoa]);

  useEffect(() => {
    void demThungRac();
  }, [demThungRac]);

  useEffect(() => {
    Promise.all([apiClient.products(), apiClient.canPham()])
      .then(([sp, cp]) => {
        setSanPham(sp.products);
        setGoiY(cp.canPham);
      })
      .catch(() => {
        /* chỉ cần khi bấm sửa, lỗi ở đây không chặn màn hình */
      });
  }, []);

  const soPhieuThieu = useMemo(() => ds.filter((o) => phieuConThieu(o) > 0).length, [ds]);

  const hienThi = useMemo(() => {
    let d = ds;
    if (chiThieuHang) d = d.filter((o) => phieuConThieu(o) > 0);
    // Phiếu có chứa món đang lọc
    if (monLoc) d = d.filter((o) => o.items.some((i) => i.productId === monLoc.id));
    if (q) d = d.filter((o) => khop(o.soPhieu, q) || khop(o.hoTen, q) || khop(o.buongGiam, q));
    return d;
  }, [ds, q, chiThieuHang, monLoc]);

  /**
   * Ô lọc món chỉ liệt kê những món thật sự có bán trong khoảng ngày đang xem.
   * Nếu để tất cả thì chọn phải món không bán trong kỳ sẽ luôn ra danh sách rỗng.
   */
  const sanPhamTrongKy = useMemo(() => {
    const coBan = new Set<string>();
    for (const o of ds) for (const i of o.items) coBan.add(i.productId);
    return sanPham.filter((p) => coBan.has(p.id));
  }, [ds, sanPham]);

  /** Số lượng của món đang lọc trong một phiếu */
  const luongMonTrong = (o: Order): number =>
    monLoc ? o.items.filter((i) => i.productId === monLoc.id).reduce((s, i) => s + i.soLuong, 0) : 0;

  const tongLuongMon = useMemo(
    () => (monLoc ? hienThi.reduce((s, o) => s + luongMonTrong(o), 0) : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hienThi, monLoc],
  );
  const tongTien = hienThi.reduce((s, o) => s + o.tongTien, 0);
  const coTien = hienThi.some((o) => o.tongTien > 0);

  const luuSua = useCallback(
    async (duLieu: DuLieuPhieu) => {
      if (!dangSua) return;
      const kq = await apiClient.suaPhieuBan(dangSua.id, duLieu);
      bao(`Đã cập nhật phiếu ${kq.order.soPhieu}`);
      setDangSua(null);
      await nap();
    },
    [dangSua, nap],
  );

  /**
   * Mỗi hộp thoại đều có phím tắt Ctrl+Enter riêng, nên chỉ mở một cái tại một
   * thời điểm — nếu không thì một lần bấm sẽ kích hoạt cả hai.
   */
  const chiMoMot = (mo: "sua" | "thieu" | "xoa", o: Order | null) => {
    setDangSua(mo === "sua" ? o : null);
    setPhieuThieu(mo === "thieu" ? o : null);
    setDangXoa(mo === "xoa" ? o : null);
    setLyDoXoa("");
  };

  const moXoa = (o: Order) => chiMoMot("xoa", o);

  const xacNhanXoa = async () => {
    if (!dangXoa) return;
    setDangXoaLuu(true);
    try {
      await apiClient.xoaPhieuBan(dangXoa.id, lyDoXoa.trim());
      bao(`Đã chuyển phiếu ${dangXoa.soPhieu} vào thùng rác`);
      setDangXoa(null);
      await nap();
      void demThungRac();
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangXoaLuu(false);
    }
  };

  const xuatExcel = () => {
    // Mỗi dòng hàng của phiếu là một dòng trong file để lọc và tổng hợp được
    const dong = hienThi.flatMap((o) =>
      o.items.map((i) => [
        o.soPhieu,
        ngayVN(o.ngay),
        o.hoTen,
        o.namSinh || null,
        o.buongGiam,
        i.ten,
        i.donViTinh,
        i.soLuong,
        conThieu(i),
        daBu(i),
        i.donGia,
        i.thanhTien,
        o.kiemLuc ? (o.kiemGhiChu ? "Đã kiểm — có sai sót" : "Đã kiểm") : "Chưa kiểm",
        o.kiemGhiChu,
      ]),
    );
    void taiExcel(`phieu-ban_${tu}_${den}`, {
      ten: "Phiếu bán",
      tieuDe:
        `Danh sách phiếu bán từ ${ngayVN(tu)} đến ${ngayVN(den)}` +
        (monLoc ? ` — chỉ phiếu có món "${monLoc.ten}"` : "") +
        (chiThieuHang ? " — chỉ phiếu còn thiếu hàng" : ""),
      tieuDeCot: [
        "Số phiếu", "Ngày", "Họ tên", "Năm sinh", "Buồng giam",
        "Mặt hàng", "ĐVT", "Số lượng", "Còn thiếu", "Đã bù", "Đơn giá", "Thành tiền",
        "Trạng thái kiểm", "Ghi chú kiểm",
      ],
      dong,
      cotTien: [10, 11],
      doRong: [16, 12, 26, 10, 12, 26, 8, 10, 11, 10, 12, 14, 20, 26],
    }).catch((e) => baoLoi((e as Error).message));
  };

  return (
    <>
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-3 py-2.5">
        <div className="mr-2">
          <div className="text-sm font-semibold text-slate-800">Phiếu bán</div>
          <div className="text-[11px] text-slate-500">Bấm vào dòng để xem và in lại phiếu</div>
        </div>
        <div className="flex items-center gap-1.5">
          <OText type="date" value={tu} onChange={(e) => setTu(e.target.value)} className="w-36" />
          <span className="text-slate-400">→</span>
          <OText type="date" value={den} onChange={(e) => setDen(e.target.value)} className="w-36" />
        </div>
        <div className="relative min-w-52 flex-1">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400">
            <BieuTuong ten="tim" className="h-4 w-4" />
          </span>
          <OText
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm số phiếu, họ tên, buồng giam…"
            className="pl-8"
          />
        </div>
        <ChonMonLoc
          products={sanPhamTrongKy}
          daChon={monLoc}
          onChon={setMonLoc}
          onBo={() => setMonLoc(null)}
        />
        <label
          className={`flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition ${
            chiThieuHang
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-slate-300 bg-white text-slate-700"
          }`}
          title="Chỉ hiện những phiếu còn nợ hàng can phạm"
        >
          <input
            type="checkbox"
            checked={chiThieuHang}
            onChange={(e) => setChiThieuHang(e.target.checked)}
            className="h-4 w-4 accent-amber-600"
          />
          Còn thiếu hàng{soPhieuThieu > 0 ? ` (${so(soPhieuThieu)})` : ""}
        </label>
        <Nut onClick={xuatExcel} disabled={hienThi.length === 0}>
          <BieuTuong ten="tai" /> Excel
        </Nut>
        {duocXoa && (
          <Nut onClick={() => setMoThungRac(true)} title="Phiếu đã xoá — vẫn phục hồi được">
            <BieuTuong ten="xoa" /> Thùng rác{soThungRac > 0 ? ` (${so(soThungRac)})` : ""}
          </Nut>
        )}
        {duocBan && (
          <Nut kieu="chinh" onClick={onSangBanHang}>
            <BieuTuong ten="them" /> Lập phiếu bán
          </Nut>
        )}
      </div>

      {monLoc && (
        <div className="border-b border-blue-200 bg-blue-50/70 px-3 py-1.5 text-[12px] text-blue-800">
          Đang lọc theo món <b>{monLoc.ten}</b> — {so(hienThi.length)} phiếu · tổng{" "}
          <b>
            {so(tongLuongMon)} {monLoc.donViTinh}
          </b>
          . Cột “SL món lọc” là số lượng món này trong từng phiếu.
        </div>
      )}

      <div className="mem-cuon max-h-[64vh] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-[12px] text-slate-600">
            <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-semibold">
              <th className="w-36">Số phiếu</th>
              <th className="w-28">Ngày</th>
              <th>Can phạm</th>
              <th className="w-32">Buồng giam</th>
              <th className="w-24 text-center">{monLoc ? "SL món lọc" : "Mặt hàng"}</th>
              <th className="w-32 text-right">Tổng tiền</th>
              <th className="w-44" />
            </tr>
          </thead>
          <tbody>
            {hienThi.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <Trong
                    tieuDe={
                      dangTai
                        ? "Đang tải…"
                        : monLoc
                          ? `Không có phiếu nào chứa món “${monLoc.ten}” trong khoảng này`
                          : "Không có phiếu nào trong khoảng ngày này"
                    }
                    moTa={
                      dangTai
                        ? undefined
                        : monLoc
                          ? "Món này không bán trong khoảng ngày đang xem. Đổi khoảng ngày, hoặc bấm × để bỏ lọc món."
                          : "Đổi khoảng ngày hoặc từ khoá tìm kiếm để xem phiếu khác."
                    }
                  />
                </td>
              </tr>
            )}
            {hienThi.map((o) => (
              <tr
                key={o.id}
                onClick={() => xemTruoc(o)}
                className="cursor-pointer [&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-2 hover:bg-blue-50/50"
              >
                <td className="font-mono text-[12px] font-medium text-blue-700">{o.soPhieu}</td>
                <td className="text-slate-600">{ngayVN(o.ngay)}</td>
                <td>
                  <div className="font-medium text-slate-800">{o.hoTen}</div>
                  <div className="text-[11px] text-slate-500">
                    {o.namSinh ? `SN ${o.namSinh}` : "Chưa rõ năm sinh"}
                  </div>
                </td>
                <td className="text-slate-600">{o.buongGiam || "—"}</td>
                <td className="text-center">
                  {monLoc ? (
                    <div className="font-semibold text-blue-700">{so(luongMonTrong(o))}</div>
                  ) : (
                    <span className="text-slate-600">{o.items.length}</span>
                  )}
                  {phieuConThieu(o) > 0 && (
                    <span
                      className="mt-0.5 ml-1.5 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                      title="Số lượng hàng còn nợ can phạm"
                    >
                      <BieuTuong ten="canh" className="h-3 w-3" />
                      thiếu {so(phieuConThieu(o))}
                    </span>
                  )}
                </td>
                <td className="text-right font-semibold text-slate-800">
                  {o.tongTien > 0 ? so(o.tongTien) : "—"}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {duocSua && (
                      <Nut
                        kieu="mo"
                        co="sm"
                        onClick={() => chiMoMot("thieu", o)}
                        title={
                          phieuConThieu(o) > 0
                            ? `Còn thiếu ${so(phieuConThieu(o))} đơn vị — bấm để ghi bù`
                            : "Ghi hàng thiếu"
                        }
                      >
                        {/* Bọc trong span để tô màu cảnh báo: đặt thẳng class lên Nut
                            sẽ tranh chấp với màu chữ mặc định của nút, mà thứ tự
                            trong file CSS mới quyết định nên không chắc ăn. */}
                        <span className={phieuConThieu(o) > 0 ? "text-amber-600" : ""}>
                          <BieuTuong ten="canh" className="h-4 w-4" />
                        </span>
                      </Nut>
                    )}
                    {duocSua && (
                      <Nut kieu="mo" co="sm" onClick={() => chiMoMot("sua", o)} title="Sửa phiếu">
                        <BieuTuong ten="sua" className="h-4 w-4" />
                      </Nut>
                    )}
                    <Nut kieu="mo" co="sm" onClick={() => xemTruoc(o)} title="Xem và in phiếu">
                      <BieuTuong ten="in" className="h-4 w-4" />
                    </Nut>
                    {duocXoa && (
                      <Nut
                        kieu="mo"
                        co="sm"
                        onClick={() => moXoa(o)}
                        title="Chuyển vào thùng rác"
                        className="hover:text-rose-600"
                      >
                        <BieuTuong ten="xoa" className="h-4 w-4" />
                      </Nut>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {hienThi.length > 0 && (
            <tfoot className="sticky bottom-0 bg-slate-50">
              <tr className="[&>td]:border-t [&>td]:border-slate-200 [&>td]:px-3 [&>td]:py-2">
                <td colSpan={4} className="text-[12px] font-medium text-slate-600">
                  Tổng {so(hienThi.length)} phiếu
                </td>
                <td className="text-center text-[12px] text-slate-600">
                  {so(hienThi.reduce((s, o) => s + o.items.reduce((a, i) => a + i.soLuong, 0), 0))} đơn vị
                </td>
                <td className="text-right text-base font-bold text-slate-900">{coTien ? tien(tongTien) : "—"}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>

      {/* --- Hộp thoại sửa phiếu --- */}
      <HopThoai
        mo={dangSua !== null}
        dong={() => setDangSua(null)}
        tieuDe={dangSua ? `Sửa phiếu ${dangSua.soPhieu}` : ""}
        rong="max-w-5xl"
      >
        {dangSua && (
          <PhieuBanForm
            banDau={dangSua}
            sanPham={sanPham}
            goiY={goiY}
            onLuu={luuSua}
            onHuy={() => setDangSua(null)}
            trongHopThoai
          />
        )}
      </HopThoai>

      {/* --- Xác nhận chuyển vào thùng rác, kèm lý do --- */}
      <HopThoai
        mo={dangXoa !== null}
        dong={() => setDangXoa(null)}
        tieuDe={dangXoa ? `Chuyển phiếu ${dangXoa.soPhieu} vào thùng rác` : ""}
        chanTrang={
          <>
            <Nut onClick={() => setDangXoa(null)} disabled={dangXoaLuu}>
              Huỷ
            </Nut>
            <Nut kieu="nguy" onClick={() => void xacNhanXoa()} disabled={dangXoaLuu}>
              <BieuTuong ten="xoa" className="h-4 w-4" />
              {dangXoaLuu ? "Đang chuyển…" : "Chuyển vào thùng rác"}
            </Nut>
          </>
        }
      >
        {dangXoa && (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-sm font-medium text-slate-800">{dangXoa.hoTen}</div>
              <div className="text-[12px] text-slate-500">
                Ngày bán {ngayVN(dangXoa.ngay)} · {dangXoa.items.length} món
                {dangXoa.tongTien > 0 ? ` · ${tien(dangXoa.tongTien)}` : ""}
                {dangXoa.buongGiam ? ` · ${dangXoa.buongGiam}` : ""}
              </div>
            </div>
            <p className="text-[13px] text-slate-600">
              Phiếu sẽ biến khỏi danh sách và báo cáo, nhưng vẫn nằm trong thùng rác và phục hồi được.
            </p>
            <div>
              <ONhan>Lý do xoá — không bắt buộc, nhưng nên ghi để sau này đối chiếu</ONhan>
              <OVung
                autoFocus
                rows={3}
                value={lyDoXoa}
                onChange={(e) => setLyDoXoa(e.target.value)}
                placeholder="Ví dụ: lập trùng phiếu, can phạm báo nhầm số lượng…"
              />
            </div>
          </div>
        )}
      </HopThoai>

      {/* --- Ghi hàng thiếu / bù hàng --- */}
      <HopThieuHang
        phieu={phieuThieu}
        dong={() => setPhieuThieu(null)}
        onLuu={(o) => {
          setDs((cu) => cu.map((x) => (x.id === o.id ? o : x)));
          setPhieuThieu(o);
        }}
      />

      {/* --- Thùng rác --- */}
      <HopThungRac
        mo={moThungRac}
        dong={() => setMoThungRac(false)}
        onThayDoi={() => {
          void nap();
          void demThungRac();
        }}
      />
    </>
  );
}

/* ------------------------ Xem trước & in phiếu ------------------------ */

export function HopXemTruocPhieu() {
  const { dangXem, dongXemTruoc, inPhieu } = useInPhieu();
  const { settings } = useStore();

  // Ctrl+Enter để đóng nhanh, khỏi phải với chuột
  useEffect(() => {
    if (!dangXem) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        dongXemTruoc();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dangXem, dongXemTruoc]);

  return (
    <HopThoai
      mo={dangXem !== null}
      dong={dongXemTruoc}
      tieuDe={dangXem ? `Phiếu bán ${dangXem.soPhieu}` : ""}
      rong="max-w-3xl"
      chanTrang={
        <>
          <Nut onClick={dongXemTruoc}>
            Đóng
            <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-normal text-slate-600">
              Ctrl+↵
            </span>
          </Nut>
          <Nut
            kieu="chinh"
            onClick={() => {
              if (dangXem) inPhieu(dangXem);
            }}
          >
            <BieuTuong ten="in" /> In phiếu
          </Nut>
        </>
      }
    >
      <div className="mem-cuon max-h-[68vh] overflow-auto rounded border border-slate-200 bg-white p-6">
        {dangXem && <MauPhieuBan order={dangXem} settings={settings} />}
      </div>
    </HopThoai>
  );
}
