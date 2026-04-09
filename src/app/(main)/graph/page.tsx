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
import { MOCK_GRAPH, MOCK_NOTES, MOCK_CATEGORIES } from '@/lib/mock';
import { RELATION_CONFIG, CATEGORY_COLORS } from '@/lib/relation-config';
import { KnowledgeNode } from '@/components/features/KnowledgeNode';
import { Network, X, ArrowRight, Maximize2, Filter, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

const nodeTypes = {
  knowledge: KnowledgeNode,
};

export default function GraphPage() {
  const router = useRouter();
  
  // States
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  
  // Transform Mock to RF Data
  const initialNodes = useMemo(() => {
    return MOCK_GRAPH.nodes.map((node, index) => ({
      id: node.id,
      type: 'knowledge',
      position: { 
        x: Math.cos(index * (2 * Math.PI / MOCK_GRAPH.nodes.length)) * 250 + 400,
        y: Math.sin(index * (2 * Math.PI / MOCK_GRAPH.nodes.length)) * 250 + 300
      },
      data: { 
        ...node, 
        isSelected: false 
      },
    }));
  }, []);

  const initialEdges = useMemo(() => {
    return MOCK_GRAPH.edges.map((edge, index) => {
      const config = RELATION_CONFIG[edge.relationType as keyof typeof RELATION_CONFIG];
      const isUncertain = edge.relationConfidence === 'uncertain';
      
      return {
        id: `e-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        label: `${Math.round(edge.similarityScore * 100)}%`,
        labelStyle: { fill: config.color, fontWeight: 700, fontSize: 10 },
        style: { 
            stroke: isUncertain ? '#cbd5e1' : config.color, 
            strokeWidth: 2,
            strokeDasharray: isUncertain ? '5,5' : '0'
        },
        animated: !isUncertain,
        arrowHeadType: MarkerType.ArrowClosed,
      };
    });
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Filter Logic
  useEffect(() => {
    if (filterCategoryId === 'all') {
      setNodes(initialNodes);
      setEdges(initialEdges);
    } else {
      const filteredNodes = initialNodes.filter(n => n.data.categoryId === filterCategoryId);
      const filteredIds = new Set(filteredNodes.map(n => n.id));
      setNodes(filteredNodes);
      setEdges(initialEdges.filter(e => filteredIds.has(e.source) && filteredIds.has(e.target)));
    }
  }, [filterCategoryId, initialNodes, initialEdges, setNodes, setEdges]);

  // Interaction
  const onNodeClick = useCallback((event: any, node: any) => {
    setSelectedNoteId(node.id);
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: { ...n.data, isSelected: n.id === node.id }
    })));
  }, [setNodes]);

  const onPaneClick = useCallback(() => {
    setSelectedNoteId(null);
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: { ...n.data, isSelected: false }
    })));
  }, [setNodes]);

  const selectedNote = useMemo(() => 
    MOCK_NOTES.find(n => n.id === selectedNoteId), 
    [selectedNoteId]
  );

  if (MOCK_GRAPH.nodes.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
            <Network size={64} className="text-gray-200" />
            <p className="text-gray-500">暂无笔记，写入第一篇后图谱将自动生成</p>
        </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative w-full">
      {/* 侧边预览面板 */}
      <div 
        className={`absolute right-0 top-0 bottom-0 w-full md:w-[350px] bg-white border-l border-gray-100 shadow-2xl z-30 transition-transform duration-500 transform ${
          selectedNoteId ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedNote && (
          <div className="h-full flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <span className="text-xs font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded">
                笔记预览
              </span>
              <button 
                onClick={() => setSelectedNoteId(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedNote.categoryIcon}</span>
                    <span className="text-sm font-bold text-gray-400">{selectedNote.categoryName}</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">
                  {selectedNote.title}
                </h2>
              </div>

              <div className="text-sm text-gray-500 leading-relaxed line-clamp-[12]">
                {selectedNote.content.replace(/[#\-\[\]]/g, '')}
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <button 
                onClick={() => router.push(`/notes/${selectedNote.id}`)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
              >
                查看完整笔记
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 画布区域 */}
      <div className="flex-1 relative">
        {/* 控制工具栏 */}
        <div className="absolute top-6 left-6 right-6 z-20 flex flex-wrap gap-4 items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 pointer-events-auto max-w-[calc(100vw-450px)]">
                <button 
                  onClick={() => setFilterCategoryId('all')}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                    filterCategoryId === 'all' 
                      ? 'bg-gray-900 border-gray-900 text-white shadow-lg' 
                      : 'bg-white/70 backdrop-blur-md border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  全部
                </button>
                {MOCK_CATEGORIES.map(c => {
                  const isActive = filterCategoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setFilterCategoryId(c.id)}
                      className={`flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                        isActive 
                          ? 'bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-500/20' 
                          : 'bg-white/70 backdrop-blur-md border-gray-100 text-gray-500 hover:border-teal-100'
                      }`}
                    >
                      <span>{c.name}</span>
                    </button>
                  );
                })}
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
                <button 
                    onClick={() => {
                        setNodes(initialNodes);
                        setEdges(initialEdges);
                    }}
                    className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-gray-100 shadow-sm text-sm font-bold text-gray-700 hover:bg-white transition-all active:scale-95"
                >
                    <Maximize2 size={16} />
                    重置视图
                </button>
            </div>
        </div>

        {/* 底部图例 */}
        <div className="absolute bottom-6 left-6 z-20 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">关联类型图例</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {Object.entries(RELATION_CONFIG).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                        <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: value.color }} />
                        <span className="text-[10px] font-bold text-gray-600">{value.label}</span>
                    </div>
                ))}
                <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 rounded-full border-t-2 border-dashed border-gray-300" />
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-0.5">
                        <AlertCircle size={8} /> 待确认
                    </span>
                </div>
            </div>
        </div>

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
          fitViewOptions={{ padding: 0.2, duration: 800 }}
          minZoom={0.1}
          maxZoom={2}
          defaultZoom={0.8}
          snapToGrid={true}
          snapGrid={[15, 15]}
          panOnScroll={true}
          panOnDrag={true}
          selectionOnDrag={false}
          zoomOnScroll={true}
          zoomOnPinch={true}
          selectNodesOnDrag={false}
        >
          <Background 
            variant="dots" 
            gap={24} 
            size={1.5} 
            color="#e2e8f0" 
            className="bg-slate-50/30"
          />
          <Controls 
            showInteractive={false} 
            className="!bg-white/80 !backdrop-blur-md !border-gray-100 !shadow-xl !rounded-2xl !overflow-hidden !m-6" 
          />
        </ReactFlow>
      </div>
    </div>
  );
}
