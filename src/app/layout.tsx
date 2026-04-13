import type { Metadata, Viewport } from "next";
import "./globals.css";

// viewport 独立导出，不在 metadata 内
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // iOS safe area 支持
  themeColor: "#14b8a6",
};

export const metadata: Metadata = {
  title: "manoai",
  description: "你的 AI 知识库",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent", // 全屏沉浸：内容延伸到状态栏下方
    title: "manoai",
  },
};

import RootInit from "@/components/RootInit";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full antialiased font-sans"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <RootInit />
        {children}
      </body>
    </html>
  );
}
