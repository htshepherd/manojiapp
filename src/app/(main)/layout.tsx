"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { BookText, PenSquare, FolderTree, Search, Network, LogOut, Menu, Sparkles, FileText } from "lucide-react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  if (!mounted || !isLoggedIn) return null;

  const navItems = [
    { label: "搜索", href: "/search", icon: <Search size={22} /> },
    { label: "记录笔记", href: "/notes/new", icon: <PenSquare size={22} /> },
    { label: "全部笔记", href: "/notes", icon: <BookText size={22} /> },
    { label: "分类管理", href: "/categories", icon: <FolderTree size={22} /> },
    { label: "模版管理", href: "/templates", icon: <FileText size={22} /> },
    { label: "知识图谱", href: "/graph", icon: <Network size={22} /> },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#f9f9f9] flex-col md:flex-row font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex flex-col w-[260px] fixed inset-y-0 bg-[#f3f4f6] border-r border-gray-200/50 text-gray-900 z-10 transition-all duration-300">
        {/* Logo Section */}
        <div className="p-8 pb-4 flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-10 h-10 bg-gradient-to-tr from-[#14b8a6] to-[#0ea5e9] rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform duration-300">
            <Sparkles className="text-white fill-white/20" size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">漫记</span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-teal-600/80 -mt-1">manoji AI</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/notes' && pathname?.startsWith(item.href));
            const isExactNotes = item.href === '/notes' && pathname === '/notes';
            const finalHighlight = item.href === '/notes' ? isExactNotes : isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  finalHighlight
                    ? "bg-white text-gray-900 shadow-sm border border-gray-100 font-bold"
                    : "text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm"
                }`}
              >
                <div className={`transition-colors ${finalHighlight ? "text-teal-600" : "text-gray-400 group-hover:text-teal-500"}`}>
                  {item.icon}
                </div>
                <span className="text-sm tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 text-sm font-medium"
          >
            <LogOut size={18} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* 移动端顶部 Navbar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-100 p-4 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-teal-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white" size={16} />
          </div>
          <span className="text-lg font-black tracking-tighter">漫记</span>
        </div>
        <button onClick={handleLogout} className="text-gray-400 p-2">
          <LogOut size={20} />
        </button>
      </div>

      {/* 右侧内容区 */}
      <main className="flex-1 md:ml-[260px] bg-[#fdfdfd] min-h-screen pb-20 md:pb-0">
        {pathname === '/graph' ? (
          children
        ) : (
          <div className="p-4 md:p-10 max-w-7xl mx-auto h-full">
            {children}
          </div>
        )}
      </main>

      {/* 移动端底部 Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-16 z-20 px-2 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/notes' && pathname?.startsWith(item.href));
          const isExactNotes = item.href === '/notes' && pathname === '/notes';
          const finalHighlight = item.href === '/notes' ? isExactNotes : isActive;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                finalHighlight ? "text-teal-600" : "text-gray-400"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
