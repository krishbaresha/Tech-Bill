import { create } from 'zustand';
import { api } from '../api/client';

export interface NavigationItem {
  key: string;
  title: string;
  icon: string;
  route: string;
  menuOrder: number;
  category: string;
}

export interface ResolvedLicense {
  status: string;
  plan: string;
  expiresAt: string | null;
  isExpired: boolean;
  isReadOnly: boolean;
  features: Record<string, string>; // e.g. { "pos": "FULL", "reports": "READ" }
  navigation: NavigationItem[];
}

interface LicenseState {
  license: ResolvedLicense | null;
  isLoading: boolean;
  error: string | null;
  fetchLicense: () => Promise<void>;
  hasFeatureAccess: (featureKey: string, requiredAccess?: 'NONE' | 'READ' | 'WRITE' | 'FULL') => boolean;
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  license: null,
  isLoading: false,
  error: null,
  fetchLicense: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<ResolvedLicense>('/tenant/me/license');
      set({ license: res.data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch license', isLoading: false });
    }
  },
  hasFeatureAccess: (featureKey, requiredAccess = 'READ') => {
    const { license } = get();
    if (!license) return false;
    
    // SuperAdmin console bypass
    if (license.plan === 'SuperAdmin Console') return true;

    const access = license.features[featureKey] || 'NONE';
    if (access === 'NONE') return false;

    const levels = {
      NONE: 0,
      READ: 1,
      WRITE: 2,
      FULL: 3,
    };

    return levels[access as keyof typeof levels] >= levels[requiredAccess as keyof typeof levels];
  },
}));
