"use client";

import writeXlsxFile, { type SheetData } from "write-excel-file/browser";

/** Một ô dữ liệu: chuỗi, số, hoặc để trống. */
export type OExcel = string | number | null;

export type TrangExcel = {
  /** Tên trang tính hiện ở đáy file Excel */
  ten: string;
  /** Dòng tiêu đề lớn in đậm phía trên bảng */
  tieuDe?: string;
  /** Dòng tiêu đề các cột, in đậm và tô nền */
  tieuDeCot: string[];
  dong: OExcel[][];
  /** Chỉ số cột (tính từ 0) hiển thị dạng số tiền, có dấu phân cách nghìn */
  cotTien?: number[];
  /** Độ rộng từng cột, tính theo số ký tự */
  doRong?: number[];
};

const NEN_TIEU_DE = "#e2e8f0";
const VIEN = "#cbd5e1";

const oVien = { borderStyle: "thin" as const, borderColor: VIEN };

/** Dựng dữ liệu cho một trang tính theo đúng định dạng thư viện yêu cầu. */
function dungTrang(t: TrangExcel): SheetData {
  const soCot = t.tieuDeCot.length;
  const data: SheetData = [];

  if (t.tieuDe) {
    data.push([{ value: t.tieuDe, fontWeight: "bold", columnSpan: soCot, height: 22 }]);
    data.push([]);
  }

  data.push(
    t.tieuDeCot.map((chu) => ({
      value: chu,
      fontWeight: "bold" as const,
      backgroundColor: NEN_TIEU_DE,
      align: "center" as const,
      ...oVien,
    })),
  );

  for (const dong of t.dong) {
    data.push(
      dong.map((o, i) => {
        if (typeof o === "number" && Number.isFinite(o)) {
          return {
            value: o,
            type: Number,
            align: "right" as const,
            ...(t.cotTien?.includes(i) ? { format: "#,##0" } : {}),
            ...oVien,
          };
        }
        return { value: o ?? "", type: String, ...oVien };
      }),
    );
  }

  return data;
}

/**
 * Tải dữ liệu ra file Excel (.xlsx) thật.
 *
 * Chấp nhận một trang tính hoặc nhiều trang — báo cáo dùng nhiều trang cho dễ đọc
 * thay vì nhồi hết vào một bảng.
 */
export async function taiExcel(tenFile: string, trang: TrangExcel | TrangExcel[]): Promise<void> {
  const ds = Array.isArray(trang) ? trang : [trang];
  const sheets = ds.map((t) => ({
    data: dungTrang(t),
    sheet: t.ten,
    ...(t.doRong ? { columns: t.doRong.map((width) => ({ width })) } : {}),
  }));

  const blob = await writeXlsxFile(sheets).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = tenFile.endsWith(".xlsx") ? tenFile : `${tenFile}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
