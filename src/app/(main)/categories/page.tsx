"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, X, FileText, Component, ArrowRight, ChevronLeft, Target, Sparkles, Sliders, Check, Loader2 } from "lucide-react";
import Link from "next/link";

import { useCategoriesStore } from "@/store/categories";
import { useTemplatesStore } from "@/store/templates";
import { Category, Granularity } from "@/types";
import { CATEGORY_COLORS } from "@/lib/relation-config";

type DeleteConfirmState = { isOpen: boolean; id: string; noteCount: number } | null;

export default function CategoriesPage() {
  const { categories, fetchCategories, addCategory, updateCategory, deleteCategory, isLoading } = useCategoriesStore();
  const { templates, fetchTemplates } = useTemplatesStore();
  
  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
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

  useEffect(() => {
    fetchCategories();
    fetchTemplates();
  }, [fetchCategories, fetchTemplates]);

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
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const handleNextStep = () => {
    if (name.trim()) {
      setModalStep(2);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !promptTemplate.trim()) return;

    setIsSaving(true);
    const categoryData: Partial<Category> = {
      name: name.trim(),
      granularity,
      promptTemplate: promptTemplate.trim(),
      linkThreshold,
      synthesisTriggerCount,
    };

    let success = false;
    if (editingId) {
      success = await updateCategory(editingId, categoryData);
    } else {
      success = await addCategory(categoryData);
    }
    
    setIsSaving(false);
    if (success) {
      closeModal();
    } else {
      alert("保存失败，请检查设置。");
    }
  };

  const handleTemplateClick = (tpl: any) => {
    setPromptTemplate(tpl.promptTemplate);
  };

  const handleDeleteClick = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    if (cat.noteCount > 0) {
      setDeleteConfirm({ isOpen: true, id: cat.id, noteCount: cat.noteCount });
    } else {
      setDeleteConfirm({ isOpen: true, id: cat.id, noteCount: 0 });
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      setIsSaving(true);
      const success = await deleteCategory(deleteConfirm.id);
      setIsSaving(false);
      if (success) {
        setDeleteConfirm(null);
      } else {
        alert("删除失败");
      }
    }
  };

  const isStep1Valid = name.trim().length > 0;
  const isStep2Valid = promptTemplate.trim().length > 0;

  return (
    <div className="flex flex-col h-full space-y-10 animate-in fade-in duration-500">
      <div className="hidden md:flex items-end justify-between px-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">知识领域</h1>
          <p className="text-sm font-bold text-gray-400">配置AI引擎生成笔记WIKI</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl hover:bg-teal-600 transition-all font-black uppercase text-xs tracking-widest shadow-lg active:scale-95"
        >
          <Plus size={18} />
          新建领域
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-[32px] animate-pulse" />)
        ) : (
            categories.map((cat) => (
                <div
                    key={cat.id}
                    className="group relative bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:border-teal-100 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
                    onClick={() => openEditModal(cat)}
                >
                    <div 
                        className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] -mr-8 -mt-8 rounded-full transition-transform duration-700 group-hover:scale-150" 
                        style={{ backgroundColor: CATEGORY_COLORS[cat.id?.length % CATEGORY_COLORS.length || 0] }}
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

                    <div className="flex items-end justify-between pt-6 border-t border-gray-50 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">包含笔记</p>
                            <p className="text-2xl font-black text-gray-900">
                                {cat.noteCount || 0} <span className="text-xs text-gray-400 font-bold uppercase">篇</span>
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <Link 
                                href={`/notes?category=${cat.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 text-[10px] font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
                            >
                                笔记
                                <ArrowRight size={12} />
                            </Link>
                            <Link 
                                href={`/synthesis/${cat.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 text-[10px] font-black text-teal-600 hover:bg-teal-600 hover:text-white transition-all uppercase tracking-widest bg-teal-50 px-3 py-1.5 rounded-lg ml-2"
                            >
                                <Sparkles size={12} />
                                AI WIKI
                            </Link>
                        </div>
                    </div>
                    </div>
                </div>
            ))
        )}
      </div>

      {!isLoading && categories.length === 0 && (
        <div className="py-24 text-center bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200 space-y-4">
          <p className="text-gray-900 font-black uppercase tracking-widest">暂无知识领域</p>
          <button onClick={openCreateModal} className="hidden md:inline-block text-sm font-bold text-teal-600 hover:underline">点击创建</button>
        </div>
      )}

      {deleteConfirm?.isOpen && (
        <div className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm p-10 space-y-8 animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="space-y-4 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Trash2 size={32} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">确认删除该领域？</h3>
                <p className="text-sm font-medium text-gray-500 leading-relaxed">
                  {deleteConfirm.noteCount > 0 ? (
                    <>该领域下包含 <strong className="text-teal-600">{deleteConfirm.noteCount} 篇笔记</strong>。删除后将失去所有关联的知识链路。</>
                  ) : (
                    <>这将移除该领域的知识处理配置。</>
                  )}
                </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmDelete}
                disabled={isSaving}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-lg active:scale-95 disabled:bg-red-300"
              >
                {isSaving ? <Loader2 className="animate-spin mx-auto" size={16} /> : "确认删除"}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/5 backdrop-blur-md animate-in fade-in duration-500" onClick={closeModal} />
          <div className="bg-white w-full sm:w-[500px] shadow-2xl h-full flex flex-col flex-shrink-0 animate-in slide-in-from-right duration-500 relative">
            <div className="p-8 border-b border-gray-50 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                  {editingId ? "编辑领域" : "新建领域"}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className={`h-1 flex-1 rounded-full transition-all ${modalStep >= 1 ? 'bg-teal-600' : 'bg-gray-100'}`} />
                <div className={`h-1 flex-1 rounded-full transition-all ${modalStep >= 2 ? 'bg-teal-600' : 'bg-gray-100'}`} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
              {modalStep === 1 ? (
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
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] px-2 block mb-4">领域名称</label>
                        <input
                          autoFocus
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="例如：产品设计, 心理学视角..."
                          className="w-full bg-gray-50/50 border border-transparent focus:bg-white focus:border-teal-500/20 focus:ring-4 focus:ring-teal-500/5 px-6 py-4 rounded-2xl outline-none transition-all text-base md:text-sm font-bold shadow-inner"
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
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                  <section className="space-y-8">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Sparkles size={24} />
                      </div>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-[0.2em]">第二步：处理指令模版</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
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

                      <div className="grid grid-cols-1 gap-3">
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
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2 block">AI WIKI 自动触发阈值</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="3"
                                        value={synthesisTriggerCount}
                                        onChange={(e) => setSynthesisTriggerCount(Math.max(3, parseInt(e.target.value) || 3))}
                                        className="w-full bg-gray-50/50 border border-transparent px-6 py-4 rounded-2xl outline-none font-black text-base md:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">篇笔记</span>
                                </div>
                            </div>
                        </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-gray-50 bg-white flex items-center gap-3">
              {modalStep === 2 && (
                <button
                  disabled={isSaving}
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
                  配置处理指令
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  disabled={!isStep2Valid || isSaving}
                  onClick={handleSave}
                  className="flex-1 py-5 bg-teal-600 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-teal-500/20 hover:bg-teal-700 transition-all active:scale-95 disabled:bg-gray-200 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : "确认并启用"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
