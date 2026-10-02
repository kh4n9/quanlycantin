import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quản lý căn tin phạm nhân",
  description: "Lập phiếu bán hàng cho can phạm tại căn tin",
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
