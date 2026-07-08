import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LockState {
  isLocked: boolean;
  pinHash: string | null;
  isPinSet: boolean;
  autoLockMinutes: number; // 0 = disabled
  lock: () => void;
  unlock: () => void;
  setPin: (pin: string) => void;
  verifyPin: (pin: string) => boolean;
  clearPin: () => void;
  setAutoLockMinutes: (minutes: number) => void;
}

// Salted synchronous hashing function to avoid storing plain PINs in LocalStorage
function hashPin(pin: string, salt = 'et_secure_salt_'): string {
  let hash = 5381;
  const str = salt + pin;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export const useLockStore = create<LockState>()(
  persist(
    (set, get) => ({
      isLocked: false,
      pinHash: null,
      isPinSet: false,
      autoLockMinutes: 0,
      lock: () => {
        if (get().isPinSet) {
          set({ isLocked: true });
        }
      },
      unlock: () => set({ isLocked: false }),
      setPin: (pin: string) => {
        const hash = hashPin(pin);
        set({ pinHash: hash, isPinSet: true });
      },
      verifyPin: (pin: string) => {
        if (!get().pinHash) return false;
        const hash = hashPin(pin);
        return get().pinHash === hash;
      },
      clearPin: () => set({ pinHash: null, isPinSet: false, isLocked: false }),
      setAutoLockMinutes: (minutes: number) => set({ autoLockMinutes: minutes }),
    }),
    {
      name: 'et-lock',
      partialize: (state) => ({
        pinHash: state.pinHash,
        isPinSet: state.isPinSet,
        isLocked: state.isLocked,
        autoLockMinutes: state.autoLockMinutes,
      }),
    }
  )
);
