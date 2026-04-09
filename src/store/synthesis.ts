import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MOCK_SYNTHESIS } from '@/lib/mock';
import { Synthesis } from '@/types';

interface SynthesisState {
  syntheses: Record<string, Synthesis>;
  updateAnnotation: (categoryId: string, annotation: string) => void;
}

export const useSynthesisStore = create<SynthesisState>()(
  persist(
    (set) => ({
      syntheses: MOCK_SYNTHESIS as Record<string, Synthesis>,
      updateAnnotation: (categoryId, annotation) => set((state) => ({
        syntheses: {
          ...state.syntheses,
          [categoryId]: {
            ...state.syntheses[categoryId],
            userAnnotation: annotation,
            updatedAt: new Date().toISOString()
          }
        }
      })),
    }),
    {
      name: 'synthesis-storage',
    }
  )
);
