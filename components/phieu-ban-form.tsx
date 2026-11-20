"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient, type DuLieuPhieu } from "@/lib/client";
import { homNay, so, tien } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { CanPhamGoiY, LineItem, Order, Product } from "@/lib/types";
import { ChonHang, OTenCanPham } from "./pickers";
import { useInPhieu } from "./print";
import { baoLoi, BieuTuong, Nut, ONhan, OText, SoTo, Trong } from "./ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

/**
 * Form lập / sửa phiếu bán.
 *
 * Dùng chung cho màn hình Bán hàng (lập phiếu mới) và hộp thoại sửa phiếu trong
 * màn hình Phiếu bán. Phần gọi form tự lo việc gọi API và xử lý sau khi lưu.
 */
export function PhieuBanForm({
  banDau,
  sanPham,
  goiY,
  onLuu,
  onHuy,
  nhanLuu,
  trongHopThoai = false,
}: {
  banDau?: Order;
  sanPham: Product[];
  goiY: CanPhamGoiY[];
  onLuu: (duLieu: DuLieuPhieu) => Promise<void>;
  onHuy?: () => void;
  nhanLuu?: string;
  trongHopThoai?: boolean;
}) {
  const suaDoi = Boolean(banDau);
  const { dangXem } = useInPhieu();
  const { datCoDuLieuChuaLuu } = useStore();

  const [hoTen, setHoTen] = useState(banDau?.hoTen ?? "");
  const [namSinh, setNamSinh] = useState(banDau?.namSinh ? String(banDau.namSinh) : "");
  const [buongGiam, setBuongGiam] = useState(banDau?.buongGiam ?? "");
  const [ngay, setNgay] = useState(banDau?.ngay ?? homNay());
  const [soThuTu, setSoThuTu] = useState(banDau?.soThuTu ? String(banDau.soThuTu) : "");
  const [ghiChu, setGhiChu] = useState(banDau?.ghiChu ?? "");
  const [dsDong, setDsDong] = useState<LineItem[]>(banDau?.items ? [...banDau.items] : []);
  const [dangLuu, setDangLuu] = useState(false);
  /** Người dùng đã tự sửa số thứ tự — lúc lưu gửi đúng số này thay vì tự chọn. */
  const [daSuaSo, setDaSuaSo] = useState(false);
  /** Đã bấm “Tự động” — lúc lưu yêu cầu máy chủ đánh lại số trống nhỏ nhất. */
  const [buocTuDong, setBuocTuDong] = useState(false);

  const oHoTen = useRef<HTMLInputElement>(null);
  const oNamSinh = useRef<HTMLInputElement>(null);
  const oBuongGiam = useRef<HTMLInputElement>(null);
  const oTimHang = useRef<HTMLInputElement>(null);
  /** Lần xin số gợi ý gần nhất — bỏ qua kết quả cũ về muộn hoặc đã bị gõ tay đè. */
  const lanGoiSo = useRef(0);

  useEffect(() => {
    if (!suaDoi) setTimeout(() => oHoTen.current?.focus(), 80);
  }, [suaDoi]);

  /**
   * Xin máy chủ số thứ tự còn trống nhỏ nhất trong một ngày và điền vào ô.
   * Lỗi mạng ở đây không chặn việc lập phiếu: ô để trống thì lúc lưu máy chủ vẫn
   * tự chọn số, nên chỉ cần bỏ qua.
   */
  const laySoThuTu = useCallback(async (ngayChon: string, boQua = "") => {
    const lan = (lanGoiSo.current += 1);
    try {
      const kq = await apiClient.soThuTuTrong(ngayChon, boQua);
      // Đổi ngày / bấm Tự động lần nữa hoặc người dùng đã gõ tay thì bỏ kết quả này
      if (lan === lanGoiSo.current) setSoThuTu(String(kq.soThuTu));
    } catch {
      /* để trống, lúc lưu máy chủ tự chọn */
    }
  }, []);

  // Lần đầu mở form: lập phiếu mới thì lấy số gợi ý cho hôm nay; sửa phiếu cũ
  // chưa từng được đánh số thì lấy số trống cho ngày của phiếu đó. Đặt trong
  // hẹn giờ 0ms để việc gọi API không chạy ngay trong thân effect.
  useEffect(() => {
    const hen = setTimeout(() => {
      if (suaDoi) {
        if (banDau && banDau.soThuTu <= 0) void laySoThuTu(banDau.ngay, banDau.id);
      } else {
        void laySoThuTu(ngay);
      }
    }, 0);
    return () => clearTimeout(hen);
    // Chỉ chạy một lần khi mở form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Đổi ngày bán: số thứ tự tính riêng từng ngày nên phải chọn lại — bỏ số
   * người dùng đã gõ tay và lấy số trống nhỏ nhất của ngày mới. Quay lại đúng
   * ngày cũ của phiếu đang sửa thì hiện lại số hiện tại của phiếu.
   */
  const doiNgay = (ngayMoi: string) => {
    setNgay(ngayMoi);
    setDaSuaSo(false);
    setBuocTuDong(false);
    if (banDau && ngayMoi === banDau.ngay && banDau.soThuTu > 0) {
      // Huỷ kết quả gợi ý của ngày vừa chọn nhầm đang trên đường về
      lanGoiSo.current += 1;
      setSoThuTu(String(banDau.soThuTu));
      return;
    }
    void laySoThuTu(ngayMoi, banDau?.id ?? "");
  };

  const isDirty = useMemo(() => {
    if (suaDoi) {
      if (!banDau) return false;
      const hoTenKhac = hoTen.trim() !== (banDau.hoTen || "");
      const namSinhKhac = (namSinh ? String(namSinh) : "") !== (banDau.namSinh ? String(banDau.namSinh) : "");
      const buongKhac = buongGiam.trim() !== (banDau.buongGiam || "");
      const ghiChuKhac = ghiChu.trim() !== (banDau.ghiChu || "");
      const ngayKhac = ngay !== banDau.ngay;
      // Chỉ tính là thay đổi khi số đang hiện khác số hiện tại của phiếu — bấm
      // “Tự động” mà số vẫn thế thì không cần cảnh báo chưa lưu.
      const soKhac = daSuaSo && Math.max(0, Math.round(Number(soThuTu) || 0)) !== (banDau.soThuTu || 0);
      if (hoTenKhac || namSinhKhac || buongKhac || ghiChuKhac || ngayKhac || soKhac) return true;
      if (dsDong.length !== banDau.items.length) return true;
      return dsDong.some((d, idx) => {
        const goc = banDau.items[idx];
        return !goc || d.productId !== goc.productId || d.soLuong !== goc.soLuong || d.donGia !== goc.donGia;
      });
    }
    return (
      hoTen.trim() !== "" ||
      namSinh.trim() !== "" ||
      buongGiam.trim() !== "" ||
      ghiChu.trim() !== "" ||
      dsDong.length > 0
    );
  }, [suaDoi, banDau, hoTen, namSinh, buongGiam, ghiChu, ngay, dsDong, daSuaSo, soThuTu]);

  useEffect(() => {
    datCoDuLieuChuaLuu(isDirty);
    return () => datCoDuLieuChuaLuu(false);
  }, [isDirty, datCoDuLieuChuaLuu]);

  const tongTien = dsDong.reduce((s, d) => s + d.thanhTien, 0);
  const tongDonVi = dsDong.reduce((s, d) => s + d.soLuong, 0);

  const themHang = useCallback((p: Product, soLuong: number) => {
    setDsDong((cu) => {
      const i = cu.findIndex((d) => d.productId === p.id);
      if (i >= 0) {
        const moi = [...cu];
        const sl = moi[i].soLuong + soLuong;
        moi[i] = { ...moi[i], soLuong: sl, thanhTien: sl * moi[i].donGia };
        return moi;
      }
      return [
        ...cu,
        {
          productId: p.id,
          ma: p.ma,
          ten: p.ten,
          donViTinh: p.donViTinh,
          soLuong,
          donGia: p.giaBan,
          thanhTien: soLuong * p.giaBan,
          thieu: 0,
          bu: [],
        },
      ];
    });
  }, []);

  const suaDong = (i: number, thayDoi: Partial<Pick<LineItem, "soLuong" | "donGia">>) => {
    setDsDong((cu) => {
      const moi = [...cu];
      const d = { ...moi[i], ...thayDoi };
      d.soLuong = Math.max(0, Math.round(d.soLuong || 0));
      d.donGia = Math.max(0, Math.round(d.donGia || 0));
      d.thanhTien = d.soLuong * d.donGia;
      moi[i] = d;
      return moi;
    });
  };

  /** Ô số lượng dùng chung cho bảng trên máy tính và thẻ trên điện thoại */
  const oSoLuong = (d: LineItem, i: number, rong = false) => (
    <div
      className={`flex items-center overflow-hidden rounded-md border border-ke-dam bg-white shadow-xs transition focus-within:border-muc ${
        rong ? "w-full" : "inline-flex"
      }`}
    >
      <button
        type="button"
        onClick={() => suaDong(i, { soLuong: Math.max(0, d.soLuong - 1) })}
        disabled={d.soLuong <= 0}
        className={`flex shrink-0 items-center justify-center text-muc-nhat transition hover:bg-giay hover:text-muc disabled:cursor-not-allowed disabled:opacity-30 ${
          rong ? "h-9 w-9" : "h-8 w-7"
        }`}
        title="Giảm 1"
        aria-label={`Giảm số lượng ${d.ten}`}
      >
        <span className="text-base leading-none font-semibold">−</span>
      </button>
      <input
        type="number"
        min={0}
        value={d.soLuong}
        onChange={(e) => suaDong(i, { soLuong: Number(e.target.value) })}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            oTimHang.current?.focus();
          } else if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            suaDong(i, { soLuong: d.soLuong + 1 });
          } else if (e.key === "-") {
            e.preventDefault();
            suaDong(i, { soLuong: Math.max(0, d.soLuong - 1) });
          }
        }}
        aria-label={`Số lượng ${d.ten}`}
        className={`border-x border-ke px-1 text-center font-mono text-[12.5px] font-semibold tabular-nums outline-none focus:bg-giay ${
          rong ? "h-9 min-w-0 flex-1" : "h-8 w-12"
        }`}
      />
      <button
        type="button"
        onClick={() => suaDong(i, { soLuong: d.soLuong + 1 })}
        className={`flex shrink-0 items-center justify-center text-muc-nhat transition hover:bg-giay hover:text-muc ${
          rong ? "h-9 w-9" : "h-8 w-7"
        }`}
        title="Tăng 1"
        aria-label={`Tăng số lượng ${d.ten}`}
      >
        <span className="text-base leading-none font-semibold">+</span>
      </button>
    </div>
  );

  const oDonGia = (d: LineItem, i: number, rong = false) => (
    <input
      type="number"
      min={0}
      step={500}
      value={d.donGia}
      onChange={(e) => suaDong(i, { donGia: Number(e.target.value) })}
      onFocus={(e) => e.target.select()}
      placeholder="0"
      aria-label={`Đơn giá ${d.ten}`}
      className={`rounded-md border border-ke-dam px-2 text-right font-mono text-[13px] tabular-nums shadow-[inset_0_1px_2px_rgb(19_30_25/0.04)] outline-none transition focus:border-muc focus:ring-2 focus:ring-muc/20 ${
        rong ? "h-9 w-full" : "h-8 w-24"
      }`}
    />
  );

  const nutXoaDong = (d: LineItem, i: number) => (
    <button
      onClick={() => setDsDong((cu) => cu.filter((_, idx) => idx !== i))}
      className="rounded-sm p-1.5 text-muc-mo transition hover:bg-dau-nhat hover:text-dau"
      title="Xoá dòng"
      aria-label={`Xoá ${d.ten}`}
    >
      <BieuTuong ten="xoa" className="h-4 w-4" />
    </button>
  );

  const lamMoi = useCallback((boQuaXacNhan = false) => {
    if (!boQuaXacNhan && isDirty) {
      if (!window.confirm("Bạn có dữ liệu phiếu bán đang nhập chưa lưu. Bạn có chắc muốn xoá để làm mới không?")) {
        return;
      }
    }
    const homNayMoi = homNay();
    setHoTen("");
    setNamSinh("");
    setBuongGiam("");
    setDsDong([]);
    setGhiChu("");
    setNgay(homNayMoi);
    setSoThuTu("");
    setDaSuaSo(false);
    setBuocTuDong(false);
    // Phiếu vừa lưu xong thì gợi ý số thứ tự phải tính lại cho phiếu kế tiếp
    void laySoThuTu(homNayMoi);
    setTimeout(() => oHoTen.current?.focus(), 50);
  }, [isDirty, laySoThuTu]);

  const xuLyHuy = useCallback(() => {
    if (isDirty) {
      if (!window.confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn huỷ không?")) {
        return;
      }
    }
    onHuy?.();
  }, [isDirty, onHuy]);

  const luu = useCallback(async () => {
    if (!hoTen.trim()) {
      baoLoi("Chưa nhập họ tên can phạm");
      oHoTen.current?.focus();
      return;
    }
    if (dsDong.length === 0) {
      baoLoi("Phiếu chưa có mặt hàng nào");
      return;
    }
    setDangLuu(true);
    try {
      const soNhap = Math.round(Number(soThuTu) || 0);
      const ngayKhac = suaDoi && banDau ? ngay !== banDau.ngay : false;
      // - Nhập tay: gửi đúng số đã gõ (máy chủ kiểm trùng).
      // - Ô bị xoá trống: coi như yêu cầu tự động.
      // - Bấm “Tự động” hoặc vừa đổi ngày: gửi 0 để máy chủ chọn số trống nhỏ nhất.
      // - Phiếu cũ chưa từng được đánh số: lưu lần này đánh luôn.
      // - Còn lại (sửa phiếu, không đụng gì): không gửi, giữ nguyên số cũ.
      const chuaCoSo = suaDoi && banDau !== undefined && banDau.soThuTu <= 0;
      const soThuTuGui = daSuaSo
        ? Math.max(0, soNhap)
        : buocTuDong || ngayKhac || chuaCoSo
          ? 0
          : undefined;
      await onLuu({
        ngay,
        hoTen: hoTen.trim(),
        namSinh: Number(namSinh) || 0,
        buongGiam: buongGiam.trim(),
        ghiChu,
        items: dsDong.map((d) => ({ productId: d.productId, soLuong: d.soLuong, donGia: d.donGia })),
        soThuTu: soThuTuGui,
      });
      if (!suaDoi) lamMoi(true);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  }, [hoTen, namSinh, buongGiam, dsDong, ngay, ghiChu, onLuu, suaDoi, lamMoi, soThuTu, daSuaSo, buocTuDong, banDau]);

  // Ctrl+Enter để lưu. Khi cửa sổ xem trước đang mở thì nhường phím này cho
  // cửa sổ đó (dùng để đóng), tránh vừa đóng vừa lưu thêm một phiếu trống.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dangXem) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void luu();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [luu, dangXem]);

  return (
    <div className="flex flex-col gap-3">
      {/* --- Thông tin can phạm, ghi thẳng trên phiếu --- */}
      {/* Không dùng `overflow-hidden`: danh sách gợi ý họ tên bung xuống dưới sẽ bị cắt
          mất bởi khối kế tiếp. Đầu mục không có nền riêng nên không cần cắt góc. */}
      <section className="rounded-lg border border-ke bg-giay-cao shadow-the">
        <header className="khia flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
          <div className="flex items-baseline gap-2.5">
            <SoTo so="01" />
            <h2 className="font-serif text-[15px] font-semibold tracking-[-0.01em] text-muc">Thông tin can phạm</h2>
          </div>
          <span className="hidden text-[11.5px] text-muc-nhat sm:block">
            Gõ tên đã mua trước đây để tự điền năm sinh và buồng giam
          </span>
        </header>
        <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)]">
          <div>
            <ONhan>Họ và tên *</ONhan>
            <OTenCanPham
              giaTri={hoTen}
              onDoi={setHoTen}
              goiY={goiY}
              inputRef={oHoTen}
              onChonGoiY={(c) => {
                setHoTen(c.hoTen);
                setNamSinh(c.namSinh ? String(c.namSinh) : "");
                setBuongGiam(c.buongGiam);
                setTimeout(() => oTimHang.current?.focus(), 50);
              }}
              onEnter={() => oNamSinh.current?.focus()}
            />
          </div>
          <div>
            <ONhan>Năm sinh</ONhan>
            <OText
              ref={oNamSinh}
              type="number"
              value={namSinh}
              onChange={(e) => setNamSinh(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  oBuongGiam.current?.focus();
                }
              }}
              placeholder="1985"
            />
          </div>
          <div>
            <ONhan>Buồng giam</ONhan>
            <OText
              ref={oBuongGiam}
              value={buongGiam}
              onChange={(e) => setBuongGiam(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  oTimHang.current?.focus();
                }
              }}
              placeholder="Buồng 3"
            />
          </div>
        </div>
      </section>

      {/* --- Thêm mặt hàng --- */}
      <section className="rounded-lg border border-ke bg-giay-cao shadow-the">
        <header className="khia flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
          <div className="flex items-baseline gap-2.5">
            <SoTo so="02" />
            <h2 className="font-serif text-[15px] font-semibold tracking-[-0.01em] text-muc">Thêm mặt hàng</h2>
          </div>
          <span className="hidden text-[11.5px] text-muc-nhat sm:block">
            Mẹo: gõ <b className="font-mono font-medium text-muc">số lượng + dấu cách + tên hàng</b>, ví dụ “5 mì”.
            Enter để thêm dòng.
          </span>
        </header>
        <div className="p-4">
          <ChonHang products={sanPham} onChon={themHang} inputRef={oTimHang} />
        </div>
      </section>

      {/* --- Danh sách mặt hàng đã chọn --- */}
      <div className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
        <header className="khia flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
          <div className="flex items-baseline gap-2.5">
            <SoTo so="03" />
            <h2 className="font-serif text-[15px] font-semibold tracking-[-0.01em] text-muc">Mặt hàng trên phiếu</h2>
          </div>
          <span className="so text-[10.5px] text-muc-mo">{dsDong.length} dòng</span>
        </header>
        {dsDong.length === 0 ? (
          <Trong
            icon="kho"
            tieuDe="Chưa có mặt hàng nào trên phiếu"
            moTa="Dùng ô “Thêm mặt hàng” ở trên để chọn hàng can phạm mua."
          />
        ) : (
          <>
            {/* Trên điện thoại, mỗi dòng hàng là một thẻ để thao tác đủ số lượng và đơn giá */}
            <div className="divide-y divide-ke/60 sm:hidden">
              {dsDong.map((d, i) => (
                <div key={d.productId} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-muc">{d.ten}</div>
                      <div className="font-mono text-[10.5px] text-muc-mo">
                        {d.ma} · {d.donViTinh}
                      </div>
                    </div>
                    {nutXoaDong(d, i)}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <div className="nhan-muc mb-1">Số lượng</div>
                      {oSoLuong(d, i, true)}
                    </div>
                    <div>
                      <div className="nhan-muc mb-1">Đơn giá</div>
                      {oDonGia(d, i, true)}
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-[12px]">
                    <span className="text-muc-nhat">Thành tiền</span>
                    <span className="so font-semibold text-muc">{so(d.thanhTien)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mem-cuon hidden max-h-[50vh] min-h-[180px] overflow-auto sm:block">
              <Table className="w-full min-w-[680px] border-collapse text-sm">
                <TableHeader className="sticky top-0 z-10 bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
                  <TableRow className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="text-left">Tên mặt hàng</TableHead>
                    <TableHead className="w-16">ĐVT</TableHead>
                    <TableHead className="w-28 text-center">Số lượng</TableHead>
                    <TableHead className="w-28 text-right">Đơn giá</TableHead>
                    <TableHead className="w-32 text-right">Thành tiền</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dsDong.map((d, i) => (
                    <TableRow
                      key={d.productId}
                      className="group [&>td]:border-b [&>td]:border-ke/70 [&>td]:px-3 [&>td]:py-2.5 hover:bg-giay/70"
                    >
                      <TableCell className="so text-center text-[10.5px] text-muc-mo">{i + 1}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-muc">{d.ten}</div>
                        <div className="font-mono text-[10.5px] text-muc-mo">{d.ma}</div>
                      </TableCell>
                      <TableCell className="text-center text-[12px] text-muc-nhat">{d.donViTinh}</TableCell>
                      <TableCell className="text-center">{oSoLuong(d, i)}</TableCell>
                      <TableCell>{oDonGia(d, i)}</TableCell>
                      <TableCell className="so text-right font-semibold text-muc">{so(d.thanhTien)}</TableCell>
                      <TableCell className="text-center">{nutXoaDong(d, i)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* --- Thanh tổng kết: chân của tờ phiếu --- */}
      <div
        className={`overflow-hidden rounded-lg border border-ke bg-giay-cao/95 shadow-the backdrop-blur ${
          trongHopThoai ? "" : "z-10 lg:sticky lg:bottom-0"
        }`}
      >
        <div className="flex flex-wrap items-end gap-x-5 gap-y-4 p-4">
          <div className="w-40 shrink-0">
            <ONhan>Ngày bán</ONhan>
            <OText
              type="date"
              value={ngay}
              onChange={(e) => doiNgay(e.target.value)}
            />
          </div>
          <div className="w-48 shrink-0">
            <ONhan>Số thứ tự trong ngày</ONhan>
            <div className="flex items-center gap-1.5">
              <OText
                type="number"
                min={1}
                step={1}
                value={soThuTu}
                onChange={(e) => {
                  // Gõ tay thì huỷ luôn kết quả gợi ý đang trên đường về
                  lanGoiSo.current += 1;
                  setSoThuTu(e.target.value);
                  setDaSuaSo(true);
                  setBuocTuDong(false);
                }}
                onFocus={(e) => e.target.select()}
                placeholder="Tự động"
                aria-label="Số thứ tự trong ngày"
                className="w-16 text-center font-mono font-semibold"
              />
              <Nut
                kieu="mo"
                co="sm"
                onClick={() => {
                  setDaSuaSo(false);
                  setBuocTuDong(true);
                  void laySoThuTu(ngay, banDau?.id ?? "");
                }}
                disabled={dangLuu}
                title="Lấy số còn trống nhỏ nhất trong ngày"
                className="h-9 px-2 text-[11.5px]"
              >
                <BieuTuong ten="lammoi" className="h-3.5 w-3.5" /> Tự động
              </Nut>
            </div>
            <div className="mt-1 font-mono text-[9.5px] tracking-[0.03em] text-muc-mo uppercase">
              Số trống nhỏ nhất của ngày
            </div>
          </div>
          <div className="min-w-40 flex-1">
            <ONhan>Ghi chú</ONhan>
            <OText value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Không bắt buộc" />
          </div>

          <div className="flex w-full flex-col gap-3 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
            {/* Tổng thu: con số đặt trên một đường kẻ đôi như ô tổng của sổ kế toán */}
            <div className="text-right">
              <div className="nhan-muc">Tổng thu</div>
              <div className="mt-1.5 border-t-2 border-muc/80 pt-1.5">
                {tongTien > 0 ? (
                  <div className="so text-[30px] leading-none font-semibold text-muc">{tien(tongTien)}</div>
                ) : dsDong.length > 0 ? (
                  <div className="font-serif text-xl leading-none font-semibold text-moc">Chưa ghi giá</div>
                ) : (
                  <div className="so text-[30px] leading-none font-semibold text-muc-mo">0 đ</div>
                )}
              </div>
              <div className="mt-2 font-mono text-[10.5px] tracking-[0.04em] text-muc-mo">
                {dsDong.length} mặt hàng · {so(tongDonVi)} đơn vị
              </div>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              {onHuy ? (
                <Nut co="lg" onClick={xuLyHuy} disabled={dangLuu} className="flex-1 sm:flex-none">
                  Huỷ
                </Nut>
              ) : (
                <Nut co="lg" onClick={() => lamMoi(false)} disabled={dangLuu} className="flex-1 sm:flex-none">
                  Làm mới
                </Nut>
              )}
              <Nut
                kieu="chinh"
                co="lg"
                onClick={() => void luu()}
                disabled={dangLuu}
                className="flex-1 whitespace-nowrap sm:flex-none"
              >
                <BieuTuong ten="check" className="h-4 w-4" />
                {dangLuu ? "Đang lưu…" : (nhanLuu ?? (suaDoi ? "Lưu thay đổi" : "Lưu phiếu"))}
                <span className="ml-1 hidden rounded-sm bg-white/12 px-1.5 py-0.5 font-mono text-[9.5px] font-medium text-giay/75 sm:inline">
                  Ctrl+↵
                </span>
              </Nut>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
