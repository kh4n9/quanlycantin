import dns from "node:dns";
import { MongoClient, type Db } from "mongodb";

/**
 * Kết nối MongoDB dùng chung.
 *
 * Client được giữ trên globalThis để khi Next chạy lại module (hot reload khi
 * phát triển) không tạo thêm kết nối mới liên tục.
 */

declare global {
  var __mongoClient: Promise<MongoClient> | undefined;
}

/** Tên cơ sở dữ liệu dùng khi .env không khai báo và URI cũng không kèm theo. */
const TEN_DB_MAC_DINH = "quanlycantin";

/* --------------------------- Phân giải SRV --------------------------- */

/**
 * `mongodb+srv://` cần tra bản ghi SRV. Trình phân giải của Node (c-ares) tự đọc
 * cấu hình DNS riêng, và trên máy có Cloudflare WARP nó thường thấy `127.0.0.1`
 * — nơi không có dịch vụ DNS nào nghe — trong khi Windows vẫn phân giải bình
 * thường qua `127.0.2.2`. Kết quả là mọi kết nối đều hỏng với
 * `querySrv ECONNREFUSED` dù mạng và chuỗi kết nối đều đúng.
 *
 * Vì vậy trước lần kết nối đầu tiên, nếu hệ thống không phân giải được tên máy
 * chủ trong URI thì thử lại bằng DNS công cộng. Chỉ áp dụng cho tiến trình này
 * và chỉ sau khi cách mặc định đã thất bại, nên không đổi hành vi ở máy bình
 * thường.
 *
 * Đặt `MONGODB_DNS_SERVERS` trong .env để chỉ định máy chủ DNS, cách nhau bởi
 * dấu phẩy (ví dụ `127.0.2.2,1.1.1.1`) khi muốn kiểm soát thay vì để tự dò.
 */
const DNS_CONG_CONG = ["1.1.1.1", "8.8.8.8"];
const CHO_TOI_DA_MS = 4000;

let daChinhDns = false;

/** Tên miền trong URI, dùng để thử phân giải SRV. */
function tenMienTrongUri(uri: string): string {
  return uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?]+)/)?.[1]?.trim() ?? "";
}

function voiHanChoTruoc<T>(viec: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    viec,
    new Promise<T>((_, huy) => setTimeout(() => huy(new Error("Hết thời gian chờ DNS")), ms).unref?.()),
  ]);
}

async function kiemTraSrv(ten: string): Promise<boolean> {
  try {
    await voiHanChoTruoc(dns.promises.resolveSrv(`_mongodb._tcp.${ten}`), CHO_TOI_DA_MS);
    return true;
  } catch {
    return false;
  }
}

async function chuanBiDns(uri: string): Promise<void> {
  if (daChinhDns || !uri.startsWith("mongodb+srv://")) return;
  daChinhDns = true;

  const ten = tenMienTrongUri(uri);
  if (!ten) return;

  // Có chỉ định thủ công thì dùng luôn, không dò tiếp
  const chiDinh = process.env.MONGODB_DNS_SERVERS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (chiDinh?.length) {
    dns.setServers(chiDinh);
    return;
  }

  // Cách mặc định đã chạy được thì giữ nguyên
  if (await kiemTraSrv(ten)) return;

  // Đổi sang DNS công cộng rồi thử lại
  const cu = dns.getServers();
  dns.setServers(DNS_CONG_CONG);
  if (await kiemTraSrv(ten)) {
    console.warn(
      `[mongo] Trình phân giải mặc định (${cu.join(", ")}) không tra được SRV; đã tạm dùng ${DNS_CONG_CONG.join(", ")} cho tiến trình này.`,
    );
    return;
  }

  // DNS công cộng cũng không xong thì trả lại như cũ để giữ nguyên thông báo lỗi gốc
  dns.setServers(cu);
}

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
    const uri = docChuoiKetNoi();
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      retryWrites: true,
    });
    globalThis.__mongoClient = chuanBiDns(uri)
      .then(() => client.connect())
      .catch((e) => {
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
  nhatKy: "nhat_ky",
  dem: "bo_dem",
  cauHinh: "cau_hinh",
} as const;

/** Mongo trả về kèm _id; ứng dụng chỉ dùng trường id của riêng mình. */
export const KHONG_LAY_ID = { projection: { _id: 0 } } as const;
