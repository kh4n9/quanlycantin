"use client";

import type { CanPhamGoiY, LineInput, Order, Product, Settings } from "./types";

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Lỗi ${res.status}`);
  return data as T;
}

export type BaoCao = {
  tongQuan: {
    doanhThu: number;
    soPhieu: number;
    soMatHang: number;
    soLuongHang: number;
    soCanPham: number;
    coDungTien: boolean;
  };
  theoNgay: { ngay: string; soPhieu: number; doanhThu: number }[];
  theoHang: {
    productId: string;
    ma: string;
    ten: string;
    donViTinh: string;
    soLuong: number;
    doanhThu: number;
  }[];
  theoCanPham: {
    hoTen: string;
    namSinh: number;
    buongGiam: string;
    soPhieu: number;
    soLuongHang: number;
    doanhThu: number;
  }[];
};

/** Nội dung một phiếu bán, dùng chung cho cả lập mới và sửa phiếu. */
export type DuLieuPhieu = {
  ngay: string;
  hoTen: string;
  namSinh: number;
  buongGiam: string;
  ghiChu: string;
  items: LineInput[];
};

export const apiClient = {
  products: () => api<{ products: Product[] }>("/api/products"),
  themHang: (body: Partial<Product>) =>
    api<{ product: Product }>("/api/products", { method: "POST", body: JSON.stringify(body) }),
  suaHang: (id: string, body: Partial<Product>) =>
    api<{ product: Product }>(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  xoaHang: (id: string) =>
    api<{ daAn: boolean; ten: string }>(`/api/products/${id}`, { method: "DELETE" }),

  /** Danh sách can phạm suy ra từ các phiếu bán cũ, dùng cho ô gợi ý. */
  canPham: () => api<{ canPham: CanPhamGoiY[] }>("/api/can-pham"),

  orders: (q = "") => api<{ orders: Order[] }>(`/api/orders${q ? `?${q}` : ""}`),
  themPhieuBan: (body: DuLieuPhieu) =>
    api<{ order: Order }>("/api/orders", { method: "POST", body: JSON.stringify(body) }),
  suaPhieuBan: (id: string, body: DuLieuPhieu) =>
    api<{ order: Order }>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  xoaPhieuBan: (id: string) => api<{ ok: boolean }>(`/api/orders/${id}`, { method: "DELETE" }),

  baoCao: (tu: string, den: string) =>
    api<BaoCao>(`/api/reports?tu=${encodeURIComponent(tu)}&den=${encodeURIComponent(den)}`),

  settings: () => api<{ settings: Settings }>("/api/settings"),
  luuSettings: (body: Partial<Settings>) =>
    api<{ settings: Settings }>("/api/settings", { method: "PATCH", body: JSON.stringify(body) }),

  xoaHetDuLieu: () =>
    api<{ ok: boolean; soHang: number; soPhieu: number }>("/api/data", { method: "DELETE" }),

  napDuLieuMau: (ghiDe = false) =>
    api<{ soHang: number }>("/api/seed", { method: "POST", body: JSON.stringify({ ghiDe }) }),
};
