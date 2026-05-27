import { create } from 'zustand';
import type { CartItem } from '../types';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (serialNumber: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()((set) => ({
  items: [],
  addItem: (item) =>
    set((s) => ({ items: [...s.items, item] })),
  removeItem: (serial) =>
    set((s) => ({ items: s.items.filter((i) => i.serialNumber !== serial) })),
  clearCart: () => set({ items: [] }),
}));
