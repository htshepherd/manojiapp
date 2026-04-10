"use client";

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useNotesStore } from '@/store/notes';
import { RELATION_CONFIG } from '@/lib/relation-config';
import { ArrowLeft, Edit3, X, AlertCircle, Info, Loader2, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Note } from '@/types';

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { removeLink } = useNotesStore();
  const token = useAuthStore(state => state.token);
  
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/notes/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setNote(data.note);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) fetchDetail();
  }, [id, token]);

  const handleRemoveLink = async (targetId: string) => {
    const success = await removeLink(note!.id, targetId);
    if (success) {
      setNote(prev => prev ? {
        ...prev,
        links: prev.links.filter(l => l.targetNoteId !== targetId)
      } : null);
    }
    setDeleteLinkId(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Loader2 className="animate-spin text-teal-600 mb-4" size={40} />
        <p className="text-gray-400 font-bold">载入中...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="text-6xl text-gray-200 font-black">404</div>
        <p className="text-gray-500 font-bold">该笔记不存在或已被删除</p>
        <Link href="/notes" className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-black uppercase tracking-widest">返回笔记列表</Link>
      </div>
    );
  }

  const formattedDate = new Date(note.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => router.push('/notes')}
          className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <div className="p-2 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors">
            <ArrowLeft size={18} />
          </div>
          返回列表
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push(`/notes/new?overwrite=${note.id}`)}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-teal-200 text-teal-600 rounded-xl hover:bg-teal-50 transition-colors text-sm font-bold shadow-sm"
          >
            <Edit3 size={16} />
            更正提炼
          </button>
          <button 
            onClick={() => {
              if (confirm('确认要永久删除这条笔记吗？此操作不可撤销。')) {
                const token = localStorage.getItem('auth-storage') 
                  ? JSON.parse(localStorage.getItem('auth-storage')!).state.token 
                  : null;
                fetch(`/api/notes/${note.id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                }).then(() => router.push('/notes'));
              }
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="删除笔记"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-[40px] p-8 md:p-14 border border-gray-100 shadow-sm space-y-10">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {note.categoryName}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{formattedDate}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-[1.3] tracking-tight">
                {note.title}
              </h1>
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
                {note.content}
              </ReactMarkdown>
            </div>

            <div className="flex flex-wrap gap-2 pt-8 border-t border-gray-50">
              {note.tags?.map(tag => (
                <span key={tag} className="px-4 py-1.5 bg-gray-50 text-gray-500 rounded-full text-xs font-bold border border-gray-100 italic">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[350px] shrink-0">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-extrabold text-gray-900">基于语义的关联 ({note.links?.length || 0})</h3>
            </div>

            <div className="space-y-3">
              {note.links && note.links.length > 0 ? (
                note.links.map((link) => {
                  const config = RELATION_CONFIG[link.relationType] || { emoji: '🔗', label: '关联', color: '#94a3b8' };
                  const isUncertain = link.relationConfidence === 'uncertain';
                  const isInferred = link.relationConfidence === 'inferred';

                  return (
                    <div 
                      key={link.targetNoteId}
                      className={`group relative bg-white border rounded-[20px] p-5 transition-all duration-300 hover:shadow-xl cursor-pointer ${
                        isUncertain ? 'opacity-60 grayscale' : 'border-gray-100 shadow-sm'
                      }`}
                      onClick={() => router.push(`/notes/${link.targetNoteId}`)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span 
                            className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shadow-inner"
                            style={{ backgroundColor: `${config.color}10`, color: config.color, borderColor: `${config.color}20` }}
                          >
                            {config.emoji} {config.label} {Math.round(link.similarityScore * 100)}%
                          </span>
                          {isUncertain && (
                            <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                              <AlertCircle size={10} />
                              待验证
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteLinkId(link.targetNoteId);
                          }}
                          className="text-gray-200 hover:text-red-500 transition-colors p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">
                        {link.sourceCategoryName}
                      </div>
                      <h4 className="text-sm font-black text-gray-900 group-hover:text-teal-600 transition-colors line-clamp-2 leading-snug">
                        {link.targetNoteTitle || '加载中...'}
                      </h4>
                    </div>
                  );
                })
              ) : (
                <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-[30px] p-10 text-center flex flex-col items-center">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md mb-4">
                    <Info size={24} className="text-gray-200" />
                  </div>
                  <p className="text-xs text-gray-400 font-bold max-w-[180px] leading-relaxed">暂无关联笔记。随着笔记库丰富，Graphify 会自动建立链接。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {deleteLinkId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-10 space-y-8">
            <div className="space-y-3 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <X size={32} />
                </div>
              <h3 className="text-xl font-black text-gray-900">撤销这条关联？</h3>
              <p className="text-sm text-gray-500 font-medium">撤销后，你可以通过重新运行生成来尝试找回这条链接。</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => handleRemoveLink(deleteLinkId)}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95"
              >
                确认撤销
              </button>
              <button 
                onClick={() => setDeleteLinkId(null)}
                className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
