"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, type DuLieuPhieu } from "@/lib/client";
import type { CanPhamGoiY, Product } from "@/lib/types";
import { PhieuBanForm } from "./phieu-ban-form";
import { useInPhieu } from "./print";
import { bao, baoLoi, Trong } from "./ui";

export function ManBanHang() {
  const { xemTruoc } = useInPhieu();

  const [products, setProducts] = useState<Product[]>([]);
  const [goiY, setGoiY] = useState<CanPhamGoiY[]>([]);
  const [dangTai, setDangTai] = useState(true);

  const nap = useCallback(async () => {
    try {
      const [sp, cp] = await Promise.all([apiClient.products(), apiClient.canPham()]);
      setProducts(sp.products);
      setGoiY(cp.canPham);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    void nap();
  }, [nap]);

  const luuPhieu = useCallback(
    async (duLieu: DuLieuPhieu) => {
      const kq = await apiClient.themPhieuBan(duLieu);
      bao(`Đã lưu phiếu ${kq.order.soPhieu} của ${kq.order.hoTen}`);
      await nap();
      xemTruoc(kq.order);
    },
    [nap, xemTruoc],
  );

  if (!dangTai && products.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <Trong
          tieuDe="Chưa có mặt hàng nào để bán"
          moTa="Vào mục “Mặt hàng” để thêm mặt hàng, hoặc nạp danh mục mẫu trong “Cài đặt” để dùng thử ngay."
        />
      </div>
    );
  }

  return <PhieuBanForm sanPham={products} goiY={goiY} onLuu={luuPhieu} />;
}
