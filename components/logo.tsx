"use client";

import { useId } from "react";

/**
 * Logo của ứng dụng: tô căn tin (bát ăn) kèm dấu tích.
 * Dùng chung một hình cho favicon (app/icon.svg), icon iOS và logo trong giao diện.
 */
export function Logo({
  className = "h-9 w-9",
  title,
}: {
  className?: string;
  title?: string;
}) {
  // Mỗi logo cần id gradient riêng: nếu trùng id, logo thứ hai (ví dụ logo trên
  // màn hình nhỏ) sẽ tham chiếu gradient của logo đang bị ẩn và mất nền.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const nenId = `logo-nen-${uid}`;
  const batId = `logo-bat-${uid}`;

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
        <linearGradient id={nenId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="0.55" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id={batId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dbeafe" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" rx="116" fill={`url(#${nenId})`} />
      <circle cx="256" cy="246" r="158" fill="#ffffff" opacity="0.07" />

      <g fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="18" opacity="0.9">
        <path d="M196 170c-17-23 17-38 0-61" />
        <path d="M256 158c-17-23 17-38 0-61" />
        <path d="M316 170c-17-23 17-38 0-61" />
      </g>

      <rect x="118" y="212" width="276" height="32" rx="16" fill="#ffffff" />
      <path
        d="M136 244h240l-19 103a66 66 0 0 1-65 55h-72a66 66 0 0 1-65-55z"
        fill={`url(#${batId})`}
      />
      <rect x="192" y="402" width="128" height="28" rx="14" fill="#ffffff" opacity="0.95" />
      <path
        d="M206 304l36 36 68-78"
        fill="none"
        stroke="#1d4ed8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="26"
      />
    </svg>
  );
}
