import fs from "node:fs";
import path from "node:path";
import type { CanPhamGoiY, DB, LineItem, LineInput, Product } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function emptyDB(): DB {
  return {
    products: [],
    orders: [],
    counters: { order: {} },
    settings: { tenDonVi: "", diaChi: "", nguoiLapPhieu: "" },
  };
}

/** Bù các trường thiếu để file dữ liệu cũ vẫn đọc được. */
function chuanHoa(p: Partial<DB>): DB {
  const goc = emptyDB();
  const soDuong = (v: unknown) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  return {
    products: (p.products ?? []).map((x) => ({ ...x, giaBan: soDuong(x?.giaBan) })),
    orders: (p.orders ?? []).map((x) => {
      const o = x as unknown as Record<string, unknown>;
      return {
        ...x,
        hoTen: String(o.hoTen ?? ""),
        namSinh: soDuong(o.namSinh),
        buongGiam: String(o.buongGiam ?? ""),
      } as DB["orders"][number];
    }),
    counters: { order: {}, ...(p.counters || {}) },
    settings: { ...goc.settings, ...(p.settings || {}) },
  };
}

const CHO_RETRY = new Set(["EPERM", "EBUSY", "EACCES", "EEXIST"]);

/**
 * Ghi dữ liệu xuống đĩa.
 *
 * Trên Windows, thao tác đổi tên file có thể tạm thời bị chặn (OneDrive,
 * antivirus, trình đánh chỉ mục) nên phải thử lại vài lần. Tên file tạm có
 * kèm pid + thời điểm để nhiều tiến trình không ghi đè lên nhau.
 */
async function ghiFile(db: DB): Promise<void> {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  const noiDung = JSON.stringify(db, null, 2);
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.promises.writeFile(tmp, noiDung, "utf8");

  let loiCuoi: unknown = null;
  for (let lan = 0; lan < 8; lan++) {
    try {
      await fs.promises.rename(tmp, DB_FILE);
      return;
    } catch (e) {
      const ma = (e as NodeJS.ErrnoException).code ?? "";
      if (!CHO_RETRY.has(ma)) throw e;
      loiCuoi = e;
      await new Promise((r) => setTimeout(r, 20 * (lan + 1)));
    }
  }

  // Vẫn bị khoá: ghi thẳng vào file đích, thà chấp nhận rủi ro nhỏ còn hơn mất dữ liệu
  try {
    await fs.promises.writeFile(DB_FILE, noiDung, "utf8");
    await fs.promises.unlink(tmp).catch(() => {});
  } catch {
    throw loiCuoi;
  }
}

/**
 * Đọc dữ liệu. Luôn đọc mới từ đĩa: file nhỏ nên chi phí không đáng kể, đổi lại
 * không bao giờ trả về dữ liệu cũ khi có nhiều tiến trình cùng phục vụ.
 */
export async function getDB(): Promise<DB> {
  try {
    const raw = await fs.promises.readFile(DB_FILE, "utf8");
    if (!raw.trim()) throw new Error("File dữ liệu rỗng");
    return chuanHoa(JSON.parse(raw) as Partial<DB>);
  } catch (e) {
    const ma = (e as NodeJS.ErrnoException).code;
    if (ma === "ENOENT") {
      const moi = emptyDB();
      await ghiFile(moi);
      return moi;
    }
    // File hỏng: giữ lại bản cũ để còn cứu dữ liệu, rồi bắt đầu file mới
    const saoLuu = `${DB_FILE}.hong-${Date.now()}`;
    await fs.promises.rename(DB_FILE, saoLuu).catch(() => {});
    console.error(`[db] File dữ liệu không đọc được, đã chuyển sang ${saoLuu}`);
    const moi = emptyDB();
    await ghiFile(moi);
    return moi;
  }
}

/**
 * Hàng đợi ghi: mọi thao tác thay đổi dữ liệu được xếp hàng để không hai
 * request nào cùng đọc-sửa-ghi một lúc.
 */
