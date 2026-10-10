import fs from "node:fs";
import path from "node:path";
import { COL, KHONG_LAY_ID, getDb } from "./mongo";
import { QUYEN_DAY_DU } from "./quyen";
import {
  MAU_IN_MAC_DINH,
  MAU_IN_THIEU_MAC_DINH,
  chuanHoaMauIn,
  chuanHoaMauInThieu,
} from "./mau-in";
import { bamMatKhau } from "./auth";
import type { CanPhamGoiY, LineItem, LineInput, Order, Product, Settings } from "./types";

/* ============================ Khởi tạo ============================ */

let daKhoiTao: Promise<void> | null = null;

/** Tạo chỉ mục, tài khoản quản trị đầu tiên và chuyển dữ liệu cũ nếu cần. */
export function khoiTao(): Promise<void> {
  if (!daKhoiTao) {
    daKhoiTao = chayKhoiTao().catch((e) => {
      daKhoiTao = null; // lần sau thử lại
      throw e;
    });
  }
  return daKhoiTao;
}

async function chayKhoiTao(): Promise<void> {
  const db = await getDb();

  await Promise.all([
    db.collection(COL.nguoiDung).createIndex({ tenDangNhap: 1 }, { unique: true }),
    db.collection(COL.nguoiDung).createIndex({ id: 1 }, { unique: true }),
    db.collection(COL.sanPham).createIndex({ id: 1 }, { unique: true }),
    db.collection(COL.phieuBan).createIndex({ id: 1 }, { unique: true }),
    db.collection(COL.phieuBan).createIndex({ ngay: -1 }),
    db.collection(COL.phieuBan).createIndex({ hoTen: 1 }),
  ]);

  await taoQuanTriDauTien();
  await capNhatQuyenMoi();
  await chuyenDuLieuTuFileJson();

  const daDon = await donThungRacQuaHan();
  if (daDon > 0) console.log(`[db] Đã tự xoá ${daDon} phiếu quá hạn lưu trong thùng rác`);
}

/**
 * Cấp quyền mới cho tài khoản đang có. Hiện dùng cho quyền "kiểm phiếu" vừa thêm:
 * ai đã được phép sửa phiếu thì mặc định cũng được kiểm. Quản trị viên có thể
 * bỏ lại trong màn hình Tài khoản.
 */
async function capNhatQuyenMoi(): Promise<void> {
  const db = await getDb();
  const kq = await db.collection(COL.nguoiDung).updateMany(
    { $and: [{ quyen: "sua_phieu" }, { quyen: { $ne: "kiem_phieu" } }] },
    { $addToSet: { quyen: "kiem_phieu" } },
  );
  if (kq.modifiedCount > 0) {
    console.log(`[db] Đã cấp quyền "kiểm phiếu" cho ${kq.modifiedCount} tài khoản`);
  }
}

/**
 * Chưa có tài khoản nào thì tạo sẵn một tài khoản quản trị
 * với tên đăng nhập và mật khẩu đều là "admin".
 */
async function taoQuanTriDauTien(): Promise<void> {
  const db = await getDb();
  const dem = await db.collection(COL.nguoiDung).countDocuments();
  if (dem > 0) return;

  await db.collection(COL.nguoiDung).insertOne({
    id: newId("nd"),
    tenDangNhap: "admin",
    hoTen: "Quản trị viên",
    quyen: QUYEN_DAY_DU,
    dangHoatDong: true,
    phaiDoiMatKhau: true,
    matKhauHash: await bamMatKhau("admin"),
    lanDangNhapCuoi: "",
    createdAt: new Date().toISOString(),
  });
  console.log("[db] Đã tạo tài khoản quản trị mặc định: admin / admin");
}

/**
 * Lần đầu chạy với cơ sở dữ liệu trống: chuyển mặt hàng và phiếu bán từ file
 * data/db.json (bản lưu cũ) lên MongoDB. File cũ được giữ nguyên làm bản sao.
 */
