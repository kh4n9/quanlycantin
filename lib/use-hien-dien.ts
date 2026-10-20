"use client";

import { useEffect } from "react";
import { apiClient } from "./client";
import type { NguoiDungCongKhai } from "./types";

/** Tên trình duyệt / hệ điều hành, đủ ngắn để hiện trong bảng tài khoản. */
function tenThietBi(): string {
  if (typeof navigator === "undefined") return "";
  const ua = navigator.userAgent;
  const trinhDuyet = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Trình duyệt";
  const heDieuHanh = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return [trinhDuyet, heDieuHanh].filter(Boolean).join(" · ");
}

/**
 * Gửi tín hiệu đang truy cập khi vào trang, khi đổi màn hình và định kỳ.
 *
 * Tín hiệu chỉ phục vụ hiển thị trạng thái nên lỗi mạng bị bỏ qua. Khi rời
 * màn hình, tín hiệu cũ tự hết hạn sau vài phút.
 */
export function useHienDien(nguoiDung: NguoiDungCongKhai | null, trang: string) {
  const id = nguoiDung?.id;

  useEffect(() => {
    if (!id) return;
    let dangGui = false;
    const thietBi = tenThietBi();
    const gui = async () => {
      if (dangGui) return;
      dangGui = true;
      try {
        await apiClient.hienDien(trang, thietBi);
      } catch {
        // Không làm phiền người dùng vì đây chỉ là tín hiệu phụ.
      } finally {
        dangGui = false;
      }
    };

    // Chờ một nhịp để các lần đổi mục liên tiếp không tạo ra tín hiệu cũ đến sau.
    const hen = window.setTimeout(() => void gui(), 120);
    const dongHo = window.setInterval(() => {
      if (document.visibilityState === "visible") void gui();
    }, 45_000);
    const khiHienLai = () => {
      if (document.visibilityState === "visible") void gui();
    };
    window.addEventListener("focus", khiHienLai);
    document.addEventListener("visibilitychange", khiHienLai);

    return () => {
      window.clearTimeout(hen);
      window.clearInterval(dongHo);
      window.removeEventListener("focus", khiHienLai);
      document.removeEventListener("visibilitychange", khiHienLai);
    };
  }, [id, trang]);
}
