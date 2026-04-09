import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PromptTemplate {
  id: string;
  name: string;
  type: string;
  promptTemplate: string;
  description?: string;
}

interface TemplatesState {
  templates: PromptTemplate[];
  addTemplate: (template: Omit<PromptTemplate, 'id'>) => void;
  updateTemplate: (id: string, template: Partial<Omit<PromptTemplate, 'id'>>) => void;
  deleteTemplate: (id: string) => void;
}

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'tpl-1',
    name: "通用摘要",
    type: "通用类",
    promptTemplate: "请将以下内容提炼为简洁的摘要，突出核心论点和结论。",
    description: "适用于大部分通用型笔记和阅读心得。"
  },
  {
    id: 'tpl-2',
    name: "案例研究",
    type: "职场类",
    promptTemplate: "请从以下内容中提取项目背景、核心挑战、解决方案及最终成果。",
    description: "适用于整理沉淀工作案例或深度调研。"
  },
  {
    id: 'tpl-3',
    name: "架构分析",
    type: "技术类",
    promptTemplate: "请提取其中的关键技术名词、架构组件及其依赖关系。",
    description: "适用于分析复杂的系统架构或底层逻辑。"
  },
  {
    id: 'tpl-4',
    name: "灵感捕捉",
    type: "创意类",
    promptTemplate: "请捕捉这段文字中的闪光点，并提供至少两个可能的应用切入点。",
    description: "适用于整理随手记录的灵感片段。"
  },
  {
    id: 'tpl-5',
    name: "概念拆解",
    type: "学术类",
    promptTemplate: "请将这段文本拆解为独立的知识点，并为每个点提供一个简单的定义。",
    description: "适用于整理大部头书籍或深度课程的笔记。"
  }
];

export const useTemplatesStore = create<TemplatesState>()(
  persist(
    (set) => ({
      templates: DEFAULT_TEMPLATES,
      addTemplate: (template) =>
        set((state) => ({
          templates: [
            ...state.templates,
            { ...template, id: `tpl-${Date.now()}` },
          ],
        })),
      updateTemplate: (id, updatedTemplate) =>
        set((state) => ({
          templates: state.templates.map((tpl) =>
            tpl.id === id ? { ...tpl, ...updatedTemplate } : tpl
          ),
        })),
      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((tpl) => tpl.id !== id),
        })),
    }),
    {
      name: 'templates-storage',
    }
  )
);
