"use client";

import type { BaoCao } from "@/lib/client";
import { ngayVN, so } from "@/lib/format";
import { MAU_IN_THIEU_MAC_DINH } from "@/lib/mau-in";
import type { KieuInThieu, MauInThieu } from "@/lib/types";

type Dong = BaoCao["thieuTheoPhieu"][number];

/* ------------------------------ Gom nhóm ------------------------------ */

/** Gom theo mặt hàng — dùng khi hàng về đợt nào thì biết phát cho ai. */
function gomTheoMon(ds: Dong[]) {
  const m = new Map<string, { ten: string; ma: string; donViTinh: string; dong: Dong[]; tong: number }>();
  for (const r of ds) {
    const khoa = r.ma || r.ten;
    const cu = m.get(khoa) || { ten: r.ten, ma: r.ma, donViTinh: r.donViTinh, dong: [], tong: 0 };
    cu.dong.push(r);
    cu.tong += r.conThieu;
    m.set(khoa, cu);
  }
  return [...m.values()].sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
}

/** Gom mỗi can phạm một dòng, kèm hết các món còn thiếu của người đó. */
function gomTheoNguoi(ds: Dong[]) {
  const m = new Map<string, { hoTen: string; buongGiam: string; dong: Dong[]; tong: number }>();
  for (const r of ds) {
    const khoa = `${r.buongGiam}||${r.hoTen}`;
    const cu = m.get(khoa) || { hoTen: r.hoTen, buongGiam: r.buongGiam, dong: [], tong: 0 };
    cu.dong.push(r);
    cu.tong += r.conThieu;
    m.set(khoa, cu);
  }
  // Buồng để trống xếp cuối; so sánh kiểu số để B2 đứng trước B12
  return [...m.values()].sort((a, b) => {
    if (!a.buongGiam && b.buongGiam) return 1;
    if (a.buongGiam && !b.buongGiam) return -1;
    const theoBuong = a.buongGiam.localeCompare(b.buongGiam, "vi", { numeric: true });
    return theoBuong !== 0 ? theoBuong : a.hoTen.localeCompare(b.hoTen, "vi");
  });
}

/* ------------------------------ Nội dung in ------------------------------ */

const oDem = { textAlign: "center" as const };
const oTien = { textAlign: "right" as const };

