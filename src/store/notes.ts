import { create } from 'zustand';
import { MOCK_NOTES } from '@/lib/mock';
import { Note } from '@/types';

interface NotesState {
  notes: Note[];
  addNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  removeLink: (noteId: string, targetNoteId: string) => void;
  // For undo functionality in Task 4
  pendingNoteId: string | null;
  setPendingNoteId: (id: string | null) => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: MOCK_NOTES as Note[],
  addNote: (newNote) => set((state) => ({ 
    notes: [newNote, ...state.notes] 
  })),
  deleteNote: (id) => set((state) => ({ 
    notes: state.notes.filter(n => n.id !== id) 
  })),
  removeLink: (noteId, targetNoteId) => set((state) => ({
    notes: state.notes.map(n => 
      n.id === noteId 
        ? { ...n, links: n.links.filter(l => l.targetNoteId !== targetNoteId) } 
        : n
    )
  })),
  pendingNoteId: null,
  setPendingNoteId: (id) => set({ pendingNoteId: id }),
}));