async function chuyenDuLieuTuFileJson(): Promise<void> {
  const db = await getDb();
  const daCoSanPham = await db.collection(COL.sanPham).countDocuments();
  if (daCoSanPham > 0) return;

  const fileCu = path.join(process.cwd(), "data", "db.json");
  if (!fs.existsSync(fileCu)) return;

  try {
    const cu = JSON.parse(fs.readFileSync(fileCu, "utf8")) as {
      products?: Product[];
      orders?: Order[];
      settings?: Settings;
    };
    const sanPham = cu.products ?? [];
    const phieu = cu.orders ?? [];
    if (sanPham.length === 0 && phieu.length === 0) return;

    if (sanPham.length) await db.collection(COL.sanPham).insertMany(sanPham);
    if (phieu.length) await db.collection(COL.phieuBan).insertMany(phieu);
    if (cu.settings) await luuCaiDat(cu.settings);

    // Đánh số phiếu tiếp nối đúng theo dữ liệu vừa chuyển
    const theoNam = new Map<string, number>();
    for (const o of phieu) {
      const nam = (o.ngay || "").slice(0, 4);
      const so = Number((o.soPhieu || "").split("-").pop()) || 0;
      if (nam) theoNam.set(nam, Math.max(theoNam.get(nam) ?? 0, so));
    }
    for (const [nam, so] of theoNam) {
      await db
        .collection<DocBoDem>(COL.dem)
        .updateOne({ _id: `phieu_ban_${nam}` }, { $max: { giaTri: so } }, { upsert: true });
    }

    console.log(`[db] Đã chuyển ${sanPham.length} mặt hàng và ${phieu.length} phiếu bán từ data/db.json lên MongoDB`);
  } catch (e) {
    console.error("[db] Không chuyển được dữ liệu cũ từ data/db.json:", (e as Error).message);
  }
}

