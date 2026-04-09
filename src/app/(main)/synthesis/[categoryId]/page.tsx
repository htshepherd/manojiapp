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
  
  const { syntheses, updateAnnotation } = useSynthesisStore();
  const categories = useCategoriesStore((state) => state.categories);
  
  const category = categories.find(c => c.id === categoryId);
  const synthesis = syntheses[categoryId];

  const [isEditing, setIsEditing] = useState(false);
  const [annotation, setAnnotation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    if (synthesis) {
        setAnnotation(synthesis.userAnnotation || '');
    }
  }, [synthesis]);

  if (!category) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <p className="text-gray-500">分类不存在</p>
            <Link href="/categories" className="text-blue-600 hover:underline">返回分类管理</Link>
        </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(r => setTimeout(r, 600));
    updateAnnotation(categoryId, annotation);
    setIsSaving(false);
    setIsEditing(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const formattedDate = synthesis ? new Date(synthesis.updatedAt).toLocaleString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* 顶部面包屑 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Link href="/categories" className="hover:text-blue-600 transition-colors">分类管理</Link>
          <ChevronRight size={12} />
          <span className="text-gray-900">{category.name} / 综述</span>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                    {category.name} · 知识综述
                </h1>
                {synthesis ? (
                    <p className="text-[10px] font-black text-gray-400 mt-3 flex items-center gap-2 uppercase tracking-widest">
                        <Info size={14} />
                        基于 {synthesis.basedOnCount} 篇笔记提炼 · 更新于 {formattedDate}
                    </p>
                ) : (
                    <div className="h-5" />
                )}
            </div>
            
            <button 
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
            >
                <ArrowLeft size={16} />
                返回
            </button>
        </div>
      </div>

      {!synthesis ? (
        /* 空状态 */
        <div className="bg-gray-50 rounded-3xl border border-dashed border-gray-200 p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner mx-auto">
                <Bot size={32} className="text-gray-200" />
            </div>
            <div className="space-y-4">
                <div className="space-y-1">
                    <h3 className="text-gray-900 font-bold">该分类暂无综述</h3>
                    <p className="text-sm text-gray-400">笔记积累后 Graphify 将自动利用深度模型为您生成综述</p>
                </div>
                
                <div className="max-w-xs mx-auto space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-400">
                        <span>生成进度</span>
                        <span>{category.noteCount} / {category.synthesisTriggerCount} 篇</span>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden border border-gray-100 shadow-inner">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-1000" 
                            style={{ width: `${Math.min(100, (category.noteCount / category.synthesisTriggerCount) * 100)}%` }} 
                        />
                    </div>
                    <p className="text-[10px] text-gray-400">已有 {category.noteCount} 篇，再积累 {Math.max(0, category.synthesisTriggerCount - category.noteCount)} 篇即可触发生成</p>
                </div>
            </div>
        </div>
      ) : (
        /* 综述内容区 */
        <div className="space-y-10">
            {/* AI 生成层 */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-black uppercase tracking-wider">
                        <Bot size={12} />
                        AI 生成 · 只读
                    </div>
                </div>
                
                <div className="relative group">
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gray-100 rounded-full" />
                    <div className="bg-gray-50/50 rounded-2xl p-8 border border-gray-100/50 cursor-default select-none">
                        <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed text-sm [&>h1]:text-2xl [&>h1]:font-black [&>h1]:mb-6 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-8 [&>h2]:mb-4 [&>h3]:text-base [&>h3]:font-bold [&>h3]:mt-6 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {synthesis.aiContent}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>

            {/* 用户批注层 */}
            <div className="space-y-4 pt-10 border-t border-gray-100">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <h3 className="font-black text-gray-900">📝 我的批注</h3>
                        {showSavedToast && (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-bold animate-in fade-in slide-in-from-left-2 duration-300">
                                <CheckCircle size={14} />
                                已保存
                            </span>
                        )}
                    </div>
                    {!isEditing ? (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold transition-colors"
                        >
                            <PenLine size={14} />
                            编辑
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1.5 text-gray-500 hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors"
                            >
                                取消
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                保存
                            </button>
                        </div>
                    )}
                </div>

                <div className={`min-h-[200px] transition-all duration-300 ${isEditing ? 'ring-2 ring-blue-500/20' : ''}`}>
                    {isEditing ? (
                        <textarea
                            value={annotation}
                            onChange={(e) => setAnnotation(e.target.value)}
                            placeholder="点击编辑添加批注，支持 Markdown 语法..."
                            className="w-full h-full min-h-[240px] p-6 bg-white border border-blue-100 rounded-2xl outline-none resize-none text-sm text-gray-700 leading-relaxed shadow-inner"
                        />
                    ) : (
                        <div 
                            onClick={() => setIsEditing(true)}
                            className={`w-full min-h-[200px] p-8 border border-gray-100 rounded-2xl cursor-text transition-colors hover:border-blue-100 ${
                                !annotation ? 'bg-gray-50/30 flex items-center justify-center' : 'bg-white'
                            }`}
                        >
                            {annotation ? (
                                <div className="prose prose-sm prose-blue max-w-none text-gray-600 [&>p]:mb-3">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {annotation}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-300 font-medium">点击编辑添加批注...</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
