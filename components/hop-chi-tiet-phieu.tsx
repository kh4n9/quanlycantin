"use client";

import { useEffect, useState } from "react";
import { apiClient, type DuLieuPhieu } from "@/lib/client";
import { ngayVN, so, tien } from "@/lib/format";
import { useStore } from "@/lib/store";
import { conThieu, daBu, phieuConThieu } from "@/lib/thieu-hang";
import type { CanPhamGoiY, Order, Product } from "@/lib/types";
import { HopThieuHang } from "./hop-thieu-hang";
import { PhieuBanForm } from "./phieu-ban-form";
import { useInPhieu } from "./print";
import { bao, baoLoi, BieuTuong, HopThoai, Nhan, Nut, Trong } from "./ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

function OSo({ nhan, giaTri }: { nhan: string; giaTri: string }) {
  return (
    <div className="rounded-md border border-ke bg-giay px-3 py-2">
      <div className="font-mono text-[9.5px] tracking-[0.1em] text-muc-mo uppercase">{nhan}</div>
      <div className="so mt-1 text-[14px] font-semibold text-muc">{giaTri}</div>
    </div>
  );
}

/**
 * Hộp chi tiết phiếu dùng chung cho các màn hình.
 *
 * Hiển thị đầy đủ hàng trên phiếu, phần còn thiếu / đã bù và cho phép bù hàng
 * hoặc sửa phiếu ngay tại chỗ. Nơi gọi chỉ cần truyền mã phiếu (hoặc nguyên
 * phiếu đã có sẵn) và hàm đóng; sau khi bù/sửa, `onThayDoi` được gọi để màn
 * hình phía sau tải lại số liệu.
 */
