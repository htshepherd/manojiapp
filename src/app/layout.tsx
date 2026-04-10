import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "漫记 manoji",
  description: "你的 AI 知识库",
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
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <RootInit />
        {children}
      </body>
    </html>
  );
}