export function PhieuThieu({
  du,
  settings,
  tu,
  den,
  mau = MAU_IN_THIEU_MAC_DINH,
  kieuIn,
}: {
  du: BaoCao;
  settings: { tenDonVi: string; diaChi: string };
  tu: string;
  den: string;
  mau?: MauInThieu;
  /** Kiểu sắp; bỏ trống thì dùng kiểu đã lưu trong mẫu */
  kieuIn?: KieuInThieu;
}) {
  const kieu = kieuIn ?? mau.kieuIn;
  const { nhan, hien } = mau;
  const ds = du.thieuTheoPhieu;

  /** Ô "Ký nhận" để trống cho can phạm ký khi nhận hàng */
  const oKyNhan = hien.cotKyNhan ? <th style={{ width: "12%" }}>{nhan.kyNhan}</th> : null;
  const oKyNhanRong = hien.cotKyNhan ? <td /> : null;

  return (
    <div className="phieu-in">
      <div style={{ textAlign: "center", lineHeight: 1.35 }}>
        <div style={{ fontWeight: 700, textTransform: "uppercase" }}>
          {settings.tenDonVi || "CĂN TIN PHẠM NHÂN"}
        </div>
        {settings.diaChi ? <div style={{ fontSize: "11pt" }}>{settings.diaChi}</div> : null}
      </div>
      <div style={{ height: 14 }} />

      <h1 style={{ textAlign: "center", fontSize: "16pt", fontWeight: 700, margin: 0, textTransform: "uppercase" }}>
        {mau.tieuDe}
      </h1>
      <div style={{ textAlign: "center", fontSize: "12pt", marginBottom: 4 }}>
        Từ {ngayVN(tu)} đến {ngayVN(den)}
      </div>
      <div style={{ textAlign: "center", fontSize: "11pt", marginBottom: 12 }}>
        {so(du.tongQuan.soPhieuThieu)} phiếu · {so(du.tongQuan.tongLuongThieu)} đơn vị chưa giao
      </div>

      {kieu === "theo_buong" && (
        <table>
          <thead>
            <tr>
              {hien.buongGiam && <th style={{ width: "10%" }}>{nhan.buongGiam}</th>}
              {hien.soPhieu && <th style={{ width: "14%" }}>{nhan.soPhieu}</th>}
              {hien.ngayBan && <th style={{ width: "11%" }}>{nhan.ngayBan}</th>}
              <th>{nhan.hoTen}</th>
              <th>{nhan.matHang}</th>
              {hien.donViTinh && <th style={{ width: "8%" }}>{nhan.donViTinh}</th>}
              <th style={{ width: "10%" }}>{nhan.conThieu}</th>
              {hien.ghiChu && <th style={{ width: "16%" }}>{nhan.ghiChu}</th>}
              {oKyNhan}
            </tr>
          </thead>
          <tbody>
            {ds.map((r, i) => (
              <tr key={`${r.soPhieu}-${r.ma}-${i}`}>
                {hien.buongGiam && <td style={oDem}>{r.buongGiam || "—"}</td>}
                {hien.soPhieu && <td style={{ ...oDem, fontFamily: "monospace", fontSize: "11pt" }}>{r.soPhieu}</td>}
                {hien.ngayBan && <td style={oDem}>{ngayVN(r.ngay)}</td>}
                <td>{r.hoTen}</td>
                <td>{r.ten}</td>
                {hien.donViTinh && <td style={oDem}>{r.donViTinh}</td>}
                <td style={oTien}>{so(r.conThieu)}</td>
                {hien.ghiChu && <td style={{ fontSize: "11pt" }}>{r.ghiChu}</td>}
                {oKyNhanRong}
              </tr>
            ))}
            {hien.dongTong && (
              <tr>
                <td colSpan={4 + (hien.buongGiam ? 1 : 0) + (hien.soPhieu ? 1 : 0) + (hien.ngayBan ? 1 : 0) + (hien.donViTinh ? 1 : 0)} style={{ ...oTien, fontWeight: 700 }}>
                  {nhan.tongCong}
                </td>
                <td style={{ ...oTien, fontWeight: 700 }}>{so(du.tongQuan.tongLuongThieu)}</td>
                {hien.ghiChu && <td />}
                {oKyNhanRong}
              </tr>
            )}
          </tbody>
        </table>
      )}

      {kieu === "theo_mon" && (
        <table>
          <thead>
            <tr>
              <th>{nhan.matHang}</th>
              {hien.donViTinh && <th style={{ width: "8%" }}>{nhan.donViTinh}</th>}
              {hien.buongGiam && <th style={{ width: "10%" }}>{nhan.buongGiam}</th>}
              <th style={{ width: "22%" }}>{nhan.hoTen}</th>
              {hien.soPhieu && <th style={{ width: "14%" }}>{nhan.soPhieu}</th>}
              <th style={{ width: "10%" }}>{nhan.conThieu}</th>
              {hien.ghiChu && <th style={{ width: "15%" }}>{nhan.ghiChu}</th>}
              {oKyNhan}
            </tr>
          </thead>
          <tbody>
            {gomTheoMon(ds).map((nhom) => (
              <>
                {nhom.dong.map((r, i) => (
                  <tr key={`${nhom.ma}-${r.soPhieu}-${i}`}>
                    <td>{i === 0 ? nhom.ten : ""}</td>
                    {hien.donViTinh && <td style={oDem}>{i === 0 ? nhom.donViTinh : ""}</td>}
                    {hien.buongGiam && <td style={oDem}>{r.buongGiam || "—"}</td>}
                    <td>{r.hoTen}</td>
                    {hien.soPhieu && <td style={{ ...oDem, fontFamily: "monospace", fontSize: "11pt" }}>{r.soPhieu}</td>}
                    <td style={oTien}>{so(r.conThieu)}</td>
                    {hien.ghiChu && <td style={{ fontSize: "11pt" }}>{r.ghiChu}</td>}
                    {oKyNhanRong}
                  </tr>
                ))}
                {/* Dòng tổng của từng món — để biết đợt hàng này cần bao nhiêu */}
                <tr key={`tong-${nhom.ma}`}>
                  <td colSpan={(hien.donViTinh ? 1 : 0) + (hien.buongGiam ? 1 : 0) + 1 + (hien.soPhieu ? 1 : 0)} style={{ ...oTien, fontWeight: 700 }}>
                    Cộng {nhom.ten}
                  </td>
                  <td style={{ ...oTien, fontWeight: 700 }}>{so(nhom.tong)}</td>
                  {hien.ghiChu && <td />}
                  {oKyNhanRong}
                </tr>
              </>
            ))}
            {hien.dongTong && (
              <tr>
                <td
                  colSpan={1 + (hien.donViTinh ? 1 : 0) + (hien.buongGiam ? 1 : 0) + 1 + (hien.soPhieu ? 1 : 0)}
                  style={{ ...oTien, fontWeight: 700 }}
                >
                  {nhan.tongCong}
                </td>
                <td style={{ ...oTien, fontWeight: 700 }}>{so(du.tongQuan.tongLuongThieu)}</td>
                {hien.ghiChu && <td />}
                {oKyNhanRong}
              </tr>
            )}
          </tbody>
        </table>
      )}

      {kieu === "gop_nguoi" && (
        <table>
          <thead>
            <tr>
              {hien.buongGiam && <th style={{ width: "11%" }}>{nhan.buongGiam}</th>}
              <th style={{ width: "24%" }}>{nhan.hoTen}</th>
              <th>{nhan.cacMon}</th>
              {hien.donViTinh && <th style={{ width: "8%" }}>{nhan.donViTinh}</th>}
              <th style={{ width: "10%" }}>{nhan.conThieu}</th>
              {oKyNhan}
            </tr>
          </thead>
          <tbody>
            {gomTheoNguoi(ds).map((n) => {
              // Mỗi món một dòng trong ô, để nhìn là biết còn nợ những gì
              const dsMon = n.dong.map((r) => `${r.ten} ×${so(r.conThieu)}`).join("; ");
              const dvts = [...new Set(n.dong.map((r) => r.donViTinh).filter(Boolean))].join(", ");
              const coGhiChu = n.dong.map((r) => r.ghiChu).filter(Boolean);
              return (
                <tr key={`${n.buongGiam}-${n.hoTen}`}>
                  {hien.buongGiam && <td style={oDem}>{n.buongGiam || "—"}</td>}
                  <td>{n.hoTen}</td>
                  <td style={{ fontSize: "11pt" }}>
                    {dsMon}
                    {hien.ghiChu && coGhiChu.length > 0 ? (
                      <div style={{ fontStyle: "italic", fontSize: "10pt" }}>({coGhiChu.join("; ")})</div>
                    ) : null}
                  </td>
                  {hien.donViTinh && <td style={oDem}>{dvts}</td>}
                  <td style={oTien}>{so(n.tong)}</td>
                  {oKyNhanRong}
                </tr>
              );
            })}
            {hien.dongTong && (
              <tr>
                <td colSpan={(hien.buongGiam ? 1 : 0) + 2 + (hien.donViTinh ? 1 : 0)} style={{ ...oTien, fontWeight: 700 }}>
                  {nhan.tongCong}
                </td>
                <td style={{ ...oTien, fontWeight: 700 }}>{so(du.tongQuan.tongLuongThieu)}</td>
                {oKyNhanRong}
              </tr>
            )}
          </tbody>
        </table>
      )}

      {mau.chuKy.length > 0 && (
        <KhoiChuKy chuKy={mau.chuKy} soCotChuKy={mau.soCotChuKy} />
      )}
    </div>
  );
}

