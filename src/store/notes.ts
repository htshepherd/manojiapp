import { create } from 'zustand';
import { Note } from '@/types';
import { useAuthStore } from './auth';

interface NotesState {
  notes: Note[];
  isLoading: boolean;
  pendingNoteId: string | null;
  pendingUntil: string | null;
  
  fetchNotes: (categoryId?: string) => Promise<void>;
  fetchRecentNotes: (limit?: number) => Promise<Note[]>;
  generateNote: (categoryId: string, text: string, overwriteId?: string) => Promise<any>;
  undoNote: (id: string) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
  removeLink: (noteId: string, targetNoteId: string) => Promise<boolean>;
  setPending: (id: string | null, until: string | null) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  isLoading: false,
  pendingNoteId: null,
  pendingUntil: null,

  fetchNotes: async (categoryId) => {
    const token = useAuthStore.getState().token;
    set({ isLoading: true });
    try {
      const url = categoryId ? `/api/notes?category_id=${categoryId}` : '/api/notes';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      set({ notes: data.notes || [], isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchRecentNotes: async (limit = 4) => {
    const token = useAuthStore.getState().token;
    try {
      const res = await fetch(`/api/notes/recent?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.notes || [];
    } catch {
      return [];
    }
  },

  generateNote: async (categoryId, text, overwriteId) => {
    const token = useAuthStore.getState().token;
    try {
      const res = await fetch('/api/notes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category_id: categoryId,
          input_text: text,
          overwrite_note_id: overwriteId
        })
      });
      if (!res.ok) throw new Error('生成失败');
      const data = await res.json();
      
      // 更新本地状态
      if (overwriteId) {
        set({
          notes: get().notes.map(n => n.id === overwriteId ? data.note : n)
        });
      } else {
        set({ notes: [data.note, ...get().notes] });
      }
      
      return data;
    } catch (err) {
      throw err;
    }
  },

  undoNote: async (id) => {
    const token = useAuthStore.getState().token;
    try {
      const res = await fetch(`/api/notes/${id}/undo`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return false;
      set({ notes: get().notes.filter(n => n.id !== id) });
      return true;
    } catch {
      return false;
    }
  },

  deleteNote: async (id) => {
    const token = useAuthStore.getState().token;
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return false;
      set({ notes: get().notes.filter(n => n.id !== id) });
      return true;
    } catch {
      return false;
    }
  },

  removeLink: async (noteId, targetNoteId) => {
    const token = useAuthStore.getState().token;
    try {
      const res = await fetch(`/api/notes/${noteId}/links/${targetNoteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return false;
      // UI 更新逻辑已在 API 调通后在调用处处理或本地更新
      return true;
    } catch {
      return false;
    }
  },

  setPending: (id, until) => set({ pendingNoteId: id, pendingUntil: until }),
}));
