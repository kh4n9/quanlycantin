"use client";

import { useId } from "react";

/**
 * Logo của ứng dụng: tô căn tin (bát ăn) màu mực trên nền giấy, dấu tích để
 * trống cho nền giấy lộ ra — như dấu đã phát trên sổ.
 * Dùng chung một hình cho favicon (app/icon.svg), icon ứng dụng và logo trong giao diện.
 */
export function Logo({
  className = "h-9 w-9",
  title,
}: {
  className?: string;
  title?: string;
}) {
  // Mỗi logo cần id riêng cho phần nền: nếu trùng id, logo thứ hai (ví dụ logo
  // trên màn hình nhỏ) sẽ tham chiếu định nghĩa của logo đang bị ẩn.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const vienId = `logo-vien-${uid}`;

  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={vienId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#16201c" />
          <stop offset="1" stopColor="#0b1411" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" rx="116" fill="#f4f5ef" />
      <rect x="6" y="6" width="500" height="500" rx="111" fill="none" stroke={`url(#${vienId})`} strokeWidth="12" opacity="0.9" />

      <g fill="none" stroke="#16201c" strokeLinecap="round" strokeWidth="18" opacity="0.55">
        <path d="M196 170c-17-23 17-38 0-61" />
        <path d="M256 158c-17-23 17-38 0-61" />
        <path d="M316 170c-17-23 17-38 0-61" />
      </g>

      <rect x="118" y="212" width="276" height="32" rx="16" fill="#16201c" />
      <path
        d="M136 244h240l-19 103a66 66 0 0 1-65 55h-72a66 66 0 0 1-65-55z"
        fill="#16201c"
      />
      <rect x="192" y="402" width="128" height="28" rx="14" fill="#16201c" opacity="0.9" />
      <path
        d="M206 304l36 36 68-78"
        fill="none"
        stroke="#f4f5ef"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="26"
      />
    </svg>
  );
}
