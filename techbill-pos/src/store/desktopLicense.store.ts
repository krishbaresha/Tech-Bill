import { create } from 'zustand';
import { api } from '../api/client';
import { getDeviceId } from '../lib/deviceFingerprint';

const STORAGE_KEY = 'techbill_desktop_license';
const APP_VERSION = '1.0.0';
const CHECKIN_STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, see LICENSE_SYSTEM.md §7

type LicenseStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';

interface PersistedState {
  licenseId: string | null;
  status: LicenseStatus | null;
  expiresAt: string | null;
  lastSuccessfulCheckin: string | null; // ISO
  desktopAccessEnabled: boolean;
}

const defaultPersisted: PersistedState = {
  licenseId: null,
  status: null,
  expiresAt: null,
  lastSuccessfulCheckin: null,
  desktopAccessEnabled: true,
};

function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPersisted;
    return { ...defaultPersisted, ...JSON.parse(raw) };
  } catch {
    return defaultPersisted;
  }
}

function savePersisted(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

interface DesktopLicenseState extends PersistedState {
  hydrated: boolean;
  activating: boolean;
  activationError: string | null;
  hydrate: () => void;
  activate: (licenseKey: string) => Promise<void>;
  checkin: () => Promise<void>;
  isReadOnly: () => boolean;
}

export const useDesktopLicenseStore = create<DesktopLicenseState>((set, get) => ({
  ...defaultPersisted,
  hydrated: false,
  activating: false,
  activationError: null,

  hydrate: () => {
    set({ ...loadPersisted(), hydrated: true });
  },

  activate: async (licenseKey: string) => {
    set({ activating: true, activationError: null });
    const deviceId = getDeviceId();
    try {
      const res = await api.post('/license/activate', {
        licenseKey: licenseKey.trim(),
        machineHash: deviceId,
        hardwareId: deviceId,
        os: 'Windows',
        appVersion: APP_VERSION,
        deviceName: 'Desktop Client',
      });
      // /license/activate doesn't return the license row's id (only the
      // signed token + status), but /license/checkin needs it — the
      // desktop client re-derives it on first successful checkin by
      // fetching /admin/licenses is not available to non-admins, so we
      // instead ask the server for it explicitly via the activate
      // response's decoded payload (signedToken carries `license_id`).
      const licenseId = decodeLicenseIdFromToken(res.data.signedToken);
      const next: PersistedState = {
        licenseId,
        status: res.data.status ?? 'ACTIVE',
        expiresAt: res.data.expiresAt ?? null,
        lastSuccessfulCheckin: new Date().toISOString(),
        desktopAccessEnabled: true,
      };
      savePersisted(next);
      set(next);
    } catch (err: any) {
      set({ activationError: err.response?.data?.message || 'Failed to activate license.' });
      throw err;
    } finally {
      set({ activating: false });
    }
  },

  checkin: async () => {
    const { licenseId } = get();
    if (!licenseId) return;
    try {
      const res = await api.post('/license/checkin', {
        licenseId,
        machineHash: getDeviceId(),
        appVersion: APP_VERSION,
      });
      const next: PersistedState = {
        licenseId,
        status: res.data.status,
        expiresAt: res.data.expiresAt,
        lastSuccessfulCheckin: new Date().toISOString(),
        desktopAccessEnabled: res.data.desktopAccessEnabled ?? true,
      };
      savePersisted(next);
      set(next);
    } catch {
      // Offline or transient failure: leave persisted state untouched.
      // Read-only tolerance comes from the staleness check in isReadOnly(),
      // not from treating a single failed checkin as revocation.
    }
  },

  isReadOnly: () => {
    const { licenseId, status, desktopAccessEnabled, lastSuccessfulCheckin } = get();
    if (!licenseId || !status) return true;
    if (status !== 'ACTIVE') return true;
    if (!desktopAccessEnabled) return true;
    if (!lastSuccessfulCheckin) return true;
    const staleMs = Date.now() - new Date(lastSuccessfulCheckin).getTime();
    return staleMs > CHECKIN_STALE_MS;
  },
}));

/**
 * The activate response's signedToken is `TB-PRO-<base64url(payload)>.<sig>`
 * (see license.service.ts's signPayload) — decode just enough to read
 * `license_id` out of the JSON payload without verifying the signature
 * (verification isn't done client-side in this lightweight flow; the value
 * is only used locally to know which license to check in against).
 */
function decodeLicenseIdFromToken(signedToken: string | undefined): string | null {
  if (!signedToken) return null;
  try {
    const withoutPrefix = signedToken.replace(/^TB-PRO-/, '');
    const payloadB64 = withoutPrefix.split('.')[0];
    const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return payload.license_id ?? null;
  } catch {
    return null;
  }
}
