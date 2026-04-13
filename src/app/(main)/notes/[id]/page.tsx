"use client";

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useNotesStore } from '@/store/notes';
import { RELATION_CONFIG } from '@/lib/relation-config';
import { ArrowLeft, Edit3, X, Info, Loader2, Trash2 } from 'lucide-react';
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

  // 记录阅读历史（为随机漫步提供沉睡数据）
  useEffect(() => {
    if (token && id) {
      fetch(`/api/notes/${id}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      }).catch(() => {}); // 失败时不报错，保证核心阅读体验
    }
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

  const handleDeleteNote = async () => {
    if (confirm('确认要永久删除这条笔记吗？此操作不可撤销。')) {
      try {
        const res = await fetch(`/api/notes/${note!.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          router.push('/notes');
        } else {
          alert('删除失败');
        }
      } catch (err) {
        alert('网络错误');
      }
    }
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
    <div className="flex flex-col h-full animate-in fade-in duration-500 pb-10">
      {/* 顶部工具栏 - Sticky for Mobile */}
      <div className="flex items-center justify-between sticky top-[var(--nav-top-h)] bg-[#fdfdfd]/95 backdrop-blur-md z-10 -mx-3 px-3 py-3 border-b border-gray-50 md:static md:bg-transparent md:mx-0 md:p-0 md:border-b-0 md:mb-8 md:items-end">
        <button 
          onClick={() => router.push('/notes')}
          className="flex items-center gap-2 h-11 px-2 text-sm font-black text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
            <ArrowLeft size={18} />
          </div>
          <span className="hidden xs:inline">返回</span>
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push(`/notes/new?overwrite=${note.id}`)}
            className="h-11 flex items-center gap-2 px-4 bg-white border border-teal-200 text-teal-600 rounded-xl active:bg-teal-50 transition-colors text-xs font-black uppercase tracking-widest shadow-sm"
          >
            <Edit3 size={15} />
            <span className="hidden sm:inline">更正</span>
          </button>
          <button 
            onClick={handleDeleteNote}
            className="h-11 w-11 flex items-center justify-center text-gray-400 active:text-red-500 active:bg-red-50 rounded-xl transition-all"
            title="删除笔记"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 mt-4 md:mt-0">
        <div className="flex-1 min-w-0">
          <article className="bg-white rounded-2xl md:rounded-[40px] p-4 md:p-14 border border-teal-50/50 md:border-gray-100 shadow-sm space-y-6 md:space-y-10">
            {/* 标题区 */}
            <div className="space-y-3 md:space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-2.5 py-0.5 bg-teal-50 text-teal-600 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest leading-none">
                  {note.categoryName}
                </span>
                <span className="text-[10px] md:text-[11px] text-gray-400 font-bold uppercase tracking-tighter">{formattedDate}</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 leading-snug md:leading-[1.3] tracking-tight">
                {note.title}
              </h1>
            </div>

            {/* 阅读区 (Reader Mode) */}
            <div className="prose prose-slate max-w-none font-sans
              [&>h2]:text-xl md:[&>h2]:text-2xl [&>h2]:font-black [&>h2]:text-gray-900 [&>h2]:mt-10 [&>h2]:mb-4
              [&>h3]:text-lg md:[&>h3]:text-xl [&>h3]:font-black [&>h3]:text-gray-900 [&>h3]:mt-8 [&>h3]:mb-4
              [&>p]:text-gray-800 [&>p]:leading-relaxed md:[&>p]:leading-relaxed [&>p]:mb-6 [&>p]:text-[16px] md:[&>p]:text-[1.1rem] [&>p]:font-medium
              [&>hr]:border-gray-100 [&>hr]:my-8
              [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-6
              [&>ul>li]:mb-2 [&>ul>li]:text-[16px] md:[&>ul>li]:text-[1.1rem] [&>ul>li]:font-medium
              [&_strong]:font-black [&_strong]:text-gray-900
              [&_blockquote]:border-l-4 [&_blockquote]:border-teal-500/20 [&_blockquote]:bg-gray-50/50 [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl [&_blockquote]:italic
              [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:text-xs md:[&_pre]:text-sm [&_pre]:overflow-x-auto
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {note.content}
              </ReactMarkdown>
            </div>

            {/* 标签 */}
            <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-50">
              {note.tags?.map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-gray-50 text-gray-500 rounded-lg text-[10px] md:text-xs font-bold border border-gray-100">
                  #{tag}
                </span>
              ))}
            </div>
          </article>
        </div>

        {/* 关联侧边栏 */}
        <aside className="w-full lg:w-[320px] shrink-0">
          <div className="sticky top-20 space-y-4">
            <h3 className="text-sm md:text-lg font-black text-gray-900 tracking-tight px-2 uppercase">相关关联 ({note.links?.length || 0})</h3>

            <div className="space-y-3">
              {note.links && note.links.length > 0 ? (
                note.links.map((link) => {
                  const config = RELATION_CONFIG[link.relationType] || { emoji: '🔗', label: '关联', color: '#94a3b8' };
                  const isUncertain = link.relationConfidence === 'uncertain';

                  return (
                    <div 
                      key={link.targetNoteId}
                      className={`group relative bg-white border rounded-2xl p-4 transition-all duration-300 active:scale-[0.98] ${
                        isUncertain ? 'opacity-60 grayscale' : 'border-gray-100 shadow-sm'
                      }`}
                      onClick={() => router.push(`/notes/${link.targetNoteId}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span 
                          className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border"
                          style={{ backgroundColor: `${config.color}05`, color: config.color, borderColor: `${config.color}15` }}
                        >
                          {config.emoji} {config.label}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteLinkId(link.targetNoteId);
                          }}
                          className="text-gray-200 active:text-red-500 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <h4 className="text-sm font-black text-gray-800 line-clamp-2 leading-snug">
                        {link.targetNoteTitle || '加载中...'}
                      </h4>
                    </div>
                  );
                })
              ) : (
                <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl p-8 text-center flex flex-col items-center">
                  <p className="text-[11px] text-gray-400 font-bold max-w-[180px]">暂无自动联想的火花。</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* 删除关联确认弹窗 */}
      {deleteLinkId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-[32px] md:rounded-[40px] shadow-2xl w-full max-w-sm p-8 space-y-6 animate-in slide-in-from-bottom duration-300">
             <div className="text-center space-y-4">
              <p className="text-sm font-black text-gray-900 uppercase tracking-widest">确认撤销关联？</p>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => handleRemoveLink(deleteLinkId)}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95"
                >
                  确认撤销
                </button>
                <button 
                  onClick={() => setDeleteLinkId(null)}
                  className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-xs"
                >
                  取消
                </button>
              </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
