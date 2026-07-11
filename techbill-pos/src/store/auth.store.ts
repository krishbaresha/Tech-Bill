import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isHydrating: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken?: string | null) => void;
  setToken: (token: string, refreshToken?: string | null) => void;
  clearAuth: () => void;
  setHydrating: (v: boolean) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isHydrating: true,
      _hasHydrated: false,
      setAuth: (user, accessToken, refreshToken = null) =>
        set({ user, accessToken, refreshToken, isHydrating: false }),
      setToken: (token, refreshToken = null) => {
        const updates: Partial<AuthState> = { accessToken: token, isHydrating: false };
        if (refreshToken) updates.refreshToken = refreshToken;
        set(updates);
      },
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null, isHydrating: false }),
      setHydrating: (v) => set({ isHydrating: v }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'et-auth',
      // Persist user, accessToken, and refreshToken
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            // If logout was detected, bootstrap already cleared storage.
            // We just need to ensure the hydration flags are set so App doesn't hang.
            if (window.__APP_LOGOUT_DETECTED__) {
              state.clearAuth(); // Ensure state is clear
            }
            state.setHasHydrated(true);
            state.setHydrating(false);
          }
        };
      },
    },
  ),
);
