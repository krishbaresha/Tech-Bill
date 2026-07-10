import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';
import type { DashboardData } from '../types';

interface PosState {
  dashboardData: DashboardData | null;
  isSyncing: boolean;
  /** ISO timestamp of the last successful sync */
  lastSyncedAt: string | null;
  syncPosDashboard: () => Promise<void>;
}

export const usePosStore = create<PosState>()(
  persist(
    (set) => ({
      dashboardData: null,
      isSyncing: false,
      lastSyncedAt: null,

      /**
       * Full sync: calls the NestJS backend to load the dashboard.
       */
      syncPosDashboard: async () => {
        set({ isSyncing: true });
        try {
          const res = await api.get<DashboardData>('/inventory/dashboard');
          set({
            dashboardData: res.data,
            lastSyncedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error('[PosStore] Full dashboard sync error:', error);
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'techbill-pos-cache',
      partialize: (state) => ({
        dashboardData: state.dashboardData,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
