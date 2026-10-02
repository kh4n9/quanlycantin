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
import { apiClient } from "./client";
import type { Settings } from "./types";

type StoreValue = {
  settings: Settings;
  dangTai: boolean;
  loi: string;
  napLai: () => Promise<void>;
  capNhatSettings: (s: Partial<Settings>) => Promise<void>;
};

const StoreContext = createContext<StoreValue | null>(null);

/** Giữ thông tin đơn vị dùng chung cho mọi màn hình (chủ yếu để in phiếu). */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ tenDonVi: "", diaChi: "", nguoiLapPhieu: "" });
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");

  const napLai = useCallback(async () => {
    try {
      const st = await apiClient.settings();
      setSettings(st.settings);
      setLoi("");
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDangTai(false);
    }
  }, []);

  const capNhatSettings = useCallback(async (s: Partial<Settings>) => {
    const kq = await apiClient.luuSettings(s);
    setSettings(kq.settings);
  }, []);

  useEffect(() => {
    void napLai();
  }, [napLai]);

  const value = useMemo<StoreValue>(
    () => ({ settings, dangTai, loi, napLai, capNhatSettings }),
    [settings, dangTai, loi, napLai, capNhatSettings],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore phải dùng bên trong StoreProvider");
  return ctx;
}
