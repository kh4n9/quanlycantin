import type { LineItem, Order } from "./types";

/** Số đã bù cho một dòng hàng. */
export function daBu(i: LineItem): number {
  return (i.bu ?? []).reduce((s, b) => s + (Number(b.soLuong) || 0), 0);
}

/** Số còn thiếu chưa bù của một dòng hàng. */
export function conThieu(i: LineItem): number {
  return Math.max(0, (Number(i.thieu) || 0) - daBu(i));
}

/** Tổng số lượng còn thiếu của cả phiếu. */
export function phieuConThieu(o: Order): number {
  return (o.items ?? []).reduce((s, i) => s + conThieu(i), 0);
}

/** Phiếu có dòng hàng nào còn thiếu chưa bù hay không. */
export function phieuDangThieu(o: Order): boolean {
  return phieuConThieu(o) > 0;
}
