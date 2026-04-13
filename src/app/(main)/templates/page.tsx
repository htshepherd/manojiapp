"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, FileText, Save, Loader2, Bot } from "lucide-react";
import { useTemplatesStore, PromptTemplate } from "@/store/templates";

export default function TemplatesPage() {
  const { templates, fetchTemplates, addTemplate, updateTemplate, deleteTemplate, isLoading } = useTemplatesStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<PromptTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreateModal = () => {
    setEditingTpl(null);
    setName("");
    setType("通用类");
    setPromptTemplate("");
    setDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (tpl: PromptTemplate) => {
    setEditingTpl(tpl);
    setName(tpl.name);
    setType(tpl.type);
    setPromptTemplate(tpl.promptTemplate);
    setDescription(tpl.description || "");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !promptTemplate.trim()) return;

    setIsSaving(true);
    const finalType = type.trim() || "通用类";
    let success = false;
    if (editingTpl) {
      success = await updateTemplate(editingTpl.id, { name, type: finalType, promptTemplate, description });
    } else {
      success = await addTemplate({ name, type: finalType, promptTemplate, description });
    }
    
    setIsSaving(false);
    if (success) {
      setIsModalOpen(false);
    } else {
      alert("保存失败");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("确定删除该模版吗？")) {
      const success = await deleteTemplate(id);
      if (!success) {
        alert("删除失败：请检查网络连接或登录状态。");
      }
    }
  };

  return (
    <div className="flex flex-col h-full space-y-10 animate-in fade-in duration-500">
      <div className="hidden md:flex items-end justify-between px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">模版管理</h1>
          <p className="text-sm font-bold text-gray-400">定义和维护 AI 的知识提炼逻辑</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl hover:bg-teal-600 transition-all font-black uppercase text-xs tracking-widest shadow-lg active:scale-95"
        >
          <Plus size={18} />
          新建模版
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-[32px] animate-pulse" />)
        ) : (
            templates.map((tpl) => (
                <div
                    key={tpl.id}
                    className="group relative bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[200px]"
                    onClick={() => openEditModal(tpl)}
                >
                    <div className="relative space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="p-2.5 rounded-xl bg-gray-50 text-gray-600">
                        <FileText size={20} />
                        </div>
                        <button 
                        onClick={(e) => handleDelete(e, tpl.id)} 
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 rounded-xl transition-all translate-x-4 group-hover:translate-x-0"
                        >
                        <Trash2 size={16} />
                        </button>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider bg-gray-900 text-white">
                            {tpl.type || "未归类"}
                        </span>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight line-clamp-1">{tpl.name}</h3>
                        <p className="text-[11px] font-bold text-gray-400 leading-snug line-clamp-2">
                        {tpl.description || "暂无备注"}
                        </p>
                    </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">{tpl.promptTemplate?.length || 0} 字符</span>
                    <div className="text-teal-600 opacity-0 group-hover:opacity-100 transition-all">
                        <Edit2 size={14} />
                    </div>
                    </div>
                </div>
            ))
        )}
      </div>

      {!isLoading && templates.length === 0 && (
        <div className="py-24 text-center bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200 space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner mx-auto">
            <Bot size={32} className="text-gray-200" />
          </div>
          <div className="space-y-2">
            <p className="text-gray-900 font-black uppercase tracking-widest">暂无处理模版</p>
            <p className="text-xs text-gray-400 font-medium">您可以点击右上角手动创建一个，或重新登录以恢复默认模版。</p>
          </div>
          <button 
            onClick={openCreateModal}
            className="hidden md:inline-block px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-teal-600 transition-all active:scale-95"
          >
            立即创建模版
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/5 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white w-full sm:w-[500px] shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-500 relative">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                {editingTpl ? "编辑模版" : "新建模版"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 block">模版名称</label>
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="如：学术文献"
                    className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/5 px-6 py-4 rounded-2xl outline-none transition-all text-base md:text-sm font-bold shadow-inner"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 block">模版类型</label>
                  <input
                    type="text"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="如：职场类"
                    className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/5 px-6 py-4 rounded-2xl outline-none transition-all text-base md:text-sm font-bold shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 block">处理指令 (Prompt)</label>
                <textarea
                  rows={8}
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  placeholder="请输入具体的 AI 提示词..."
                  className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/5 px-8 py-8 rounded-[32px] outline-none transition-all text-base md:text-xs font-mono font-bold leading-relaxed resize-none shadow-inner"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 block">模版备注</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="描述该模版的适用场景..."
                  className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/5 px-6 py-4 rounded-2xl outline-none transition-all text-base md:text-xs font-bold leading-relaxed resize-none shadow-inner"
                />
              </div>
            </div>

            <div className="p-8 border-t border-gray-50 bg-white">
              <button
                disabled={!name.trim() || !promptTemplate.trim() || isSaving}
                onClick={handleSave}
                className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-gray-200 hover:bg-teal-600 transition-all active:scale-95 disabled:bg-gray-100 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                保存模版
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
