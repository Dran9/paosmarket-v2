import CategoryIcon from './CategoryIcon';
import { useStore } from '@/lib/store';
import type { Product } from '@/lib/types';

interface Props {
  product: Product;
  onClick: (p: Product) => void;
}

export default function ProductCard({ product, onClick }: Props) {
  const { settings } = useStore();
  const out = product.stock <= 0;
  const low = product.stock <= settings.lowStockThreshold;

  return (
    <button
      type="button"
      disabled={out}
      onClick={() => onClick(product)}
      className={`bg-white rounded-xl border-2 border-slate-200 p-3 flex flex-col items-stretch text-left transition-all ${
        out
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:border-indigo-400 hover:-translate-y-0.5 hover:shadow-md cursor-pointer'
      }`}
    >
      <div className="flex justify-center mb-2">
        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
          <CategoryIcon category={product.category} size={24} className="text-indigo-500" />
        </div>
      </div>
      <div className="text-base font-bold text-center text-slate-800 mb-1.5 leading-tight line-clamp-2">
        {product.name}
      </div>
      <div className="text-xl font-black text-center text-indigo-500 mb-1.5">
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
