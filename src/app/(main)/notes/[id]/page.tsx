"use client";

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotesStore } from '@/store/notes';
import { RELATION_CONFIG } from '@/lib/relation-config';
import { ArrowLeft, ChevronRight, Edit3, X, AlertCircle, Info, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { notes, removeLink } = useNotesStore();
  
  const note = notes.find((n) => n.id === id);
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <div className="text-6xl text-gray-200">404</div>
        <p className="text-gray-500">该笔记不存在或已被删除</p>
        <Link href="/notes" className="text-blue-600 hover:underline">返回笔记列表</Link>
      </div>
    );
  }

  const handleRemoveLink = (targetId: string) => {
    removeLink(note.id, targetId);
    setDeleteLinkId(null);
  };

  const formattedDate = new Date(note.createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* 顶部导航 */}
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

        <button 
          onClick={() => router.push(`/notes/new?overwrite=${note.id}`)}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-bold"
        >
          <Edit3 size={16} />
          覆盖更新
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* 左侧 - 笔记内容 */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-[40px] p-8 md:p-14 border border-gray-100 shadow-sm space-y-10">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {note.categoryName}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{formattedDate}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-[1.1] tracking-tight">
                {note.title}
              </h1>
            </div>

            <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed [&>h2]:text-xl [&>h2]:font-bold [&>h2]:text-gray-900 [&>h2]:mt-8 [&>h2]:mb-4 [&>h2]:pb-2 [&>h2]:border-b [&>h2]:border-gray-50 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2 [&>code]:bg-gray-100 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-blue-600 [&>code]:text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {note.content}
              </ReactMarkdown>
            </div>

            <div className="flex flex-wrap gap-2 pt-8 border-t border-gray-50">
              {note.tags.map(tag => (
                <span key={tag} className="px-4 py-1.5 bg-gray-50 text-gray-500 rounded-full text-xs font-bold border border-gray-100 italic">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧 - 关联区 */}
        <div className="w-full lg:w-[350px] shrink-0">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-gray-900">关联笔记 ({note.links.length})</h3>
            </div>

            <div className="space-y-3">
              {note.links.length > 0 ? (
                note.links.map((link) => {
                  const config = RELATION_CONFIG[link.relationType];
                  const linkedNote = notes.find(n => n.id === link.targetNoteId);
                  const isUncertain = link.relationConfidence === 'uncertain';
                  const isInferred = link.relationConfidence === 'inferred';

                  return (
                    <div 
                      key={link.targetNoteId}
                      className={`group relative bg-white border rounded-xl p-4 transition-all duration-300 hover:shadow-md cursor-pointer ${
                        isUncertain ? 'bg-gray-50/50 border-gray-200 grayscale-[0.5]' : 'border-gray-100'
                      }`}
                      onClick={() => router.push(`/notes/${link.targetNoteId}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span 
                            className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${config.color}15`, color: config.color }}
                          >
                            {config.emoji} {config.label} {Math.round(link.similarityScore * 100)}%
                          </span>
                          {isUncertain && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
                              <AlertCircle size={10} />
                              待确认
                            </span>
                          )}
                          {isInferred && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              <Info size={10} />
                              AI推断
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteLinkId(link.targetNoteId);
                          }}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                        <span>{link.sourceCategoryName}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                        {linkedNote?.title || '未知笔记'}
                      </h4>
                    </div>
                  );
                })
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-sm text-gray-400">暂无关联笔记，知识图谱构建中...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 删除关联确认弹窗 */}
      {deleteLinkId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-900">确认撤销关联？</h3>
              <p className="text-sm text-gray-500">撤销后，你可以通过重新运行生成来尝试找回这条链接。</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteLinkId(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => handleRemoveLink(deleteLinkId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                确认撤销
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
