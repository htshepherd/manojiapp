"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, X, Bot, Play, Loader2, FileText, Component, ArrowRight, ChevronLeft, Target, Sparkles, Sliders, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

import { useCategoriesStore } from "@/store/categories";
import { useTemplatesStore } from "@/store/templates";
import { Category, Granularity } from "@/types";
import { CATEGORY_COLORS } from "@/lib/relation-config";

type DeleteConfirmState = { isOpen: boolean; id: string; noteCount: number } | null;

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategoriesStore();
  const { templates } = useTemplatesStore();
  
  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState(1);
  
  // Form State
  const [name, setName] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("summary");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [linkThreshold, setLinkThreshold] = useState(0.75);
  const [synthesisTriggerCount, setSynthesisTriggerCount] = useState(5);
  
  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);
  
  // Template Filter State
  const [activeTemplateType, setActiveTemplateType] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingId(null);
    setModalStep(1);
    setName("");
    setGranularity("summary");
    setPromptTemplate("");
    setLinkThreshold(0.75);
    setSynthesisTriggerCount(5);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingId(cat.id);
    setModalStep(1);
    setName(cat.name);
    setGranularity(cat.granularity);
    setPromptTemplate(cat.promptTemplate);
    setLinkThreshold(cat.linkThreshold);
    setSynthesisTriggerCount(cat.synthesisTriggerCount);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleNextStep = () => {
    if (name.trim()) {
      setModalStep(2);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !promptTemplate.trim()) return;

    const categoryData = {
      name: name.trim(),
      icon: '',
      granularity,
      promptTemplate: promptTemplate.trim(),
      linkThreshold,
      synthesisTriggerCount,
    };

    if (editingId) {
      updateCategory(editingId, categoryData);
    } else {
      addCategory(categoryData);
    }
    closeModal();
  };

  const handleTemplateClick = (tpl: any) => {
    setPromptTemplate(tpl.promptTemplate);
    setGranularity(tpl.granularity as Granularity);
  };

  const handleDeleteClick = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    if (cat.noteCount > 0) {
      setDeleteConfirm({ isOpen: true, id: cat.id, noteCount: cat.noteCount });
    } else {
      deleteCategory(cat.id);
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteCategory(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const isStep1Valid = name.trim().length > 0;
  const isStep2Valid = promptTemplate.trim().length > 0;

  return (
    <div className="flex flex-col h-full space-y-10 animate-in fade-in duration-500">
      {/* 顶部标题区 */}
      <div className="flex items-end justify-between px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">分类管理</h1>
          <p className="text-sm font-bold text-gray-400">配置你的专属知识提炼引擎</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl hover:bg-teal-600 transition-all font-black uppercase text-xs tracking-widest shadow-lg active:scale-95"
        >
          <Plus size={18} />
          新建分类
        </button>
      </div>

      {/* 分类列表区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="group relative bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:border-teal-100 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[200px]"
            onClick={() => openEditModal(cat)}
          >
            <div 
                className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] -mr-8 -mt-8 rounded-full transition-transform duration-700 group-hover:scale-150" 
                style={{ backgroundColor: CATEGORY_COLORS[cat.id.length % CATEGORY_COLORS.length] }}
            />

            <div className="relative flex flex-col h-full">
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider">
                        {cat.granularity === 'atomic' ? '原子知识' : '整段综述'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 group-hover:text-teal-600 transition-colors uppercase tracking-tight">
                    {cat.name}
                  </h3>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                    <button 
                        onClick={(e) => handleDeleteClick(e, cat)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
              </div>

              <div className="flex-1" />

              <div className="flex items-end justify-between pt-6 border-t border-gray-50">
                <div className="space-y-1">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">库存情况</p>
                    <p className="text-2xl font-black text-gray-900">
                        {cat.noteCount} <span className="text-xs text-gray-400 font-bold uppercase">篇笔记</span>
                    </p>
                </div>
                
                <Link 
                    href={`/synthesis/${cat.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-teal-600 transition-colors uppercase tracking-[0.2em]"
                >
                    查看综述
                    <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="py-24 text-center bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200 space-y-4">
          <p className="text-gray-900 font-black uppercase tracking-widest">暂无分类</p>
          <button onClick={openCreateModal} className="text-sm font-bold text-teal-600 hover:underline">点击创建你的第一个提炼引擎</button>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm?.isOpen && (
        <div className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-10 space-y-8 animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">危险操作</h3>
                <p className="text-sm font-medium text-gray-500 leading-relaxed">
                    该分类下包含 <strong className="text-teal-600">{deleteConfirm.noteCount} 篇笔记</strong>。删除后将失去所有关联的知识链路。
                </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDelete} 
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-lg active:scale-95"
              >
                确认删除
              </button>
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建/编辑分类 Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/5 backdrop-blur-md animate-in fade-in duration-500" onClick={closeModal} />
          <div className="bg-white w-full sm:w-[500px] shadow-2xl h-full flex flex-col flex-shrink-0 animate-in slide-in-from-right duration-500 relative">
            {/* Header */}
            <div className="p-8 border-b border-gray-50 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                  {editingId ? "编辑分类" : "新建分类"}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                  <X size={24} />
                </button>
              </div>
              {/* 步骤条 */}
              <div className="flex items-center gap-2">
                <div className={`h-1 flex-1 rounded-full transition-all ${modalStep >= 1 ? 'bg-teal-600' : 'bg-gray-100'}`} />
                <div className={`h-1 flex-1 rounded-full transition-all ${modalStep >= 2 ? 'bg-teal-600' : 'bg-gray-100'}`} />
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8">
              {modalStep === 1 ? (
                /* 第一步：基础信息 */
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                  <section className="space-y-12">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                        <Target size={24} />
                      </div>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-[0.2em]">第一步：标识与定位</h3>
                    </div>

                    <div className="space-y-12">
                      <div className="space-y-8">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] px-2 block mb-4">分类名称</label>
                        <input
                          autoFocus
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="例如：产品设计, 心理学视角..."
                          className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/5 px-6 py-4 rounded-2xl outline-none transition-all text-sm font-bold shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="space-y-14">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] px-2 block mb-4">知识学习深度 (粒度)</label>
                      <div className="grid grid-cols-1 gap-4">
                        <button
                          onClick={() => setGranularity('summary')}
                          className={`p-5 rounded-[24px] border text-left transition-all flex items-center gap-4 relative group/opt ${
                            granularity === 'summary' 
                              ? 'bg-teal-50 border-teal-600/30 text-teal-700 shadow-lg shadow-teal-500/5 scale-[1.02]' 
                              : 'bg-white border-gray-100 hover:border-teal-100 hover:bg-gray-50/20'
                          }`}
                        >
                          <div className={`p-3 rounded-xl flex-shrink-0 transition-all ${
                            granularity === 'summary' ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 group-hover/opt:text-teal-600'
                          }`}>
                            <FileText size={22} strokeWidth={2} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-black tracking-tight">整段综述</h4>
                            <p className={`text-[10px] font-bold leading-tight mt-0.5 ${
                              granularity === 'summary' ? 'text-teal-600/70' : 'text-gray-400'
                            }`}>
                              提炼为叙事性的摘要，适合宏观理解知识脉络。
                            </p>
                          </div>
                        </button>

                        <button
                          onClick={() => setGranularity('atomic')}
                          className={`p-5 rounded-[24px] border text-left transition-all flex items-center gap-4 relative group/opt ${
                            granularity === 'atomic' 
                              ? 'bg-teal-50 border-teal-600/30 text-teal-700 shadow-lg shadow-teal-500/5 scale-[1.02]' 
                              : 'bg-white border-gray-100 hover:border-teal-100 hover:bg-gray-50/20'
                          }`}
                        >
                          <div className={`p-3 rounded-xl flex-shrink-0 transition-all ${
                            granularity === 'atomic' ? 'bg-teal-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 group-hover/opt:text-teal-600'
                          }`}>
                            <Component size={22} strokeWidth={2} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-black tracking-tight">原子知识</h4>
                            <p className={`text-[10px] font-bold leading-tight mt-0.5 ${
                              granularity === 'atomic' ? 'text-teal-600/70' : 'text-gray-400'
                            }`}>
                              提取核心概念和名词，适合知识图谱构建。
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                /* 第二步：处理策略 */
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                  <section className="space-y-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Sparkles size={24} />
                      </div>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-[0.2em]">第二步：选择指令模版</h3>
                    </div>

                    <div className="space-y-6">
                      {/* 横向标签切换 */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                        {Array.from(new Set(templates.map(t => t.type))).map(type => {
                          const isActive = (activeTemplateType || templates[0]?.type) === type;
                          return (
                            <button
                              key={type}
                              onClick={() => setActiveTemplateType(type)}
                              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                                isActive 
                                  ? 'bg-gray-900 border-gray-900 text-white shadow-lg' 
                                  : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                              }`}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {templates
                          .filter(t => t.type === (activeTemplateType || templates[0]?.type))
                          .map(tpl => {
                            const isSelected = promptTemplate === tpl.promptTemplate;
                            return (
                              <button
                                key={tpl.id}
                                onClick={() => handleTemplateClick(tpl)}
                                className={`p-5 rounded-[24px] border text-left transition-all relative overflow-hidden flex items-center gap-4 ${
                                  isSelected 
                                    ? 'bg-teal-50 border-teal-600/30 text-teal-700 shadow-md shadow-teal-500/5' 
                                    : 'bg-white border-gray-100 hover:border-teal-100 hover:bg-gray-50/20'
                                }`}
                              >
                                <div className={`p-2.5 rounded-xl flex-shrink-0 transition-all ${
                                  isSelected ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-400'
                                }`}>
                                   <FileText size={18} />
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-black tracking-tight">{tpl.name}</h4>
                                  <p className={`text-[10px] font-bold line-clamp-1 ${isSelected ? 'text-teal-600/70' : 'text-gray-400'}`}>
                                    {tpl.description || '点击应用此处理指令'}
                                  </p>
                                </div>
                                {isSelected && (
                                  <div className="absolute top-0 right-0 p-1.5 bg-teal-600 text-white rounded-bl-lg">
                                    <Check size={10} strokeWidth={4} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Sliders size={20} />
                            </div>
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">高级关联参数</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex justify-between px-2 block">
                                    关联精准度阈值
                                    <span className="text-teal-600 font-black">{Math.round(linkThreshold * 100)}%</span>
                                </label>
                                <div className="px-2">
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="1.0"
                                        step="0.01"
                                        value={linkThreshold}
                                        onChange={(e) => setLinkThreshold(parseFloat(e.target.value))}
                                        className="w-full accent-teal-600 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 leading-relaxed italic px-2">值越高，笔记之间的关联越严谨，反之越发散。</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2 block">综述自动触发阈值</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="3"
                                        value={synthesisTriggerCount}
                                        onChange={(e) => setSynthesisTriggerCount(Math.max(3, parseInt(e.target.value) || 3))}
                                        className="w-full bg-gray-50/50 border border-transparent px-6 py-4 rounded-2xl outline-none font-black text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">篇笔记</span>
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 leading-relaxed italic px-2">当分类下笔记达到此数量时，AI 将自动生成全局综述。</p>
                            </div>
                        </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-gray-50 bg-white flex items-center gap-3">
              {modalStep === 2 && (
                <button
                  onClick={() => setModalStep(1)}
                  className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={16} />
                  上一步
                </button>
              )}
              {modalStep === 1 ? (
                <button
                  disabled={!isStep1Valid}
                  onClick={handleNextStep}
                  className="flex-1 py-5 bg-gray-900 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-gray-200 hover:bg-teal-600 hover:shadow-teal-500/20 transition-all active:scale-95 disabled:bg-gray-100 disabled:shadow-none flex items-center justify-center gap-2"
                >
                  配置下一步
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  disabled={!isStep2Valid}
                  onClick={handleSave}
                  className="flex-1 py-5 bg-teal-600 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-teal-500/20 hover:bg-teal-700 transition-all active:scale-95 disabled:bg-gray-200 disabled:shadow-none"
                >
                  确认并启用
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
