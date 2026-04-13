"use client";

import { useState, useEffect, useMemo } from "react";
import { Search as SearchIcon, Loader2, Sparkles, BookText, Filter, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useSearchStore } from "@/store/search";
import { useCategoriesStore } from "@/store/categories";
import { CATEGORY_COLORS } from "@/lib/relation-config";
import CategoryBottomSheet from "../category-bottom-sheet";

const getColorForCategory = (categoryId: string) => {
  if (!categoryId) return "#3b82f6";
  const num = categoryId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLORS[num % CATEGORY_COLORS.length] || "#3b82f6";
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const { results, search, isLoading } = useSearchStore();
  const { categories, fetchCategories } = useCategoriesStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    search(query);
  };

  const filteredResults = useMemo(() => {
    if (activeCategory === "all") return results;
    return results.filter(r => r.categoryId === activeCategory);
  }, [results, activeCategory]);

  return (
    <div className="flex flex-col h-full bg-[#fdfdfd]">
      {/* Search Header Area */}
      <div className="flex flex-col space-y-4 md:space-y-6 animate-in fade-in duration-500 shrink-0 px-1 md:px-0 mb-4">
        {/* Title - Hidden on Mobile */}
        <div className="hidden md:block space-y-1 px-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">语义搜索</h1>
          <p className="text-sm font-bold text-gray-400">基于向量引擎的深度知识检索</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative px-2">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-blue-500 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-10 transition-opacity duration-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索你的思维火花..."
              className="w-full bg-white border border-gray-100 rounded-3xl py-4 md:py-6 pl-14 md:pl-16 pr-6 text-base md:text-xl font-bold text-gray-900 shadow-sm focus:shadow-2xl focus:border-teal-100 transition-all outline-none md:tracking-tight"
            />
            <button 
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors"
            >
              {isLoading ? <Loader2 size={24} className="animate-spin" /> : <SearchIcon size={24} />}
            </button>
          </div>
        </form>

        {/* Category Filters - Top 5 + More */}
        <div className="flex items-center gap-2 overflow-hidden px-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-1.5 ${
              activeCategory === "all"
                ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200"
                : "bg-white text-gray-400 border-gray-100"
            }`}
          >
            全部
          </button>
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.slice(0, 5).map((cat) => (
                <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                    activeCategory === cat.id
                    ? "bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-200"
                    : "bg-white text-gray-400 border-gray-100"
                }`}
                >
                {cat.name}
                </button>
            ))}
          </div>

          <button
            onClick={() => setBottomSheetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-500 rounded-xl text-xs font-black uppercase tracking-widest border border-gray-100 active:bg-gray-100 shrink-0"
          >
            <span className="md:inline hidden">更多</span>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Category Selection Bottom Sheet */}
      <CategoryBottomSheet 
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        categories={categories}
        activeCategoryId={activeCategory}
        onSelect={setActiveCategory}
      />

      {/* Results Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {isLoading ? (
          <div className="space-y-4 px-3 md:px-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 md:h-40 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="space-y-3 md:space-y-6 px-3 md:px-2">
            {filteredResults.map((result) => (
              <Link
                key={result.id}
                href={`/notes/${result.id}`}
                className="group flex flex-col md:flex-row md:items-center justify-between p-4 md:p-8 bg-white border border-gray-50 rounded-2xl md:rounded-[40px] shadow-sm hover:shadow-xl hover:border-teal-100 transition-all duration-300"
              >
                <div className="flex items-start gap-4 md:gap-8 flex-1">
                  {/* Score Indicator */}
                  <div className="shrink-0 flex flex-col items-center justify-center p-3 md:p-4 rounded-2xl md:rounded-3xl bg-gray-50 text-gray-300 group-hover:bg-teal-50 transition-colors">
                    <Sparkles size={18} className="md:w-6 md:h-6 group-hover:text-teal-600" />
                    <span className="text-[9px] md:text-[10px] font-black mt-1 uppercase text-gray-400 group-hover:text-teal-600">
                      {Math.round(result.score * 100)}%
                    </span>
                  </div>

                  <div className="space-y-1.5 md:space-y-2 flex-1 min-w-0">
                    <h3 className="text-base md:text-xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-1">
                      {result.title}
                    </h3>
                    <p className="text-sm text-gray-400 font-medium line-clamp-2 leading-relaxed">
                      {result.content.replace(/[#*\-\[\]]/g, "").replace(/\n/g, " ")}
                    </p>
                    {/* Meta info row for mobile */}
                    <div className="flex md:hidden items-center gap-2 pt-1 font-black uppercase tracking-widest text-[10px]">
                      <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                        {result.categoryName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop Category Display */}
                <div className="hidden md:flex flex-col items-end gap-2 ml-4">
                  <span className="px-4 py-1.5 bg-gray-50 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {result.categoryName}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : query ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center shadow-inner">
              <SearchIcon size={32} className="text-gray-200" />
            </div>
            <div className="space-y-1">
              <p className="font-black text-gray-900 uppercase tracking-widest">未发现相关火花</p>
              <p className="text-sm text-gray-400 font-medium tracking-tight">换个关键词试试，或放宽分类限制。</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 md:py-32 text-center space-y-6 md:space-y-8 animate-in fade-in duration-1000">
            <div className="relative">
              <div className="absolute inset-0 bg-teal-500 blur-3xl opacity-10 animate-pulse" />
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-xl relative z-10">
                <Sparkles size={32} className="md:w-10 md:h-10 text-teal-600" />
              </div>
            </div>
            <div className="space-y-2 px-6">
              <p className="text-base md:text-xl font-black text-gray-900 uppercase tracking-widest">开启深度检索</p>
              <p className="text-xs md:text-sm text-gray-400 font-bold max-w-xs md:max-w-sm leading-relaxed mx-auto italic">
                “ 好的问题，是知识之门开启的第一把钥匙。 ”
              </p>
            </div>
            
            {/* Quick Tips */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 px-4 w-full max-w-sm md:max-w-md">
              <div className="p-4 bg-white border border-gray-50 rounded-2xl md:rounded-3xl shadow-sm text-center space-y-2">
                <BookText size={20} className="mx-auto text-gray-300" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">寻找共鸣</p>
              </div>
              <div className="p-4 bg-white border border-gray-100 rounded-2xl md:rounded-3xl shadow-sm text-center space-y-2">
                <Link href="/notes" className="block space-y-2">
                  <Filter size={20} className="mx-auto text-gray-300" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">按域过滤</p>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
