import { create } from 'zustand';
import { useAuthStore } from './auth';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  categoryName: string;
  score: number;
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
  search: (query: string) => Promise<void>;
}

export const useSearchStore = create<SearchState>((set) => ({
  results: [],
  isLoading: false,
  search: async (query: string) => {
    if (!query.trim()) return;
    
    const token = useAuthStore.getState().token;
    set({ isLoading: true });
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      set({ results: data.results || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