export function HopChiTietPhieu({
  orderId,
  banDau = null,
  onDong,
  onThayDoi,
  choIn = true,
}: {
  orderId: string | null;
  /** Phiếu đã có sẵn trong danh sách, dùng để mở tức thì không cần gọi API. */
  banDau?: Order | null;
  onDong: () => void;
  onThayDoi?: (o: Order) => void;
  choIn?: boolean;
}) {
  const { coQuyen } = useStore();
  const { xemTruoc } = useInPhieu();
  const duocSua = coQuyen("sua_phieu");

  const [phieu, setPhieu] = useState<Order | null>(() =>
    orderId && banDau && banDau.id === orderId ? banDau : null,
  );
  // Chỉ tải từ API khi chưa có sẵn phiếu trong danh sách. Nơi gọi key theo id
  // phiếu nên mỗi lần mở là một lần mount mới, không cần đồng bộ state bằng effect.
  const [dangTai, setDangTai] = useState(
    () => Boolean(orderId) && !(banDau && banDau.id === orderId),
  );
  const [loi, setLoi] = useState("");

  const [moThieu, setMoThieu] = useState(false);
  const [moSua, setMoSua] = useState(false);
  const [sanPham, setSanPham] = useState<Product[]>([]);
  const [goiY, setGoiY] = useState<CanPhamGoiY[]>([]);
  const [daTaiDanhMuc, setDaTaiDanhMuc] = useState(false);
  const [dangTaiDanhMuc, setDangTaiDanhMuc] = useState(false);

  useEffect(() => {
    if (!orderId || (banDau && banDau.id === orderId)) return;

    let huy = false;
    apiClient
      .layPhieuBan(orderId)
      .then((kq) => {
        if (!huy) setPhieu(kq.order);
      })
      .catch((e) => {
        if (!huy) {
          setPhieu(null);
          setLoi((e as Error).message);
        }
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });

    return () => {
      huy = true;
    };
  }, [orderId, banDau]);

  const moSuaPhieu = async () => {
    if (!phieu) return;
    setMoSua(true);
    if (daTaiDanhMuc) return;

    setDangTaiDanhMuc(true);
    try {
      const [sp, cp] = await Promise.all([apiClient.products(), apiClient.canPham()]);
      setSanPham(sp.products);
      setGoiY(cp.canPham);
      setDaTaiDanhMuc(true);
    } catch (e) {
      setMoSua(false);
      baoLoi((e as Error).message);
    } finally {
      setDangTaiDanhMuc(false);
    }
  };

  const luuSua = async (duLieu: DuLieuPhieu) => {
    if (!phieu) return;
    const kq = await apiClient.suaPhieuBan(phieu.id, duLieu);
    setPhieu(kq.order);
    setMoSua(false);
    onThayDoi?.(kq.order);
    bao(`Đã cập nhật phiếu ${kq.order.soPhieu}`);
  };

  const capNhatThieu = (o: Order) => {
    setPhieu(o);
    onThayDoi?.(o);
  };

  const tongThieu = phieu ? phieuConThieu(phieu) : 0;
  const tongDaBu = phieu ? phieu.items.reduce((s, i) => s + daBu(i), 0) : 0;
  const tongLuong = phieu ? phieu.items.reduce((s, i) => s + i.soLuong, 0) : 0;
  const coTien = Boolean(phieu && (phieu.tongTien > 0 || phieu.items.some((i) => i.thanhTien > 0)));
  const lichSuBu = phieu
    ? phieu.items.flatMap((i, idx) =>
        (i.bu ?? []).map((b, j) => ({
          khoa: `${i.productId}-${idx}-${j}`,
          ten: i.ten,
          donViTinh: i.donViTinh,
          ...b,
        })),
      )
    : [];

  return (
    <>
      <HopThoai
        mo={orderId !== null}
        dong={onDong}
        tieuDe={phieu ? `Phiếu bán ${phieu.soPhieu}` : "Chi tiết phiếu"}
        rong="max-w-4xl"
        khoaEsc={moThieu || moSua}
        chanTrang={
          <>
            <Nut onClick={onDong}>Đóng</Nut>
            {choIn && phieu && (
              <Nut
                onClick={() => {
                  onDong();
                  xemTruoc(phieu);
                }}
              >
                <BieuTuong ten="in" className="h-4 w-4" /> In phiếu
              </Nut>
            )}
            {duocSua && phieu && tongThieu > 0 && (
              <Nut onClick={() => setMoThieu(true)} disabled={moSua}>
                <BieuTuong ten="canh" className="h-4 w-4" /> Bù hàng thiếu
              </Nut>
            )}
            {duocSua && phieu && (
              <Nut kieu="chinh" onClick={() => void moSuaPhieu()} disabled={moThieu || dangTaiDanhMuc}>
                <BieuTuong ten="sua" className="h-4 w-4" />
                {dangTaiDanhMuc ? "Đang mở…" : "Chỉnh sửa phiếu"}
              </Nut>
            )}
          </>
        }
      >
        {dangTai && <Trong tieuDe="Đang tải phiếu…" />}

        {!dangTai && loi && (
          <div className="rounded-md border border-dau/30 bg-dau-nhat px-3 py-2.5 text-[13px] text-dau">{loi}</div>
        )}

        {!dangTai && phieu && (
          <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-ke-dam bg-giay text-muc-nhat">
                  <BieuTuong ten="phieu" />
                </span>
                <div className="min-w-0">
                  <div className="so text-[11.5px] font-semibold text-muc">{phieu.soPhieu}</div>
                  <div className="truncate font-serif text-[17px] font-semibold tracking-[-0.01em] text-muc">
                    {phieu.hoTen}
                  </div>
                  <div className="font-mono text-[10.5px] tracking-[0.02em] text-muc-mo">
                    {[
                      phieu.namSinh ? `SN ${phieu.namSinh}` : "",
                      phieu.buongGiam || "",
                      `Ngày bán ${ngayVN(phieu.ngay)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {tongThieu > 0 ? (
                  <Nhan sac="vang">Còn thiếu {so(tongThieu)} đơn vị</Nhan>
                ) : (
                  <Nhan sac="luc">Đã giao đủ</Nhan>
                )}
                {phieu.kiemLuc ? (
                  <Nhan sac={phieu.kiemGhiChu ? "vang" : "luc"}>
                    {phieu.kiemGhiChu ? "Đã kiểm — có sai sót" : "Đã kiểm"}
                  </Nhan>
                ) : (
                  <Nhan>Chưa kiểm</Nhan>
                )}
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-2 ${coTien ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              <OSo nhan="Mặt hàng" giaTri={so(phieu.items.length)} />
              <OSo nhan="Lượng hàng" giaTri={so(tongLuong)} />
              {coTien && <OSo nhan="Tổng tiền" giaTri={tien(phieu.tongTien)} />}
              <OSo nhan="Còn thiếu" giaTri={`${so(tongThieu)}${tongDaBu ? ` · bù ${so(tongDaBu)}` : ""}`} />
            </div>

            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-serif text-[15px] font-semibold text-muc">Mặt hàng trên phiếu</h4>
                <span className="font-mono text-[9.5px] tracking-[0.03em] text-muc-mo uppercase">
                  {tongThieu > 0 ? "Dòng còn thiếu được tô vàng" : "Không còn hàng thiếu"}
                </span>
              </div>
              <div className="mem-cuon overflow-auto rounded-sm border border-ke">
                <Table className="w-full min-w-[680px] border-collapse text-[13px]">
                  <TableHeader className="sticky top-0 z-10 bg-giay font-mono text-[9.5px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur">
                    <TableRow className="[&>th]:border-b [&>th]:border-ke [&>th]:px-3 [&>th]:py-2 [&>th]:font-medium">
                      <TableHead className="w-8 text-center">#</TableHead>
                      <TableHead>Mặt hàng</TableHead>
                      <TableHead className="w-14">ĐVT</TableHead>
                      <TableHead className="w-16 text-right">SL</TableHead>
                      {coTien && <TableHead className="w-24 text-right">Đơn giá</TableHead>}
                      {coTien && <TableHead className="w-28 text-right">Thành tiền</TableHead>}
                      <TableHead className="w-20 text-right">Còn thiếu</TableHead>
                      <TableHead className="w-16 text-right">Đã bù</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phieu.items.map((i, idx) => {
                      const con = conThieu(i);
                      const bu = daBu(i);
                      return (
                        <TableRow
                          key={`${i.productId}-${idx}`}
                          className={`[&>td]:border-b [&>td]:border-ke/60 [&>td]:px-3 [&>td]:py-1.5 ${
                            con > 0 ? "bg-moc-nhat/45" : ""
                          }`}
                        >
                          <TableCell className="text-center font-mono text-[10px] text-muc-mo">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium text-muc">{i.ten}</div>
                            <div className="font-mono text-[10px] tracking-[0.01em] text-muc-mo">{i.ma}</div>
                          </TableCell>
                          <TableCell className="text-[12px] text-muc-nhat">{i.donViTinh}</TableCell>
                          <TableCell className="so text-right text-[12.5px] text-muc">{so(i.soLuong)}</TableCell>
                          {coTien && <TableCell className="so text-right text-[12px] text-muc-nhat">{so(i.donGia)}</TableCell>}
                          {coTien && (
                            <TableCell className="so text-right text-[12px] text-muc-nhat">{so(i.thanhTien)}</TableCell>
                          )}
                          <TableCell className="text-right">
                            {con > 0 ? (
                              <span className="so inline-block rounded-sm border border-moc/30 bg-moc-nhat px-1.5 py-0.5 text-[11.5px] font-semibold text-moc">
                                {so(con)}
                              </span>
                            ) : (
                              <span className="so text-[12px] text-muc-mo">—</span>
                            )}
                          </TableCell>
                          <TableCell className="so text-right text-[12px] text-ngoc">{bu || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {lichSuBu.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h4 className="font-serif text-[15px] font-semibold text-muc">Các lần bù hàng</h4>
                  <span className="font-mono text-[9.5px] tracking-[0.03em] text-muc-mo uppercase">
                    {so(lichSuBu.length)} lần
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {lichSuBu.map((b) => (
                    <div
                      key={b.khoa}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm border border-ke bg-giay px-3 py-1.5 text-[12px]"
                    >
                      <span className="font-medium text-muc">{b.ten}</span>
                      <span className="so text-[11px] text-ngoc">
                        bù {so(b.soLuong)} {b.donViTinh}
                      </span>
                      <span className="font-mono text-[10.5px] text-muc-nhat">{ngayVN(b.ngay)}</span>
                      {b.ghiChu && <span className="text-muc-nhat">· {b.ghiChu}</span>}
                      {b.boi && <span className="ml-auto text-[11px] text-muc-mo">bởi {b.boi}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(phieu.ghiChu || phieu.kiemGhiChu) && (
              <div className="grid gap-2 sm:grid-cols-2">
                {phieu.ghiChu && (
                  <div className="rounded-sm border border-ke bg-giay px-3 py-2">
                    <div className="nhan-muc">Ghi chú phiếu</div>
                    <div className="mt-0.5 whitespace-pre-wrap text-[12.5px] text-muc-nhat">{phieu.ghiChu}</div>
                  </div>
                )}
                {phieu.kiemGhiChu && (
                  <div className="rounded-sm border border-moc/30 bg-moc-nhat px-3 py-2">
                    <div className="nhan-muc text-moc">Ghi chú kiểm{phieu.kiemBoi ? ` · ${phieu.kiemBoi}` : ""}</div>
                    <div className="mt-0.5 whitespace-pre-wrap text-[12.5px] text-muc">{phieu.kiemGhiChu}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </HopThoai>

      {moThieu && phieu && (
        <HopThieuHang
          key={phieu.id}
          phieu={phieu}
          dong={() => setMoThieu(false)}
          onLuu={capNhatThieu}
        />
      )}

      {moSua && phieu && (
        <HopThoai
          mo
          dong={() => setMoSua(false)}
          tieuDe={`Chỉnh sửa phiếu ${phieu.soPhieu}`}
          rong="max-w-5xl"
        >
          <div className="max-h-[76vh] overflow-y-auto pr-1">
            <PhieuBanForm
              banDau={phieu}
              sanPham={sanPham}
              goiY={goiY}
              onLuu={luuSua}
              onHuy={() => setMoSua(false)}
              nhanLuu="Lưu thay đổi"
              trongHopThoai
            />
          </div>
        </HopThoai>
      )}
    </>
  );
}
