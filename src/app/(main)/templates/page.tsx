"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X, Component, FileText, Check, Save } from "lucide-react";
import { useTemplatesStore, PromptTemplate } from "@/store/templates";

export default function TemplatesPage() {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplatesStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<PromptTemplate | null>(null);
  
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [description, setDescription] = useState("");

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

  const handleSave = () => {
    if (!name.trim() || !type.trim() || !promptTemplate.trim()) return;

    if (editingTpl) {
      updateTemplate(editingTpl.id, { name, type, promptTemplate, description });
    } else {
      addTemplate({ name, type, promptTemplate, description });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full space-y-10 animate-in fade-in duration-500">
      <div className="flex items-end justify-between px-2">
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
        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="group relative bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[180px]"
            onClick={() => openEditModal(tpl)}
          >
            <div className="relative space-y-4">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-gray-50 text-gray-600">
                  <FileText size={20} />
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl.id); }} 
                  className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 rounded-xl transition-all translate-x-4 group-hover:translate-x-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <span className="text-[10px] px-2 py-0.5 rounded-lg font-black uppercase tracking-wider bg-gray-900 text-white">
                     {tpl.type}
                   </span>
                </div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight line-clamp-1">{tpl.name}</h3>
                <p className="text-[11px] font-bold text-gray-400 leading-snug line-clamp-2">
                   {tpl.description || "暂无备注"}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-50 flex items-center justify-between">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">{tpl.promptTemplate.length} 字符</span>
               <div className="text-teal-600 opacity-0 group-hover:opacity-100 transition-all">
                  <Edit2 size={14} />
               </div>
            </div>
          </div>
        ))}
      </div>

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

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 block">模版名称</label>
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="如：学术文献"
                    className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/5 px-6 py-4 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 block">模版类型</label>
                  <input
                    type="text"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="如：职场类"
                    className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/5 px-6 py-4 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner"
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
                  className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/5 px-6 py-4 rounded-2xl outline-none transition-all text-xs font-mono font-bold leading-relaxed resize-none shadow-inner"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 block">模版备注</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="描述该模版的适用场景..."
                  className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/5 px-6 py-4 rounded-2xl outline-none transition-all text-xs font-bold leading-relaxed resize-none shadow-inner"
                />
              </div>
            </div>

            <div className="p-8 border-t border-gray-50 bg-white">
              <button
                disabled={!name.trim() || !promptTemplate.trim()}
                onClick={handleSave}
                className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-gray-200 hover:bg-teal-600 transition-all active:scale-95 disabled:bg-gray-100 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                保存模版
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
