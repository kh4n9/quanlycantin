import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COL, KHONG_LAY_ID, getDb } from "./mongo";
import { chuanHoaQuyen, type Quyen } from "./quyen";
import type { NguoiDung, NguoiDungCongKhai } from "./types";

const scryptAsync = promisify(scrypt);

const TEN_COOKIE = "phien";
const HAN_PHIEN_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

/* --------------------------- Mật khẩu --------------------------- */

/** Băm mật khẩu bằng scrypt kèm muối ngẫu nhiên. Chuỗi lưu: scrypt$muối$băm */
export async function bamMatKhau(matKhau: string): Promise<string> {
  const muoi = randomBytes(16).toString("hex");
  const khoa = (await scryptAsync(matKhau, muoi, 64)) as Buffer;
  return `scrypt$${muoi}$${khoa.toString("hex")}`;
}

export async function kiemMatKhau(matKhau: string, daLuu: string): Promise<boolean> {
  const [kieu, muoi, bam] = (daLuu || "").split("$");
  if (kieu !== "scrypt" || !muoi || !bam) return false;
  const khoa = (await scryptAsync(matKhau, muoi, 64)) as Buffer;
  const mongDoi = Buffer.from(bam, "hex");
  if (mongDoi.length !== khoa.length) return false;
  return timingSafeEqual(khoa, mongDoi);
}

/* --------------------------- Phiên đăng nhập --------------------------- */

let biMatCache: string | null = null;

/**
 * Khoá ký phiên. Sinh một lần rồi lưu trong cơ sở dữ liệu để phiên còn hiệu lực
 * sau khi khởi động lại máy chủ.
 */
async function layBiMat(): Promise<string> {
  if (biMatCache) return biMatCache;
  const db = await getDb();
  const kq = await db
    .collection(COL.cauHinh)
    .findOneAndUpdate(
      { khoa: "phien" },
      { $setOnInsert: { khoa: "phien", biMat: randomBytes(32).toString("hex") } },
      { upsert: true, returnDocument: "after", projection: { _id: 0, biMat: 1 } },
    );
  biMatCache = String(kq?.biMat ?? "");
  if (!biMatCache) throw new Error("Không tạo được khoá ký phiên đăng nhập");
  return biMatCache;
}

function b64(s: Buffer | string): string {
  return Buffer.from(s).toString("base64url");
}

async function kyPhien(uid: string): Promise<string> {
  const het = Date.now() + HAN_PHIEN_MS;
  const noiDung = b64(JSON.stringify({ uid, het }));
  const chuKy = b64(createHmac("sha256", await layBiMat()).update(noiDung).digest());
  return `${noiDung}.${chuKy}`;
}

async function docPhien(token: string): Promise<{ uid: string } | null> {
  const [noiDung, chuKy] = (token || "").split(".");
  if (!noiDung || !chuKy) return null;
  const mongDoi = b64(createHmac("sha256", await layBiMat()).update(noiDung).digest());
  const a = Buffer.from(chuKy);
  const b = Buffer.from(mongDoi);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(noiDung, "base64url").toString()) as { uid?: string; het?: number };
    if (!payload.uid || !payload.het || payload.het < Date.now()) return null;
    return { uid: payload.uid };
  } catch {
    return null;
  }
}

/** Đặt cookie phiên. Bảo mật: chỉ máy chủ đọc được, không cho JS truy cập. */
export async function moPhien(uid: string): Promise<void> {
  const token = await kyPhien(uid);
  const kho = await cookies();
  kho.set(TEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(HAN_PHIEN_MS / 1000),
  });
}

export async function dongPhien(): Promise<void> {
  const kho = await cookies();
  kho.delete(TEN_COOKIE);
}

/* --------------------------- Người dùng --------------------------- */

export function congKhai(nd: NguoiDung): NguoiDungCongKhai {
  const { matKhauHash: _bo, ...con } = nd;
  return con;
}

export async function timNguoiDung(tenDangNhap: string): Promise<NguoiDung | null> {
  const db = await getDb();
  const doc = await db
    .collection(COL.nguoiDung)
    .findOne({ tenDangNhap: tenDangNhap.trim().toLowerCase() }, KHONG_LAY_ID);
  if (!doc) return null;
  return chuanHoaNguoiDung(doc as Record<string, unknown>);
}

export async function timNguoiDungTheoId(id: string): Promise<NguoiDung | null> {
  const db = await getDb();
  const doc = await db.collection(COL.nguoiDung).findOne({ id }, KHONG_LAY_ID);
  if (!doc) return null;
  return chuanHoaNguoiDung(doc as Record<string, unknown>);
}

export function chuanHoaNguoiDung(doc: Record<string, unknown>): NguoiDung {
  return {
    id: String(doc.id ?? ""),
    tenDangNhap: String(doc.tenDangNhap ?? ""),
    hoTen: String(doc.hoTen ?? ""),
    quyen: chuanHoaQuyen(doc.quyen),
    dangHoatDong: doc.dangHoatDong !== false,
    phaiDoiMatKhau: doc.phaiDoiMatKhau === true,
    matKhauHash: String(doc.matKhauHash ?? ""),
    lanDangNhapCuoi: String(doc.lanDangNhapCuoi ?? ""),
    createdAt: String(doc.createdAt ?? ""),
  };
}

/** Người dùng của phiên hiện tại, null nếu chưa đăng nhập. */
export async function nguoiDungHienTai(): Promise<NguoiDung | null> {
  const kho = await cookies();
  const token = kho.get(TEN_COOKIE)?.value;
  if (!token) return null;
  const phien = await docPhien(token);
  if (!phien) return null;
  const nd = await timNguoiDungTheoId(phien.uid);
  if (!nd || !nd.dangHoatDong) return null;
  return nd;
}

export const loiChuaDangNhap = () =>
  NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

export const loiKhongCoQuyen = (quyen: Quyen) =>
  NextResponse.json({ error: `Tài khoản không có quyền: ${quyen}` }, { status: 403 });

/**
 * Dùng trong các route API:
 *
 *   const kq = await yeuCau("ban_hang");
 *   if ("res" in kq) return kq.res;
 *   // kq.nd là người dùng đã đăng nhập và đủ quyền
 */
export async function yeuCau(quyen?: Quyen): Promise<{ nd: NguoiDung } | { res: NextResponse }> {
  const nd = await nguoiDungHienTai();
  if (!nd) return { res: loiChuaDangNhap() };
  if (quyen && !nd.quyen.includes(quyen)) return { res: loiKhongCoQuyen(quyen) };
  return { nd };
}
