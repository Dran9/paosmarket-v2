import { ShoppingCart } from 'lucide-react';

export default function POSView() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
      <ShoppingCart size={48} className="mb-4 text-slate-300" />
      <h2 className="text-xl font-extrabold text-slate-700 mb-1">Punto de Venta</h2>
      <p className="text-sm">La caja se implementa en la siguiente fase.</p>
    </div>
  );
}