export function newId(tienTo = "id"): string {
  return `${tienTo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Bảng đếm dùng _id kiểu chuỗi, ví dụ "phieu_ban_2026". */
type DocBoDem = { _id: string; giaTri: number };

/* ============================ Mặt hàng ============================ */

export async function laySanPham(): Promise<Product[]> {
  const db = await getDb();
  return (await db.collection(COL.sanPham).find({}, KHONG_LAY_ID).toArray()) as unknown as Product[];
}

export async function timSanPham(id: string): Promise<Product | null> {
  const db = await getDb();
  const doc = await db.collection(COL.sanPham).findOne({ id }, KHONG_LAY_ID);
  return (doc as unknown as Product) ?? null;
}

export async function themSanPham(sp: Product): Promise<Product> {
  const db = await getDb();
  await db.collection(COL.sanPham).insertOne({ ...sp });
  return sp;
}

export async function suaSanPham(id: string, patch: Partial<Product>): Promise<Product | null> {
  const db = await getDb();
  await db.collection(COL.sanPham).updateOne({ id }, { $set: patch });
  return timSanPham(id);
}

export async function xoaSanPham(id: string): Promise<void> {
  const db = await getDb();
  await db.collection(COL.sanPham).deleteOne({ id });
}

export async function sanPhamDaLenPhieu(id: string): Promise<boolean> {
  const db = await getDb();
  return (await db.collection(COL.phieuBan).countDocuments({ "items.productId": id }, { limit: 1 })) > 0;
}

/* ============================ Phiếu bán ============================ */

/** Sinh số phiếu dạng PB-2026-0001. Bộ đếm tăng nguyên tử nên nhiều người cùng lập phiếu vẫn không trùng số. */
export async function soPhieuMoi(ngay: string): Promise<string> {
  const nam = (ngay || new Date().toISOString()).slice(0, 4);
  const db = await getDb();
  const kq = await db
    .collection<DocBoDem>(COL.dem)
    .findOneAndUpdate(
      { _id: `phieu_ban_${nam}` },
      { $inc: { giaTri: 1 } },
      { upsert: true, returnDocument: "after" },
    );
  const so = Number(kq?.giaTri ?? 1);
  return `PB-${nam}-${String(so).padStart(4, "0")}`;
}

export type LocPhieu = { tu?: string; den?: string; hoTen?: string };

/** Bù các trường thêm sau cho những phiếu lập trước khi có tính năng đó. */
function chuanHoaPhieu(doc: Record<string, unknown>): Order {
  const items = ((doc.items as LineItem[] | undefined) ?? []).map((i) => ({
    ...i,
    thieu: Math.max(0, Math.round(Number(i.thieu) || 0)),
    bu: Array.isArray(i.bu) ? i.bu : [],
  }));
  return {
    ...(doc as unknown as Order),
    items,
    kiemLuc: String(doc.kiemLuc ?? ""),
    kiemBoi: String(doc.kiemBoi ?? ""),
    kiemGhiChu: String(doc.kiemGhiChu ?? ""),
    xoaLuc: String(doc.xoaLuc ?? ""),
    xoaBoi: String(doc.xoaBoi ?? ""),
    lyDoXoa: String(doc.lyDoXoa ?? ""),
  };
}

/**
 * Điều kiện lọc phiếu còn dùng và phiếu trong thùng rác.
 * Phải kể cả trường hợp trường chưa tồn tại, vì phiếu lập trước khi có thùng rác
 * không có trường xoaLuc — nếu chỉ so với chuỗi rỗng thì chúng sẽ biến mất khỏi
 * mọi danh sách.
 */
const CHUA_XOA = { $or: [{ xoaLuc: { $exists: false } }, { xoaLuc: "" }, { xoaLuc: null }] };
const DA_XOA = { xoaLuc: { $nin: ["", null] } };

export async function layPhieuBan(loc: LocPhieu = {}): Promise<Order[]> {
  const db = await getDb();
  const dieuKien: Record<string, unknown> = {};
  if (loc.tu || loc.den) {
    const khoang: Record<string, string> = {};
    if (loc.tu) khoang.$gte = loc.tu;
    if (loc.den) khoang.$lte = loc.den;
    dieuKien.ngay = khoang;
  }
  if (loc.hoTen) {
    dieuKien.hoTen = new RegExp(`^${loc.hoTen.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  }
  // Phiếu trong thùng rác không bao giờ lọt vào danh sách đang dùng
  const ds = await db
    .collection(COL.phieuBan)
    .find({ $and: [dieuKien, CHUA_XOA] }, KHONG_LAY_ID)
    .sort({ ngay: -1, createdAt: -1 })
    .toArray();
  return (ds as Record<string, unknown>[]).map(chuanHoaPhieu);
}

/** Danh sách phiếu đang nằm trong thùng rác, mới xoá lên đầu. */
export async function layThungRac(): Promise<Order[]> {
  const db = await getDb();
  const ds = await db
    .collection(COL.phieuBan)
    .find(DA_XOA, KHONG_LAY_ID)
    .sort({ xoaLuc: -1 })
    .toArray();
  return (ds as Record<string, unknown>[]).map(chuanHoaPhieu);
}

export async function timPhieuBan(id: string): Promise<Order | null> {
  const db = await getDb();
  const doc = await db.collection(COL.phieuBan).findOne({ id }, KHONG_LAY_ID);
  return doc ? chuanHoaPhieu(doc as Record<string, unknown>) : null;
}

/** Đánh dấu phiếu đã kiểm (kèm ghi chú nếu có sai sót). */
export async function danhDauDaKiem(id: string, nguoiKiem: string, ghiChu: string): Promise<Order | null> {
  const db = await getDb();
  await db.collection(COL.phieuBan).updateOne(
    { id },
    { $set: { kiemLuc: new Date().toISOString(), kiemBoi: nguoiKiem, kiemGhiChu: ghiChu } },
  );
  return timPhieuBan(id);
}

