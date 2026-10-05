import { COL, getDb } from "./mongo";
import { newId } from "./db";
import type { Product } from "./types";

/** [mã, tên, nhóm, đơn vị tính, giá bán] */
const HANG_MAU: [string, string, string, string, number][] = [
  ["MI-001", "Mì tôm Hảo Hảo", "Thực phẩm", "gói", 5000],
  ["MI-002", "Mì tôm Cung Đình", "Thực phẩm", "gói", 4800],
  ["GA-001", "Gạo tẻ", "Thực phẩm", "kg", 18000],
  ["NU-001", "Nước ngọt Coca 330ml", "Đồ uống", "lon", 10000],
  ["NU-002", "Nước suối Aquafina 500ml", "Đồ uống", "chai", 5000],
  ["NU-003", "Trà xanh Không Độ", "Đồ uống", "chai", 10000],
  ["CA-001", "Cà phê G7 3in1", "Đồ uống", "gói", 4500],
  ["SU-001", "Sữa đặc Ông Thọ", "Sữa", "hộp", 22000],
  ["SU-002", "Sữa tươi Vinamilk 180ml", "Sữa", "hộp", 9000],
  ["BK-001", "Bánh quy Cosy", "Bánh kẹo", "gói", 15000],
  ["BK-002", "Kẹo dừa", "Bánh kẹo", "gói", 10000],
  ["TH-001", "Thuốc lá Thăng Long", "Thuốc lá", "bao", 25000],
  ["TH-002", "Thuốc lá Sài Gòn", "Thuốc lá", "bao", 26000],
  ["VS-001", "Xà phòng Lifebuoy", "Đồ dùng", "bánh", 12000],
  ["VS-002", "Kem đánh răng PS", "Đồ dùng", "tuýp", 19000],
  ["VS-003", "Bàn chải đánh răng", "Đồ dùng", "cái", 11000],
  ["VS-004", "Dầu gội Clear gói", "Đồ dùng", "gói", 4000],
  ["VS-005", "Giấy vệ sinh", "Đồ dùng", "cuộn", 7000],
  ["GI-001", "Nước mắm Nam Ngư 500ml", "Gia vị", "chai", 27000],
  ["GI-002", "Muối i-ốt", "Gia vị", "gói", 4000],
  ["GI-003", "Đường cát trắng", "Gia vị", "kg", 22000],
  ["GI-004", "Bột ngọt Ajinomoto", "Gia vị", "gói", 13000],
  ["MA-001", "Áo thun", "May mặc", "cái", 60000],
  ["MA-002", "Quần đùi", "May mặc", "cái", 55000],
  ["MA-003", "Dép nhựa", "May mặc", "đôi", 28000],
];

/** Thay danh mục mặt hàng bằng bộ dữ liệu mẫu. Phiếu bán đã lập giữ nguyên. */
export async function napDuLieuMau(): Promise<{ soHang: number }> {
  const db = await getDb();
  const now = new Date().toISOString();
  const ds: Product[] = HANG_MAU.map(([ma, ten, nhom, donViTinh, giaBan]) => ({
    id: newId("sp"),
    ma,
    ten,
    nhom,
    donViTinh,
    giaBan,
    dangDung: true,
    ghiChu: "",
    createdAt: now,
  }));
  await db.collection(COL.sanPham).deleteMany({});
  await db.collection(COL.sanPham).insertMany(ds);
  return { soHang: ds.length };
}