let hangDoi: Promise<unknown> = Promise.resolve();

export function mutate<T>(fn: (db: DB) => T): Promise<T> {
  const chay = hangDoi.then(async () => {
    const db = await getDB();
    const ketQua = fn(db);
    await ghiFile(db);
    return ketQua;
  });
  // Lỗi của lần này không được làm kẹt hàng đợi
  hangDoi = chay.then(
    () => undefined,
    () => undefined,
  );
  return chay;
}

export function newId(tienTo = "id"): string {
  return `${tienTo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Sinh số phiếu dạng PB-2026-0001, đếm lại từ đầu mỗi năm. */
export function soPhieuMoi(db: DB, ngay: string): string {
  const nam = (ngay || new Date().toISOString()).slice(0, 4);
  const so = (db.counters.order[nam] || 0) + 1;
  db.counters.order[nam] = so;
  return `PB-${nam}-${String(so).padStart(4, "0")}`;
}

export function timProduct(db: DB, id: string): Product | undefined {
  return db.products.find((p) => p.id === id);
}

/**
 * Danh sách can phạm suy ra từ các phiếu bán đã lập, dùng cho ô gợi ý.
 * Gộp theo họ tên (không phân biệt hoa thường, khoảng trắng thừa).
 */
/** Ưu tiên cách viết có chữ hoa đầu ("Nguyễn Văn An" hơn "nguyễn văn an"). */
function vietHoaDau(s: string): boolean {
  return /^\p{Lu}/u.test(s.trim());
}

export function danhSachCanPham(db: DB): CanPhamGoiY[] {
  const map = new Map<string, CanPhamGoiY>();
  for (const o of db.orders) {
    const hoTen = o.hoTen.trim();
    if (!hoTen) continue;
    const khoa = hoTen.toLowerCase().replace(/\s+/g, " ");
    const cu = map.get(khoa);
    if (!cu) {
      map.set(khoa, { hoTen, namSinh: o.namSinh, buongGiam: o.buongGiam, soLan: 1, lanCuoi: o.ngay });
    } else {
      cu.soLan += 1;
      // Giữ thông tin của phiếu mới nhất
      if (o.ngay >= cu.lanCuoi) {
        cu.lanCuoi = o.ngay;
        if (vietHoaDau(hoTen) || !vietHoaDau(cu.hoTen)) cu.hoTen = hoTen;
        if (o.namSinh) cu.namSinh = o.namSinh;
        if (o.buongGiam) cu.buongGiam = o.buongGiam;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.lanCuoi.localeCompare(a.lanCuoi));
}

/**
 * Dựng danh sách dòng hàng từ dữ liệu người dùng gửi lên, kiểm tra mặt hàng có
 * tồn tại và tính lại thành tiền ở phía máy chủ.
 */
export function dungDongHang(db: DB, inputs: LineInput[]): { items: LineItem[]; tongTien: number } {
  const items: LineItem[] = [];
  for (const input of inputs) {
    const p = timProduct(db, input.productId);
    if (!p) throw new Error(`Không tìm thấy mặt hàng: ${input.productId}`);
    const soLuong = Math.round(Number(input.soLuong) || 0);
    if (soLuong <= 0) throw new Error(`Số lượng không hợp lệ cho "${p.ten}"`);
    const coGia = input.donGia !== undefined && input.donGia !== null && !Number.isNaN(Number(input.donGia));
    const donGia = coGia ? Math.max(0, Math.round(Number(input.donGia))) : p.giaBan;
    items.push({
      productId: p.id,
      ma: p.ma,
      ten: p.ten,
      donViTinh: p.donViTinh,
      soLuong,
      donGia,
      thanhTien: soLuong * donGia,
    });
  }
  if (items.length === 0) throw new Error("Phiếu phải có ít nhất một mặt hàng");
  return { items, tongTien: items.reduce((s, i) => s + i.thanhTien, 0) };
}