/** Bỏ đánh dấu đã kiểm. */
export async function boDanhDauKiem(id: string): Promise<Order | null> {
  const db = await getDb();
  await db.collection(COL.phieuBan).updateOne({ id }, { $set: { kiemLuc: "", kiemBoi: "", kiemGhiChu: "" } });
  return timPhieuBan(id);
}

export async function themPhieuBan(o: Order): Promise<Order> {
  const db = await getDb();
  await db.collection(COL.phieuBan).insertOne({ ...o });
  return o;
}

export async function suaPhieuBan(id: string, patch: Partial<Order>): Promise<Order | null> {
  const db = await getDb();
  await db.collection(COL.phieuBan).updateOne({ id }, { $set: patch });
  return timPhieuBan(id);
}

/** Chuyển phiếu vào thùng rác kèm lý do. Dữ liệu vẫn còn, phục hồi được. */
export async function xoaPhieuBan(id: string, nguoiXoa: string, lyDo: string): Promise<Order | null> {
  const db = await getDb();
  if (!(await timPhieuBan(id))) return null;
  await db.collection(COL.phieuBan).updateOne(
    { id },
    { $set: { xoaLuc: new Date().toISOString(), xoaBoi: nguoiXoa, lyDoXoa: lyDo } },
  );
  return timPhieuBan(id);
}

/** Lấy phiếu ra khỏi thùng rác. */
export async function phucHoiPhieuBan(id: string): Promise<Order | null> {
  const db = await getDb();
  await db
    .collection(COL.phieuBan)
    .updateOne({ id }, { $set: { xoaLuc: "", xoaBoi: "", lyDoXoa: "" } });
  return timPhieuBan(id);
}

/**
 * Ghi nhận số lượng còn thiếu của từng dòng hàng trên phiếu.
 * Không cho đặt số thiếu nhỏ hơn số đã bù, nếu không công nợ sẽ thành số âm.
 */
export async function ghiThieuHang(id: string, dsThieu: Record<string, number>): Promise<Order | null> {
  const db = await getDb();
  const phieu = await timPhieuBan(id);
  if (!phieu) return null;

  const items = phieu.items.map((i) => {
    if (!(i.productId in dsThieu)) return i;
    const soLuong = Math.max(0, Math.round(Number(dsThieu[i.productId]) || 0));
    if (soLuong > i.soLuong) {
      throw new Error(`"${i.ten}" chỉ có ${i.soLuong} ${i.donViTinh} trên phiếu, không thể thiếu ${soLuong}`);
    }
    const daBuRoi = (i.bu ?? []).reduce((s, b) => s + (Number(b.soLuong) || 0), 0);
    if (soLuong < daBuRoi) {
      throw new Error(`"${i.ten}" đã bù ${daBuRoi} ${i.donViTinh}, không thể đặt thiếu ít hơn`);
    }
    return { ...i, thieu: soLuong };
  });

  await db.collection(COL.phieuBan).updateOne({ id }, { $set: { items } });
  return timPhieuBan(id);
}

/** Ghi một lần bù hàng cho phần còn thiếu. */
export async function ghiBuHang(
  id: string,
  dsBu: Record<string, number>,
  ngay: string,
  ghiChu: string,
  nguoiBu: string,
): Promise<Order | null> {
  const db = await getDb();
  const phieu = await timPhieuBan(id);
  if (!phieu) return null;

  const items = phieu.items.map((i) => {
    if (!(i.productId in dsBu)) return i;
    const soLuong = Math.round(Number(dsBu[i.productId]) || 0);
    if (soLuong <= 0) return i;

    const daBuRoi = (i.bu ?? []).reduce((s, b) => s + (Number(b.soLuong) || 0), 0);
    const conLai = Math.max(0, i.thieu - daBuRoi);
    if (soLuong > conLai) {
      throw new Error(`"${i.ten}" chỉ còn thiếu ${conLai} ${i.donViTinh}, không thể bù ${soLuong}`);
    }
    return {
      ...i,
      bu: [...(i.bu ?? []), { soLuong, ngay, ghiChu, boi: nguoiBu }],
    };
  });

  await db.collection(COL.phieuBan).updateOne({ id }, { $set: { items } });
  return timPhieuBan(id);
}

