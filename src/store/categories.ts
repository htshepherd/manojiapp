import { create } from 'zustand';
import { Category } from '@/types';
import { useAuthStore } from './auth';

interface CategoriesState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  addCategory: (_category: Partial<Category>) => Promise<boolean>;
  updateCategory: (_id: string, _category: Partial<Category>) => Promise<boolean>;
  deleteCategory: (_id: string) => Promise<boolean>;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    const token = useAuthStore.getState().token;
    set({ isLoading: true });
    try {
      const res = await fetch('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      set({ categories: data.categories || [], isLoading: false });
    } catch {
      set({ error: '获取分类失败', isLoading: false });
    }
  },

  addCategory: async (newCatData) => {
    const token = useAuthStore.getState().token;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCatData)
      });
      if (!res.ok) return false;
      const data = await res.json();
      set({ categories: [data.category, ...get().categories] });
      return true;
    } catch {
      return false;
    }
  },

  updateCategory: async (id, data) => {
    const token = useAuthStore.getState().token;
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) return false;
      const updated = await res.json();
      set({
        categories: get().categories.map(cat => 
          cat.id === id ? { ...cat, ...updated.category } : cat
        )
      });
      return true;
    } catch {
      return false;
    }
  },

  deleteCategory: async (id) => {
    const token = useAuthStore.getState().token;
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return false;
      set({ categories: get().categories.filter(cat => cat.id !== id) });
      return true;
    } catch {
      return false;
    }
  },
}));
