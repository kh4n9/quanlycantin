"use client";

import { useEffect, useRef } from "react";

/*
 * "Dappled light" — nắng lọt qua tán lá, đổ xuống mặt giấy.
 *
 * Không dùng ảnh hay video: một canvas nhỏ vẽ các vũng sáng ấm di chuyển rất
 * chậm, rồi khoét những mảng lá để tạo vệt sáng tối. Màu ánh sáng chuyển dần
 * giữa vàng nắng và xanh lọc qua lá theo một chu kỳ dài, không giật.
 *
 * Lớp này chỉ là nền: trong suốt ở chỗ bóng lá, nên vẫn nhìn thấy giấy kẻ dòng
 * và lề đỏ phía dưới.
 */

type VungSang = {
  x: number;
  y: number;
  banKinh: number;
  bienX: number;
  bienY: number;
  nhipX: number;
  nhipY: number;
  pha: number;
};

type BongLa = {
  x: number;
  y: number;
  rx: number;
  ry: number;
  goc: number;
  bienX: number;
  bienY: number;
  nhipX: number;
  nhipY: number;
  pha: number;
};

const NANG = { h: 42, s: 86, l: 80 };
const LA = { h: 98, s: 32, l: 78 };
const CHU_KY_MAU = 26; // giây cho một vòng vàng → xanh → vàng

