"use client";

import { useState, useMemo } from "react";
import { Search, X, Check } from "lucide-react";
import { Category } from "@/types";

interface CategoryBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  activeCategoryId: string;
  onSelect: (_id: string) => void;
}

export default function CategoryBottomSheet({
  isOpen,
  onClose,
  categories,
  activeCategoryId,
  onSelect,
}: CategoryBottomSheetProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCategories = useMemo(() => {
    const list = [{ id: "all", name: "全部" }, ...categories];
    if (!searchTerm.trim()) return list;
    return list.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div
        className={`fixed inset-x-0 bottom-0 bg-white rounded-t-[32px] z-[70] h-[60vh] flex flex-col shadow-2xl transition-transform duration-300 ease-out transform ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Handle bar */}
        <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2 shrink-0">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">选择分类</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-6 py-2 shrink-0">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索分类..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 pl-11 pr-4 text-base outline-none focus:ring-4 focus:ring-teal-500/5 focus:border-teal-500/30 transition-all font-medium"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 no-scrollbar">
          <div className="space-y-1">
            {filteredCategories.map((cat) => {
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelect(cat.id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all ${
                    isActive
                      ? "bg-teal-50 text-teal-600 font-bold"
                      : "text-gray-600 active:bg-gray-50"
                  }`}
                >
                  <span className="text-base">{cat.name}</span>
                  {isActive && <Check size={20} />}
                </button>
              );
            })}
            
            {filteredCategories.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm font-medium">
                未找到匹配分类
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
