import {
  Apple,
  Banana,
  Bath,
  Beef,
  Beer,
  Box,
  Boxes,
  Cake,
  Candy,
  Carrot,
  ChefHat,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  Croissant,
  Drumstick,
  Egg,
  Fish,
  Flame,
  Flower,
  Gift,
  GlassWater,
  Grape,
  Ham,
  Dessert,
  Heart,
  IceCream,
  Leaf,
  Lollipop,
  Milk,
  Package,
  PawPrint,
  Pill,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  ShoppingBag,
  ShoppingBasket,
  Shirt,
  Soup,
  Sparkles,
  SprayCan,
  Stethoscope,
  Tag,
  Tags,
  Truck,
  Utensils,
  WashingMachine,
  Wheat,
  Wine,
  type LucideIcon,
} from 'lucide-react';

const COMBINING = /[̀-ͯ]/g;

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(COMBINING, '');
}

// Catálogo curado de iconos disponibles para categorías.
export const ICON_CATALOG: Record<string, LucideIcon> = {
  Apple, Banana, Bath, Beef, Beer, Box, Boxes, Cake, Candy, Carrot,
  ChefHat, Cherry, Citrus, Coffee, Cookie, Croissant, Drumstick, Egg,
  Fish, Flame, Flower, Gift, GlassWater, Grape, Ham, Dessert, Heart,
  IceCream, Leaf, Lollipop, Milk, Package, PawPrint, Pill, Pizza,
  Popcorn, Salad, Sandwich, ShoppingBag, ShoppingBasket, Shirt, Soup,
  Sparkles, SprayCan, Stethoscope, Tag, Tags, Truck, Utensils, WashingMachine,
  Wheat, Wine,
};

export const ICON_NAMES: string[] = Object.keys(ICON_CATALOG).sort();

// Fallback estático para categorías legacy (cuando aún no cargó el API).
const FALLBACK_MAP: Record<string, LucideIcon> = {
  bebidas: GlassWater,
  lacteos: Milk,
  panaderia: Wheat,
  carnes: Beef,
  snacks: Cookie,
  abarrotes: ShoppingBasket,
  limpieza: Sparkles,
  higiene: Bath,
  frutas: Apple,
  verduras: Carrot,
  otros: Package,
};

// Mapa dinámico poblado por la API. Se actualiza vía setDynamicCategoryIcons.
let dynamicMap: Record<string, LucideIcon> = {};

export function setDynamicCategoryIcons(map: Record<string, string>) {
  const next: Record<string, LucideIcon> = {};
  for (const [cat, iconName] of Object.entries(map)) {
    const Icon = ICON_CATALOG[iconName];
    if (Icon) next[normalize(cat)] = Icon;
  }
  dynamicMap = next;
}

export function lookupIcon(iconName: string): LucideIcon {
  return ICON_CATALOG[iconName] ?? Package;
}

export function iconFor(category: string): LucideIcon {
  const key = normalize(category || '');
  return dynamicMap[key] ?? FALLBACK_MAP[key] ?? Package;
}

// Sugerencias de iconos por keywords del nombre de categoría.
const KEYWORD_SUGGESTIONS: Array<[string[], string[]]> = [
  [['lacteo', 'leche', 'queso', 'yogur'], ['Milk', 'GlassWater', 'IceCream', 'Cake', 'Egg']],
  [['bebida', 'jugo', 'agua', 'refresco', 'gaseosa'], ['GlassWater', 'Coffee', 'Beer', 'Wine', 'Citrus']],
  [['vino', 'licor', 'alcohol', 'cerveza'], ['Wine', 'Beer', 'GlassWater']],
  [['cafe', 'te', 'infusion'], ['Coffee', 'GlassWater', 'Leaf']],
  [['carne', 'pollo', 'res', 'cerdo', 'embutido'], ['Beef', 'Drumstick', 'Ham', 'Fish', 'Egg', 'ChefHat']],
  [['pescado', 'mariscos', 'mar'], ['Fish', 'ChefHat']],
  [['pan', 'panaderia', 'reposteria', 'pasteleria'], ['Wheat', 'Croissant', 'Cake', 'Cookie']],
  [['fruta', 'frutas'], ['Apple', 'Banana', 'Cherry', 'Grape', 'Citrus']],
  [['verdura', 'vegetal', 'hortaliza', 'legumbre'], ['Carrot', 'Salad', 'Leaf', 'Apple']],
  [['snack', 'dulce', 'caramelo', 'galleta', 'chocolate', 'chuche'], ['Cookie', 'Candy', 'Lollipop', 'Cake', 'IceCream', 'Popcorn']],
  [['comida', 'almuerzo', 'plato', 'menu', 'rapida'], ['Utensils', 'Dessert', 'Pizza', 'Sandwich', 'ChefHat', 'Soup']],
  [['huevo'], ['Egg']],
  [['mascota', 'perro', 'gato'], ['PawPrint']],
  [['limpieza', 'detergente'], ['Sparkles', 'SprayCan', 'WashingMachine']],
  [['higiene', 'cuidado', 'personal', 'aseo'], ['Bath', 'SprayCan', 'Sparkles']],
  [['salud', 'farmacia', 'medicina', 'medicamento'], ['Pill', 'Stethoscope', 'Heart']],
  [['ropa', 'vestir', 'textil'], ['Shirt']],
  [['flor', 'planta', 'jardin'], ['Flower', 'Leaf']],
  [['regalo', 'obsequio'], ['Gift', 'Heart']],
  [['abarrote', 'general'], ['ShoppingBasket', 'Boxes', 'Package']],
  [['oferta', 'promocion'], ['Tag', 'Tags']],
  [['delivery', 'envio'], ['Truck', 'ShoppingBag']],
  [['parrilla', 'asado', 'bbq'], ['Flame', 'Beef', 'ChefHat']],
];

export function suggestIcons(name: string): string[] {
  const n = normalize(name).trim();
  if (!n) return [];
  const out: string[] = [];
  for (const [keys, icons] of KEYWORD_SUGGESTIONS) {
    if (keys.some((k) => n.includes(k))) {
      for (const i of icons) {
        if (typeof i === 'string' && ICON_CATALOG[i] && !out.includes(i)) out.push(i);
      }
    }
  }
  return out;
}
