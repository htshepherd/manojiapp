"use client";

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSynthesisStore } from '@/store/synthesis';
import { useCategoriesStore } from '@/store/categories';
import { Bot, PenLine, ChevronLeft, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function SynthesisPage({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = use(params);
  const router = useRouter();
  
  const { syntheses, fetchSynthesis, updateAnnotation, isLoading } = useSynthesisStore();
  const { categories, fetchCategories } = useCategoriesStore();
  
  const category = categories.find(c => c.id === categoryId);
  const synthesis = syntheses[categoryId];

  const [isEditing, setIsEditing] = useState(false);
  const [annotation, setAnnotation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchSynthesis(categoryId);
  }, [categoryId, fetchCategories, fetchSynthesis]);

  useEffect(() => {
    if (synthesis) {
        setAnnotation(synthesis.userAnnotation || '');
    }
  }, [synthesis]);

  if (!category && !isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <p className="text-gray-500 font-bold text-sm">该分类不存在</p>
            <button 
                onClick={() => router.push('/categories')}
                className="text-teal-600 text-sm font-bold active:underline"
            >
                返回分类管理
            </button>
        </div>
    );
  }

  const handleSave = async () => {
    if (!synthesis) return;
    setIsSaving(true);
    const success = await updateAnnotation(synthesis.id, categoryId, annotation);
    setIsSaving(false);
    if (success) {
        setIsEditing(false);
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 2000);
    } else {
        alert('保存失败');
    }
  };

  const formattedDate = synthesis ? new Date(synthesis.updatedAt).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="space-y-4 md:space-y-12">
        {/* Compressed Header for Mobile */}
        <div className="flex items-center justify-between sticky top-[var(--nav-top-h)] bg-[#fdfdfd]/95 backdrop-blur-md z-10 px-3 py-2 -mx-3 border-b border-gray-50 md:static md:bg-transparent md:mx-0 md:p-0 md:border-b-0 md:items-end md:mb-8">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => router.push('/categories')}
                    className="flex md:hidden items-center gap-1 text-gray-500 font-bold active:text-gray-900"
                >
                    <ChevronLeft size={18} />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-base md:text-3xl font-black text-gray-900 tracking-tight leading-none">
                        {category?.name} 综述
                    </h1>
                    <div className="flex items-center gap-2 mt-1 md:mt-2">
                        <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest hidden md:inline-block">
                            结构化沉淀
                        </span>
                        <p className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-tighter">
                            更新于 {formattedDate}
                        </p>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={() => router.push('/categories')}
                className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-gray-900 hover:bg-gray-200 transition-all shadow-sm"
            >
                返回分类
            </button>
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 md:py-32 space-y-4">
                <Loader2 className="animate-spin text-teal-600" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">正在调取结构化综述...</p>
            </div>
        ) : !synthesis ? (
            <div className="bg-white rounded-2xl md:rounded-[40px] border border-gray-100 shadow-sm p-8 md:p-16 text-center space-y-6 md:space-y-8 mx-1 md:mx-0">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-gray-50 rounded-full flex items-center justify-center shadow-inner mx-auto">
                    <Bot size={32} className="text-gray-200" />
                </div>
                <div className="space-y-2 md:space-y-4 text-center">
                    <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase">领域综述尚未唤醒</h3>
                    <p className="text-xs md:text-sm font-medium text-gray-400 max-w-xs mx-auto">Claude 正期待您的笔记积累。当火花达到临界点，结构化综述将自动呈现。</p>
                </div>
                <div className="max-w-[200px] md:max-w-xs mx-auto space-y-3">
                    <div className="flex justify-between text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>编译进度</span>
                        <span>{category?.noteCount || 0} / {category?.synthesisTriggerCount || 5}</span>
                    </div>
                    <div className="h-1.5 md:h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-[1px]">
                        <div 
                            className="h-full bg-gradient-to-r from-teal-500 to-blue-500 rounded-full transition-all duration-[2s]" 
                            style={{ width: `${Math.min(100, ((category?.noteCount || 0) / (category?.synthesisTriggerCount || 5)) * 100)}%` }} 
                        />
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-6 md:space-y-12">
                {/* AI Synthesis Content Section */}
                <div className="bg-white rounded-xl md:rounded-[40px] p-4 md:p-14 border border-teal-50/50 md:border-gray-100 shadow-sm relative overflow-hidden mx-1 md:mx-0">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-blue-500 opacity-30" />
                    
                    <div className="prose prose-slate max-w-none font-sans
                        [&>h2]:text-lg md:[&>h2]:text-2xl [&>h2]:font-black [&>h2]:text-gray-900 [&>h2]:mt-10 md:[&>h2]:mt-12 [&>h2]:mb-4 md:[&>h2]:mb-6
                        [&>h3]:text-base md:[&>h3]:text-xl [&>h3]:font-black [&>h3]:text-gray-900 [&>h3]:mt-8 md:[&>h3]:mt-10 [&>h3]:mb-3
                        [&>p]:text-gray-800 [&>p]:leading-relaxed md:[&>p]:leading-relaxed [&>p]:mb-6 md:[&>p]:mb-8 [&>p]:text-[16px] md:[&>p]:text-[1.15rem] [&>p]:font-medium
                        [&>hr]:border-gray-100 [&>hr]:my-8 md:[&>hr]:my-12
                        [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-6 md:[&>ul]:mb-8
                        [&>ul>li]:mb-2 md:[&>ul>li]:mb-4 [&>ul>li]:text-[16px] md:[&>ul>li]:text-[1.1rem] [&>ul>li]:font-medium
                        [&_strong]:font-black [&_strong]:text-gray-900
                    ">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {synthesis.aiContent}
                        </ReactMarkdown>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                            <Sparkles size={12} className="text-teal-500" />
                            基于 Claude 智能化处理
                        </div>
                    </div>
                </div>

                {/* User Annotation Section */}
                <div className="px-2 md:px-0 space-y-4 md:space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm md:text-xl font-black text-gray-900 uppercase tracking-tight">沉淀与洞察</h3>
                            {showSavedToast && (
                                <span className="text-[10px] text-teal-600 font-black animate-in fade-in slide-in-from-left-2 duration-300">
                                    已存档
                                </span>
                            )}
                        </div>
                        {!isEditing ? (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-white text-teal-600 border border-teal-100 rounded-xl text-[10px] font-black uppercase tracking-widest active:bg-teal-50 transition-all"
                            >
                                修正洞察
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="px-3 py-2 text-[10px] font-black uppercase text-gray-400"
                                >
                                    取消
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:bg-teal-700 disabled:bg-gray-300 transition-colors"
                                >
                                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : null}
                                    保存
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="transition-all duration-500">
                        {isEditing ? (
                            <textarea
                                autoFocus
                                value={annotation}
                                onChange={(e) => setAnnotation(e.target.value)}
                                placeholder="在此记录您对该领域的独创见解..."
                                className="w-full min-h-[300px] md:min-h-[400px] p-6 md:p-14 bg-white border-2 border-teal-50 rounded-2xl md:rounded-[40px] outline-none resize-none font-sans text-[16px] md:text-[1.15rem] text-gray-800 leading-relaxed shadow-2xl"
                            />
                        ) : (
                            <div 
                                onClick={() => setIsEditing(true)}
                                className={`w-full min-h-[150px] md:min-h-[300px] p-6 md:p-14 border rounded-2xl md:rounded-[40px] cursor-text transition-all duration-300 active:scale-[0.99] ${
                                    !annotation 
                                        ? 'bg-gray-50/30 border-dashed border-gray-200 flex flex-col items-center justify-center space-y-3' 
                                        : 'bg-white border-gray-100 shadow-sm'
                                }`}
                            >
                                {annotation ? (
                                    <div className="prose prose-slate max-w-none font-sans text-[16px] md:text-[1.1rem] text-gray-700 italic leading-relaxed">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {annotation}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-2">
                                            <PenLine size={20} className="text-gray-200" />
                                        </div>
                                        <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">点击此处开始思想沉淀</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
