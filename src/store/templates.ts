import { create } from 'zustand';
import { useAuthStore } from './auth';

import { PromptTemplate, TemplateRow } from '@/types';

interface TemplatesState {
  templates: PromptTemplate[];
  isLoading: boolean;
  fetchTemplates: () => Promise<void>;
  addTemplate: (_template: Omit<PromptTemplate, 'id' | 'userId' | 'createdAt'>) => Promise<boolean>;
  updateTemplate: (_id: string, _template: Partial<Omit<PromptTemplate, 'id' | 'userId' | 'createdAt'>>) => Promise<boolean>;
  deleteTemplate: (_id: string) => Promise<boolean>;
}

export const useTemplatesStore = create<TemplatesState>((set, get) => ({
  templates: [],
  isLoading: false,

  fetchTemplates: async () => {
    const token = useAuthStore.getState().token;
    set({ isLoading: true });
    try {
      const res = await fetch('/api/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // Map backend snake_case to frontend camelCase
      const mapped = (data.templates || []).map((t: TemplateRow) => ({ // typed
        id: t.id,
        userId: t.user_id,
        name: t.name,
        type: t.type,
        promptTemplate: t.prompt_template,
        description: t.description || undefined,
        createdAt: t.created_at
      }));
      set({ templates: mapped, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addTemplate: async (tpl) => {
    const token = useAuthStore.getState().token;
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: tpl.name,
          type: tpl.type,
          prompt_template: tpl.promptTemplate,
          description: tpl.description
        })
      });
      if (!res.ok) return false;
      await get().fetchTemplates(); // Refresh list to get real ID
      return true;
    } catch {
      return false;
    }
  },

  updateTemplate: async (id, tpl) => {
    const token = useAuthStore.getState().token;
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: tpl.name,
          type: tpl.type,
          prompt_template: tpl.promptTemplate,
          description: tpl.description
        })
      });
      if (!res.ok) return false;
      const data = await res.json();
      const updated = data.template;
      set({
        templates: get().templates.map(t => 
          t.id === id ? {
            ...t,
            name: updated.name,
            type: updated.type,
            promptTemplate: updated.prompt_template,
            description: updated.description
          } : t
        )
      });
      return true;
    } catch {
      return false;
    }
  },

  deleteTemplate: async (id) => {
    const token = useAuthStore.getState().token;
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return false;
      set({ templates: get().templates.filter(t => t.id !== id) });
      return true;
    } catch {
      return false;
    }
  },
}));
