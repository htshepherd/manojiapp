import { create } from 'zustand';
import { Synthesis } from '@/types';

interface SynthesisState {
  syntheses: Record<string, Synthesis>;
  isLoading: boolean;
  error: string | null;
  fetchSynthesis: (_categoryId: string, _token: string | null) => Promise<void>;
  updateAnnotation: (_categoryId: string, _annotation: string, _token: string | null) => Promise<boolean>;
}

export const useSynthesisStore = create<SynthesisState>((set, _get) => ({
  syntheses: {},
  isLoading: false,
  error: null,

  fetchSynthesis: async (categoryId, token) => {
    if (!token) return;
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/synthesis/${categoryId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

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
    } catch (err: unknown) { // typed
      const error = err as Error; // typed
      set({ isLoading: false, error: error.message }); // typed
    }
  },

  updateAnnotation: async (categoryId, annotation, token) => {
    if (!token) return false;
    try {
      const res = await fetch(`/api/synthesis/${categoryId}`, {
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
