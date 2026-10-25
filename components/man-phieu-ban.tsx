"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient, type DuLieuPhieu } from "@/lib/client";
import { taiExcel } from "@/lib/excel";
import { homNay, khop, ngayVN, so, tien } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { CanPhamGoiY, Order, Product } from "@/lib/types";
import { useNap } from "@/lib/use-nap";
import { HopThieuHang } from "./hop-thieu-hang";
import { HopChiTietPhieu } from "./hop-chi-tiet-phieu";
import { ChonMonLoc } from "./pickers";
import { HopThungRac } from "./hop-thung-rac";
import { PhieuBanForm } from "./phieu-ban-form";
import { conThieu, daBu, phieuConThieu } from "@/lib/thieu-hang";
import { MauPhieuBan, useInPhieu } from "./print";
import {
  bao,
  baoLoi,
  BieuTuong,
  HopThoai,
  Nut,
  OCongTac,
  OKhoangNgay,
  ONhan,
  OPhanTrang,
  OTim,
  OVung,
  Trong,
} from "./ui";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./ui/table";

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
  const [phieuDangXem, setPhieuDangXem] = useState<Order | null>(null);
  const [chiThieuHang, setChiThieuHang] = useState(false);
  const [monLoc, setMonLoc] = useState<Product | null>(null);

  // Dữ liệu cho form sửa phiếu
  const [sanPham, setSanPham] = useState<Product[]>([]);
  const [goiY, setGoiY] = useState<CanPhamGoiY[]>([]);

  // Bộ lọc ngày có thể đổi liên tiếp (gõ ngày, chọn lịch…). Chỉ áp dụng kết quả
  // của lần nạp mới nhất, tránh response cũ về sau ghi đè danh sách đã lọc.
  const lanNap = useRef(0);
  const nap = useCallback(async () => {
    const lan = ++lanNap.current;
    setDangTai(true);
    try {
      const thamSo = new URLSearchParams();
      if (tu) thamSo.set("tu", tu);
      if (den) thamSo.set("den", den);
      const kq = await apiClient.orders(thamSo.toString());
      if (lan !== lanNap.current) return;
      setDs(kq.orders);
    } catch (e) {
      if (lan === lanNap.current) baoLoi((e as Error).message);
    } finally {
      if (lan === lanNap.current) setDangTai(false);
    }
  }, [tu, den]);

  useNap(nap);

  /** Chỉ lấy số lượng để hiện trên nút, không cần nội dung */
  const demThungRac = useCallback(async () => {
    if (!duocXoa) return;
    try {
      setSoThungRac((await apiClient.thungRac()).orders.length);
    } catch {
      /* chỉ là con số hiển thị, lỗi ở đây không chặn màn hình */
    }
  }, [duocXoa]);

  useNap(demThungRac);

  /** Danh mục cho form sửa phiếu — chỉ cần khi bấm sửa, lỗi ở đây không chặn màn hình */
  const napDanhMuc = useCallback(async () => {
    try {
      // Danh mục mặt hàng cần cho bộ lọc món của cả người chỉ xem; gợi ý can
      // phạm chỉ phục vụ form sửa phiếu nên chỉ tải khi có quyền sửa.
      const [sp, cp] = await Promise.all([
        apiClient.products(),
        duocSua ? apiClient.canPham() : Promise.resolve({ canPham: [] as CanPhamGoiY[] }),
      ]);
      setSanPham(sp.products);
      setGoiY(cp.canPham);
    } catch {
      /* để trống */
    }
  }, [duocSua]);

  useNap(napDanhMuc);

  const soPhieuThieu = useMemo(() => ds.filter((o) => phieuConThieu(o) > 0).length, [ds]);

  const hienThi = useMemo(() => {
    let d = ds;
    if (chiThieuHang) d = d.filter((o) => phieuConThieu(o) > 0);
    // Phiếu có chứa món đang lọc
    if (monLoc) d = d.filter((o) => o.items.some((i) => i.productId === monLoc.id));
    if (q) d = d.filter((o) => khop(o.soPhieu, q) || khop(o.hoTen, q) || khop(o.buongGiam, q));
    return d;
  }, [ds, q, chiThieuHang, monLoc]);

  // Danh sách một tháng có thể vài trăm phiếu: chia trang để chân bảng và dòng
  // tổng kết luôn nằm trong tầm mắt, không phải cuộn qua cả sổ. Đổi khoảng ngày
  // hay bộ lọc (khoá `locKhoa`) thì tự quay về trang 1 — tính trong lúc render,
  // không cần effect đồng bộ state.
  const MOI_TRANG = 25;
  const locKhoa = [tu, den, q, chiThieuHang ? "1" : "", monLoc?.id ?? ""].join("|");
  const [trangChon, setTrangChon] = useState({ khoa: locKhoa, trang: 1 });
  const trang = trangChon.khoa === locKhoa ? trangChon.trang : 1;
  const datTrang = (t: number) => setTrangChon({ khoa: locKhoa, trang: t });
  const soTrang = Math.max(1, Math.ceil(hienThi.length / MOI_TRANG));
  const trangHien = Math.min(trang, soTrang);

  const dangXemDay = hienThi.slice((trangHien - 1) * MOI_TRANG, trangHien * MOI_TRANG);

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
  const tongDonVi = hienThi.reduce((s, o) => s + o.items.reduce((a, i) => a + i.soLuong, 0), 0);

  const tieuDeTrong = dangTai
    ? "Đang tải…"
    : monLoc
      ? `Không có phiếu nào chứa món “${monLoc.ten}” trong khoảng này`
      : "Không có phiếu nào trong khoảng ngày này";
  const moTaTrong = dangTai
    ? undefined
    : monLoc
      ? "Món này không bán trong khoảng ngày đang xem. Đổi khoảng ngày, hoặc bấm × để bỏ lọc món."
      : "Đổi khoảng ngày hoặc từ khoá tìm kiếm để xem phiếu khác.";

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

  /** Cụm nút thao tác dùng chung cho bảng trên máy tính và danh sách thẻ trên điện thoại */
  const thaoTacPhieu = (o: Order) => (
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
          <span className={phieuConThieu(o) > 0 ? "text-moc" : ""}>
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
          className="hover:text-dau"
        >
          <BieuTuong ten="xoa" className="h-4 w-4" />
        </Nut>
      )}
    </div>
  );

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
    <div className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
      <div className="khia bg-giay px-3.5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-serif text-[15px] leading-tight font-semibold tracking-[-0.01em] text-muc">Sổ phiếu bán</h2>
            <span className="text-[11.5px] text-muc-nhat">Bấm vào dòng để xem chi tiết, bù hàng hoặc sửa phiếu</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
        </div>

        {/* Cả khoảng ngày, ô tìm, bộ lọc món và các bộ lọc phụ trên một dải */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <OKhoangNgay tu={tu} den={den} onTu={setTu} onDen={setDen} />
          <OTim
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm số phiếu, họ tên, buồng giam…"
            aria-label="Tìm phiếu bán"
            className="min-w-52"
          />
          <ChonMonLoc
            products={sanPhamTrongKy}
            daChon={monLoc}
            onChon={setMonLoc}
            onBo={() => setMonLoc(null)}
          />
          <OCongTac
            bat={chiThieuHang}
            onDoi={setChiThieuHang}
            sac="moc"
            title="Chỉ hiện những phiếu còn nợ hàng can phạm"
          >
            Còn thiếu hàng{soPhieuThieu > 0 ? ` (${so(soPhieuThieu)})` : ""}
          </OCongTac>
          <Nut onClick={xuatExcel} disabled={hienThi.length === 0} className="ml-auto">
            <BieuTuong ten="tai" /> Excel
          </Nut>
        </div>
      </div>

      {monLoc && (
        <div className="border-b border-ke bg-giay/70 px-3.5 py-1.5 text-[12px] text-muc-nhat">
          Đang lọc theo món <b className="text-muc">{monLoc.ten}</b> — {so(hienThi.length)} phiếu · tổng{" "}
          <b className="so text-muc">
            {so(tongLuongMon)} {monLoc.donViTinh}
          </b>
          . Cột “SL món lọc” là số lượng món này trong từng phiếu.
        </div>
      )}

      {/* Trên điện thoại, danh sách phiếu dùng thẻ để không phải cuộn ngang */}
      <div className="sm:hidden">
        {hienThi.length === 0 ? (
          <Trong tieuDe={tieuDeTrong} moTa={moTaTrong} />
        ) : (
          <>
            <div className="divide-y divide-ke/70">
              {dangXemDay.map((o) => (
                <div key={o.id} className="p-3">
                  <button type="button" onClick={() => setPhieuDangXem(o)} className="block w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="so text-[11.5px] font-medium text-muc">{o.soPhieu}</div>
                        <div className="mt-0.5 truncate font-semibold text-muc">{o.hoTen}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="so text-[15px] font-semibold text-muc">
                          {o.tongTien > 0 ? tien(o.tongTien) : "—"}
                        </div>
                        <div className="text-[11px] text-muc-nhat">{o.items.length} mặt hàng</div>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muc-nhat">
                      <span>{ngayVN(o.ngay)}</span>
                      <span>Buồng {o.buongGiam || "—"}</span>
                      {o.namSinh && <span>SN {o.namSinh}</span>}
                      {monLoc && (
                        <span className="font-medium text-muc">
                          {so(luongMonTrong(o))} {monLoc.donViTinh} món lọc
                        </span>
                      )}
                      {phieuConThieu(o) > 0 && (
                        <span className="font-mono text-[10px] tracking-[0.03em] text-moc uppercase">
                          thiếu {so(phieuConThieu(o))}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <div onClick={(e) => e.stopPropagation()}>{thaoTacPhieu(o)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ke bg-giay px-3 py-2.5 text-[12px]">
              <span className="font-medium text-muc-nhat">
                Tổng {so(hienThi.length)} phiếu · {so(tongDonVi)} đơn vị
              </span>
              <span className="so font-semibold text-muc">{coTien ? tien(tongTien) : "—"}</span>
            </div>
            <OPhanTrang
              trang={trangHien}
              soTrang={soTrang}
              tong={hienThi.length}
              onTrang={datTrang}
              nhan="phiếu"
            />
          </>
        )}
      </div>

      <div className="mem-cuon hidden max-h-[calc(100vh-260px)] min-h-[320px] overflow-auto sm:block">
        <Table className="w-full min-w-[1040px] border-collapse text-sm">
          <TableHeader className="sticky top-0 z-10 bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
            <TableRow className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
              <TableHead className="w-36">Số phiếu</TableHead>
              <TableHead className="w-28">Ngày</TableHead>
              <TableHead>Can phạm</TableHead>
              <TableHead className="w-32">Buồng giam</TableHead>
              <TableHead className="w-24 text-center">{monLoc ? "SL món lọc" : "Mặt hàng"}</TableHead>
              <TableHead className="w-32 text-right">Tổng tiền</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {hienThi.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Trong tieuDe={tieuDeTrong} moTa={moTaTrong} />
                </TableCell>
              </TableRow>
            )}
            {dangXemDay.map((o) => (
              <TableRow
                key={o.id}
                onClick={() => setPhieuDangXem(o)}
                className="group cursor-pointer [&>td]:border-b [&>td]:border-ke/70 [&>td]:px-3 [&>td]:py-2.5 hover:bg-giay/70"
              >
                <TableCell className="so text-[11.5px] font-medium text-muc">{o.soPhieu}</TableCell>
                <TableCell className="text-[13px] text-muc-nhat">{ngayVN(o.ngay)}</TableCell>
                <TableCell>
                  <div className="font-semibold text-muc">{o.hoTen}</div>
                  <div className="text-[11px] text-muc-mo">
                    {o.namSinh ? `SN ${o.namSinh}` : "Chưa rõ năm sinh"}
                  </div>
                </TableCell>
                <TableCell className="text-[13px] text-muc-nhat">{o.buongGiam || "—"}</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    {monLoc ? (
                      <span className="so text-[13px] font-medium text-muc">{so(luongMonTrong(o))}</span>
                    ) : (
                      <span className="so text-[13px] text-muc-nhat">{o.items.length}</span>
                    )}
                    {phieuConThieu(o) > 0 && (
                      <span
                        className="inline-flex items-center gap-1 rounded-sm border border-moc/25 bg-moc-nhat px-1.5 py-0.5 font-mono text-[9.5px] font-medium tracking-[0.04em] whitespace-nowrap text-moc uppercase"
                        title="Số lượng hàng còn nợ can phạm"
                      >
                        <BieuTuong ten="canh" className="h-3 w-3" />
                        thiếu {so(phieuConThieu(o))}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="so text-right text-[13px] font-semibold text-muc">
                  {o.tongTien > 0 ? so(o.tongTien) : "—"}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>{thaoTacPhieu(o)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          {hienThi.length > 0 && (
            <TableFooter className="sticky bottom-0 bg-giay/95 backdrop-blur">
              <TableRow className="[&>td]:border-t [&>td]:border-ke [&>td]:px-3 [&>td]:py-2.5">
                <TableCell colSpan={4} className="text-[12px] font-medium text-muc-nhat">
                  {soTrang > 1 ? (
                    <>
                      Trang {so(trangHien)}/{so(soTrang)} · tổng cả kỳ {so(hienThi.length)} phiếu
                    </>
                  ) : (
                    <>Tổng {so(hienThi.length)} phiếu</>
                  )}
                </TableCell>
                <TableCell className="so text-center text-[12px] text-muc-nhat">{so(tongDonVi)} đơn vị</TableCell>
                <TableCell className="so text-right text-[15px] font-semibold whitespace-nowrap text-muc">
                  {coTien ? tien(tongTien) : "—"}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {hienThi.length > 0 && (
        <OPhanTrang
          trang={trangHien}
          soTrang={soTrang}
          tong={hienThi.length}
          onTrang={datTrang}
          nhan="phiếu"
          disabled={dangTai}
        />
      )}
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
            <div className="rounded-sm border border-ke border-l-[3px] border-l-dau bg-dau-nhat/40 px-3 py-2">
              <div className="text-sm font-semibold text-muc">{dangXoa.hoTen}</div>
              <div className="so text-[10.5px] text-muc-nhat">
                Ngày bán {ngayVN(dangXoa.ngay)} · {dangXoa.items.length} món
                {dangXoa.tongTien > 0 ? ` · ${tien(dangXoa.tongTien)}` : ""}
                {dangXoa.buongGiam ? ` · ${dangXoa.buongGiam}` : ""}
              </div>
            </div>
            <p className="text-[13px] text-muc-nhat">
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
      {phieuThieu && (
        <HopThieuHang
          key={phieuThieu.id}
          phieu={phieuThieu}
          dong={() => setPhieuThieu(null)}
          onLuu={(o) => {
            setDs((cu) => cu.map((x) => (x.id === o.id ? o : x)));
            setPhieuThieu(o);
          }}
        />
      )}

      {/* --- Chi tiết phiếu dùng chung: xem, bù hàng, sửa --- */}
      <HopChiTietPhieu
        key={phieuDangXem?.id ?? "dong"}
        orderId={phieuDangXem?.id ?? null}
        banDau={phieuDangXem}
        onDong={() => setPhieuDangXem(null)}
        onThayDoi={(o) => {
          setDs((cu) => cu.map((x) => (x.id === o.id ? o : x)));
          setPhieuDangXem(o);
        }}
      />

      {/* --- Thùng rác --- */}
      {moThungRac && (
        <HopThungRac
          mo
          dong={() => setMoThungRac(false)}
          onThayDoi={() => {
            void nap();
            void demThungRac();
          }}
        />
      )}
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
            <span className="ml-1 rounded-sm bg-muc/8 px-1.5 py-0.5 font-mono text-[9.5px] font-normal text-muc-nhat">
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
      <div className="mem-cuon max-h-[68vh] overflow-auto rounded-sm border border-ke bg-giay p-4">
        <div className="mx-auto w-[720px] max-w-full bg-white px-10 py-9 shadow-the ring-1 ring-ke/70">
          {dangXem && <MauPhieuBan order={dangXem} settings={settings} />}
        </div>
      </div>
    </HopThoai>
  );
}
