import { create } from 'zustand';
import type { CartItem } from '../types';

interface CartStore {
  items: CartItem[];
  isOnlineOrder: boolean;
  setIsOnlineOrder: (val: boolean) => void;
  addItem: (item: CartItem) => void;
  removeItem: (serialNumber: string) => void;
  updateItemPrice: (serialNumber: string, price: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()((set) => ({
  items: [],
  isOnlineOrder: false,
  setIsOnlineOrder: (val) => set({ isOnlineOrder: val }),
  addItem: (item) =>
    set((s) => ({ items: [...s.items, item] })),
  removeItem: (serial) =>
    set((s) => ({ items: s.items.filter((i) => i.serialNumber !== serial) })),
  updateItemPrice: (serial, price) =>
    set((s) => ({
      items: s.items.map((i) => (i.serialNumber === serial ? { ...i, sellingPrice: price } : i)),
    })),
  clearCart: () => set({ items: [], isOnlineOrder: false }),
}));

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for insecure contexts (HTTP)
  return 'fallback-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);
}
