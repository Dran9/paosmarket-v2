import CategoryIcon from './CategoryIcon';
import { useStore } from '@/lib/store';
import type { Product } from '@/lib/types';

interface Props {
  product: Product;
  onClick: (p: Product) => void;
}

export default function ProductCard({ product, onClick }: Props) {
  const { settings } = useStore();
  const threshold = settings.lowStockThreshold ?? 5;
  const out = product.stock <= 0;
  const low = product.stock <= threshold;

  return (
    <button
      type="button"
      disabled={out}
      onClick={() => onClick(product)}
      className={`bg-white rounded-xl border-2 border-slate-200 p-3 flex flex-col items-stretch text-left transition-all relative ${
        out
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:border-indigo-400 hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
      }`}
    >
      <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[9px] font-semibold text-indigo-600 max-w-[80%] truncate">
        <CategoryIcon category={product.category} size={9} className="text-indigo-500 flex-shrink-0" />
        <span className="truncate">{product.category}</span>
      </div>
      <div className="flex justify-center mb-2 mt-3">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
          <CategoryIcon category={product.category} size={24} className="text-indigo-500" />
        </div>
      </div>
      <div className="text-base font-bold text-center text-slate-800 mb-0.5 leading-tight line-clamp-2">
        {product.name}
      </div>
      {product.brand && (
        <div className="text-[11px] text-center text-slate-400 mb-1 truncate">{product.brand}</div>
      )}
      <div className="text-[22px] font-black text-center text-indigo-500 mb-1.5">
        {settings.currencySymbol} {product.price.toFixed(2)}
      </div>
      <div
        className={`text-xs text-center font-medium ${
          out ? 'text-red-500' : low ? 'text-amber-600' : 'text-slate-500'
        }`}
      >
        {product.stock} {product.unit === 'kg' ? 'kg' : 'pzas'}
      </div>
    </button>
  );
}
