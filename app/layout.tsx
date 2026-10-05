import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Zepp × Intervals｜私人唯讀連接",
  description: "由擁有者安全設定的 Zepp 與 Intervals 私人唯讀插件；預設停用資料讀取。",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
