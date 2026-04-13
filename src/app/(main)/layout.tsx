"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import {
  BookText, PenSquare, FolderTree, Search,
  Network, LogOut, Sparkles, FileText, Menu, X, ChevronDown, Shuffle
} from "lucide-react";
import { CategoryProvider, useCategoryContext } from "./category-context";
import CategoryBottomSheet from "./category-bottom-sheet";
import { useCategoriesStore } from "@/store/categories";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  // ── 挂载检查 & 登录校验 ──────────────────────────────────
  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  // ── 路由变化时自动关闭抽屉 ──────────────────────────────
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // ── 抽屉开关时锁定/解锁 body 滚动 ───────────────────────
  useEffect(() => {
    if (drawerOpen || bottomSheetOpen) {
      document.body.classList.add("drawer-open");
    } else {
      document.body.classList.remove("drawer-open");
    }
    // 组件卸载时确保解锁
    return () => {
      document.body.classList.remove("drawer-open");
    };
  }, [drawerOpen, bottomSheetOpen]);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login");
  }, [logout, router]);

  if (!mounted || !isLoggedIn) return null;

  // ── 导航菜单数据（桌面端和移动端共用）──────────────────
  const navItems = [
    { label: "语义搜索", href: "/search",     icon: <Search size={22} />    },
    { label: "记录笔记", href: "/notes/new",  icon: <PenSquare size={22} /> },
    { label: "全部笔记", href: "/notes",      icon: <BookText size={22} />  },
    { label: "随机漫步", href: "/wander",     icon: <Shuffle size={22} />   },
    { label: "知识领域", href: "/categories", icon: <FolderTree size={22} />},
    { label: "提示词库", href: "/templates",  icon: <FileText size={22} />  },
    { label: "知识图谱", href: "/graph",      icon: <Network size={22} />   },
  ];

  // ── 高亮逻辑抽取为工具函数 ───────────────────────────────
  const isItemActive = (href: string): boolean => {
    if (href === "/notes") return pathname === "/notes";
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div
        className="p-8 pb-4 hidden md:flex items-center gap-3 group cursor-pointer"
        onClick={() => router.push("/")}
      >
        <div className="w-10 h-10 bg-gradient-to-tr from-[#14b8a6] to-[#0ea5e9] rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform duration-300">
          <Sparkles className="text-white fill-white/20" size={24} />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
            manoai
          </span>
        </div>
      </div>

      {/* 菜单项 */}
      <nav className="flex-1 px-4 py-8 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isItemActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                active
                  ? "bg-white text-gray-900 shadow-sm border border-gray-100 font-bold"
                  : "text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-sm"
              }`}
            >
              <div
                className={`transition-colors ${
                  active
                    ? "text-teal-600"
                    : "text-gray-400 group-hover:text-teal-500"
                }`}
              >
                {item.icon}
              </div>
              <span className="text-sm tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 退出登录 */}
      <div className="p-6">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 text-sm font-medium"
        >
          <LogOut size={18} />
          <span>退出登录</span>
        </button>
      </div>
    </>
  );

  return (
    <CategoryProvider>
      <MainLayoutContent
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        bottomSheetOpen={bottomSheetOpen}
        setBottomSheetOpen={setBottomSheetOpen}
        NavContent={NavContent}
        isLoggedIn={isLoggedIn}
      >
        {children}
      </MainLayoutContent>
    </CategoryProvider>
  );
}

function MainLayoutContent({
  children,
  drawerOpen,
  setDrawerOpen,
  bottomSheetOpen,
  setBottomSheetOpen,
  NavContent,
  isLoggedIn
}: {
  children: React.ReactNode;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  bottomSheetOpen: boolean;
  setBottomSheetOpen: (v: boolean) => void;
  NavContent: React.ComponentType;
  isLoggedIn: boolean;
}) {
  const pathname = usePathname();
  const { categories } = useCategoriesStore();
  const { activeCategory, setActiveCategory } = useCategoryContext();

  const activeCategoryLabel = activeCategory === "all" 
    ? "全部" 
    : categories.find(c => c.id === activeCategory)?.name || "全部";

  return (
    <div className="flex min-h-screen bg-[#f9f9f9] flex-col md:flex-row font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* ── 桌面端固定侧边栏 ─────────────────── */}
      <aside className="hidden md:flex flex-col w-[260px] fixed inset-y-0 bg-[#f3f4f6] border-r border-gray-200/50 text-gray-900 z-10 transition-all duration-300">
        <NavContent />
      </aside>

      {/* ── 移动端：顶部 Navbar ───────────────────────────── */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-100 px-4 sticky top-0 z-20"
           style={{ height: "var(--nav-top-h)" }}>
        {/* 汉堡按钮 */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 text-gray-500 hover:text-gray-900 transition-colors"
          aria-label="打开菜单"
        >
          <Menu size={24} />
        </button>

        {/* Navbar 中部动态内容 */}
        <div className="flex-1 flex justify-center px-4">
          {pathname === "/notes" ? (
            <button 
              onClick={() => setBottomSheetOpen(true)}
              className="flex items-center gap-1.5 text-sm font-black text-gray-900 active:scale-95 transition-transform"
            >
              <span>{activeCategoryLabel}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight">manoai</span>
            </div>
          )}
        </div>

        {/* 占位（保持居中） */}
        <div className="w-10" />
      </div>

      {/* ── 移动端：抽屉遮罩层 ── */}
      <div
        className={`md:hidden fixed inset-0 bg-black/40 z-30 transition-opacity duration-300 ${
          drawerOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ── 移动端：左侧抽屉 ── */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 w-[260px] bg-[#f3f4f6] z-40 flex flex-col
          transform transition-transform duration-300 ease-out shadow-2xl ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="导航菜单"
      >
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="关闭菜单"
        >
          <X size={20} />
        </button>
        <NavContent />
      </aside>

      {/* ── 移动端：分类选择 Bottom Sheet ── */}
      <CategoryBottomSheet 
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        categories={categories}
        activeCategoryId={activeCategory}
        onSelect={setActiveCategory}
      />

      {/* ── 内容区 ── */}
      <main
        className="flex-1 md:ml-[260px] bg-[#fdfdfd] min-h-screen"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        {pathname === "/graph" ? (
          children
        ) : (
          <div className="p-3 md:p-10 max-w-7xl mx-auto h-full">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
