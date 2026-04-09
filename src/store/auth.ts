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
  login: (account: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
      login: async (account, pass) => {
        // simulate standard network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        if (account === 'admin' && pass === 'manoji2026') {
          set({
            isLoggedIn: true,
            user: { id: "user-001", account: "admin" }
          });
          return true;
        }
        return false;
      },
      logout: () => {
        set({ isLoggedIn: false, user: null });
      }
    }),
    {
      name: 'auth-storage', // name of item in the storage (must be unique)
    }
  )
)
