"use client";

import type { Quyen } from "./quyen";
import type { CanPhamGoiY, LineInput, NguoiDungCongKhai, Order, Product, Settings } from "./types";

/** Lỗi trả về từ API kèm mã trạng thái, để chỗ gọi biết là 401 hay 403. */
export class LoiApi extends Error {
  ma: number;
  constructor(message: string, ma: number) {
    super(message);
    this.ma = ma;
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new LoiApi((data as { error?: string })?.error || `Lỗi ${res.status}`, res.status);
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

export type DuLieuTaiKhoan = {
  tenDangNhap: string;
  hoTen: string;
  matKhau: string;
  quyen: Quyen[];
  dangHoatDong: boolean;
};

export const apiClient = {
  /* ------------------------------ Xác thực ------------------------------ */
  toi: () => api<{ nguoiDung: NguoiDungCongKhai; caiDat: Settings }>("/api/auth/toi"),
  dangNhap: (tenDangNhap: string, matKhau: string) =>
    api<{ nguoiDung: NguoiDungCongKhai }>("/api/auth/dang-nhap", {
      method: "POST",
      body: JSON.stringify({ tenDangNhap, matKhau }),
    }),
  dangXuat: () => api<{ ok: boolean }>("/api/auth/dang-xuat", { method: "POST" }),
  doiMatKhau: (matKhauCu: string, matKhauMoi: string) =>
    api<{ ok: boolean }>("/api/auth/doi-mat-khau", {
      method: "POST",
      body: JSON.stringify({ matKhauCu, matKhauMoi }),
    }),

  /* ------------------------------ Tài khoản ------------------------------ */
  dsTaiKhoan: () => api<{ nguoiDung: NguoiDungCongKhai[] }>("/api/tai-khoan"),
  themTaiKhoan: (body: DuLieuTaiKhoan) =>
    api<{ nguoiDung: NguoiDungCongKhai }>("/api/tai-khoan", { method: "POST", body: JSON.stringify(body) }),
  suaTaiKhoan: (id: string, body: Partial<DuLieuTaiKhoan> & { matKhauMoi?: string }) =>
    api<{ nguoiDung: NguoiDungCongKhai }>(`/api/tai-khoan/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  xoaTaiKhoan: (id: string) =>
    api<{ ok: boolean; hoTen: string }>(`/api/tai-khoan/${id}`, { method: "DELETE" }),

  /* ------------------------------ Nghiệp vụ ------------------------------ */
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
  /** Sửa phiếu bán: gửi trường nào thì cập nhật trường đó (màn Kiểm phiếu chỉ gửi items). */
  suaPhieuBan: (id: string, body: Partial<DuLieuPhieu>) =>
    api<{ order: Order }>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  /** Chuyển phiếu vào thùng rác (phục hồi được). */
  xoaPhieuBan: (id: string) => api<{ ok: boolean; soPhieu: string }>(`/api/orders/${id}`, { method: "DELETE" }),
  thungRac: () => api<{ orders: Order[] }>("/api/thung-rac"),
  phucHoiPhieuBan: (id: string) =>
    api<{ order: Order }>(`/api/orders/${id}/phuc-hoi`, { method: "POST" }),
  xoaVinhVienPhieuBan: (id: string) =>
    api<{ ok: boolean; soPhieu: string }>(`/api/orders/${id}/xoa-vinh-vien`, { method: "DELETE" }),
  danhDauDaKiem: (id: string, ghiChu: string) =>
    api<{ order: Order }>(`/api/orders/${id}/kiem`, { method: "POST", body: JSON.stringify({ ghiChu }) }),
  boDanhDauKiem: (id: string) =>
    api<{ order: Order }>(`/api/orders/${id}/kiem`, { method: "DELETE" }),

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
