import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isHydrating: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
  setHydrating: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isHydrating: false,
      setAuth: (user, accessToken) => set({ user, accessToken, isHydrating: false }),
      setToken: (token) => set({ accessToken: token, isHydrating: false }),
      clearAuth: () => set({ user: null, accessToken: null, isHydrating: false }),
      setHydrating: (v) => set({ isHydrating: v }),
    }),
    {
      name: 'et-auth',
      // Only persist user — access token lives in memory only
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
