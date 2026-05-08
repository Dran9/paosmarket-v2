import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, CartItem, Product, User, ViewKey } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  businessName: "Paolita's Market",
  businessTagline: 'Tu tienda de confianza',
  businessNIT: '',
  businessPhone: '',
  businessAddress: '',
  businessCity: 'La Paz',
  businessEmail: '',
  currency: 'BOB',
  currencySymbol: 'Bs',
  timezone: 'America/La_Paz',
  taxRate: 13,
  ticketPrefix: 'T-',
  orderPrefix: 'PED-',
  lowStockThreshold: 5,
};

interface State {
  settings: AppSettings;
  view: ViewKey;
  cart: CartItem[];
  currentUser: User | null;

  setSettings: (s: Partial<AppSettings>) => void;
  setView: (v: ViewKey) => void;
  setUser: (u: User | null) => void;

  addToCart: (p: Product) => void;
  decQty: (productId: number) => void;
  setQty: (productId: number, qty: number) => void;
  removeItem: (productId: number) => void;
  resetCart: () => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      view: 'pos',
      cart: [],
      currentUser: null,

      setSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),
      setView: (v) => set({ view: v }),
      setUser: (u) => set({ currentUser: u }),

      addToCart: (p) =>
        set((state) => {
          const idx = state.cart.findIndex((c) => c.productId === p.id);
          if (idx === -1) {
            return {
              cart: [
                ...state.cart,
                {
                  productId: p.id,
                  name: p.name,
                  category: p.category,
                  price: p.price,
                  cost: p.cost,
                  qty: 1,
                },
              ],
            };
          }
          const next = state.cart.slice();
          next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
          return { cart: next };
        }),
      decQty: (productId) =>
        set((state) => {
          const idx = state.cart.findIndex((c) => c.productId === productId);
          if (idx === -1) return state;
          const next = state.cart.slice();
          const newQty = next[idx].qty - 1;
          if (newQty <= 0) next.splice(idx, 1);
          else next[idx] = { ...next[idx], qty: newQty };
          return { cart: next };
        }),
      setQty: (productId, qty) =>
        set((state) => {
          const idx = state.cart.findIndex((c) => c.productId === productId);
          if (idx === -1) return state;
          const next = state.cart.slice();
          if (qty <= 0) next.splice(idx, 1);
          else next[idx] = { ...next[idx], qty };
          return { cart: next };
        }),
      removeItem: (productId) =>
        set((state) => ({
          cart: state.cart.filter((c) => c.productId !== productId),
        })),
      resetCart: () => set({ cart: [] }),
    }),
    {
      name: 'pos-store',
      partialize: (s) => ({ settings: s.settings, view: s.view }),
    }
  )
);
