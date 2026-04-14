// src/store/auth.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string;
  account: string;
}

interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  token: string | null;
  login: (account: string, pass: string) => Promise<boolean>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      user: null,
      token: null,

      login: async (account, pass) => {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ account, password: pass }),
            headers: { 'Content-Type': 'application/json' }
          });

          if (!res.ok) return false;

          const data = await res.json();
          set({
            isLoggedIn: true,
            user: data.user,
            token: data.token
          });
          return true;
        } catch (error) {
          console.error('Login failed:', error);
          return false;
        }
      },

      logout: () => {
        set({ isLoggedIn: false, user: null, token: null });
      },

      initialize: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) {
            get().logout();
          }
        } catch {
          get().logout();
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        user: state.user,
        token: state.token
      })
    }
  )
)
