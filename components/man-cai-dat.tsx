"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/client";
import { so } from "@/lib/format";
import { useStore } from "@/lib/store";
import { ManMauIn } from "./man-mau-in";
import { ManMauInThieu } from "./man-mau-in-thieu";
import { bao, baoLoi, BieuTuong, Nut, ONhan, OText, The } from "./ui";
import { useNap } from "@/lib/use-nap";

export function ManCaiDat() {
  const { settings, capNhatSettings, napLai, coQuyen } = useStore();
  const duocSua = coQuyen("sua_cai_dat");
  const duocSuaHang = coQuyen("quan_ly_mat_hang");
  const [soHang, setSoHang] = useState(0);
  const [soPhieu, setSoPhieu] = useState(0);
  const [tenDonVi, setTenDonVi] = useState(settings.tenDonVi);
  const [diaChi, setDiaChi] = useState(settings.diaChi);
  const [nguoiLapPhieu, setNguoiLapPhieu] = useState(settings.nguoiLapPhieu);
  const [soNgayGiuThungRac, setSoNgayGiuThungRac] = useState(String(settings.soNgayGiuThungRac || 0));
  const [dangLuu, setDangLuu] = useState(false);
  const [dangNap, setDangNap] = useState(false);

  // Màn hình này chỉ mount sau khi StoreProvider đã nạp xong cài đặt, nên các ô
  // nhập lấy giá trị ban đầu trực tiếp từ settings là đủ.

  const demDuLieu = useCallback(async () => {
    try {
      const [sp, dh] = await Promise.all([apiClient.products(), apiClient.orders()]);
      setSoHang(sp.products.length);
      setSoPhieu(dh.orders.length);
    } catch {
      /* để trống, chỉ là số liệu cho biết */
    }
  }, []);

  useNap(demDuLieu);

  const luu = async () => {
    setDangLuu(true);
    try {
      await capNhatSettings({ tenDonVi, diaChi, nguoiLapPhieu });
      bao("Đã lưu thông tin đơn vị");
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  };

  const luuThungRac = async () => {
    const soNgay = Math.max(0, Math.round(Number(soNgayGiuThungRac) || 0));
    setDangLuu(true);
    try {
      await capNhatSettings({ soNgayGiuThungRac: soNgay });
      bao(
        soNgay > 0
          ? `Đã đặt: phiếu trong thùng rác quá ${soNgay} ngày sẽ bị xoá vĩnh viễn`
          : "Đã tắt tự xoá — phiếu trong thùng rác được giữ mãi",
      );
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangLuu(false);
    }
  };

  const napMau = async () => {
    const coDuLieu = soHang > 0;
    if (
      coDuLieu &&
      !window.confirm(
        "Đang có mặt hàng. Nạp dữ liệu mẫu sẽ GHI ĐÈ toàn bộ danh mục mặt hàng hiện có.\n\nCác phiếu bán đã lập vẫn được giữ lại. Tiếp tục?",
      )
    ) {
      return;
    }
    setDangNap(true);
    try {
      const kq = await apiClient.napDuLieuMau(coDuLieu);
      bao(`Đã nạp ${kq.soHang} mặt hàng mẫu`);
      await Promise.all([napLai(), demDuLieu()]);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangNap(false);
    }
  };

  const xoaHet = async () => {
    const buoc1 = window.confirm(
      "XOÁ SẠCH toàn bộ mặt hàng và phiếu bán?\n\nThao tác này không thể hoàn tác và không xoá được tài khoản. Nên bấm “Tải file sao lưu” trước khi xoá.",
    );
    if (!buoc1) return;
    if (!window.confirm("Chắc chắn xoá hết? Đây là lần xác nhận cuối.")) return;
    setDangNap(true);
    try {
      const kq = await apiClient.xoaHetDuLieu();
      bao(`Đã xoá ${kq.soHang} mặt hàng và ${kq.soPhieu} phiếu bán`);
      await Promise.all([napLai(), demDuLieu()]);
    } catch (e) {
      baoLoi((e as Error).message);
    } finally {
      setDangNap(false);
    }
  };

  const saoLuu = async () => {
    try {
      const [sp, dh] = await Promise.all([apiClient.products(), apiClient.orders()]);
      const duLieu = {
        thoiDiem: new Date().toISOString(),
        products: sp.products,
        orders: dh.orders,
      };
      const blob = new Blob([JSON.stringify(duLieu, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sao-luu-cantin_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      bao("Đã tải file sao lưu");
    } catch (e) {
      baoLoi((e as Error).message);
    }
  };

  return (
    <div className="flex max-w-5xl flex-col gap-3">
      {/* Mục lục nhỏ: nhảy nhanh tới ô cần sửa thay vì cuộn qua cả trang */}
      <nav
        aria-label="Mục trong phần cài đặt"
        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-ke bg-giay-cao px-3 py-2 shadow-the"
      >
        <span className="nhan-muc mr-1">Trong trang này</span>
        {[
          ["#cd-don-vi", "Đơn vị"],
          ["#cd-mau-in", "Mẫu phiếu in"],
          ["#cd-mau-thieu", "Mẫu danh sách thiếu"],
          ["#cd-thung-rac", "Thùng rác"],
          ["#cd-du-lieu", "Dữ liệu"],
          ["#cd-phim-tat", "Phím tắt"],
        ].map(([href, nhan]) => (
          <a
            key={href}
            href={href}
            className="rounded-sm border border-ke-dam bg-white px-2 py-0.5 font-mono text-[10.5px] tracking-[0.02em] text-muc-nhat transition hover:border-muc/40 hover:text-muc"
          >
            {nhan}
          </a>
        ))}
      </nav>

      <div id="cd-don-vi" className="scroll-mt-24">
        <The so="01" tieuDe="Thông tin đơn vị" phuDe="In ở phần đầu của phiếu bán">
          <div className="grid gap-3 p-4">
            <div>
              <ONhan>Tên đơn vị</ONhan>
              <OText
                value={tenDonVi}
                onChange={(e) => setTenDonVi(e.target.value)}
                placeholder="Ví dụ: TRẠI GIAM X — CĂN TIN PHẠM NHÂN"
              />
            </div>
            <div>
              <ONhan>Địa chỉ / dòng phụ</ONhan>
              <OText value={diaChi} onChange={(e) => setDiaChi(e.target.value)} placeholder="Không bắt buộc" />
            </div>
            <div>
              <ONhan>Người lập phiếu (mặc định)</ONhan>
              <OText
                value={nguoiLapPhieu}
                onChange={(e) => setNguoiLapPhieu(e.target.value)}
                placeholder="Không bắt buộc"
              />
            </div>
            <div className="flex items-center gap-3">
              <Nut kieu="chinh" onClick={() => void luu()} disabled={dangLuu || !duocSua}>
                {dangLuu ? "Đang lưu…" : "Lưu thông tin"}
              </Nut>
              {!duocSua && <span className="text-[12px] text-muc-mo">Tài khoản của bạn không có quyền sửa cài đặt.</span>}
            </div>
          </div>
        </The>
      </div>

      <div id="cd-mau-in" className="scroll-mt-24">
        <ManMauIn />
      </div>

      <div id="cd-mau-thieu" className="scroll-mt-24">
        <ManMauInThieu />
      </div>

      <div id="cd-thung-rac" className="scroll-mt-24">
        <The so="04" tieuDe="Thùng rác" phuDe="Phiếu bị xoá vẫn phục hồi được cho tới khi quá hạn này">
          <div className="grid gap-3 p-4">
            <div className="max-w-xs">
              <ONhan>Số ngày giữ phiếu trong thùng rác</ONhan>
              <OText
                type="number"
                min={0}
                value={soNgayGiuThungRac}
                onChange={(e) => setSoNgayGiuThungRac(e.target.value)}
                disabled={!duocSua}
                placeholder="0"
              />
            </div>
            <p className="text-[12px] text-muc-nhat">
              Để <b className="font-semibold text-muc">0</b> nghĩa là giữ mãi, không tự xoá. Đặt số ngày cụ thể thì
              phiếu nằm trong thùng rác quá số ngày đó sẽ bị{" "}
              <b className="font-semibold text-muc">xoá vĩnh viễn, không lấy lại được</b>.
            </p>
            <p className="text-[12px] text-muc-mo">
              Việc dọn dẹp chạy khi mở thùng rác hoặc khi khởi động lại máy chủ — không cần hẹn giờ riêng.
            </p>
            <div>
              <Nut kieu="chinh" onClick={() => void luuThungRac()} disabled={dangLuu || !duocSua}>
                {dangLuu ? "Đang lưu…" : "Lưu thiết lập thùng rác"}
              </Nut>
            </div>
          </div>
        </The>
      </div>

      <div id="cd-du-lieu" className="scroll-mt-24">
        <The so="05" tieuDe="Dữ liệu" phuDe="Toàn bộ dữ liệu được lưu trên MongoDB, nhiều máy cùng dùng chung">
          <div className="flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-baseline gap-1.5 rounded-md border border-ke bg-giay px-2.5 py-1.5">
                <b className="so text-[15px] font-semibold text-muc">{so(soHang)}</b>
                <span className="text-[11.5px] text-muc-nhat">mặt hàng</span>
              </span>
              <span className="inline-flex items-baseline gap-1.5 rounded-md border border-ke bg-giay px-2.5 py-1.5">
                <b className="so text-[15px] font-semibold text-muc">{so(soPhieu)}</b>
                <span className="text-[11.5px] text-muc-nhat">phiếu bán</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Nut onClick={() => void saoLuu()}>
                <BieuTuong ten="tai" /> Tải file sao lưu (JSON)
              </Nut>
              {duocSuaHang && (
                <Nut onClick={() => void napMau()} disabled={dangNap}>
                  <BieuTuong ten="them" />
                  {dangNap ? "Đang xử lý…" : "Nạp danh mục mặt hàng mẫu"}
                </Nut>
              )}
              {duocSua && (
                <Nut kieu="nguy" onClick={() => void xoaHet()} disabled={dangNap}>
                  <BieuTuong ten="xoa" /> Xoá sạch dữ liệu
                </Nut>
              )}
            </div>
            <p className="text-[12px] text-muc-mo">
              Nên sao lưu định kỳ: file tải về chứa toàn bộ mặt hàng và phiếu bán, dùng để đối chiếu hoặc khôi phục khi
              cần. Việc xoá sạch chỉ ảnh hưởng mặt hàng và phiếu bán — tài khoản và thông tin đơn vị vẫn giữ nguyên.
            </p>
          </div>
        </The>
      </div>

      <div id="cd-phim-tat" className="scroll-mt-24">
        <The so="06" tieuDe="Phím tắt" phuDe="Giúp nhập liệu nhanh hơn">
          <div className="grid gap-2 p-4 text-sm sm:grid-cols-2">
            {[
              ["Ctrl + Enter", "Lưu phiếu đang lập ở màn hình Bán hàng"],
              ["↑ / ↓", "Chọn mục trong danh sách gợi ý"],
              ["Enter", "Thêm mặt hàng đang chọn vào phiếu"],
              ["5 + dấu cách + tên", "Nhập nhanh số lượng, ví dụ “5 mì”"],
              ["Esc", "Đóng danh sách gợi ý / hộp thoại"],
              ["Alt + 1…9", "Chuyển nhanh giữa các mục đang thấy"],
              ["Ctrl + ↵ (Kiểm phiếu)", "Xác nhận phiếu đúng và sang phiếu kế tiếp"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start gap-2">
                <kbd className="rounded-sm border border-ke-dam bg-giay px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-muc">
                  {k}
                </kbd>
                <span className="text-muc-nhat">{v}</span>
              </div>
            ))}
          </div>
        </The>
      </div>
    </div>
  );
}
