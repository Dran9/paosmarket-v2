import {
  GlassWater,
  Milk,
  Wheat,
  Beef,
  Cookie,
  ShoppingBasket,
  Sparkles,
  Package,
  type LucideIcon,
} from 'lucide-react';

const COMBINING = /[̀-ͯ]/g;

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(COMBINING, '');
}

const RAW_MAP: Record<string, LucideIcon> = {
  bebidas: GlassWater,
  lacteos: Milk,
  panaderia: Wheat,
  carnes: Beef,
  snacks: Cookie,
  abarrotes: ShoppingBasket,
  limpieza: Sparkles,
};

export const CAT_ICON_MAP = RAW_MAP;

export function iconFor(category: string): LucideIcon {
  return RAW_MAP[normalize(category || '')] ?? Package;
}
