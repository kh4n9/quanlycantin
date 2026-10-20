"use client";

import { useEffect, useSyncExternalStore } from "react";

const khongTheoDoi = () => () => {};

/**
 * `false` khi render ở máy chủ, `true` sau khi đã chạy ở trình duyệt.
 * Dùng cho những thứ chỉ dựng được phía client (portal, `document`…) mà không
 * gây lệch hydrate.
 */
export function useDaMount(): boolean {
  return useSyncExternalStore(
    khongTheoDoi,
    () => true,
    () => false,
  );
}

/**
 * Gọi hàm nạp dữ liệu mỗi khi `nap` thay đổi (màn hình mở, bộ lọc đổi…).
 *
 * Các hàm nạp đều bật cờ "đang tải" ngay từ dòng đầu. Gọi thẳng chúng trong
 * thân effect sẽ tạo thêm một vòng render ngay sau khi mount; chờ qua một
 * microtask giữ nguyên hành vi tải dữ liệu mà không gây cascading render.
 * Nếu component đã đóng trước lúc microtask chạy thì bỏ luôn, khỏi gọi API.
 */
export function useNap(nap: () => Promise<void>) {
  useEffect(() => {
    let huy = false;
    void (async () => {
      await Promise.resolve();
      if (huy) return;
      try {
        await nap();
      } catch {
        // Hàm nạp tự báo lỗi cho người dùng; ở đây chỉ cần tránh unhandled rejection.
      }
    })();
    return () => {
      huy = true;
    };
  }, [nap]);
}
