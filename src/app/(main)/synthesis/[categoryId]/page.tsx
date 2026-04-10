"use client";

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSynthesisStore } from '@/store/synthesis';
import { useCategoriesStore } from '@/store/categories';
import { ChevronRight, Bot, PenLine, Save, CheckCircle, Info, ArrowLeft, Loader2 } from 'lucide-react';
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
            <p className="text-gray-500 font-bold">该分类不存在</p>
            <Link href="/categories" className="text-teal-600 hover:underline">返回分类管理</Link>
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

  const formattedDate = synthesis ? new Date(synthesis.updatedAt).toLocaleString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {category?.name} · 知识综述
                    </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight uppercase">
                    {category?.name} · 知识综述
                </h1>
            </div>
            
            <button 
                onClick={() => router.push('/categories')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-gray-900 hover:bg-gray-200 transition-all shadow-sm"
            >
                <ArrowLeft size={16} />
                返回分类
            </button>
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="animate-spin text-teal-600" size={40} />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">正在调取结构化综述...</p>
            </div>
        ) : !synthesis ? (
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-16 text-center space-y-8 mx-4">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center shadow-inner mx-auto font-serif">
                    <Bot size={40} className="text-gray-200" />
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-gray-900">该领域暂无全局综述</h3>
                        <p className="text-sm font-medium text-gray-400 max-w-sm mx-auto">当笔记积累到一定规模，Graphify 将自动唤醒 Claude 为您生成跨笔记的结构化综述。</p>
                    </div>
                    
                    <div className="max-w-xs mx-auto space-y-4">
                        <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                            <span>编译进度</span>
                            <span>{category?.noteCount || 0} / {category?.synthesisTriggerCount || 5}</span>
                        </div>
                        <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100 shadow-inner p-[1px]">
                            <div 
                                className="h-full bg-gradient-to-r from-teal-500 to-blue-500 rounded-full transition-all duration-[2s]" 
                                style={{ width: `${Math.min(100, ((category?.noteCount || 0) / (category?.synthesisTriggerCount || 5)) * 100)}%` }} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-12 pb-20">
                {/* AI Synthesis Section */}
                <div className="bg-white rounded-[40px] p-8 md:p-14 border border-gray-100 shadow-md relative overflow-hidden mx-2 md:mx-0">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-blue-500 opacity-50" />
                    
                    <div className="prose prose-slate max-w-none font-serif
                        [&>h1]:font-sans [&>h1]:text-4xl [&>h1]:font-black [&>h1]:text-gray-900 [&>h1]:mb-12 [&>h1]:mt-4 [&>h1]:leading-tight
                        [&>h2]:font-sans [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-12 [&>h2]:mb-6 [&>h2]:flex [&>h2]:items-center [&>h2]:gap-3
                        [&>h3]:font-sans [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-gray-900 [&>h3]:mt-10 [&>h3]:mb-4
                        [&>p]:text-gray-800 [&>p]:leading-[2.2] [&>p]:mb-8 [&>p]:text-[1.15rem] [&>p]:tracking-normal
                        [&>hr]:border-gray-100 [&>hr]:my-12
                        [&>ul]:list-none [&>ul]:pl-0 [&>ul]:space-y-6 [&>ul]:mb-8
                        [&>ul>li]:relative [&>ul>li]:pl-8 [&>ul>li]:text-[1.1rem] [&>ul>li]:leading-[1.8]
                        [&>ul>li]:text-gray-700
                        [&>ul>li::before]:content-[''] [&>ul>li::before]:absolute [&>ul>li::before]:left-0 [&>ul>li::before]:top-[0.8em] [&>ul>li::before]:w-2 [&>ul>li::before]:h-2 [&>ul>li::before]:bg-teal-500 [&>ul>li::before]:rounded-full
                        [&_strong]:font-bold [&_strong]:text-gray-900
                        selection:bg-teal-100
                    ">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {synthesis.aiContent}
                        </ReactMarkdown>
                    </div>
                </div>

                {/* User Annotation Section */}
                <div className="px-2 md:px-0 space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">沉淀与洞察</h3>
                            {showSavedToast && (
                                <span className="flex items-center gap-1.5 text-xs text-teal-600 font-black animate-in fade-in slide-in-from-left-2 duration-300">
                                    <CheckCircle size={16} />
                                    已存档
                                </span>
                            )}
                        </div>
                        {!isEditing ? (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-5 py-2 bg-white text-teal-600 border border-teal-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-50 transition-all shadow-sm"
                            >
                                <PenLine size={14} />
                                修正洞察
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-[10px] font-black uppercase text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    取消
                                </button>
                                <button 
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-500/20 disabled:bg-gray-300"
                                >
                                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    保存存档
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={`transition-all duration-500 ${isEditing ? 'scale-[1.005]' : ''}`}>
                        {isEditing ? (
                            <textarea
                                autoFocus
                                value={annotation}
                                onChange={(e) => setAnnotation(e.target.value)}
                                placeholder="在此记录您对该领域的独创见解..."
                                className="w-full min-h-[400px] p-10 md:p-14 bg-white border-2 border-teal-50 rounded-[40px] outline-none resize-none font-serif text-[1.15rem] text-gray-800 leading-[2] shadow-2xl"
                            />
                        ) : (
                            <div 
                                onClick={() => setIsEditing(true)}
                                className={`w-full min-h-[300px] p-10 md:p-14 border rounded-[40px] cursor-text transition-all duration-300 hover:shadow-xl ${
                                    !annotation 
                                        ? 'bg-gray-50/30 border-dashed border-gray-200 flex flex-col items-center justify-center space-y-4' 
                                        : 'bg-white border-gray-100 shadow-sm'
                                }`}
                            >
                                {annotation ? (
                                    <div className="prose prose-slate max-w-none font-serif text-gray-700 italic leading-[2] text-[1.1rem]">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {annotation}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-2">
                                            <PenLine size={24} className="text-gray-200" />
                                        </div>
                                        <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.3em]">点击此处开始思想沉淀</p>
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
