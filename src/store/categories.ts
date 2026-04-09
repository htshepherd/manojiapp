import { create } from 'zustand';
import { MOCK_CATEGORIES } from '@/lib/mock';
import { Category } from '@/types';

interface CategoriesState {
  categories: Category[];
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'noteCount'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
}

export const useCategoriesStore = create<CategoriesState>((set) => ({
  categories: MOCK_CATEGORIES as Category[],
  addCategory: (newCatData) => set((state) => {
    const newCategory: Category = {
      ...newCatData,
      id: `cat-${Date.now()}`, // simple random id
      createdAt: new Date().toISOString(),
      noteCount: 0,
    };
    return { categories: [...state.categories, newCategory] };
  }),
  updateCategory: (id, data) => set((state) => ({
    categories: state.categories.map(cat => 
      cat.id === id ? { ...cat, ...data } : cat
    )
  })),
  deleteCategory: (id) => set((state) => ({
    categories: state.categories.filter(cat => cat.id !== id)
  })),
}));
