import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "日文單字庫",
  description: "Notion 同步日文學習",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