/** Xoá hẳn khỏi cơ sở dữ liệu. Không hoàn tác được. */
export async function xoaVinhVienPhieuBan(id: string): Promise<Order | null> {
  const db = await getDb();
  const phieu = await timPhieuBan(id);
  if (!phieu) return null;
  await db.collection(COL.phieuBan).deleteOne({ id });
  return phieu;
}

/**
 * Danh sách can phạm suy ra từ các phiếu bán đã lập, dùng cho ô gợi ý.
 * Gộp theo họ tên (không phân biệt hoa thường, khoảng trắng thừa).
 */
export async function danhSachCanPham(): Promise<CanPhamGoiY[]> {
  const db = await getDb();
  const ds = await db
    .collection(COL.phieuBan)
    .aggregate([
      { $match: CHUA_XOA },
      { $sort: { ngay: 1, createdAt: 1 } },
      {
        $group: {
          _id: {
            $toLower: { $trim: { input: { $replaceAll: { input: "$hoTen", find: "  ", replacement: " " } } } },
          },
          hoTen: { $last: "$hoTen" },
          namSinh: { $last: "$namSinh" },
          buongGiam: { $last: "$buongGiam" },
          soLan: { $sum: 1 },
          lanCuoi: { $last: "$ngay" },
        },
      },
      { $project: { _id: 0 } },
      { $sort: { lanCuoi: -1 } },
    ])
    .toArray();

  return (ds as unknown as CanPhamGoiY[]).map((c) => ({
    hoTen: String(c.hoTen ?? "").trim(),
    namSinh: Number(c.namSinh) || 0,
    buongGiam: String(c.buongGiam ?? ""),
    soLan: Number(c.soLan) || 0,
    lanCuoi: String(c.lanCuoi ?? ""),
  }));
}

/* ============================ Sổ đếm & cài đặt ============================ */

/** Xoá sạch mặt hàng và phiếu bán, giữ lại tài khoản và thông tin đơn vị. */
export async function xoaHetDuLieu(): Promise<{ soHang: number; soPhieu: number }> {
  const db = await getDb();
  const [soHang, soPhieu] = await Promise.all([
    db.collection(COL.sanPham).countDocuments(),
    db.collection(COL.phieuBan).countDocuments(),
  ]);
  await Promise.all([db.collection(COL.sanPham).deleteMany({}), db.collection(COL.phieuBan).deleteMany({})]);
  await db.collection(COL.dem).deleteMany({});
  return { soHang, soPhieu };
}

/** Mặc định không tự xoá — chỉ xoá khi người dùng đặt số ngày cụ thể. */
const CAI_DAT_MAC_DINH: Settings = {
  tenDonVi: "",
  diaChi: "",
  nguoiLapPhieu: "",
  soNgayGiuThungRac: 0,
  mauIn: MAU_IN_MAC_DINH,
  mauInThieu: MAU_IN_THIEU_MAC_DINH,
};

export async function layCaiDat(): Promise<Settings> {
  const db = await getDb();
  const doc = await db.collection(COL.cauHinh).findOne({ khoa: "don_vi" }, { projection: { _id: 0 } });
  if (!doc) {
    return { ...CAI_DAT_MAC_DINH, mauIn: chuanHoaMauIn(null), mauInThieu: chuanHoaMauInThieu(null) };
  }
  return {
    tenDonVi: String(doc.tenDonVi ?? ""),
    diaChi: String(doc.diaChi ?? ""),
    nguoiLapPhieu: String(doc.nguoiLapPhieu ?? ""),
    soNgayGiuThungRac: Math.max(0, Math.round(Number(doc.soNgayGiuThungRac) || 0)),
    mauIn: chuanHoaMauIn(doc.mauIn),
    mauInThieu: chuanHoaMauInThieu(doc.mauInThieu),
  };
}