function tron(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mau(h: number, s: number, l: number, a: number) {
  return `hsla(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}% / ${a})`;
}

/** Số ngẫu nhiên có hạt giống để bố cục không đổi sau mỗi lần render. */
function taoNgauNhien(hat: number) {
  let s = hat >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function taoVungSang(): VungSang[] {
  return Array.from({ length: 13 }, (_, i) => {
    const rnd = taoNgauNhien(101 + i * 977);
    return {
      x: 0.08 + rnd() * 0.84,
      y: 0.04 + rnd() * 0.92,
      banKinh: 0.22 + rnd() * 0.34,
      bienX: 0.035 + rnd() * 0.06,
      bienY: 0.025 + rnd() * 0.05,
      nhipX: 0.045 + rnd() * 0.075,
      nhipY: 0.035 + rnd() * 0.065,
      pha: rnd() * Math.PI * 2,
    };
  });
}

function taoBongLa(): BongLa[] {
  return Array.from({ length: 18 }, (_, i) => {
    const rnd = taoNgauNhien(7001 + i * 613);
    return {
      x: 0.06 + rnd() * 0.88,
      y: 0.04 + rnd() * 0.92,
      rx: 0.035 + rnd() * 0.075,
      ry: 0.012 + rnd() * 0.028,
      goc: rnd() * Math.PI,
      bienX: 0.008 + rnd() * 0.022,
      bienY: 0.006 + rnd() * 0.018,
      nhipX: 0.07 + rnd() * 0.12,
      nhipY: 0.06 + rnd() * 0.1,
      pha: rnd() * Math.PI * 2,
    };
  });
}

export function DappledLight({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const vungSang = taoVungSang();
    const bongLa = taoBongLa();
    let khungHinh = 0;
    let lanVe = 0;
    let rong = 0;
    let cao = 0;
    let tyLe = 1;

    const chinhKichThuoc = () => {
      const rect = canvas.getBoundingClientRect();
      const rongMoi = Math.max(1, Math.round(rect.width));
      const caMoi = Math.max(1, Math.round(rect.height));
      if (rongMoi === rong && caMoi === cao) return;
      rong = rongMoi;
      cao = caMoi;
      // Nền chỉ gồm các mảng mờ nên không cần vẽ đúng từng pixel thiết bị.
      // Hạ nhẹ độ phân giải để giữ 30fps trên máy yếu mà mắt vẫn thấy mượt.
      tyLe = Math.min(window.devicePixelRatio || 1, 1.25) * 0.8;
      canvas.width = Math.round(rong * tyLe);
      canvas.height = Math.round(cao * tyLe);
      ctx.setTransform(tyLe, 0, 0, tyLe, 0, 0);
    };

    const ve = (thoiGian: number) => {
      chinhKichThuoc();
      if (!rong || !cao) return;

      const giay = thoiGian / 1000;
      // Bắt đầu bằng nắng ấm, chuyển dần sang ánh xanh rồi trở lại.
      const phaMau = (giay * Math.PI * 2) / CHU_KY_MAU - Math.PI / 2;
      const tiLeMau = (Math.sin(phaMau) + 1) / 2;
      const h = tron(NANG.h, LA.h, tiLeMau);
      const s = tron(NANG.s, LA.s, tiLeMau);
      const l = tron(NANG.l, LA.l, tiLeMau);
      const nhoNhat = Math.min(rong, cao);

      ctx.clearRect(0, 0, rong, cao);

      // Một lớp sương sáng rất nhạt phủ cả nền. Nhờ nó, màu ánh sáng đổi mượt
      // trên toàn mặt giấy chứ không chỉ ở vài vũng rời rạc.
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = mau(h, s, l, 0.035);
      ctx.fillRect(0, 0, rong, cao);

      // Các vũng nắng lớn, trôi theo quỹ đạo lệch pha nhau. Cộng sáng để chỗ
      // chồng nhau vẫn giữ được cảm giác nắng thật, không bị đục.
      ctx.globalCompositeOperation = "lighter";
      for (const v of vungSang) {
        const x = (v.x + Math.sin(giay * v.nhipX + v.pha) * v.bienX) * rong;
        const y = (v.y + Math.cos(giay * v.nhipY + v.pha * 1.37) * v.bienY) * cao;
        const banKinh = v.banKinh * nhoNhat;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, banKinh);
        gradient.addColorStop(0, mau(h, s, Math.min(92, l + 6), 0.2));
        gradient.addColorStop(0.55, mau(h, s, l, 0.07));
        gradient.addColorStop(1, mau(h, s, l, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, banKinh, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bóng lá phủ lên cả nắng lẫn giấy: cùng một màu mực, alpha thấp, và
      // càng ra mép càng loang để không thành những hình bầu dục cứng.
      ctx.globalCompositeOperation = "source-over";
      for (const b of bongLa) {
        const x = (b.x + Math.sin(giay * b.nhipX + b.pha) * b.bienX) * rong;
        const y = (b.y + Math.cos(giay * b.nhipY + b.pha) * b.bienY) * cao;
        const goc = b.goc + Math.sin(giay * b.nhipX * 0.7 + b.pha) * 0.14;
        const rx = b.rx * nhoNhat;
        const ry = b.ry * nhoNhat;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(goc);
        ctx.scale(rx, ry);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        gradient.addColorStop(0, "rgba(19,30,25,0.07)");
        gradient.addColorStop(0.55, "rgba(19,30,25,0.045)");
        gradient.addColorStop(1, "rgba(19,30,25,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const lap = (thoiGian: number) => {
      // 30fps là đủ cho chuyển động rất chậm này và nhẹ hơn hẳn 60fps.
      if (thoiGian - lanVe >= 33) {
        ve(thoiGian);
        lanVe = thoiGian;
      }
      khungHinh = requestAnimationFrame(lap);
    };

    const giamChuyenDong = window.matchMedia("(prefers-reduced-motion: reduce)");
    const batDau = () => {
      cancelAnimationFrame(khungHinh);
      if (giamChuyenDong.matches) {
        ve(0);
        return;
      }
      lanVe = 0;
      khungHinh = requestAnimationFrame(lap);
    };

    batDau();

    const theoDoiKichThuoc = new ResizeObserver(() => {
      if (giamChuyenDong.matches) ve(0);
    });
    theoDoiKichThuoc.observe(canvas);
    giamChuyenDong.addEventListener("change", batDau);

    return () => {
      cancelAnimationFrame(khungHinh);
      theoDoiKichThuoc.disconnect();
      giamChuyenDong.removeEventListener("change", batDau);
    };
  }, []);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
