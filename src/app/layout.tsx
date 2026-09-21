import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "供货订购",
  description: "每日供货订购收集工具",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