export async function luuCaiDat(patch: Partial<Settings>): Promise<Settings> {
  const db = await getDb();
  const deLuu: Record<string, unknown> = { ...patch, khoa: "don_vi" };
  if (patch.soNgayGiuThungRac !== undefined) {
    deLuu.soNgayGiuThungRac = Math.max(0, Math.round(Number(patch.soNgayGiuThungRac) || 0));
  }
  // Chuẩn hoá mẫu in trước khi lưu để dữ liệu rác từ giao diện không lọt vào
  if (patch.mauIn !== undefined) deLuu.mauIn = chuanHoaMauIn(patch.mauIn);
  if (patch.mauInThieu !== undefined) deLuu.mauInThieu = chuanHoaMauInThieu(patch.mauInThieu);
  await db.collection(COL.cauHinh).updateOne({ khoa: "don_vi" }, { $set: deLuu }, { upsert: true });
  return layCaiDat();
}

/**
 * Xoá vĩnh viễn những phiếu đã nằm trong thùng rác quá số ngày cho phép.
 *
 * Không có bộ hẹn giờ chạy nền nên việc dọn được kích hoạt khi mở thùng rác và
 * lúc máy chủ khởi động — đủ để thùng rác không phình ra theo thời gian.
 */
export async function donThungRacQuaHan(): Promise<number> {
  const { soNgayGiuThungRac } = await layCaiDat();
  if (soNgayGiuThungRac <= 0) return 0;

  const moc = new Date(Date.now() - soNgayGiuThungRac * 24 * 60 * 60 * 1000).toISOString();
  const db = await getDb();
  const kq = await db
    .collection(COL.phieuBan)
    // $nin loại phiếu chưa xoá, $lt lọc theo mốc thời gian — gộp chung một trường
    .deleteMany({ xoaLuc: { $nin: ["", null], $lt: moc } });
  return kq.deletedCount;
}

/* ============================ Dòng hàng ============================ */

/**
 * Dựng danh sách dòng hàng từ dữ liệu người dùng gửi lên, kiểm tra mặt hàng có
 * tồn tại và tính lại thành tiền ở phía máy chủ.
 */
export async function dungDongHang(
  inputs: LineInput[],
  /**
   * Các dòng hàng cũ của phiếu (khi sửa phiếu). Số lượng thiếu và lịch sử bù
   * hàng được giữ lại theo mặt hàng — nếu không thì chỉ cần sửa một chi tiết nhỏ
   * là mất hết công nợ hàng thiếu của phiếu đó.
   */
  giuLai: LineItem[] = [],
): Promise<{ items: LineItem[]; tongTien: number }> {
  const items: LineItem[] = [];
  for (const input of inputs) {
    const p = await timSanPham(String(input.productId || ""));
    if (!p) throw new Error(`Không tìm thấy mặt hàng: ${input.productId}`);
    const soLuong = Math.round(Number(input.soLuong) || 0);
    if (soLuong <= 0) throw new Error(`Số lượng không hợp lệ cho "${p.ten}"`);
    const coGia = input.donGia !== undefined && input.donGia !== null && !Number.isNaN(Number(input.donGia));
    const donGia = coGia ? Math.max(0, Math.round(Number(input.donGia))) : p.giaBan;

    const cu = giuLai.find((x) => x.productId === p.id);
    items.push({
      productId: p.id,
      ma: p.ma,
      ten: p.ten,
      donViTinh: p.donViTinh,
      soLuong,
      donGia,
      thanhTien: soLuong * donGia,
      // Giảm số lượng trên phiếu thì phần thiếu cũng không thể vượt quá số mới
      thieu: Math.min(Math.max(0, Math.round(Number(cu?.thieu) || 0)), soLuong),
      bu: Array.isArray(cu?.bu) ? cu.bu : [],
    });
  }
  if (items.length === 0) throw new Error("Phiếu phải có ít nhất một mặt hàng");
  return { items, tongTien: items.reduce((s, i) => s + i.thanhTien, 0) };
}
