import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, CartItem, User, ViewKey } from './types';

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
      resetCart: () => set({ cart: [] }),
    }),
    {
      name: 'pos-store',
      partialize: (s) => ({ settings: s.settings, view: s.view }),
    }
  )
);
