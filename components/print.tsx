"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { docSoThanhChu, so } from "@/lib/format";
import { MAU_IN_MAC_DINH } from "@/lib/mau-in";
import { useStore } from "@/lib/store";
import type { LineItem, MauInPhieu, Order, Settings } from "@/lib/types";

type PrintValue = {
  /** Mở ngay hộp thoại in của trình duyệt. */
  inPhieu: (order: Order) => void;
  /** Mở cửa sổ xem trước trên màn hình. */
  xemTruoc: (order: Order) => void;
  dongXemTruoc: () => void;
  dangXem: Order | null;
};

const PrintContext = createContext<PrintValue | null>(null);

export function useInPhieu(): PrintValue {
  const ctx = useContext(PrintContext);
  if (!ctx) throw new Error("useInPhieu phải dùng bên trong PhieuInProvider");
  return ctx;
}

export function PhieuInProvider({ children }: { children: ReactNode }) {
  const { settings } = useStore();
  const [dangIn, setDangIn] = useState<Order | null>(null);
  const [dangXem, setDangXem] = useState<Order | null>(null);

  const inPhieu = useCallback((order: Order) => {
    setDangIn(order);
    // Chờ React vẽ xong nội dung phiếu rồi mới mở hộp thoại in
    setTimeout(() => window.print(), 100);
  }, []);

  const xemTruoc = useCallback((order: Order) => setDangXem(order), []);
  const dongXemTruoc = useCallback(() => setDangXem(null), []);

  return (
    <PrintContext.Provider value={{ inPhieu, xemTruoc, dongXemTruoc, dangXem }}>
      {children}
      <div id="print-area">
        {dangIn && <MauPhieuBan order={dangIn} settings={settings} />}
      </div>
    </PrintContext.Provider>
  );
}

/* ------------------------------ Phiếu bán ------------------------------ */

function BangHang({ items, mau }: { items: LineItem[]; mau: MauInPhieu }) {
  const { nhan, hien } = mau;
  const oDem = { textAlign: "center" as const };
  const oTien = { textAlign: "right" as const };

  const coDonViTinh = hien.cotDonViTinh;
  const coDonGia = hien.cotDonGia;
  // Tắt cột thành tiền thì bỏ luôn tiền ở dòng tổng — không còn gì để cộng
  const coThanhTien = hien.cotThanhTien;
  const coTong = hien.dongTongCong;

  const tongTien = items.reduce((s, i) => s + i.thanhTien, 0);
  const tongLuong = items.reduce((s, i) => s + i.soLuong, 0);

  // Số cột của dòng tổng = các cột đứng trước cột cuối cùng
  const soCotTruoc = 3 + (coDonViTinh ? 1 : 0) + (coDonGia ? 1 : 0);

  return (
    <>
      <table>
        <thead>
          <tr>
            <th style={{ width: "7%" }}>{nhan.stt}</th>
            <th>{nhan.tenHang}</th>
            {coDonViTinh && <th style={{ width: "11%" }}>{nhan.donViTinh}</th>}
            <th style={{ width: "13%" }}>{nhan.soLuong}</th>
            {coDonGia && <th style={{ width: "16%" }}>{nhan.donGia}</th>}
            {coThanhTien && <th style={{ width: "18%" }}>{nhan.thanhTien}</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={`${i.productId}-${idx}`}>
              <td style={oDem}>{idx + 1}</td>
              <td>{i.ten}</td>
              {coDonViTinh && <td style={oDem}>{i.donViTinh}</td>}
              <td style={oDem}>{so(i.soLuong)}</td>
              {coDonGia && <td style={oTien}>{so(i.donGia)}</td>}
              {coThanhTien && <td style={oTien}>{so(i.thanhTien)}</td>}
            </tr>
          ))}
          {coTong && (
            <tr>
              <td colSpan={soCotTruoc} style={{ ...oTien, fontWeight: 700 }}>
                {nhan.tongCong}
              </td>
              {/* Không có cột thành tiền thì tổng là tổng số lượng */}
              <td style={{ ...oTien, fontWeight: 700 }}>{so(coThanhTien ? tongTien : tongLuong)}</td>
            </tr>
          )}
        </tbody>
      </table>
      {coThanhTien && hien.bangChu && (
        <div style={{ marginTop: 6, fontStyle: "italic" }}>Bằng chữ: {docSoThanhChu(tongTien)}./.</div>
      )}
    </>
  );
}

