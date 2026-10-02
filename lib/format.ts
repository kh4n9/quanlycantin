const nf = new Intl.NumberFormat("vi-VN");

/** 4500 -> "4.500" */
export function so(n: number): string {
  return nf.format(Math.round(n || 0));
}

/** 4500 -> "4.500 đ" */
export function tien(n: number): string {
  return `${so(n)} đ`;
}

/** "2026-10-02" -> "02/10/2026" */
export function ngayVN(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Ngày hôm nay theo giờ địa phương, dạng YYYY-MM-DD. */
export function homNay(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Chuẩn hoá tiếng Việt để tìm kiếm không dấu. */
export function boDau(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/** So khớp tìm kiếm: gõ không dấu vẫn ra kết quả. */
export function khop(target: string, query: string): boolean {
  if (!query) return true;
  return boDau(target).includes(boDau(query));
}

export function docSoThanhChu(n: number): string {
  n = Math.round(n || 0);
  if (n === 0) return "Không đồng";
  const chuso = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const hang = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const doc3 = (num: number, full: boolean): string => {
    const tram = Math.floor(num / 100);
    const chuc = Math.floor((num % 100) / 10);
    const dv = num % 10;
    const parts: string[] = [];
    if (tram > 0 || full) parts.push(`${chuso[tram]} trăm`);
    if (chuc > 1) {
      parts.push(`${chuso[chuc]} mươi`);
      if (dv === 1) parts.push("mốt");
      else if (dv === 5) parts.push("lăm");
      else if (dv > 0) parts.push(chuso[dv]);
    } else if (chuc === 1) {
      parts.push("mười");
      if (dv === 5) parts.push("lăm");
      else if (dv > 0) parts.push(chuso[dv]);
    } else if (dv > 0) {
      if (tram > 0 || full) parts.push("lẻ");
      parts.push(chuso[dv]);
    }
    return parts.join(" ");
  };
  const nhom: number[] = [];
  let rest = n;
  while (rest > 0) {
    nhom.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const out: string[] = [];
  for (let i = nhom.length - 1; i >= 0; i--) {
    if (nhom[i] === 0) continue;
    out.push(`${doc3(nhom[i], i !== nhom.length - 1)} ${hang[i]}`.trim());
  }
  const s = out.join(" ").replace(/\s+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1) + " đồng";
}

export function maTuDong(tienTo: string, ten: string): string {
  const slug = boDau(ten)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12)
    .toUpperCase();
  return `${tienTo}-${slug || "HANG"}`;
}
