"use client";

import { Handle, Position, NodeProps } from 'reactflow';
import { CATEGORY_COLORS } from '@/lib/relation-config';

export const KnowledgeNode = ({ data }: NodeProps) => {
  const { title, categoryName, linkCount, categoryId, isSelected } = data;
  
  // Hash color for category
  const num = categoryId.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const color = CATEGORY_COLORS[num % CATEGORY_COLORS.length] || "#3b82f6";

  const size = linkCount >= 3 ? 140 : linkCount >= 1 ? 120 : 100;

  return (
    <div 
      className={`relative flex flex-col items-center justify-center text-center p-4 rounded-full border-2 bg-white transition-all duration-300 ${
        isSelected ? 'ring-4 ring-blue-500/20 scale-110 shadow-lg' : 'shadow-sm border-gray-100 hover:border-gray-200'
      }`}
      style={{ 
        width: size, 
        height: size,
        borderColor: isSelected ? 'rgb(59 130 246)' : color 
      }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase text-gray-400 tracking-tighter block truncate max-w-[80px]">
          {categoryName}
        </span>
        <h4 className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-2 px-1">
          {title.slice(0, 15)}{title.length > 15 ? '...' : ''}
        </h4>
        <div className="flex gap-1 justify-center pt-1">
            {Array.from({ length: Math.min(linkCount, 3) }).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            ))}
            {linkCount > 3 && <span className="text-[8px] text-gray-400">+{linkCount-3}</span>}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};
