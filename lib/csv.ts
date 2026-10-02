"use client";

/** Tải một bảng dữ liệu ra file CSV (mở được bằng Excel, có dấu tiếng Việt). */
export function taiCsv(tenFile: string, tieuDe: string[], dong: (string | number)[][]) {
  const boc = (o: string | number) => `"${String(o ?? "").replace(/"/g, '""')}"`;
  const noiDung = [tieuDe, ...dong].map((r) => r.map(boc).join(",")).join("\r\n");
  // BOM để Excel nhận đúng bảng mã UTF-8
  const blob = new Blob([`﻿${noiDung}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = tenFile.endsWith(".csv") ? tenFile : `${tenFile}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
