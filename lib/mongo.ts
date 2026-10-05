import { MongoClient, type Db } from "mongodb";

/**
 * Kết nối MongoDB dùng chung.
 *
 * Client được giữ trên globalThis để khi Next chạy lại module (hot reload khi
 * phát triển) không tạo thêm kết nối mới liên tục.
 */

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: Promise<MongoClient> | undefined;
}

/** Tên cơ sở dữ liệu dùng khi .env không khai báo và URI cũng không kèm theo. */
const TEN_DB_MAC_DINH = "quanlycantin";

let chuoiCache: string | null = null;

function docChuoiKetNoi(): string {
  if (chuoiCache) return chuoiCache;

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("Thiếu MONGODB_URI trong file .env");
  }
  const user = process.env.MONGODB_USERNAME?.trim();
  const matKhau = process.env.MONGODB_PASSWORD?.trim();

  // Nếu chuỗi kết nối chưa có tài khoản mà .env để riêng thì ghép vào
  const daCoTaiKhoan = /^mongodb(\+srv)?:\/\/[^/@]+@/.test(uri);
  chuoiCache =
    daCoTaiKhoan || !user || !matKhau
      ? uri
      : uri.replace(/^(mongodb(\+srv)?:\/\/)/, `$1${encodeURIComponent(user)}:${encodeURIComponent(matKhau)}@`);
  return chuoiCache;
}

/** Tên cơ sở dữ liệu nằm ngay sau tên miền trong chuỗi kết nối. */
function tenDbTrongUri(uri: string): string {
  const m = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/]*)/);
  return m?.[1]?.trim() ?? "";
}

export function getClient(): Promise<MongoClient> {
  if (!globalThis.__mongoClient) {
    const client = new MongoClient(docChuoiKetNoi(), {
      serverSelectionTimeoutMS: 8000,
      retryWrites: true,
    });
    globalThis.__mongoClient = client.connect().catch((e) => {
      // Kết nối hỏng thì bỏ cache để lần sau thử lại
      globalThis.__mongoClient = undefined;
      throw e;
    });
  }
  return globalThis.__mongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  // Ưu tiên MONGODB_DB, rồi tới tên trong chuỗi kết nối, cuối cùng là mặc định.
  // Không để trống: driver sẽ âm thầm dùng cơ sở dữ liệu "test".
  const ten = process.env.MONGODB_DB?.trim() || tenDbTrongUri(docChuoiKetNoi()) || TEN_DB_MAC_DINH;
  return client.db(ten);
}

/* ------------------------------ Tên bảng ------------------------------ */

export const COL = {
  nguoiDung: "nguoi_dung",
  sanPham: "san_pham",
  phieuBan: "phieu_ban",
  dem: "bo_dem",
  cauHinh: "cau_hinh",
} as const;

/** Mongo trả về kèm _id; ứng dụng chỉ dùng trường id của riêng mình. */
export const KHONG_LAY_ID = { projection: { _id: 0 } } as const;