function KhoiChuKy({ mau }: { mau: MauInPhieu }) {
  const { chuKy, soCotChuKy } = mau;
  if (chuKy.length === 0) return null;

  const d = new Date();
  // Chia chữ ký thành từng hàng, mỗi hàng `soCotChuKy` ô
  const hang: typeof chuKy[] = [];
  for (let i = 0; i < chuKy.length; i += soCotChuKy) hang.push(chuKy.slice(i, i + soCotChuKy));
  const beRong = `${100 / soCotChuKy}%`;

  const oKhongVien = (them: React.CSSProperties = {}): React.CSSProperties => ({
    border: "none",
    textAlign: "center",
    padding: 2,
    ...them,
  });

  return (
    <>
      <div style={{ textAlign: "right", marginTop: 16, fontStyle: "italic" }}>
        Ngày {d.getDate()} tháng {d.getMonth() + 1} năm {d.getFullYear()}
      </div>
      {hang.map((mot, i) => (
        <table key={i} style={{ width: "100%", marginTop: i === 0 ? 4 : 0, borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              {mot.map((c) => (
                <td key={c.nhan} style={oKhongVien({ fontWeight: 700, width: beRong })}>
                  {c.nhan}
                </td>
              ))}
            </tr>
            <tr>
              {mot.map((c) => (
                <td key={c.nhan} style={oKhongVien({ fontStyle: "italic", fontSize: "11pt" })}>
                  {c.ghiChu}
                </td>
              ))}
            </tr>
            <tr>
              {mot.map((c) => (
                <td key={c.nhan} style={oKhongVien({ height: 80 })} />
              ))}
            </tr>
          </tbody>
        </table>
      ))}
    </>
  );
}

export function MauPhieuBan({
  order,
  settings,
  mau = settings?.mauIn ?? MAU_IN_MAC_DINH,
}: {
  order: Order;
  settings: Settings | null;
  /** Cho phép truyền mẫu in riêng để xem trước trong phần Cài đặt */
  mau?: MauInPhieu;
}) {
  const [nam, thang, ngayTrongThang] = [order.ngay.slice(0, 4), order.ngay.slice(5, 7), order.ngay.slice(8, 10)];

  return (
    <div className="phieu-in">
      <div style={{ textAlign: "center", lineHeight: 1.35 }}>
        <div style={{ fontWeight: 700, textTransform: "uppercase" }}>
          {settings?.tenDonVi || "CĂN TIN PHẠM NHÂN"}
        </div>
        {settings?.diaChi ? <div style={{ fontSize: "11pt" }}>{settings.diaChi}</div> : null}
      </div>
      <div style={{ height: 14 }} />

      <h1
        style={{ textAlign: "center", fontSize: "16pt", fontWeight: 700, margin: 0, textTransform: "uppercase" }}
      >
        {mau.tieuDe}
      </h1>
      {mau.hien.soPhieu && (
        <div style={{ textAlign: "center", fontSize: "12pt" }}>
          Số: <b>{order.soPhieu}</b>
        </div>
      )}
      {mau.hien.ngay && (
        <div style={{ textAlign: "center", fontSize: "12pt", marginBottom: 14 }}>
          Ngày {ngayTrongThang} tháng {thang} năm {nam}
        </div>
      )}

      <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
        <div>
          {mau.nhan.hoTen}: <b>{order.hoTen}</b>
        </div>
        {mau.hien.namSinh && (
          <div>
            {mau.nhan.namSinh}: <b>{order.namSinh || "…"}</b>
          </div>
        )}
        {mau.hien.buongGiam && (
          <div>
            {mau.nhan.buongGiam}: <b>{order.buongGiam || "…"}</b>
          </div>
        )}
        {mau.hien.ghiChu && order.ghiChu ? (
          <div>
            {mau.nhan.ghiChu}: {order.ghiChu}
          </div>
        ) : null}
      </div>

      <BangHang items={order.items} mau={mau} />
      <KhoiChuKy mau={mau} />
    </div>
  );
}
