"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Plus, Inbox } from "lucide-react";
import { useNotesStore } from "@/store/notes";
import { useCategoriesStore } from "@/store/categories";
import { CATEGORY_COLORS } from "@/lib/relation-config";
import { useCategoryContext } from "../category-context";

const getColorForCategory = (categoryId: string) => {
  if (!categoryId) return "#3b82f6";
  const num = categoryId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLORS[num % CATEGORY_COLORS.length] || "#3b82f6";
};

const timeAgo = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "刚刚";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}天前`;
  return date.toLocaleDateString('zh-CN');
};

export default function NotesPage() {
  const { activeCategory, setActiveCategory } = useCategoryContext();
  const { notes, fetchNotes, isLoading } = useNotesStore();
  const { categories, fetchCategories } = useCategoriesStore();

  useEffect(() => {
    fetchCategories();
    fetchNotes(activeCategory === "all" ? undefined : activeCategory);
  }, [activeCategory, fetchNotes, fetchCategories]);

  // 本地过滤以保持响应
  const displayedNotes = useMemo(() => {
    return activeCategory === "all" ? notes : notes.filter(n => n.categoryId === activeCategory);
  }, [notes, activeCategory]);

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-10 animate-in fade-in duration-500">
      {/* Header - 移动端隐藏标题与主按钮 */}
      <div className="hidden md:flex items-end justify-between px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">全部笔记</h1>
          <p className="text-sm font-bold text-gray-400">你的数字化第二大脑</p>
        </div>
        <Link
          href="/notes/new"
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl hover:bg-teal-600 transition-all font-black uppercase text-xs tracking-widest shadow-lg active:scale-95"
        >
          <Plus size={18} />
          记录笔记
        </Link>
      </div>

      {/* 分类筛选 - 仅在桌面端显示（移动端由 Navbar 接管） */}
      <div className="hidden md:flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar px-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border whitespace-nowrap ${
            activeCategory === "all"
              ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200"
              : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
          }`}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border whitespace-nowrap ${
              activeCategory === cat.id
                ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200"
                : "bg-white text-gray-400 border-gray-100 hover:border-gray-300"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 px-1 md:px-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 md:h-72 bg-gray-100 rounded-2xl md:rounded-[40px] animate-pulse" />
          ))}
        </div>
      ) : displayedNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-8 px-1 md:px-2 pb-10">
          {displayedNotes.map((note) => (
            <Link
              key={note.id}
              href={`/notes/${note.id}`}
              className="group relative bg-white rounded-2xl md:rounded-[40px] p-4 md:p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:border-teal-100 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col justify-between min-h-0 md:min-h-[300px]"
            >
              {/* 背景装饰（仅在桌面端显示） */}
              <div 
                  className="hidden md:block absolute top-0 right-0 w-32 h-32 opacity-[0.03] -mr-8 -mt-8 rounded-full transition-transform duration-700 group-hover:scale-150" 
                  style={{ backgroundColor: getColorForCategory(note.categoryId) }}
              />

              <div className="relative space-y-2 md:space-y-4 flex-1">
                {/* 第一行：分类 + 时间 */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] md:text-[10px] bg-teal-50 text-teal-600 px-2 md:px-3 py-0.5 md:py-1 rounded-full font-black uppercase tracking-widest leading-none">
                    {note.categoryName}
                  </span>
                  <p className="hidden md:block text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                    {timeAgo(note.createdAt)}
                  </p>
                </div>

                {/* 第二行：标题 */}
                <h3 className="text-base md:text-xl font-black text-gray-900 group-hover:text-teal-600 transition-colors leading-snug md:leading-tight tracking-tight line-clamp-2">
                  {note.title}
                </h3>
                
                {/* 第三行：摘要 */}
                <p className="text-sm text-gray-400 font-medium line-clamp-2 md:line-clamp-3 leading-relaxed">
                  {(note.preview || note.content || "").replace(/[#*\-\[\]]/g, "").replace(/\n/g, " ")}
                </p>

                {/* 第四行：标签（紧跟摘要，移动端适配） */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {note.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[11px] font-black text-gray-500 uppercase tracking-tight bg-gray-50 px-2 py-0.5 rounded-md">
                          #{tag}
                        </span>
                    ))}
                </div>
              </div>

              {/* 仅在桌面端显示的链接详情按钮 */}
              <div className="hidden md:flex mt-8 pt-6 border-t border-gray-50 items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-teal-600 group-hover:text-white transition-all duration-500 shadow-inner">
                  {/* 此处可放置装饰或保持空位 */}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-20 md:py-24 text-center bg-gray-50/50 rounded-2xl md:rounded-[40px] border border-dashed border-gray-200 mx-1 md:mx-2">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-6">
            <Inbox className="w-8 h-8 md:w-10 md:h-10 text-gray-200" />
          </div>
          <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-tight mb-2">知识荒原</h3>
          <p className="text-gray-400 mb-8 max-w-[200px] md:max-w-xs text-xs md:text-sm font-medium">
            {activeCategory === "all"
              ? "这里空空如也，快开始记录你的第一条知识火花吧。"
              : "当前分类下暂无内容，换个频道试试。"}
          </p>
          <Link
            href="/notes/new"
            className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-600 transition-all shadow-lg active:scale-95"
          >
            记录第一篇笔记
          </Link>
        </div>
      )}
    </div>
  );
}
