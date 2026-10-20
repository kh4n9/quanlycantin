import type { Metadata, Viewport } from "next";
import "./globals.css";

const TEN_UNG_DUNG = "Quản lý căn tin phạm nhân";

export const metadata: Metadata = {
  title: TEN_UNG_DUNG,
  description: "Lập phiếu bán hàng cho can phạm tại căn tin",
  applicationName: TEN_UNG_DUNG,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Căn tin",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: TEN_UNG_DUNG,
    title: TEN_UNG_DUNG,
    description: "Lập phiếu bán hàng cho can phạm tại căn tin",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: các tiện ích trình duyệt (ColorZilla, Grammarly…)
    // tự chèn thuộc tính vào <html>/<body> trước khi React hydrate, làm React báo
    // lỗi hydration giả. Thuộc tính này chỉ bỏ qua khác biệt ở đúng hai thẻ đó,
    // không che lỗi hydration thật ở các component bên trong.
    <html lang="vi" className="h-full" suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
