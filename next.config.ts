import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Huy hiệu dev mặc định nằm ở góc dưới trái, đè lên nút "Đổi mật khẩu" và
  // "Đăng xuất" ở chân thanh điều hướng. Chuyển lên góc trên phải cho khỏi vướng.
  devIndicators: {
    position: "top-right",
  },
};

export default nextConfig;
