"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient, LoiApi } from "./client";
import type { Quyen } from "./quyen";
import type { NguoiDungCongKhai, Settings } from "./types";

type StoreValue = {
  nguoiDung: NguoiDungCongKhai | null;
  settings: Settings;
  /** true khi đang kiểm tra phiên đăng nhập lần đầu */
  dangKhoiDong: boolean;
  loi: string;
  napLai: () => Promise<void>;
  capNhatSettings: (s: Partial<Settings>) => Promise<void>;
  /** Người dùng hiện tại có quyền này không */
  coQuyen: (q: Quyen) => boolean;
  /** Ghi đè người dùng sau khi tự đổi hồ sơ (ví dụ đổi mật khẩu xong) */
  datNguoiDung: (nd: NguoiDungCongKhai | null) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [nguoiDung, setNguoiDung] = useState<NguoiDungCongKhai | null>(null);
  const [settings, setSettings] = useState<Settings>({ tenDonVi: "", diaChi: "", nguoiLapPhieu: "" });
  const [dangKhoiDong, setDangKhoiDong] = useState(true);
  const [loi, setLoi] = useState("");

  const napLai = useCallback(async () => {
    try {
      const kq = await apiClient.toi();
      setNguoiDung(kq.nguoiDung);
      setSettings(kq.caiDat);
      setLoi("");
    } catch (e) {
      // 401 là chưa đăng nhập, không phải lỗi hệ thống
      if (e instanceof LoiApi && e.ma === 401) {
        setNguoiDung(null);
        setLoi("");
      } else {
        setLoi((e as Error).message);
      }
    } finally {
      setDangKhoiDong(false);
    }
  }, []);

  const capNhatSettings = useCallback(async (s: Partial<Settings>) => {
    const kq = await apiClient.luuSettings(s);
    setSettings(kq.settings);
  }, []);

  const datNguoiDung = useCallback((nd: NguoiDungCongKhai | null) => {
    setNguoiDung(nd);
  }, []);

  const coQuyen = useCallback((q: Quyen) => Boolean(nguoiDung?.quyen.includes(q)), [nguoiDung]);

  useEffect(() => {
    void napLai();
  }, [napLai]);

  const value = useMemo<StoreValue>(
    () => ({
      nguoiDung,
      settings,
      dangKhoiDong,
      loi,
      napLai,
      capNhatSettings,
      coQuyen,
      datNguoiDung,
    }),
    [nguoiDung, settings, dangKhoiDong, loi, napLai, capNhatSettings, coQuyen, datNguoiDung],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore phải dùng bên trong StoreProvider");
  return ctx;
}

/** Tiện dụng: lấy thẳng hàm kiểm tra quyền. */
export function useQuyen() {
  return useStore().coQuyen;
}
