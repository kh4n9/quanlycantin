"use client";

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { apiClient, type BaoCao } from "@/lib/client";
import { useStore } from "@/lib/store";
import { taiExcel, type TrangExcel } from "@/lib/excel";
import { DS_KIEU_IN } from "@/lib/mau-in";
import type { KieuInThieu } from "@/lib/types";
import { useDaMount, useNap } from "@/lib/use-nap";
import { PhieuThieu } from "./in-thieu";
import { homNay, ngayVN, so, tien } from "@/lib/format";
import { baoLoi, BieuTuong, HopThoai, Nhan, Nut, Trong } from "./ui";

/** Màu duy nhất cho chuỗi dữ liệu — đã kiểm bằng scripts/validate_palette.js */
const MAU_DUONG = "linear-gradient(180deg, #2a342e 0%, #16201c 100%)";

type HangBaoCao = BaoCao["theoHang"][number];
type CanPhamBaoCao = BaoCao["theoCanPham"][number];
type NgayBaoCao = BaoCao["theoNgay"][number];
type PhieuTomTat = CanPhamBaoCao["phieu"][number];

function dauThang(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function luiNgay(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function ManBaoCao() {
  const { settings } = useStore();
  const [tu, setTu] = useState(dauThang());
  const [den, setDen] = useState(homNay());
  const [du, setDu] = useState<BaoCao | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [chiTietHang, setChiTietHang] = useState<HangBaoCao | null>(null);
  const [chiTietCanPham, setChiTietCanPham] = useState<CanPhamBaoCao | null>(null);
  const [chiTietNgay, setChiTietNgay] = useState<NgayBaoCao | null>(null);
  // Chỉ phản hồi của lần tải mới nhất được phép cập nhật màn hình.
  const lanNap = useRef(0);
  // Portal cần document nên chỉ dựng sau khi đã sang phía trình duyệt
  const daMount = useDaMount();

  // Kiểu sắp danh sách khi in, lấy mặc định từ mẫu đã lưu trong Cài đặt
  const [kieuIn, setKieuIn] = useState<KieuInThieu>(settings.mauInThieu.kieuIn);
  const [xemTruocThieu, setXemTruocThieu] = useState(false);

  /**
   * In danh sách hàng còn thiếu để đi phát.
   *
   * Nội dung in nằm ở #print-thieu bên ngoài khung ứng dụng; thân trang mang
   * class "in-thieu" để CSS chọn in phần này thay vì in phiếu bán.
   */
  const inDanhSachThieu = () => {
    document.body.classList.add("in-thieu");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("in-thieu");
    }, 80);
  };

  const nap = useCallback(async () => {
    const lan = ++lanNap.current;
    setDangTai(true);
    try {
      const kq = await apiClient.baoCao(tu, den);
      if (lan === lanNap.current) setDu(kq);
    } catch (e) {
      if (lan === lanNap.current) baoLoi((e as Error).message);
    } finally {
      if (lan === lanNap.current) setDangTai(false);
    }
  }, [tu, den]);

  useNap(nap);

  /** Các chỉ số dẫn xuất, chỉ tính lại khi dữ liệu báo cáo đổi. */
  const nhanh = useMemo(() => {
    if (!du || du.tongQuan.soPhieu === 0) return null;
    const tq = du.tongQuan;
    const soNgayCoBan = du.theoNgay.filter((n) => n.soPhieu > 0).length;
    const ngayCao = [...du.theoNgay].sort((a, b) =>
      tq.coDungTien ? b.doanhThu - a.doanhThu : b.soPhieu - a.soPhieu,
    )[0];
    return {
      soNgayCoBan,
      tbPhieuNgay: soNgayCoBan ? tq.soPhieu / soNgayCoBan : 0,
      tbGiaTri: tq.soPhieu ? tq.doanhThu / tq.soPhieu : 0,
      tbHang: tq.soPhieu ? tq.soLuongHang / tq.soPhieu : 0,
      ngayCao,
      topHang: du.theoHang[0] ?? null,
      topNguoi: du.theoCanPham[0] ?? null,
    };
  }, [du]);

  const datNhanh = (kieu: "homnay" | "7ngay" | "thangnay" | "thangtruoc") => {
    const d = new Date();
    if (kieu === "homnay") {
      setTu(homNay());
      setDen(homNay());
    } else if (kieu === "7ngay") {
      setTu(luiNgay(6));
      setDen(homNay());
    } else if (kieu === "thangnay") {
      setTu(dauThang(d));
      setDen(homNay());
    } else {
      const truoc = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const cuoi = new Date(d.getFullYear(), d.getMonth(), 0);
      const p = (n: number) => String(n).padStart(2, "0");
      setTu(`${truoc.getFullYear()}-${p(truoc.getMonth() + 1)}-01`);
      setDen(`${cuoi.getFullYear()}-${p(cuoi.getMonth() + 1)}-${p(cuoi.getDate())}`);
    }
  };

  const xuatExcel = () => {
    if (!du) return;
    const khoang = `${ngayVN(tu)} – ${ngayVN(den)}`;
    const tq = du.tongQuan;

    const tongQuan: (string | number | null)[][] = [
      ["Số phiếu bán", tq.soPhieu],
      ["Số lượng hàng đã bán", tq.soLuongHang],
      ["Số mặt hàng khác nhau", tq.soMatHang],
      ["Số can phạm đã mua", tq.soCanPham],
    ];
    if (tq.coDungTien) tongQuan.push(["Doanh thu", tq.doanhThu]);

    // Trang hàng thiếu chỉ thêm khi thật sự có, tránh xuất ra bảng trống
    const trangThieu: TrangExcel[] =
      du.hangThieu.length > 0
        ? [
            {
              ten: "Tổng hợp hàng thiếu",
              // Số phiếu ở đây là số phiếu riêng biệt nên không cộng dồn theo cột,
              // vì một phiếu có thể thiếu nhiều mặt hàng. Ghi rõ ở dòng tiêu đề.
              tieuDe: `Hàng còn thiếu cần bù — ${du.hangThieu.length} mặt hàng, ${du.tongQuan.soPhieuThieu} phiếu, ${du.tongQuan.tongLuongThieu} đơn vị`,
              tieuDeCot: ["Mã hàng", "Tên mặt hàng", "ĐVT", "Số phiếu", "Tổng còn thiếu"],
              dong: [
                ...du.hangThieu.map((h) => [h.ma, h.ten, h.donViTinh, h.phieu.length, h.conThieu]),
                // Dòng tổng chỉ cộng cột số lượng; cột số phiếu để trống cho khỏi
                // thành con số sai (cộng theo cột sẽ đếm trùng phiếu thiếu nhiều món)
                ["", "TỔNG CỘNG", "", null, du.tongQuan.tongLuongThieu],
              ],
              cotTien: [],
              doRong: [14, 32, 10, 12, 18],
            },
            {
              ten: "Chi tiết theo buồng",
              tieuDe: `Danh sách phát hàng còn thiếu — ${du.tongQuan.soPhieuThieu} phiếu, ${du.tongQuan.tongLuongThieu} đơn vị`,
              // Sắp theo buồng rồi tới phiếu để đi phát lần lượt từng buồng
              tieuDeCot: [
                "Buồng giam",
                "Số phiếu",
                "Ngày bán",
                "Họ tên",
                "Mã hàng",
                "Tên mặt hàng",
                "ĐVT",
                "Còn thiếu",
                "Ghi chú",
              ],
              dong: [
                ...du.thieuTheoPhieu.map((r) => [
                  r.buongGiam || "—",
                  r.soPhieu,
                  ngayVN(r.ngay),
                  r.hoTen,
                  r.ma,
                  r.ten,
                  r.donViTinh,
                  r.conThieu,
                  r.ghiChu,
                ]),
                // Cột ghi chú để trống ở dòng tổng vì cộng chữ lại không có nghĩa
                ["", "TỔNG CỘNG", "", "", "", "", "", du.tongQuan.tongLuongThieu, ""],
              ],
              doRong: [12, 16, 12, 26, 14, 26, 9, 11, 30],
            },
          ]
        : [];

    void taiExcel(`bao-cao_${tu}_${den}`, [
      {
        ten: "Tổng quan",
        tieuDe: `Báo cáo bán hàng căn tin — ${khoang}`,
        tieuDeCot: ["Chỉ tiêu", "Giá trị"],
        dong: tongQuan,
        cotTien: [1],
        doRong: [28, 18],
      },
      {
        ten: "Theo ngày",
        tieuDeCot: ["Ngày", "Số phiếu", "Doanh thu"],
        dong: du.theoNgay.map((n) => [ngayVN(n.ngay), n.soPhieu, n.doanhThu]),
        cotTien: [2],
        doRong: [14, 12, 18],
      },
      {
        ten: "Mặt hàng",
        tieuDeCot: ["Mã", "Tên mặt hàng", "ĐVT", "Số phiếu", "Số can phạm", "Số lượng đã bán", "Doanh thu"],
        dong: du.theoHang.map((h) => [
          h.ma,
          h.ten,
          h.donViTinh,
          h.soPhieu,
          h.soCanPham,
          h.soLuong,
          h.doanhThu,
        ]),
        cotTien: [6],
        doRong: [14, 32, 10, 10, 13, 18, 18],
      },
      ...trangThieu,
      {
        ten: "Can phạm",
        tieuDeCot: ["Họ tên", "Năm sinh", "Buồng giam", "Số phiếu", "Số lượng hàng", "Doanh thu"],
        dong: du.theoCanPham.map((p) => [
          p.hoTen,
          p.namSinh || null,
          p.buongGiam,
          p.soPhieu,
          p.soLuongHang,
          p.doanhThu,
        ]),
        cotTien: [5],
        doRong: [26, 10, 12, 10, 16, 18],
      },
    ]).catch((e) => baoLoi((e as Error).message));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Bộ lọc — một hàng phía trên các biểu đồ */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-ke bg-giay-cao px-3.5 py-3 shadow-the">
        <span className="mr-1 font-serif text-[14px] font-semibold text-muc">Khoảng thời gian</span>
        {(
          [
            ["homnay", "Hôm nay"],
            ["7ngay", "7 ngày"],
            ["thangnay", "Tháng này"],
            ["thangtruoc", "Tháng trước"],
          ] as const
        ).map(([k, nhan]) => (
          <Nut key={k} co="sm" onClick={() => datNhanh(k)}>
            {nhan}
          </Nut>
        ))}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={tu}
            onChange={(e) => setTu(e.target.value)}
            className="h-9 rounded-sm border border-ke-dam bg-giay-cao px-2.5 font-mono text-[11.5px] shadow-xs outline-none transition focus:border-muc"
          />
          <span className="text-muc-mo">→</span>
          <input
            type="date"
            value={den}
            onChange={(e) => setDen(e.target.value)}
            className="h-9 rounded-sm border border-ke-dam bg-giay-cao px-2.5 font-mono text-[11.5px] shadow-xs outline-none transition focus:border-muc"
          />
        </div>
        <Nut onClick={xuatExcel} disabled={!du} className="ml-auto">
          <BieuTuong ten="tai" /> Xuất Excel
        </Nut>
      </div>

      {dangTai && !du ? (
        <div className="rounded-lg border border-ke bg-giay-cao py-16 text-center font-mono text-[11px] tracking-[0.06em] text-muc-mo uppercase shadow-the">
          Đang tổng hợp số liệu…
        </div>
      ) : !du || du.tongQuan.soPhieu === 0 ? (
        <div className="rounded-lg border border-ke bg-giay-cao shadow-the">
          <Trong
            tieuDe="Chưa có phiếu bán nào trong khoảng thời gian này"
            moTa="Chọn khoảng ngày khác, hoặc lập phiếu bán ở màn hình Bán hàng."
          />
        </div>
      ) : (
        <>
          {du.tongQuan.soPhieuThieu > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-moc/30 border-l-[3px] border-l-moc bg-moc-nhat px-3.5 py-2.5 text-[13px] text-muc shadow-xs">
              <BieuTuong ten="canh" className="h-4 w-4 shrink-0 text-moc" />
              <span>
                Đang có <b className="font-semibold">{so(du.tongQuan.soPhieuThieu)}</b> phiếu còn nợ hàng can phạm, tổng
                cộng <b className="font-semibold">{so(du.tongQuan.tongLuongThieu)}</b> đơn vị chưa giao. Chi tiết ở mục
                “Hàng còn thiếu” bên dưới.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Tile
              nhan="Số phiếu bán"
              giaTri={so(du.tongQuan.soPhieu)}
              chinh
              icon="phieu"
              soSanh={du.soSanh ? { hienTai: du.tongQuan.soPhieu, truoc: du.soSanh.soPhieu } : undefined}
            />
            {du.tongQuan.coDungTien ? (
              <Tile
                nhan="Doanh thu"
                giaTri={tien(du.tongQuan.doanhThu)}
                icon="bieu"
                soSanh={du.soSanh ? { hienTai: du.tongQuan.doanhThu, truoc: du.soSanh.doanhThu } : undefined}
              />
            ) : (
              <Tile
                nhan="Số can phạm đã mua"
                giaTri={so(du.tongQuan.soCanPham)}
                icon="nguoi"
                soSanh={du.soSanh ? { hienTai: du.tongQuan.soCanPham, truoc: du.soSanh.soCanPham } : undefined}
              />
            )}
            <Tile
              nhan="Số lượng hàng đã bán"
              giaTri={so(du.tongQuan.soLuongHang)}
              phu={`TB ${so(du.tongQuan.soPhieu ? du.tongQuan.soLuongHang / du.tongQuan.soPhieu : 0)} đơn vị/phiếu`}
              icon="kho"
              soSanh={du.soSanh ? { hienTai: du.tongQuan.soLuongHang, truoc: du.soSanh.soLuongHang } : undefined}
            />
            {du.tongQuan.coDungTien ? (
              <Tile
                nhan="Can phạm đã mua"
                giaTri={so(du.tongQuan.soCanPham)}
                phu={`${so(du.tongQuan.soMatHang)} mặt hàng khác nhau`}
                icon="nguoi"
                soSanh={du.soSanh ? { hienTai: du.tongQuan.soCanPham, truoc: du.soSanh.soCanPham } : undefined}
              />
            ) : (
              <Tile
                nhan="Số mặt hàng khác nhau"
                giaTri={so(du.tongQuan.soMatHang)}
                icon="kho"
                soSanh={du.soSanh ? { hienTai: du.tongQuan.soMatHang, truoc: du.soSanh.soMatHang } : undefined}
              />
            )}
          </div>

          {nhanh && (
            <ChiSoNhanh
              coDungTien={du.tongQuan.coDungTien}
              tbPhieuNgay={nhanh.tbPhieuNgay}
              soNgayCoBan={nhanh.soNgayCoBan}
              tbGiaTri={nhanh.tbGiaTri}
              tbHang={nhanh.tbHang}
              ngayCao={nhanh.ngayCao}
              topHang={nhanh.topHang}
              topNguoi={nhanh.topNguoi}
              onChonHang={setChiTietHang}
              onChonNguoi={setChiTietCanPham}
              onChonNgay={setChiTietNgay}
            />
          )}

          <BieuDoTheoNgay data={du.theoNgay} dungTien={du.tongQuan.coDungTien} onChonNgay={setChiTietNgay} />

          <HangConThieu
            hang={du.hangThieu}
            tu={tu}
            den={den}
            kieuIn={kieuIn}
            setKieuIn={setKieuIn}
            onIn={du.thieuTheoPhieu.length > 0 ? inDanhSachThieu : undefined}
            onXemTruoc={du.thieuTheoPhieu.length > 0 ? () => setXemTruocThieu(true) : undefined}
            onChonHang={(productId) => {
              const h = du.theoHang.find((x) => x.productId === productId);
              if (h) setChiTietHang(h);
            }}
          />

          <BangXepHang
            tieuDe="Mặt hàng đã bán"
            phuDe={du.tongQuan.coDungTien ? "Xếp theo doanh thu · bấm để xem chi tiết" : "Xếp theo số lượng đã bán · bấm để xem chi tiết"}
            cot="Số lượng"
            hang={du.theoHang.map((h) => ({
              id: h.productId,
              ma: h.ma,
              ten: h.ten,
              soLuong: h.soLuong,
              donVi: h.donViTinh,
              giaTri: du.tongQuan.coDungTien ? h.doanhThu : h.soLuong,
              hienThi: du.tongQuan.coDungTien ? so(h.doanhThu) : so(h.soLuong),
            }))}
            nhanGiaTri="Doanh thu"
            onChon={(id) => {
              const h = du.theoHang.find((x) => x.productId === id);
              if (h) setChiTietHang(h);
            }}
          />

          <BangXepHang
            tieuDe="Can phạm mua hàng"
            phuDe={
              du.tongQuan.coDungTien
                ? "Xếp theo tổng tiền mua · bấm để xem lịch sử"
                : "Xếp theo số lượng hàng đã mua · bấm để xem lịch sử"
            }
            cot="Số phiếu"
            hang={du.theoCanPham.map((p) => ({
              id: p.id,
              ma: p.namSinh ? `SN ${p.namSinh}` : "",
              ten: p.hoTen,
              phu: p.buongGiam,
              soLuong: p.soPhieu,
              donVi: "phiếu",
              giaTri: du.tongQuan.coDungTien ? p.doanhThu : p.soLuongHang,
              hienThi: du.tongQuan.coDungTien ? so(p.doanhThu) : so(p.soLuongHang),
            }))}
            nhanGiaTri="Tổng tiền"
            onChon={(id) => {
              const p = du.theoCanPham.find((x) => x.id === id);
              if (p) setChiTietCanPham(p);
            }}
          />
        </>
      )}

      {chiTietHang && (
        <HopChiTietHang
          hang={chiTietHang}
          dungTien={du?.tongQuan.coDungTien ?? false}
          dong={() => setChiTietHang(null)}
        />
      )}
      {chiTietCanPham && (
        <HopChiTietCanPham
          canPham={chiTietCanPham}
          dungTien={du?.tongQuan.coDungTien ?? false}
          dong={() => setChiTietCanPham(null)}
        />
      )}
      {chiTietNgay && (
        <HopChiTietNgay
          ngay={chiTietNgay}
          dungTien={du?.tongQuan.coDungTien ?? false}
          dong={() => setChiTietNgay(null)}
        />
      )}

      {daMount &&
        createPortal(
          <div id="print-thieu">
            {du && du.thieuTheoPhieu.length > 0 && (
              <PhieuThieu
                du={du}
                settings={settings}
                tu={tu}
                den={den}
                kieuIn={kieuIn}
                mau={settings.mauInThieu}
              />
            )}
          </div>,
          document.body,
        )}

      {/* Xem trước danh sách phát trước khi in */}
      {xemTruocThieu && du && (
        <div className="khong-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-muc/45 p-4 pt-10">
          <div className="hop-noi w-full max-w-4xl rounded-lg border border-ke bg-white shadow-noi">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ke px-4 py-3">
              <div>
                <h3 className="font-serif text-[15px] font-semibold text-muc">Xem trước danh sách phát</h3>
                <p className="font-mono text-[10px] tracking-[0.02em] text-muc-mo">
                  {DS_KIEU_IN.find((k) => k.khoa === kieuIn)?.nhan} — mẫu in sửa trong Cài đặt
                </p>
              </div>
              <div className="flex gap-2">
                <Nut co="sm" onClick={() => setXemTruocThieu(false)}>
                  Đóng
                </Nut>
                <Nut
                  co="sm"
                  kieu="chinh"
                  onClick={() => {
                    setXemTruocThieu(false);
                    inDanhSachThieu();
                  }}
                >
                  <BieuTuong ten="in" className="h-4 w-4" /> In
                </Nut>
              </div>
            </header>
            <div className="mem-cuon max-h-[76vh] overflow-auto p-6">
              <PhieuThieu
                du={du}
                settings={settings}
                tu={tu}
                den={den}
                kieuIn={kieuIn}
                mau={settings.mauInThieu}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function phanTramSoSanh(hienTai: number, truoc: number) {
  if (truoc <= 0) {
    return hienTai > 0 ? { nhan: "kỳ trước chưa có", sac: "xam" as const } : null;
  }
  const phanTram = ((hienTai - truoc) / truoc) * 100;
  if (Math.abs(phanTram) < 0.5) return { nhan: "không đổi so với kỳ trước", sac: "xam" as const };
  return {
    nhan: `${phanTram > 0 ? "+" : ""}${phanTram.toFixed(1).replace(".", ",")}% so với kỳ trước`,
    sac: phanTram > 0 ? ("luc" as const) : ("do" as const),
  };
}

function Tile({
  nhan,
  giaTri,
  phu,
  chinh = false,
  icon,
  soSanh,
}: {
  nhan: string;
  giaTri: string;
  phu?: string;
  chinh?: boolean;
  icon?: string;
  soSanh?: { hienTai: number; truoc: number };
}) {
  const ss = soSanh ? phanTramSoSanh(soSanh.hienTai, soSanh.truoc) : null;
  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-giay-cao px-4 py-3.5 shadow-the ${
        chinh ? "border-muc/25" : "border-ke"
      }`}
    >
      {chinh && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-muc" />}
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="nhan-muc min-w-0 truncate">{nhan}</div>
          {icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-ke bg-giay text-muc-mo">
              <BieuTuong ten={icon} className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        <div
          className={`so mt-1.5 font-semibold tracking-tight whitespace-nowrap text-muc ${
            chinh ? "text-[25px] sm:text-[30px]" : "text-[19px] sm:text-[22px]"
          }`}
        >
          {giaTri}
        </div>
        {phu && <div className="mt-1 text-[11px] text-muc-nhat">{phu}</div>}
        {ss && (
          <div className="mt-1.5">
            <Nhan sac={ss.sac}>{ss.nhan}</Nhan>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- Biểu đồ theo ngày --------------------------- */

type DiemNgay = NgayBaoCao;

function BieuDoTheoNgay({
  data,
  dungTien,
  onChonNgay,
}: {
  data: DiemNgay[];
  dungTien: boolean;
  onChonNgay?: (d: DiemNgay) => void;
}) {
  const [tro, setTro] = useState<number | null>(null);
  const giaTri = (d: DiemNgay) => (dungTien ? d.doanhThu : d.soPhieu);

  const { caoNhat, moc, buocNhan } = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => (dungTien ? d.doanhThu : d.soPhieu)));
    const donVi = Math.pow(10, Math.floor(Math.log10(max)));
    const tran = max <= 5 ? max : Math.ceil(max / donVi) * donVi;
    return {
      caoNhat: tran,
      moc: [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(tran * t)),
      buocNhan: Math.max(1, Math.ceil(data.length / 8)),
    };
  }, [data, dungTien]);

  const tong = data.reduce((s, d) => s + giaTri(d), 0);
  const ngayCaoNhat = data.reduce((a, b) => (giaTri(b) > giaTri(a) ? b : a), data[0]);

  return (
    <section className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-ke bg-giay px-4 py-3">
        <div>
          <h2 className="font-serif text-[15px] leading-tight font-semibold tracking-[-0.01em] text-muc">
            {dungTien ? "Doanh thu theo ngày" : "Số phiếu bán theo ngày"}
          </h2>
          <p className="mt-0.5 text-[11px] text-muc-nhat">
            Tổng {dungTien ? tien(tong) : `${so(tong)} phiếu`} · TB {so(tong / Math.max(1, data.length))}/ngày · cao
            nhất {ngayVN(ngayCaoNhat?.ngay ?? "")} (
            {dungTien ? tien(giaTri(ngayCaoNhat)) : `${so(giaTri(ngayCaoNhat))} phiếu`})
          </p>
        </div>
        <span className="font-mono text-[9.5px] tracking-[0.03em] text-muc-mo uppercase">
          {onChonNgay ? "Bấm vào cột để xem phiếu trong ngày" : "Đưa chuột lên cột để xem chi tiết ngày"}
        </span>
      </header>

      <div className="flex gap-3 px-4 pt-4 pb-3">
        <div className="so flex h-[220px] w-20 shrink-0 flex-col justify-between text-right text-[9.5px] text-muc-mo">
          {[...moc].reverse().map((m) => (
            <span key={m} className="-translate-y-1/2 tabular-nums">
              {so(m)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="relative h-[220px]">
            <div className="absolute inset-0 flex flex-col justify-between">
              {moc.map((m, i) => (
                <div key={m} className={`h-px w-full ${i === moc.length - 1 ? "bg-ke-dam" : "bg-ke/60"}`} />
              ))}
            </div>

            <div className="absolute inset-0 flex items-end" style={{ gap: 2 }}>
              {data.map((d, i) => {
                const phanTram = (giaTri(d) / caoNhat) * 100;
                const dangTro = tro === i;
                return (
                  <div
                    key={d.ngay}
                    className={`relative flex h-full flex-1 items-end ${
                      onChonNgay ? "cursor-pointer" : "cursor-default"
                    }`}
                    onMouseEnter={() => setTro(i)}
                    onMouseLeave={() => setTro(null)}
                    onClick={() => onChonNgay?.(d)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onChonNgay?.(d);
                      }
                    }}
                    role={onChonNgay ? "button" : undefined}
                    title={onChonNgay ? "Bấm để xem chi tiết ngày" : undefined}
                    tabIndex={0}
                    onFocus={() => setTro(i)}
                    onBlur={() => setTro(null)}
                  >
                    <div
                      className="mx-auto w-full transition-opacity"
                      style={{
                        height: `${Math.max(phanTram, giaTri(d) > 0 ? 1.5 : 0)}%`,
                        maxWidth: 52,
                        background: MAU_DUONG,
                        borderTopLeftRadius: 6,
                        borderTopRightRadius: 6,
                        opacity: tro === null || dangTro ? 1 : 0.45,
                      }}
                    />
                    {dangTro && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-44 -translate-x-1/2 rounded-md border border-ke-dam bg-giay-cao px-3 py-2 text-[11.5px] shadow-noi">
                        <div className="font-mono text-[10px] tracking-[0.06em] text-muc uppercase">{ngayVN(d.ngay)}</div>
                        <div className="mt-1 flex justify-between gap-3 text-muc-nhat">
                          <span>Số phiếu</span>
                          <b className="so text-muc">{so(d.soPhieu)}</b>
                        </div>
                        <div className="flex justify-between gap-3 text-muc-nhat">
                          <span>Lượng hàng</span>
                          <span className="so text-muc">{so(d.soLuongHang)}</span>
                        </div>
                        {dungTien && (
                          <div className="flex justify-between gap-3 text-muc-nhat">
                            <span>Doanh thu</span>
                            <span className="so text-muc">{so(d.doanhThu)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-1 flex" style={{ gap: 2 }}>
            {data.map((d, i) => (
              <div key={d.ngay} className="so min-w-0 flex-1 text-center text-[9.5px] whitespace-nowrap text-muc-mo">
                {i % buocNhan === 0 || i === data.length - 1 ? d.ngay.slice(8, 10) : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Hàng còn thiếu ------------------------------ */

type DongThieu = BaoCao["hangThieu"][number];

/**
 * Danh sách hàng còn nợ can phạm, gom theo mặt hàng.
 * Dùng để khi hàng về thì biết ngay cần bù cho phiếu nào, bao nhiêu.
 */
function HangConThieu({
  hang,
  tu,
  den,
  kieuIn,
  setKieuIn,
  onIn,
  onXemTruoc,
  onChonHang,
}: {
  hang: DongThieu[];
  tu: string;
  den: string;
  kieuIn: KieuInThieu;
  setKieuIn: (k: KieuInThieu) => void;
  onIn?: () => void;
  onXemTruoc?: () => void;
  onChonHang?: (productId: string) => void;
}) {
  if (hang.length === 0) {
    return (
      <section className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
        <header className="border-b border-dashed border-ke bg-giay px-4 py-3">
          <h2 className="font-serif text-[15px] leading-tight font-semibold tracking-[-0.01em] text-muc">
            Hàng còn thiếu
          </h2>
          <p className="mt-0.5 text-[11px] text-muc-nhat">
            Khoảng {ngayVN(tu)} – {ngayVN(den)}
          </p>
        </header>
        <div className="flex items-center gap-2 px-4 py-4 text-[13px] text-ngoc">
          <BieuTuong ten="check" className="h-4 w-4" />
          Không có phiếu nào còn nợ hàng can phạm trong khoảng này.
        </div>
      </section>
    );
  }

  const tongThieu = hang.reduce((s, h) => s + h.conThieu, 0);

  return (
    <section className="relative overflow-hidden rounded-lg border border-moc/30 bg-giay-cao shadow-the">
      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-moc" />
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-ke bg-giay px-4 py-3">
        <div>
          <h2 className="font-serif text-[15px] leading-tight font-semibold tracking-[-0.01em] text-muc">
            Hàng còn thiếu
          </h2>
          <p className="mt-0.5 text-[11px] text-muc-nhat">
            Khi hàng về, đối chiếu mục này để biết cần bù cho phiếu nào
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10.5px] tracking-[0.03em] text-moc uppercase">
            {so(hang.length)} mặt hàng · tổng {so(tongThieu)} đơn vị
          </span>
          {onIn && (
            <>
              <label className="text-[12px] text-muc-nhat">Kiểu in</label>
              <select
                value={kieuIn}
                onChange={(e) => setKieuIn(e.target.value as KieuInThieu)}
                title={DS_KIEU_IN.find((k) => k.khoa === kieuIn)?.moTa}
                className="h-8 rounded-md border border-ke-dam bg-giay-cao px-2 text-[13px] shadow-xs outline-none transition focus:border-muc/60"
              >
                {DS_KIEU_IN.map((k) => (
                  <option key={k.khoa} value={k.khoa}>
                    {k.nhan}
                  </option>
                ))}
              </select>
              <Nut co="sm" onClick={onXemTruoc} title="Xem trước rồi mới in">
                Xem trước
              </Nut>
              <Nut co="sm" kieu="chinh" onClick={onIn} title="In danh sách để đi phát hàng">
                <BieuTuong ten="in" className="h-4 w-4" /> In danh sách phát
              </Nut>
            </>
          )}
        </div>
      </header>

      {onIn && (
        <div className="border-b border-ke/70 bg-giay/60 px-4 py-1.5 font-mono text-[10px] tracking-[0.03em] text-muc-nhat">
          {DS_KIEU_IN.find((k) => k.khoa === kieuIn)?.moTa}
        </div>
      )}

      <div className="divide-y divide-ke/60">
        {hang.map((h) => (
          <div key={h.productId} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="so text-[11px] text-muc-mo">{h.ma}</span>
              <span className="font-semibold text-muc">{h.ten}</span>
              <span className="text-[12px] text-muc-mo">{h.donViTinh}</span>
              <span className="ml-auto">
                <Nhan sac="vang">còn thiếu {so(h.conThieu)}</Nhan>
              </span>
              {onChonHang && (
                <button
                  type="button"
                  onClick={() => onChonHang(h.productId)}
                  className="text-[12px] font-semibold text-muc underline decoration-ke-dam underline-offset-2 hover:decoration-muc"
                >
                  Xem mặt hàng
                </button>
              )}
            </div>

            <div className="mem-cuon mt-1.5 overflow-x-auto">
              <table className="w-full border-collapse text-[13px] sm:min-w-[560px]">
                <tbody>
                  {h.phieu.map((p) => (
                    <tr key={`${h.productId}-${p.id}`} className="[&>td]:py-1">
                      <td className="so w-28 text-[11.5px] text-muc sm:w-32">{p.soPhieu}</td>
                      <td className="hidden w-24 font-mono text-[10.5px] text-muc-mo sm:table-cell">{ngayVN(p.ngay)}</td>
                      <td className="text-muc-nhat">{p.hoTen}</td>
                      <td className="hidden w-24 text-muc-nhat sm:table-cell">{p.buongGiam || "—"}</td>
                      <td className="so w-20 text-right font-semibold text-moc sm:w-24">
                        thiếu {so(p.conThieu)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ Bảng xếp hạng ------------------------------ */

type DongXepHang = {
  id: string;
  ma: string;
  ten: string;
  phu?: string;
  soLuong: number;
  donVi: string;
  giaTri: number;
  hienThi: string;
};

function BangXepHang({
  tieuDe,
  phuDe,
  cot,
  hang,
  nhanGiaTri,
  onChon,
}: {
  tieuDe: string;
  phuDe: string;
  cot: string;
  hang: DongXepHang[];
  nhanGiaTri: string;
  onChon?: (id: string) => void;
}) {
  const [moRong, setMoRong] = useState(false);
  if (hang.length === 0) return null;
  const lonNhat = Math.max(1, ...hang.map((h) => h.giaTri));
  const soHienMacDinh = 10;
  const hienThi = moRong ? hang : hang.slice(0, soHienMacDinh);
  const conLai = hang.length - soHienMacDinh;

  const mo = (h: DongXepHang) => {
    if (!onChon) return;
    onChon(h.id);
  };

  return (
    <section className="overflow-hidden rounded-lg border border-ke bg-giay-cao shadow-the">
      <header className="flex items-baseline justify-between gap-2 border-b border-dashed border-ke bg-giay px-4 py-3">
        <div>
          <h2 className="font-serif text-[15px] leading-tight font-semibold tracking-[-0.01em] text-muc">{tieuDe}</h2>
          <p className="mt-0.5 text-[11px] text-muc-nhat">{phuDe}</p>
        </div>
        <span className="so text-[10.5px] text-muc-mo">
          {hienThi.length} / {hang.length}
        </span>
      </header>
      <div className="mem-cuon overflow-x-auto">
        <table className="w-full border-collapse text-sm sm:min-w-[520px]">
          <thead className="bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase">
            <tr className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
              <th className="hidden w-10 sm:table-cell">#</th>
              <th className="hidden w-32 sm:table-cell">Mã</th>
              <th>Tên</th>
              <th className="w-20 text-right sm:w-28">{cot}</th>
              <th className="w-24 text-right sm:w-56">{nhanGiaTri}</th>
            </tr>
          </thead>
          <tbody>
            {hienThi.map((h, i) => (
              <tr
                key={h.id}
                onClick={() => mo(h)}
                title={onChon ? "Bấm để xem chi tiết" : undefined}
                className={`[&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-1.5 ${
                  onChon ? "cursor-pointer transition-colors hover:bg-giay/60" : ""
                }`}
              >
                <td className="hidden text-center font-mono text-[10.5px] text-muc-mo sm:table-cell">
                  {i < 3 ? <span className="font-semibold text-muc">{i + 1}</span> : i + 1}
                </td>
                <td className="so hidden text-[11px] text-muc-mo sm:table-cell">{h.ma}</td>
                <td>
                  <div className="font-semibold text-muc">{h.ten}</div>
                  {h.phu && <div className="text-[10.5px] text-muc-mo">{h.phu}</div>}
                </td>
                <td className="so text-right text-[12.5px] text-muc-nhat">
                  {so(h.soLuong)} {h.donVi}
                </td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    {/* Độ dài cột mã hoá độ lớn; con số vẫn hiện đầy đủ */}
                    <div className="hidden h-1.5 w-28 overflow-hidden rounded-sm bg-ke/70 sm:block">
                      <div
                        className="h-full rounded-sm"
                        style={{ width: `${(h.giaTri / lonNhat) * 100}%`, background: MAU_DUONG }}
                      />
                    </div>
                    <span className="so text-right text-[12.5px] font-semibold text-muc sm:w-20">{h.hienThi}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hang.length > soHienMacDinh && (
        <button
          type="button"
          onClick={() => setMoRong((v) => !v)}
          aria-expanded={moRong}
          className="flex w-full items-center justify-center gap-1.5 border-t border-ke bg-giay/70 px-4 py-2.5 font-mono text-[10.5px] tracking-[0.05em] text-muc uppercase transition-colors hover:bg-giay"
        >
          {moRong ? "Thu gọn danh sách" : `Xem thêm ${so(conLai)} mục`}
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform ${moRong ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </section>
  );
}

/* --------------------------- Chỉ số nhanh --------------------------- */

function ChiSoNhanh({
  coDungTien,
  tbPhieuNgay,
  soNgayCoBan,
  tbGiaTri,
  tbHang,
  ngayCao,
  topHang,
  topNguoi,
  onChonHang,
  onChonNguoi,
  onChonNgay,
}: {
  coDungTien: boolean;
  tbPhieuNgay: number;
  soNgayCoBan: number;
  tbGiaTri: number;
  tbHang: number;
  ngayCao?: NgayBaoCao;
  topHang: HangBaoCao | null;
  topNguoi: CanPhamBaoCao | null;
  onChonHang: (h: HangBaoCao) => void;
  onChonNguoi: (p: CanPhamBaoCao) => void;
  onChonNgay: (n: NgayBaoCao) => void;
}) {
  return (
    <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      <TheNhanh nhan="Nhịp bán hàng" icon="phieu">
        <div className="so text-[17px] font-semibold tracking-tight text-muc">
          {so(tbPhieuNgay)}{" "}
          <span className="font-mono text-[10.5px] font-normal tracking-[0.02em] text-muc-mo">phiếu/ngày</span>
        </div>
        <div className="mt-0.5 text-[11px] text-muc-nhat">Trung bình trên {so(soNgayCoBan)} ngày có bán</div>
      </TheNhanh>

      <TheNhanh nhan={coDungTien ? "Giá trị trung bình" : "Lượng hàng trung bình"} icon="bieu">
        <div className="so text-[17px] font-semibold tracking-tight text-muc">
          {coDungTien ? tien(tbGiaTri) : so(tbHang)}{" "}
          <span className="font-mono text-[10.5px] font-normal tracking-[0.02em] text-muc-mo">
            {coDungTien ? "mỗi phiếu" : "đơn vị/phiếu"}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-muc-nhat">
          {coDungTien ? `TB ${so(tbHang)} đơn vị hàng mỗi phiếu` : "Tính trên các phiếu có bán trong kỳ"}
        </div>
      </TheNhanh>

      <TheNhanh
        nhan="Ngày bán mạnh nhất"
        icon="phieu"
        onClick={ngayCao ? () => onChonNgay(ngayCao) : undefined}
      >
        <div className="so text-[15px] font-semibold tracking-tight text-muc">
          {ngayCao ? ngayVN(ngayCao.ngay) : "—"}
        </div>
        <div className="mt-0.5 text-[11px] text-muc-nhat">
          {ngayCao
            ? `${so(ngayCao.soPhieu)} phiếu · ${coDungTien ? tien(ngayCao.doanhThu) : `${so(ngayCao.soLuongHang)} đơn vị hàng`}`
            : "Chưa có ngày nào có bán"}
        </div>
      </TheNhanh>

      <TheNhanh nhan="Dẫn đầu kỳ này" icon="nguoi">
        <div className="mt-0.5 space-y-1">
          {topHang ? (
            <button
              type="button"
              onClick={() => onChonHang(topHang)}
              className="flex w-full items-center gap-1.5 rounded-sm px-1 py-0.5 text-left text-[12px] transition-colors hover:bg-giay"
              title="Xem chi tiết mặt hàng"
            >
              <span className="w-9 shrink-0 font-mono text-[9px] tracking-[0.06em] text-muc-mo uppercase">Hàng</span>
              <span className="min-w-0 flex-1 truncate font-medium text-muc">{topHang.ten}</span>
              <span className="so shrink-0 font-semibold text-muc">
                {coDungTien ? tien(topHang.doanhThu) : so(topHang.soLuong)}
              </span>
            </button>
          ) : null}
          {topNguoi ? (
            <button
              type="button"
              onClick={() => onChonNguoi(topNguoi)}
              className="flex w-full items-center gap-1.5 rounded-sm px-1 py-0.5 text-left text-[12px] transition-colors hover:bg-giay"
              title="Xem lịch sử mua hàng"
            >
              <span className="w-9 shrink-0 font-mono text-[9px] tracking-[0.06em] text-muc-mo uppercase">Người</span>
              <span className="min-w-0 flex-1 truncate font-medium text-muc">{topNguoi.hoTen}</span>
              <span className="so shrink-0 font-semibold text-muc">
                {coDungTien ? tien(topNguoi.doanhThu) : so(topNguoi.soLuongHang)}
              </span>
            </button>
          ) : null}
        </div>
      </TheNhanh>
    </section>
  );
}

function TheNhanh({
  nhan,
  icon,
  onClick,
  children,
}: {
  nhan: string;
  icon: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const noiDung = (
    <>
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-ke bg-giay text-muc-mo">
          <BieuTuong ten={icon} className="h-3.5 w-3.5" />
        </span>
        <span className="nhan-muc">{nhan}</span>
      </div>
      <div className="mt-1.5">{children}</div>
    </>
  );
  const lop =
    "rounded-lg border border-ke bg-giay-cao px-3 py-2.5 text-left shadow-xs transition-colors";
  if (!onClick) return <div className={lop}>{noiDung}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${lop} hover:border-ke-dam hover:bg-giay`}
      title="Bấm để xem chi tiết ngày"
    >
      {noiDung}
    </button>
  );
}

/* ------------------------- Hộp thoại chi tiết ------------------------- */

function MiniStat({ nhan, giaTri }: { nhan: string; giaTri: string }) {
  return (
    <div className="rounded-md border border-ke bg-giay px-3 py-2">
      <div className="font-mono text-[9.5px] tracking-[0.1em] text-muc-mo uppercase">{nhan}</div>
      <div className="so mt-1 text-[14px] font-semibold text-muc">{giaTri}</div>
    </div>
  );
}

function HopChiTietHang({
  hang,
  dungTien,
  dong,
}: {
  hang: HangBaoCao;
  dungTien: boolean;
  dong: () => void;
}) {
  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe="Chi tiết mặt hàng"
      rong="max-w-3xl"
      chanTrang={<Nut onClick={dong}>Đóng</Nut>}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-ke-dam bg-giay text-muc-nhat">
            <BieuTuong ten="kho" />
          </span>
          <div className="min-w-0">
            <div className="truncate font-serif text-[16px] font-semibold tracking-[-0.01em] text-muc">{hang.ten}</div>
            <div className="font-mono text-[10.5px] tracking-[0.02em] text-muc-mo">
              {hang.ma} · {hang.donViTinh}
            </div>
          </div>
        </div>
        <Nhan sac="xanh">{so(hang.soPhieu)} phiếu</Nhan>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat nhan="Số lượng đã bán" giaTri={`${so(hang.soLuong)} ${hang.donViTinh}`} />
        <MiniStat nhan="Số can phạm" giaTri={so(hang.soCanPham)} />
        <MiniStat nhan="Số phiếu" giaTri={so(hang.soPhieu)} />
        {dungTien && <MiniStat nhan="Doanh thu" giaTri={tien(hang.doanhThu)} />}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <h4 className="font-serif text-[15px] font-semibold text-muc">Các phiếu đã mua</h4>
        <span className="so text-[10px] text-muc-mo">{so(hang.phieu.length)} dòng</span>
      </div>
      <div className="mem-cuon mt-2 max-h-[38vh] overflow-auto rounded-sm border border-ke">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-giay font-mono text-[9.5px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
            <tr className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
              <th>Ngày</th>
              <th>Số phiếu</th>
              <th>Can phạm</th>
              <th className="text-right">SL</th>
              {dungTien && <th className="text-right">Thành tiền</th>}
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {hang.phieu.map((p) => (
              <tr
                key={`${p.id}-${p.soPhieu}`}
                className="[&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-1.5"
              >
                <td className="so whitespace-nowrap text-[11px] text-muc-nhat">{ngayVN(p.ngay)}</td>
                <td className="so text-[10.5px] text-muc-nhat">{p.soPhieu}</td>
                <td>
                  <div className="font-medium text-muc">{p.hoTen}</div>
                  <div className="font-mono text-[10px] tracking-[0.01em] text-muc-mo">
                    {[p.buongGiam, p.namSinh ? `SN ${p.namSinh}` : ""].filter(Boolean).join(" · ") || "—"}
                  </div>
                </td>
                <td className="so text-right text-[12px] text-muc-nhat">{so(p.soLuong)}</td>
                {dungTien && <td className="so text-right text-[12px] text-muc-nhat">{tien(p.thanhTien)}</td>}
                <td>
                  {p.conThieu > 0 ? <Nhan sac="vang">Thiếu {so(p.conThieu)}</Nhan> : <Nhan sac="luc">Đủ hàng</Nhan>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HopThoai>
  );
}

function HopChiTietCanPham({
  canPham,
  dungTien,
  dong,
}: {
  canPham: CanPhamBaoCao;
  dungTien: boolean;
  dong: () => void;
}) {
  const chuDau = canPham.hoTen
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe="Chi tiết can phạm"
      rong="max-w-4xl"
      chanTrang={<Nut onClick={dong}>Đóng</Nut>}
    >
      <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-ke-dam bg-giay font-mono text-[12px] font-semibold text-muc-nhat">
              {chuDau || <BieuTuong ten="nguoi" />}
            </span>
            <div className="min-w-0">
              <div className="truncate font-serif text-[17px] font-semibold tracking-[-0.01em] text-muc">
                {canPham.hoTen}
              </div>
              <div className="font-mono text-[10.5px] tracking-[0.02em] text-muc-mo">
                {[canPham.buongGiam, canPham.namSinh ? `SN ${canPham.namSinh}` : ""].filter(Boolean).join(" · ") ||
                  "Chưa có thông tin buồng giam"}
              </div>
            </div>
          </div>
          <Nhan sac="xanh">Mua {so(canPham.soPhieu)} phiếu</Nhan>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat nhan="Số phiếu" giaTri={so(canPham.soPhieu)} />
          <MiniStat nhan="Lượng hàng" giaTri={`${so(canPham.soLuongHang)} đơn vị`} />
          <MiniStat nhan="Mặt hàng" giaTri={so(canPham.soMatHang)} />
          {dungTien && <MiniStat nhan="Tổng tiền" giaTri={tien(canPham.doanhThu)} />}
        </div>

        <div className="rounded-sm border border-ke border-l-[3px] border-l-ke-dam bg-giay px-3 py-2 text-[12px] text-muc-nhat">
          Mua lần đầu <b className="so font-semibold text-muc">{ngayVN(canPham.lanDau)}</b> · gần nhất{" "}
          <b className="so font-semibold text-muc">{ngayVN(canPham.lanCuoi)}</b>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h4 className="font-serif text-[15px] font-semibold text-muc">Mặt hàng đã mua</h4>
            <span className="so text-[10px] text-muc-mo">{so(canPham.hang.length)} mặt hàng</span>
          </div>
          <div className="mem-cuon max-h-[28vh] overflow-auto rounded-sm border border-ke">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-giay font-mono text-[9.5px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
                <tr className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                  <th className="w-28">Mã</th>
                  <th>Mặt hàng</th>
                  <th className="text-right">Số lượng</th>
                  {dungTien && <th className="text-right">Thành tiền</th>}
                </tr>
              </thead>
              <tbody>
                {canPham.hang.map((h) => (
                  <tr
                    key={h.productId}
                    className="[&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-1.5"
                  >
                    <td className="so text-[10.5px] text-muc-mo">{h.ma}</td>
                    <td>
                      <div className="font-medium text-muc">{h.ten}</div>
                      <div className="font-mono text-[10px] tracking-[0.01em] text-muc-mo">{h.donViTinh}</div>
                    </td>
                    <td className="so text-right text-[12px] text-muc-nhat">{so(h.soLuong)}</td>
                    {dungTien && <td className="so text-right text-[12px] text-muc-nhat">{tien(h.thanhTien)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h4 className="font-serif text-[15px] font-semibold text-muc">Phiếu đã mua</h4>
            <span className="so text-[10px] text-muc-mo">{so(canPham.phieu.length)} phiếu</span>
          </div>
          <BangPhieuTomTat phieu={canPham.phieu} dungTien={dungTien} />
        </div>
      </div>
    </HopThoai>
  );
}

function HopChiTietNgay({
  ngay,
  dungTien,
  dong,
}: {
  ngay: NgayBaoCao;
  dungTien: boolean;
  dong: () => void;
}) {
  const soNguoi = new Set(ngay.phieu.map((p) => p.hoTen.trim().toLowerCase())).size;
  return (
    <HopThoai
      mo
      dong={dong}
      tieuDe={`Chi tiết ngày ${ngayVN(ngay.ngay)}`}
      rong="max-w-4xl"
      chanTrang={<Nut onClick={dong}>Đóng</Nut>}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat nhan="Số phiếu" giaTri={so(ngay.soPhieu)} />
        <MiniStat nhan="Can phạm" giaTri={so(soNguoi)} />
        <MiniStat nhan="Lượng hàng" giaTri={`${so(ngay.soLuongHang)} đơn vị`} />
        <MiniStat nhan={dungTien ? "Doanh thu" : "Trung bình/phiếu"} giaTri={dungTien ? tien(ngay.doanhThu) : so(ngay.soLuongHang / Math.max(1, ngay.soPhieu))} />
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h4 className="font-serif text-[15px] font-semibold text-muc">Phiếu trong ngày</h4>
          <span className="font-mono text-[9.5px] tracking-[0.03em] text-muc-mo uppercase">
            Bấm Đóng để quay lại báo cáo
          </span>
        </div>
        <BangPhieuTomTat phieu={ngay.phieu} dungTien={dungTien} />
      </div>
    </HopThoai>
  );
}

function BangPhieuTomTat({ phieu, dungTien }: { phieu: PhieuTomTat[]; dungTien: boolean }) {
  if (phieu.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-ke-dam px-3 py-6 text-center font-mono text-[10.5px] tracking-[0.02em] text-muc-mo">
        Chưa có phiếu nào.
      </div>
    );
  }
  return (
    <div className="mem-cuon max-h-[38vh] overflow-auto rounded-sm border border-ke">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <thead className="sticky top-0 z-10 bg-giay font-mono text-[9.5px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
          <tr className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
            <th>Ngày</th>
            <th>Số phiếu</th>
            <th>Can phạm</th>
            <th className="text-center">Mặt hàng</th>
            <th className="text-right">SL hàng</th>
            {dungTien && <th className="text-right">Tổng tiền</th>}
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {phieu.map((p) => (
            <tr key={p.id} className="[&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-1.5">
              <td className="so whitespace-nowrap text-[11px] text-muc-nhat">{ngayVN(p.ngay)}</td>
              <td className="so text-[10.5px] text-muc-nhat">{p.soPhieu}</td>
              <td>
                <div className="font-medium text-muc">{p.hoTen}</div>
                <div className="font-mono text-[10px] tracking-[0.01em] text-muc-mo">
                  {[p.buongGiam, p.namSinh ? `SN ${p.namSinh}` : ""].filter(Boolean).join(" · ") || "—"}
                </div>
              </td>
              <td className="so text-center text-[12px] text-muc-nhat">{so(p.soMatHang)}</td>
              <td className="so text-right text-[12px] text-muc-nhat">{so(p.soLuong)}</td>
              {dungTien && <td className="so text-right text-[12px] text-muc-nhat">{tien(p.tongTien)}</td>}
              <td>
                <div className="flex flex-wrap gap-1">
                  {p.conThieu > 0 && <Nhan sac="vang">Thiếu {so(p.conThieu)}</Nhan>}
                  {p.kiemLuc ? <Nhan sac="luc">Đã kiểm</Nhan> : <Nhan>Chưa kiểm</Nhan>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