function KhoiChuKy({
  chuKy,
  soCotChuKy,
}: {
  chuKy: { nhan: string; ghiChu: string }[];
  soCotChuKy: number;
}) {
  const hang: typeof chuKy[] = [];
  for (let i = 0; i < chuKy.length; i += soCotChuKy) hang.push(chuKy.slice(i, i + soCotChuKy));
  const oKhongVien = (them: React.CSSProperties = {}): React.CSSProperties => ({
    border: "none",
    textAlign: "center",
    padding: 2,
    ...them,
  });

  return (
    <>
      {hang.map((mot, i) => (
        <table key={i} style={{ width: "100%", marginTop: i === 0 ? 18 : 0, borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              {mot.map((c) => (
                <td key={c.nhan + i} style={oKhongVien({ fontWeight: 700, width: `${100 / soCotChuKy}%` })}>
                  {c.nhan}
                </td>
              ))}
            </tr>
            <tr>
              {mot.map((c) => (
                <td key={c.nhan + i} style={oKhongVien({ fontStyle: "italic", fontSize: "11pt" })}>
                  {c.ghiChu}
                </td>
              ))}
            </tr>
            <tr>
              {mot.map((c) => (
                <td key={c.nhan + i} style={oKhongVien({ height: 75 })} />
              ))}
            </tr>
          </tbody>
        </table>
      ))}
    </>
  );
}
