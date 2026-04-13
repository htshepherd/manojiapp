"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, Sparkles, Inbox } from "lucide-react";
import { useAuthStore } from "@/store/auth";

interface WanderNote {
  id: string;
  title: string;
  preview: string;
  categoryName: string;
  tags: string[];
  createdAt: string;
  lastViewedAt: string | null;
  vectorId: string;
  reason: string;
  reasonType: 'dormant' | 'related' | 'random';
}

const reasonIcon = {
  dormant: "💤",
  related: "🔗",
  random: "🎲",
};

export default function WanderPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [cards, setCards] = useState<WanderNote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  
  // 动画状态
  const [offsetY, setOffsetY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const startYRef = useRef(0);

  const loadMore = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/wander", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          excludeIds: Array.from(seenIds),
          lastNoteVectorId: cards[currentIndex]?.vectorId,
        }),
      });
      const data = await res.json();
      if (data.notes && data.notes.length > 0) {
        setCards((prev) => [...prev, ...data.notes]);
        setSeenIds((prev) => {
          const next = new Set(prev);
          data.notes.forEach((n: WanderNote) => next.add(n.id));
          return next;
        });
      }
    } catch (error) {
      console.error("[Wander] Failed to load cards:", error);
    } finally {
      setIsLoading(false);
      setIsInitialLoading(false);
    }
  }, [token, seenIds, cards, currentIndex, isLoading]);

  // 初始化加载
  useEffect(() => {
    if (token) loadMore();
  }, [token]);

  // 预加载策略：当滑到倒数第2张时加载下一批
  useEffect(() => {
    if (cards.length > 0 && currentIndex >= cards.length - 2 && !isLoading) {
      loadMore();
    }
  }, [currentIndex, cards.length, isLoading, loadMore]);

  const triggerSwipe = () => {
    if (isAnimating || currentIndex >= cards.length) return;
    setIsAnimating(true);
    
    // 动画执行 300ms 后切换数据状态
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setOffsetY(0);
      setIsAnimating(false);
    }, 300);
  };

  // Touch 事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isAnimating) return;
    // 阻止浏览器默认滚动
    const delta = startYRef.current - e.touches[0].clientY;
    if (delta > 0) {
        setOffsetY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (isAnimating) return;
    // 灵敏度调整：超过 80px 触发上滑
    if (offsetY > 80) {
      triggerSwipe();
    } else {
      setOffsetY(0);
    }
  };

  // PC 端滚动切换
  const handleWheel = (e: React.WheelEvent) => {
    if (isAnimating) return;
    if (e.deltaY > 30) {
      triggerSwipe();
    }
  };

  if (isInitialLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center space-y-4 z-50">
        <Loader2 size={40} className="animate-spin text-teal-600" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">正在开启随机漫步...</p>
      </div>
    );
  }

  if (cards.length === 0 || currentIndex >= cards.length) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center px-8 text-center space-y-8 animate-in fade-in duration-500 z-50">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center shadow-inner">
          <Inbox size={40} className="text-gray-200" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">漫步暂告一段落</h2>
          <p className="text-sm text-gray-400 font-medium leading-relaxed">你的所有思想火花都已漫步完毕。🎉<br/>去记录新的知识吧，或者等明天再来。</p>
        </div>
        <button 
          onClick={() => router.push("/notes")}
          className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95"
        >
          返回笔记列表
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const nextCard = cards[currentIndex + 1];

  return (
    <div 
      className="fixed inset-0 md:left-[260px] h-[100dvh] overflow-hidden bg-white z-0 select-none touch-none"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 顶部工具栏 - 始终在最上 */}
      <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-6 z-50 pointer-events-none">
        <button 
            onClick={() => router.push("/notes")}
            className="flex items-center gap-1.5 text-gray-400 font-black text-xs uppercase tracking-widest active:text-gray-900 transition-colors pointer-events-auto"
        >
          <ChevronLeft size={18} />
          返回
        </button>
        <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">漫步中</span>
        </div>
      </div>

      {/* 下一张卡片 (背景层预加载) */}
      {nextCard && (
          <div 
              className={`absolute inset-0 w-full h-full bg-white transition-transform duration-300 ease-out z-10 flex flex-col overflow-hidden`}
              style={{
                transform: isAnimating ? 'translateY(0)' : 'translateY(110vh)'
              }}
          >
              <div className="w-full h-full max-w-[560px] mx-auto flex flex-col px-6 py-8 pt-24 pb-12 opacity-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-gray-50 rounded-2xl" />
                </div>
                <div className="space-y-4 md:space-y-6 flex-1">
                    <div className="w-20 h-6 bg-gray-50 rounded-full" />
                    <div className="w-full h-12 bg-gray-50 rounded-lg" />
                    <div className="w-full h-24 bg-gray-50 rounded-lg" />
                </div>
              </div>
          </div>
      )}

      {/* 当前卡片 (顶层交互) */}
      <div 
        key={currentCard.id}
        onClick={(e) => {
            if (isAnimating) return;
            // 判断是否为桌面端：md 宽度以上，点击卡片切换下一条
            if (window.innerWidth >= 768) {
                triggerSwipe();
            } else {
                // 移动端：点击进入详情
                router.push(`/notes/${currentCard.id}`);
            }
        }}
        className={`absolute inset-0 w-full h-full bg-white z-20 overflow-hidden cursor-pointer`}
        style={{ 
          transform: isAnimating 
              ? `translateY(-110vh)` 
              : `translateY(${-offsetY}px)`,
          transition: isAnimating ? 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
        }}
      >
        <div className="w-full h-full max-w-[560px] mx-auto flex flex-col px-6 py-8 pt-24 pb-12 relative">
            {/* 内容背景装饰 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

            {/* 推荐理由 */}
            <div className="flex items-center gap-3 mb-8 md:mb-12 relative">
            <div className="w-10 h-10 bg-teal-50 rounded-2xl flex items-center justify-center text-xl shadow-inner text-gray-400">
                {reasonIcon[currentCard.reasonType]}
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest leading-none mb-1">AI 漫步发现</p>
                <p className="text-sm font-bold text-gray-900 leading-tight">{currentCard.reason}</p>
            </div>
            </div>

            <div className="space-y-6 md:space-y-10 flex-1 relative">
            <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-100">
                    {currentCard.categoryName}
                </span>
            </div>
            
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight line-clamp-4">
                {currentCard.title}
            </h1>

            <p className="text-base md:text-xl text-gray-400 font-medium leading-relaxed line-clamp-6">
                {currentCard.preview}...
            </p>

            <div className="flex flex-wrap gap-2 pt-4">
                {currentCard.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs font-black text-teal-400 uppercase tracking-tight">#{tag}</span>
                ))}
            </div>
            </div>

            {/* 底部引导 */}
            <div className="mt-8 pt-6 md:pt-8 border-t border-gray-50 relative flex flex-col items-center gap-4">
                {/* 桌面端特有的详情按钮 */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/notes/${currentCard.id}`);
                    }}
                    className="hidden md:flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-teal-600 transition-all active:scale-95"
                >
                    查看全文
                </button>

                <div className="text-center text-xs text-gray-300 space-y-1">
                    <p className="md:hidden font-bold tracking-widest uppercase">点击阅读全文</p>
                    <p className="hidden md:block font-bold tracking-widest uppercase">点击或滚轮换一条</p>
                    <p className="font-medium animate-bounce pt-1">上滑换一条 ↑</p>
                </div>
            </div>
        </div>
      </div>

      {/* 静默加载下一批提示 */}
      {isLoading && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl animate-in slide-in-from-bottom-4 ml-[130px] md:ml-0">
            <Loader2 size={12} className="animate-spin text-teal-400" />
            <span>正在载入灵感...</span>
          </div>
      )}
    </div>
  );
}
