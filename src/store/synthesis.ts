import { create } from 'zustand';
import { Synthesis } from '@/types';
import { useAuthStore } from './auth';

interface SynthesisState {
  syntheses: Record<string, Synthesis>;
  isLoading: boolean;
  fetchSynthesis: (categoryId: string) => Promise<void>;
  updateAnnotation: (synthesisId: string, categoryId: string, annotation: string) => Promise<boolean>;
}

export const useSynthesisStore = create<SynthesisState>((set, get) => ({
  syntheses: {},
  isLoading: false,

  fetchSynthesis: async (categoryId) => {
    const token = useAuthStore.getState().token;
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/synthesis/${categoryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.synthesis) {
        set((state) => ({
          syntheses: {
            ...state.syntheses,
            [categoryId]: data.synthesis
          },
          isLoading: false
        }));
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  updateAnnotation: async (synthesisId, categoryId, annotation) => {
    const token = useAuthStore.getState().token;
    try {
      const res = await fetch(`/api/synthesis/${synthesisId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ user_annotation: annotation })
      });
      if (!res.ok) return false;
      const data = await res.json();
      set((state) => ({
        syntheses: {
          ...state.syntheses,
          [categoryId]: data.synthesis
        }
      }));
      return true;
    } catch {
      return false;
    }
  },
}));
