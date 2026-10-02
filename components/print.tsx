"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { docSoThanhChu, so } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { LineItem, Order, Settings } from "@/lib/types";

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
      <div id="print-area">{dangIn && <MauPhieuBan order={dangIn} settings={settings} />}</div>
    </PrintContext.Provider>
  );
}

/* ------------------------------ Phiếu bán ------------------------------ */

function BangHang({ items, coTien }: { items: LineItem[]; coTien: boolean }) {
  const oDem = { textAlign: "center" as const };
  const oTien = { textAlign: "right" as const };
  const tongTien = items.reduce((s, i) => s + i.thanhTien, 0);

  return (
    <>
      <table>
        <thead>
          <tr>
            <th style={{ width: "7%" }}>STT</th>
            <th>Tên mặt hàng</th>
            <th style={{ width: "12%" }}>ĐVT</th>
            <th style={{ width: "14%" }}>Số lượng</th>
            {coTien && <th style={{ width: "16%" }}>Đơn giá</th>}
            {coTien && <th style={{ width: "18%" }}>Thành tiền</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={`${i.productId}-${idx}`}>
              <td style={oDem}>{idx + 1}</td>
              <td>{i.ten}</td>
              <td style={oDem}>{i.donViTinh}</td>
              <td style={oDem}>{so(i.soLuong)}</td>
              {coTien && <td style={oTien}>{so(i.donGia)}</td>}
              {coTien && <td style={oTien}>{so(i.thanhTien)}</td>}
            </tr>
          ))}
          {coTien && (
            <tr>
              <td colSpan={5} style={{ ...oTien, fontWeight: 700 }}>
                TỔNG CỘNG
              </td>
              <td style={{ ...oTien, fontWeight: 700 }}>{so(tongTien)}</td>
            </tr>
          )}
        </tbody>
      </table>
      {coTien && (
        <div style={{ marginTop: 6, fontStyle: "italic" }}>Bằng chữ: {docSoThanhChu(tongTien)}./.</div>
      )}
    </>
  );
}

export function MauPhieuBan({ order, settings }: { order: Order; settings: Settings | null }) {
  const [nam, thang, ngayTrongThang] = [order.ngay.slice(0, 4), order.ngay.slice(5, 7), order.ngay.slice(8, 10)];
  const coTien = order.items.some((i) => i.donGia > 0);
  const d = new Date();

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
        Phiếu bán hàng
      </h1>
      <div style={{ textAlign: "center", fontSize: "12pt" }}>
        Số: <b>{order.soPhieu}</b>
      </div>
      <div style={{ textAlign: "center", fontSize: "12pt", marginBottom: 14 }}>
        Ngày {ngayTrongThang} tháng {thang} năm {nam}
      </div>

      <div style={{ marginBottom: 10, lineHeight: 1.6 }}>
        <div>
          Họ và tên can phạm: <b>{order.hoTen}</b>
        </div>
        <div>
          Năm sinh: <b>{order.namSinh || "…"}</b>
        </div>
        <div>
          Buồng giam: <b>{order.buongGiam || "…"}</b>
        </div>
        {order.ghiChu ? <div>Ghi chú: {order.ghiChu}</div> : null}
      </div>

      <BangHang items={order.items} coTien={coTien} />

      <div style={{ textAlign: "right", marginTop: 16, fontStyle: "italic" }}>
        Ngày {d.getDate()} tháng {d.getMonth() + 1} năm {d.getFullYear()}
      </div>
      <table style={{ width: "100%", marginTop: 4, borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            {["Người mua hàng", "Người bán hàng"].map((b) => (
              <td
                key={b}
                style={{ border: "none", textAlign: "center", fontWeight: 700, width: "50%", padding: 2 }}
              >
                {b}
              </td>
            ))}
          </tr>
          <tr>
            {["(Ký, ghi rõ họ tên)", "(Ký, ghi rõ họ tên)"].map((b, i) => (
              <td
                key={i}
                style={{ border: "none", textAlign: "center", fontStyle: "italic", fontSize: "11pt", padding: 2 }}
              >
                {b}
              </td>
            ))}
          </tr>
          <tr>
            {["", ""].map((_, i) => (
              <td key={i} style={{ border: "none", height: 80 }} />
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
