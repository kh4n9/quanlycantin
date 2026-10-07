"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { apiClient, type BaoCao } from "@/lib/client";
import { useStore } from "@/lib/store";
import { taiExcel, type TrangExcel } from "@/lib/excel";
import { homNay, ngayVN, so, tien } from "@/lib/format";
import { baoLoi, BieuTuong, Nut, Trong } from "./ui";

/** Màu duy nhất cho chuỗi dữ liệu — đã kiểm bằng scripts/validate_palette.js */
const MAU_DUONG = "#2563eb";

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
  // Portal cần document nên chỉ dựng sau khi đã sang phía trình duyệt
  const [daMount, setDaMount] = useState(false);
  useEffect(() => setDaMount(true), []);

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
    setDangTai(true);
    try {
      setDu(await apiClient.baoCao(tu, den));
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangTai(false);
    }
  }, [tu, den]);

  useEffect(() => {
    void nap();
  }, [nap]);

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
        tieuDeCot: ["Mã", "Tên mặt hàng", "ĐVT", "Số lượng đã bán", "Doanh thu"],
        dong: du.theoHang.map((h) => [h.ma, h.ten, h.donViTinh, h.soLuong, h.doanhThu]),
        cotTien: [4],
        doRong: [14, 32, 10, 18, 18],
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
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <span className="mr-1 text-sm font-semibold text-slate-800">Khoảng thời gian</span>
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
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={den}
            onChange={(e) => setDen(e.target.value)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <Nut onClick={xuatExcel} disabled={!du} className="ml-auto">
          <BieuTuong ten="tai" /> Xuất Excel
        </Nut>
      </div>

      {dangTai && !du ? (
        <div className="rounded-lg border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 shadow-sm">
          Đang tổng hợp số liệu…
        </div>
      ) : !du || du.tongQuan.soPhieu === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <Trong
            tieuDe="Chưa có phiếu bán nào trong khoảng thời gian này"
            moTa="Chọn khoảng ngày khác, hoặc lập phiếu bán ở màn hình Bán hàng."
          />
        </div>
      ) : (
        <>
          {du.tongQuan.soPhieuThieu > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
              <BieuTuong ten="canh" className="h-4 w-4 shrink-0" />
              <span>
                Đang có <b>{so(du.tongQuan.soPhieuThieu)}</b> phiếu còn nợ hàng can phạm, tổng cộng{" "}
                <b>{so(du.tongQuan.tongLuongThieu)}</b> đơn vị chưa giao. Chi tiết ở mục “Hàng còn thiếu” bên dưới.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile nhan="Số phiếu bán" giaTri={so(du.tongQuan.soPhieu)} chinh />
            <Tile nhan="Số lượng hàng đã bán" giaTri={so(du.tongQuan.soLuongHang)} phu="tổng số đơn vị hàng" />
            <Tile nhan="Số mặt hàng khác nhau" giaTri={so(du.tongQuan.soMatHang)} />
            {du.tongQuan.coDungTien ? (
              <Tile nhan="Doanh thu" giaTri={tien(du.tongQuan.doanhThu)} />
            ) : (
              <Tile nhan="Số can phạm đã mua" giaTri={so(du.tongQuan.soCanPham)} />
            )}
          </div>

          <BieuDoTheoNgay data={du.theoNgay} dungTien={du.tongQuan.coDungTien} />

          <HangConThieu
            hang={du.hangThieu}
            tu={tu}
            den={den}
            onIn={du.thieuTheoPhieu.length > 0 ? inDanhSachThieu : undefined}
          />

          <BangXepHang
            tieuDe="Mặt hàng đã bán"
            phuDe={du.tongQuan.coDungTien ? "Xếp theo doanh thu" : "Xếp theo số lượng đã bán"}
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
          />

          <BangXepHang
            tieuDe="Can phạm mua hàng"
            phuDe={du.tongQuan.coDungTien ? "Xếp theo tổng tiền mua" : "Xếp theo số lượng hàng đã mua"}
            cot="Số phiếu"
            hang={du.theoCanPham.map((p) => ({
              id: p.hoTen,
              ma: p.namSinh ? `SN ${p.namSinh}` : "",
              ten: p.hoTen,
              phu: p.buongGiam,
              soLuong: p.soPhieu,
              donVi: "phiếu",
              giaTri: du.tongQuan.coDungTien ? p.doanhThu : p.soLuongHang,
              hienThi: du.tongQuan.coDungTien ? so(p.doanhThu) : so(p.soLuongHang),
            }))}
            nhanGiaTri="Tổng tiền"
          />
        </>
      )}

      {daMount &&
        createPortal(
          <div id="print-thieu">
            {du && du.thieuTheoPhieu.length > 0 && (
              <PhieuThieu du={du} settings={settings} tu={tu} den={den} />
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

function Tile({ nhan, giaTri, phu, chinh = false }: { nhan: string; giaTri: string; phu?: string; chinh?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
      <div className="text-[12px] text-slate-500">{nhan}</div>
      <div className={`mt-1 font-bold text-slate-900 ${chinh ? "text-2xl" : "text-xl"}`}>{giaTri}</div>
      {phu && <div className="mt-0.5 text-[11px] text-slate-500">{phu}</div>}
    </div>
  );
}

/* --------------------------- Biểu đồ theo ngày --------------------------- */

type DiemNgay = { ngay: string; soPhieu: number; doanhThu: number };

function BieuDoTheoNgay({ data, dungTien }: { data: DiemNgay[]; dungTien: boolean }) {
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
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            {dungTien ? "Doanh thu theo ngày" : "Số phiếu bán theo ngày"}
          </h2>
          <p className="text-[11px] text-slate-500">
            Tổng {dungTien ? tien(tong) : `${so(tong)} phiếu`} · cao nhất {ngayVN(ngayCaoNhat?.ngay ?? "")} (
            {dungTien ? tien(giaTri(ngayCaoNhat)) : `${so(giaTri(ngayCaoNhat))} phiếu`})
          </p>
        </div>
        <span className="text-[11px] text-slate-400">Đưa chuột lên cột để xem chi tiết ngày</span>
      </header>

      <div className="flex gap-3 px-4 pt-4 pb-3">
        <div className="flex h-[220px] w-20 shrink-0 flex-col justify-between text-right text-[10px] text-slate-400">
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
                <div key={m} className={`h-px w-full ${i === moc.length - 1 ? "bg-slate-300" : "bg-slate-100"}`} />
              ))}
            </div>

            <div className="absolute inset-0 flex items-end" style={{ gap: 2 }}>
              {data.map((d, i) => {
                const phanTram = (giaTri(d) / caoNhat) * 100;
                const dangTro = tro === i;
                return (
                  <div
                    key={d.ngay}
                    className="relative flex h-full flex-1 cursor-default items-end"
                    onMouseEnter={() => setTro(i)}
                    onMouseLeave={() => setTro(null)}
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
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                        opacity: tro === null || dangTro ? 1 : 0.45,
                      }}
                    />
                    {dangTro && (
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-44 -translate-x-1/2 rounded-md border border-slate-300 bg-white px-3 py-2 text-[12px] shadow-lg">
                        <div className="font-semibold text-slate-800">{ngayVN(d.ngay)}</div>
                        <div className="mt-1 flex justify-between gap-3 text-slate-600">
                          <span>Số phiếu</span>
                          <b className="tabular-nums text-slate-900">{so(d.soPhieu)}</b>
                        </div>
                        {dungTien && (
                          <div className="flex justify-between gap-3 text-slate-600">
                            <span>Doanh thu</span>
                            <span className="tabular-nums">{so(d.doanhThu)}</span>
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
              <div key={d.ngay} className="min-w-0 flex-1 text-center text-[10px] whitespace-nowrap text-slate-400">
                {i % buocNhan === 0 || i === data.length - 1 ? d.ngay.slice(8, 10) : ""}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------- Bản in danh sách hàng còn thiếu --------------------- */

/**
 * Bản in để đi phát hàng: sắp theo buồng rồi tới phiếu, có ghi chú của phiếu.
 * Nội dung được đưa ra ngoài khung ứng dụng bằng portal để khi in không bị ẩn.
 */
function PhieuThieu({ du, settings, tu, den }: { du: BaoCao; settings: { tenDonVi: string; diaChi: string }; tu: string; den: string }) {
  const oDem = { textAlign: "center" as const };
  const oTien = { textAlign: "right" as const };

  return (
    <div className="phieu-in">
      <div style={{ textAlign: "center", lineHeight: 1.35 }}>
        <div style={{ fontWeight: 700, textTransform: "uppercase" }}>
          {settings.tenDonVi || "CĂN TIN PHẠM NHÂN"}
        </div>
        {settings.diaChi ? <div style={{ fontSize: "11pt" }}>{settings.diaChi}</div> : null}
      </div>
      <div style={{ height: 14 }} />

      <h1 style={{ textAlign: "center", fontSize: "16pt", fontWeight: 700, margin: 0, textTransform: "uppercase" }}>
        Danh sách hàng còn thiếu
      </h1>
      <div style={{ textAlign: "center", fontSize: "12pt", marginBottom: 4 }}>
        Từ {ngayVN(tu)} đến {ngayVN(den)}
      </div>
      <div style={{ textAlign: "center", fontSize: "11pt", marginBottom: 12 }}>
        {so(du.tongQuan.soPhieuThieu)} phiếu · {so(du.tongQuan.tongLuongThieu)} đơn vị chưa giao
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: "10%" }}>Buồng giam</th>
            <th style={{ width: "14%" }}>Số phiếu</th>
            <th>Họ và tên</th>
            <th>Tên mặt hàng</th>
            <th style={{ width: "8%" }}>ĐVT</th>
            <th style={{ width: "10%" }}>Còn thiếu</th>
            <th style={{ width: "18%" }}>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {du.thieuTheoPhieu.map((r, i) => (
            <tr key={`${r.soPhieu}-${r.ma}-${i}`}>
              <td style={oDem}>{r.buongGiam || "—"}</td>
              <td style={{ ...oDem, fontFamily: "monospace", fontSize: "11pt" }}>{r.soPhieu}</td>
              <td>{r.hoTen}</td>
              <td>{r.ten}</td>
              <td style={oDem}>{r.donViTinh}</td>
              <td style={oTien}>{so(r.conThieu)}</td>
              <td style={{ fontSize: "11pt" }}>{r.ghiChu}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={5} style={{ ...oTien, fontWeight: 700 }}>
              TỔNG CỘNG
            </td>
            <td style={{ ...oTien, fontWeight: 700 }}>{so(du.tongQuan.tongLuongThieu)}</td>
            <td />
          </tr>
        </tbody>
      </table>

      <table style={{ width: "100%", marginTop: 18, borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            {["Người lập danh sách", "Người phát hàng", "Người nhận hàng"].map((b) => (
              <td key={b} style={{ border: "none", textAlign: "center", fontWeight: 700, width: "33.33%", padding: 2 }}>
                {b}
              </td>
            ))}
          </tr>
          <tr>
            {["", "", ""].map((_, i) => (
              <td key={i} style={{ border: "none", textAlign: "center", fontStyle: "italic", fontSize: "11pt" }}>
                (Ký, ghi rõ họ tên)
              </td>
            ))}
          </tr>
          <tr>
            {["", "", ""].map((_, i) => (
              <td key={i} style={{ border: "none", height: 75 }} />
            ))}
          </tr>
        </tbody>
      </table>
    </div>
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
  onIn,
}: {
  hang: DongThieu[];
  tu: string;
  den: string;
  onIn?: () => void;
}) {
  if (hang.length === 0) {
    return (
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-slate-800">Hàng còn thiếu</h2>
          <p className="text-[11px] text-slate-500">
            Khoảng {ngayVN(tu)} – {ngayVN(den)}
          </p>
        </header>
        <div className="flex items-center gap-2 px-4 py-4 text-[13px] text-emerald-700">
          <BieuTuong ten="check" className="h-4 w-4" />
          Không có phiếu nào còn nợ hàng can phạm trong khoảng này.
        </div>
      </section>
    );
  }

  const tongThieu = hang.reduce((s, h) => s + h.conThieu, 0);

  return (
    <section className="overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-amber-200 bg-amber-50/70 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-amber-900">Hàng còn thiếu</h2>
          <p className="text-[11px] text-amber-700">
            Khi hàng về, đối chiếu mục này để biết cần bù cho phiếu nào
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-amber-800">
            {so(hang.length)} mặt hàng · tổng {so(tongThieu)} đơn vị
          </span>
          {onIn && (
            <Nut co="sm" onClick={onIn} title="In danh sách sắp theo buồng để đi phát hàng">
              <BieuTuong ten="in" className="h-4 w-4" /> In danh sách phát
            </Nut>
          )}
        </div>
      </header>

      <div className="divide-y divide-slate-100">
        {hang.map((h) => (
          <div key={h.productId} className="px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-[11px] text-slate-400">{h.ma}</span>
              <span className="font-medium text-slate-900">{h.ten}</span>
              <span className="text-[12px] text-slate-500">{h.donViTinh}</span>
              <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[12px] font-semibold text-amber-800">
                còn thiếu {so(h.conThieu)}
              </span>
            </div>

            <table className="mt-1.5 w-full border-collapse text-[13px]">
              <tbody>
                {h.phieu.map((p) => (
                  <tr key={`${h.productId}-${p.id}`} className="[&>td]:py-1">
                    <td className="w-32 font-mono text-[12px] text-blue-700">{p.soPhieu}</td>
                    <td className="w-24 text-slate-500">{ngayVN(p.ngay)}</td>
                    <td className="text-slate-700">{p.hoTen}</td>
                    <td className="w-24 text-slate-500">{p.buongGiam || "—"}</td>
                    <td className="w-24 text-right font-semibold text-amber-700 tabular-nums">
                      thiếu {so(p.conThieu)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
}: {
  tieuDe: string;
  phuDe: string;
  cot: string;
  hang: DongXepHang[];
  nhanGiaTri: string;
}) {
  if (hang.length === 0) return null;
  const lonNhat = Math.max(1, ...hang.map((h) => h.giaTri));
  const hienThi = hang.slice(0, 15);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-baseline justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">{tieuDe}</h2>
          <p className="text-[11px] text-slate-500">{phuDe}</p>
        </div>
        <span className="text-[11px] text-slate-400">
          Hiện {hienThi.length} / {hang.length}
        </span>
      </header>
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-[12px] text-slate-600">
          <tr className="[&>th]:border-b [&>th]:border-slate-200 [&>th]:px-3 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-semibold">
            <th className="w-10">#</th>
            <th className="w-32">Mã</th>
            <th>Tên</th>
            <th className="w-28 text-right">{cot}</th>
            <th className="w-56 text-right">{nhanGiaTri}</th>
          </tr>
        </thead>
        <tbody>
          {hienThi.map((h, i) => (
            <tr key={h.id} className="[&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-1.5">
              <td className="text-center text-[12px] text-slate-400">{i + 1}</td>
              <td className="font-mono text-[12px] text-slate-500">{h.ma}</td>
              <td>
                <div className="font-medium text-slate-800">{h.ten}</div>
                {h.phu && <div className="text-[11px] text-slate-400">{h.phu}</div>}
              </td>
              <td className="text-right text-slate-600 tabular-nums">
                {so(h.soLuong)} {h.donVi}
              </td>
              <td>
                <div className="flex items-center justify-end gap-2">
                  {/* Độ dài cột mã hoá độ lớn; con số vẫn hiện đầy đủ */}
                  <div className="h-2 w-28 overflow-hidden rounded-sm bg-slate-100">
                    <div
                      className="h-full rounded-sm"
                      style={{ width: `${(h.giaTri / lonNhat) * 100}%`, background: MAU_DUONG }}
                    />
                  </div>
                  <span className="w-20 text-right font-semibold text-slate-800 tabular-nums">{h.hienThi}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
