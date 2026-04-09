"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { Search, History, Loader2, Inbox, Calendar, Tags, ExternalLink } from 'lucide-react';
import { MOCK_NOTES, MOCK_CATEGORIES, MOCK_SEARCH_RESULTS } from '@/lib/mock';
import { useNotesStore } from '@/store/notes';
import { SearchResult } from '@/types';

export default function SearchPage() {
  const router = useRouter();
  const { notes } = useNotesStore();
  
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [debouncedQuery] = useDebounce(query, 300);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  // 最近笔记 (默认显示最近的4篇)
  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [notes]);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      // 模拟服务器延迟
      await new Promise(r => setTimeout(r, 500));
      
      const searchResults = MOCK_SEARCH_RESULTS(debouncedQuery);
      setResults(searchResults);
      setIsSearching(false);
    };

    performSearch();
  }, [debouncedQuery]);

  // 根据分类过滤结果
  const filteredResults = useMemo(() => {
    if (activeCategory === 'all') return results;
    return results.filter(r => r.categoryName === MOCK_CATEGORIES.find(c => c.id === activeCategory)?.name);
  }, [results, activeCategory]);

  const getSimilarityColor = (score: number) => {
    const percent = score * 100;
    if (percent > 80) return 'text-teal-600 bg-teal-50 border-teal-100';
    if (percent > 60) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-gray-500 bg-gray-50 border-gray-100';
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 搜索框区域 */}
      <div className="space-y-6 sticky top-0 bg-[#fdfdfd]/80 backdrop-blur-md pt-4 pb-6 z-10 border-b border-gray-100/50 -mx-4 px-4 md:mx-0">
        <div className="relative group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-600 transition-colors">
            <Search size={24} />
          </div>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索全库知识..."
            className="w-full bg-white border border-gray-200 rounded-2xl py-6 pl-16 pr-6 text-xl outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all shadow-sm"
          />
        </div>

        {/* 分类过滤 Tab */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`shrink-0 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              activeCategory === 'all'
                ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            全部
          </button>
          {MOCK_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                activeCategory === cat.id
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 结果展示区 */}
      <div className="space-y-6 px-2">
        {isSearching ? (
          /* Loading 状态 */
          <div className="space-y-6 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 bg-gray-50 rounded-3xl border border-gray-100 shadow-sm" />
            ))}
          </div>
        ) : query.trim() === '' ? (
          /* 初始状态 - 最近笔记 */
          <div className="space-y-8">
            <div className="flex items-center gap-3 text-gray-900 font-extrabold px-2">
              <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                <History size={20} />
              </div>
              <h3 className="text-sm uppercase tracking-widest text-[10px] font-black tracking-[0.2em] text-gray-400">最新记录的笔记</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentNotes.map(note => (
                <div 
                  key={note.id} 
                  onClick={() => router.push(`/notes/${note.id}`)}
                  className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col space-y-4 group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-teal-50 text-teal-600 px-3 py-1 rounded-full font-black uppercase tracking-wider">{note.categoryName}</span>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <h4 className="font-black text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-2 leading-tight text-lg">{note.title}</h4>
                </div>
              ))}
            </div>
          </div>
        ) : filteredResults.length > 0 ? (
          /* 搜索结果 */
          <div className="space-y-8">
            <div className="flex items-center justify-between px-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                共找到 {filteredResults.length} 条结果
            </div>
            <div className="space-y-6">
              {filteredResults.map(result => (
                <div 
                  key={result.noteId} 
                  onClick={() => router.push(`/notes/${result.noteId}`)}
                  className="group bg-white border border-gray-100 rounded-[32px] p-8 hover:shadow-2xl hover:border-teal-100 transition-all duration-500 cursor-pointer flex flex-col space-y-4 shadow-sm relative overflow-hidden"
                >
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] bg-gray-900 text-white px-3 py-1 rounded-full font-black uppercase tracking-wider">{result.categoryName}</span>
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border shadow-sm ${getSimilarityColor(result.similarityScore)}`}>
                          匹配度 {Math.round(result.similarityScore * 100)}%
                        </span>
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 group-hover:text-teal-600 transition-colors leading-tight tracking-tight">
                      {result.title}
                    </h3>

                    <p className="text-base text-gray-500 line-clamp-2 leading-relaxed font-medium">
                      {result.preview}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {result.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1.5 text-[10px] bg-gray-50 text-gray-400 px-3 py-1 rounded-full font-bold hover:bg-teal-50 hover:text-teal-600 transition-colors">
                          <Tags size={12} />
                          {tag.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="absolute right-8 bottom-8">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-teal-600 group-hover:text-white group-hover:rotate-45 transition-all duration-500 shadow-inner text-xs font-black">
                      查看
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* 无结果 */
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-6 bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl">
              <Inbox size={40} className="text-gray-200" />
            </div>
            <div className="space-y-2">
              <p className="text-gray-900 text-xl font-black tracking-tight">未发现相关内容</p>
              <p className="text-gray-400 max-w-xs mx-auto text-sm font-medium leading-relaxed">尝试更换关键词，或者放宽筛选条件。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
