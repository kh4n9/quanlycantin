import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quản lý căn tin phạm nhân",
    short_name: "Căn tin",
    description: "Lập phiếu bán hàng cho can phạm tại căn tin",
    start_url: "/",
    display: "standalone",
    background_color: "#eef2f6",
    theme_color: "#1e3a8a",
    lang: "vi",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
