"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState, 
  MarkerType,
  ConnectionMode
} from 'react-flow-renderer';
import { useAuthStore } from '@/store/auth';
import { useCategoriesStore } from '@/store/categories';
import { RELATION_CONFIG } from '@/lib/relation-config';
import { KnowledgeNode } from '@/components/features/KnowledgeNode';
import { Network, X, ArrowRight, Maximize2, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

const nodeTypes = {
  knowledge: KnowledgeNode,
};

export default function GraphPage() {
  const router = useRouter();
  const token = useAuthStore(state => state.token);
  const { categories, fetchCategories } = useCategoriesStore();
  
  // States
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const fetchGraph = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = filterCategoryId === 'all' ? '/api/graph' : `/api/graph?category_id=${filterCategoryId}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      const rfNodes = (data.nodes || []).map((node: any, index: number) => {
          // 简单的力导向初始布局
          const angle = index * (2 * Math.PI / data.nodes.length);
          const radius = 250 + Math.random() * 50;
          return {
            id: node.id,
            type: 'knowledge',
            position: { 
                x: Math.cos(angle) * radius + 400,
                y: Math.sin(angle) * radius + 300
            },
            data: { 
                ...node, 
                isSelected: false 
            },
          };
      });

      const rfEdges = (data.edges || []).map((edge: any) => {
        // 兼容 camelCase 和 snake_case 两种字段命名
        const relationType = edge.relationType || edge.relation_type;
        const confidence = edge.relationConfidence || edge.relation_confidence;
        const score = edge.similarityScore ?? edge.similarity_score ?? 0;

        const config = RELATION_CONFIG[relationType as keyof typeof RELATION_CONFIG] || { color: '#94a3b8' };
        const isUncertain = confidence === 'uncertain';
        
        return {
          id: `e-${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          label: `${Math.round(score * 100)}%`,
          labelStyle: { fill: config.color, fontWeight: 800, fontSize: 10 },
          style: { 
              stroke: isUncertain ? '#cbd5e1' : config.color, 
              strokeWidth: 2,
              strokeDasharray: isUncertain ? '5,5' : '0'
          },
          animated: !isUncertain && score > 0.8,
          arrowHeadType: MarkerType.ArrowClosed,
        };
      });

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (err) {
      console.error('Fetch graph failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterCategoryId, token, setNodes, setEdges]);

  useEffect(() => {
    fetchCategories();
    if (token) fetchGraph();
  }, [token, filterCategoryId, fetchGraph, fetchCategories]);

  // Interaction
  const onNodeClick = useCallback(async (event: any, node: any) => {
    setSelectedNoteId(node.id);
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: { ...n.data, isSelected: n.id === node.id }
    })));

    // 异步拉取详细信息
    try {
        const res = await fetch(`/api/notes/${node.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const d = await res.json();
        setSelectedNote(d.note);
    } catch (err) {
        console.error(err);
    }
  }, [setNodes, token]);

  const onPaneClick = useCallback(() => {
    setSelectedNoteId(null);
    setSelectedNote(null);
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: { ...n.data, isSelected: false }
    })));
  }, [setNodes]);

  return (
    <div className="flex h-screen bg-white overflow-hidden relative w-full font-sans">
      {/* 侧边预览面板 */}
      <div 
        className={`fixed right-0 top-0 bottom-0 w-full md:w-[400px] bg-white border-l border-gray-100 shadow-2xl z-40 transition-transform duration-500 ease-out transform ${
          selectedNoteId ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedNote ? (
          <div className="h-full flex flex-col">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                知识节点预览
              </span>
              <button 
                onClick={() => setSelectedNoteId(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-gray-900 text-white px-3 py-1 rounded-full font-black uppercase tracking-wider">{selectedNote.category_name}</span>
                </div>
                <h2 className="text-3xl font-black text-gray-900 leading-tight tracking-tight">
                  {selectedNote.title}
                </h2>
              </div>

              <div className="text-sm text-gray-500 leading-relaxed line-clamp-[15] font-medium italic">
                {selectedNote.content.replace(/[#\-\[\]]/g, '')}
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedNote.tags?.map((t: string) => (
                    <span key={t} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">#{t}</span>
                ))}
              </div>
            </div>

            <div className="p-8 border-t border-gray-50 bg-gray-50/50">
              <button 
                onClick={() => router.push(`/notes/${selectedNote.id}`)}
                className="w-full flex items-center justify-center gap-3 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-600 transition-all shadow-xl active:scale-95"
              >
                查看完整笔记
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        ) : (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-teal-600" size={32} />
            </div>
        )}
      </div>

      <div className="flex-1 relative">
        <div className="absolute top-8 left-8 right-8 z-20 flex flex-wrap gap-4 items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 pointer-events-auto max-w-[calc(100vw-500px)]">
                <button 
                  onClick={() => setFilterCategoryId('all')}
                  className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                    filterCategoryId === 'all' 
                      ? 'bg-gray-900 border-gray-900 text-white shadow-2xl' 
                      : 'bg-white/80 backdrop-blur-md border-gray-100 text-gray-400 hover:border-gray-200 shadow-sm'
                  }`}
                >
                  全部领域
                </button>
                {categories.map(c => {
                  const isActive = filterCategoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setFilterCategoryId(c.id)}
                      className={`flex items-center px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                        isActive 
                          ? 'bg-teal-600 border-teal-600 text-white shadow-2xl shadow-teal-500/20' 
                          : 'bg-white/80 backdrop-blur-md border-gray-100 text-gray-500 hover:border-teal-100 shadow-sm'
                      }`}
                    >
                      <span>{c.name}</span>
                    </button>
                  );
                })}
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
                <button 
                    onClick={() => fetchGraph()}
                    className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-gray-100 shadow-sm text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-white transition-all active:scale-95"
                >
                    <Maximize2 size={16} />
                    重置视图
                </button>
            </div>
        </div>

        {isLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-white rounded-3xl shadow-2xl">
                        <Loader2 className="animate-spin text-teal-600" size={32} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 animate-pulse">正在构建知识网络...</span>
                </div>
            </div>
        )}

        {!isLoading && nodes.length === 0 && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center space-y-6">
                <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-200">
                    <Network size={48} />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">知识网络暂未建立</h3>
                    <p className="text-sm font-medium text-gray-400 max-w-xs mx-auto">随着你分类下的笔记增多，Graphify 将自动扫描并在这里实时展现你知识系统中的语义链接。</p>
                </div>
            </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.3, duration: 1000 }}
          minZoom={0.05}
          maxZoom={3}
          defaultZoom={0.7}
          panOnScroll={true}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
        >
          <Background 
            variant={"dots" as any} 
            gap={32} 
            size={1.5} 
            color="#f1f5f9" 
            className="bg-[#fdfdfd]"
          />
          <Controls 
            showInteractive={false} 
            className="!bg-white/80 !backdrop-blur-md !border-gray-100 !shadow-2xl !rounded-3xl !overflow-hidden !m-8 !p-1" 
          />
        </ReactFlow>
      </div>
    </div>
  );
}
