"use client";

import { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCategoriesStore } from '@/store/categories';
import { useNotesStore } from '@/store/notes';
import { Loader2, RotateCcw, Sparkles, CheckCircle2, ArrowRight, ChevronLeft, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function NewNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const overwriteId = searchParams.get('overwrite');
  
  const categories = useCategoriesStore((state) => state.categories);
  const { generateNote, undoNote, fetchNotes } = useNotesStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed'>('idle');
  const [loadingStep, setLoadingStep] = useState(0);
  const [undoTimer, setUndoTimer] = useState(0);
  const [generatedNote, setGeneratedNote] = useState<any | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const charCount = inputText.length;
  const isOverLimit = charCount > 6000;
  
  const steps = [
    "正在通过 Claude 提炼摘要...",
    "正在提取关键实体...",
    "正在持久化到第二大脑...",
    "正在同步向量数据库...",
    "后端处理完成"
  ];

  // 挂载时拉取分类
  useEffect(() => {
    useCategoriesStore.getState().fetchCategories();
    
    // 如果是更正模式，加载原始笔记数据
    if (overwriteId) {
        const fetchOriginal = async () => {
            const token = useCategoriesStore.getState().token || (localStorage.getItem('auth-storage') 
                ? JSON.parse(localStorage.getItem('auth-storage')!).state.token 
                : null);
            try {
                const res = await fetch(`/api/notes/${overwriteId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.note) {
                    setCategoryId(data.note.categoryId);
                    setInputText(data.note.sourceText || data.note.content);
                }
            } catch (err) {
                console.error('Failed to load original note:', err);
            }
        };
        fetchOriginal();
    }
  }, [overwriteId]);

  const handleGenerate = async () => {
    if (!categoryId || !inputText || isOverLimit) return;

    setCurrentStep(2);
    setStatus('processing');
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
        setLoadingStep(prev => Math.min(prev + 1, steps.length - 2));
    }, 1200);

    try {
        const data = await generateNote(categoryId, inputText, overwriteId || undefined);
        clearInterval(stepInterval);
        setLoadingStep(steps.length - 1);
        
        setGeneratedNote(data.note);
        setStatus('completed');
        setUndoTimer(5);
    } catch (error) {
        clearInterval(stepInterval);
        alert('生成失败，请检查网络或配置');
        setCurrentStep(1);
        setStatus('idle');
    }
  };

  useEffect(() => {
    if (status === 'completed' && undoTimer > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setUndoTimer(prev => prev - 1);
      }, 1000);
    } else if (undoTimer === 0 && status === 'completed') {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, undoTimer]);

  const handleUndo = async () => {
    if (generatedNote && generatedNote.id) {
      const success = await undoNote(generatedNote.id);
      if (success) {
        setUndoTimer(0);
        setStatus('idle');
        setGeneratedNote(null);
        setCurrentStep(1);
      }
    }
  };

  const handleFinishAndNext = () => {
    setGeneratedNote(null);
    setInputText('');
    setCategoryId('');
    setStatus('idle');
    setCurrentStep(1);
    setUndoTimer(0);
    fetchNotes(); // 刷新后台数据
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col overflow-hidden pb-2">
        {currentStep === 1 ? (
          <div className="bg-white rounded-[40px] pt-6 px-8 md:px-12 pb-6 shadow-sm border border-gray-100 flex flex-col flex-1 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
            <div className="flex flex-col space-y-6 overflow-y-auto pr-2 no-scrollbar flex-1 pb-6">
                <div className="shrink-0">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                        {overwriteId ? '选择更正所属分类' : '选择分类'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <button
                        key={cat.id}
                        onClick={() => setCategoryId(cat.id)}
                        className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border ${
                            categoryId === cat.id
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xl shadow-teal-500/20 scale-105'
                            : 'bg-white text-gray-500 border-gray-100 hover:border-teal-200 hover:text-teal-600'
                        }`}
                        >
                        {cat.name}
                        </button>
                    ))}
                    </div>
                </div>

                <div className="space-y-2 flex-1 flex flex-col">
                    <div className="flex items-center justify-between shrink-0">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">输入内容原文</label>
                        <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                            isOverLimit ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                            {charCount} / 6000 字符
                        </div>
                    </div>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="在此粘贴对话、摘要或知识片段，漫记将为您进行智能化提炼..."
                        className="w-full flex-1 bg-gray-50/50 border border-transparent rounded-[32px] px-8 py-8 focus:ring-8 focus:ring-teal-500/5 focus:bg-white focus:border-teal-500/20 outline-none transition-all resize-none text-gray-800 leading-relaxed text-lg shadow-inner"
                    />
                </div>
            </div>

            <div className="flex justify-end py-4 border-t border-gray-50 shrink-0">
                <button
                    onClick={handleGenerate}
                    disabled={!categoryId || !inputText || isOverLimit}
                    className="flex items-center gap-3 px-12 py-5 bg-gray-900 text-white rounded-[24px] font-black hover:bg-teal-600 transition-all hover:shadow-2xl hover:shadow-teal-500/20 active:scale-95 disabled:bg-gray-100 disabled:text-gray-300"
                >
                    {overwriteId ? '更正提炼' : '开始 AI 提炼'}
                    <ArrowRight size={20} />
                </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden flex flex-col flex-1 animate-in slide-in-from-right-4 duration-500">
             {status === 'processing' ? (
               <div className="flex-1 p-12 flex flex-col items-center justify-center space-y-12">
                  <div className="relative">
                      <div className="w-24 h-24 border-4 border-teal-50 border-t-teal-500 rounded-full animate-spin" />
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-500" size={32} />
                  </div>
                  <div className="space-y-6 w-full max-w-sm">
                      {steps.map((step, index) => (
                          <div key={index} className={`flex items-center gap-4 transition-all duration-500 ${index <= loadingStep ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                              {index < loadingStep ? (
                                  <CheckCircle2 size={20} className="text-teal-500" />
                              ) : index === loadingStep ? (
                                  <Loader2 size={20} className="animate-spin text-teal-500" />
                              ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-100" />
                              )}
                              <span className={`text-[11px] font-black uppercase tracking-widest ${index === loadingStep ? 'text-teal-600' : index < loadingStep ? 'text-gray-900' : 'text-gray-300'}`}>
                                  {step}
                              </span>
                          </div>
                      ))}
                  </div>
               </div>
             ) : (
               <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex-1 p-8 md:p-14 overflow-y-auto space-y-10 no-scrollbar">
                      <div className="space-y-4">
                          <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[10px] font-black rounded-full uppercase tracking-widest">提炼结果</span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date().toLocaleDateString()}</span>
                          </div>
                          <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-[1.3] tracking-tight">{generatedNote?.title}</h1>
                      </div>

                      <div className="prose prose-slate max-w-none font-serif
                        [&>h3]:font-sans [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-gray-900 [&>h3]:mt-8 [&>h3]:mb-4
                        [&>p]:text-gray-800 [&>p]:leading-[2] [&>p]:mb-6 [&>p]:text-[1.1rem] [&>p]:indent-0 [&>p]:tracking-wide
                        [&>hr]:border-gray-200 [&>hr]:my-6
                        [&>ul]:list-none [&>ul]:pl-0
                        [&>ul>li]:relative [&>ul>li]:pl-6 [&>ul>li]:mb-4
                        [&>ul>li::before]:content-[''] [&>ul>li::before]:absolute [&>ul>li::before]:left-0 [&>ul>li::before]:top-[0.8em] [&>ul>li::before]:w-1.5 [&>ul>li::before]:h-1.5 [&>ul>li::before]:bg-gray-400 [&>ul>li::before]:rounded-full
                        [&_strong]:font-bold [&_strong]:text-gray-900
                      ">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {generatedNote?.content || ''}
                          </ReactMarkdown>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-8 border-t border-gray-50">
                      {generatedNote?.tags?.map((tag: string) => (
                          <span key={tag} className="px-4 py-1.5 bg-gray-50 text-gray-400 rounded-full text-xs font-black uppercase tracking-widest border border-gray-100">
                          #{tag}
                          </span>
                      ))}
                      </div>
                  </div>

                  <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between shrink-0">
                      <button 
                          onClick={() => setCurrentStep(1)}
                          className="flex items-center gap-2 px-6 py-3 text-gray-400 hover:text-gray-900 font-black uppercase text-xs tracking-widest transition-all"
                      >
                          <ChevronLeft size={18} />
                          返回修改原文
                      </button>

                      <div className="flex items-center gap-4">
                          {undoTimer > 0 && (
                              <button 
                                  onClick={handleUndo}
                                  className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-100 transition-all active:scale-95"
                              >
                                  <RotateCcw size={16} />
                                  撤销并重来 ({undoTimer}s)
                              </button>
                          )}
                          <button 
                              onClick={handleFinishAndNext}
                              className="flex items-center gap-3 px-10 py-4 bg-gray-900 text-white rounded-[24px] font-black hover:bg-teal-600 transition-all shadow-xl shadow-gray-200 active:scale-95"
                          >
                              <Save size={20} />
                              保存并记录下一篇
                          </button>
                      </div>
                  </div>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
