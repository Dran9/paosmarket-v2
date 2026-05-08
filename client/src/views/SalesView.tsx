import { useMemo, useState } from 'react';
import {
  Store,
  Truck,
  Banknote,
  QrCode,
  CreditCard,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useSales } from '@/lib/queries';
import { fmt, fmtDateTime, useDateRange, type Period } from '@/lib/utils';

const PERIODS: ReadonlyArray<readonly [Period, string]> = [
  ['today', 'Hoy'],
  ['week', 'Semana'],
  ['month', 'Mes'],
  ['year', 'Año'],
];

const TYPES: ReadonlyArray<readonly ['all' | 'site' | 'delivery', string]> = [
  ['all', 'Todas'],
  ['site', 'En tienda'],
  ['delivery', 'Delivery'],
];

export default function SalesView() {
  const [period, setPeriod] = useState<Period>('month');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'site' | 'delivery'>('all');
  const range = useDateRange(period);
  const { data: sales = [], isLoading, error } = useSales(range);

  const filtered = useMemo(
    () =>
      sales.filter((s) => {
        const q = search.toLowerCase().trim();
        const matchSearch =
          !q ||
          s.productName.toLowerCase().includes(q) ||
          s.ticketId.toLowerCase().includes(q);
        const matchType = filterType === 'all' || s.saleType === filterType;
        return matchSearch && matchType;
      }),
    [sales, search, filterType]
  );

  const totals = useMemo(
    () => ({
      rows: filtered.length,
      units: filtered.reduce((s, r) => s + r.qty, 0),
      revenue: filtered.reduce((s, r) => s + r.lineTotal, 0),
      profit: filtered.reduce((s, r) => s + r.lineProfit, 0),
    }),
    [filtered]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold text-slate-800">Ventas</h2>
        <div className="flex gap-1">
          {PERIODS.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setPeriod(k)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                period === k
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-indigo-50'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Filas" value={totals.rows} color="text-slate-700" />
        <KpiCard label="Unidades" value={totals.units} color="text-indigo-600" />
        <KpiCard label="Ingresos" value={fmt(totals.revenue)} color="text-emerald-600" />
        <KpiCard
          label="Ganancia"
          value={fmt(totals.profit)}
          color={totals.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}
        />
      </div>

      <div className="flex gap-3 mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto o ticket…"
          className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none transition-colors"
        />
        <div className="flex gap-1">
          {TYPES.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilterType(k)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                filterType === k
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white border border-slate-200 hover:bg-indigo-50 text-slate-600'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr className="text-xs font-bold uppercase text-slate-600">
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-3 py-3 text-left">Ticket</th>
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-3 py-3 text-left">Categoría</th>
                <th className="px-3 py-3 text-center">Tipo</th>
                <th className="px-3 py-3 text-right">Precio</th>
                <th className="px-3 py-3 text-right">Costo</th>
                <th className="px-3 py-3 text-center">Cant.</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-right">Ganancia</th>
                <th className="px-3 py-3 text-center">Pago</th>
                <th className="px-4 py-3 text-left">Atiende</th>
                <th className="px-3 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr
                  key={row.lineId}
                  className={`text-sm border-b border-slate-100 hover:bg-indigo-50/40 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  }`}
                >
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {fmtDateTime(row.soldAt)}
                  </td>
                  <td className="px-3 py-3 font-bold text-slate-800">{row.ticketId}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.productName}</td>
                  <td className="px-3 py-3 text-slate-600">{row.category}</td>
                  <td className="px-3 py-3 text-center">
                    {row.saleType === 'site' ? (
                      <span title="En tienda">
                        <Store size={18} className="inline text-indigo-500" />
                      </span>
                    ) : (
                      <span title="Delivery">
                        <Truck size={18} className="inline text-amber-500" />
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">{fmt(row.price)}</td>
                  <td className="px-3 py-3 text-right text-slate-500">{fmt(row.cost)}</td>
                  <td className="px-3 py-3 text-center font-bold">{row.qty}</td>
                  <td className="px-3 py-3 text-right font-bold text-emerald-600">
                    {fmt(row.lineTotal)}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-bold ${
                      row.lineProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {fmt(row.lineProfit)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <PaymentIcon method={row.paymentMethod} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.attendedBy}</td>
                  <td
                    className={`px-3 py-3 text-right font-semibold whitespace-nowrap ${
                      row.currentStock <= 5
                        ? 'text-red-600'
                        : row.currentStock <= 15
                          ? 'text-amber-600'
                          : 'text-slate-700'
                    }`}
                  >
                    {row.currentStock}
                    {row.currentStock <= 5 && (
                      <AlertCircle size={14} className="inline ml-1" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Cargando ventas…
          </div>
        )}
        {!isLoading && !filtered.length && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No hay ventas en este período.
          </div>
        )}
        {error && (
          <div className="text-center py-6 text-red-500 text-sm">
            {error instanceof Error ? error.message : 'Error cargando ventas'}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border-2 border-slate-200 shadow-sm">
      <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">{label}</div>
      <div className={`text-2xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}

function PaymentIcon({ method }: { method: string }) {
  if (method === 'Efectivo') return <Banknote size={18} className="inline text-emerald-500" />;
  if (method === 'QR') return <QrCode size={18} className="inline text-indigo-500" />;
  if (method === 'Tarjeta') return <CreditCard size={18} className="inline text-blue-500" />;
  return <span className="text-xs text-slate-600">{method}</span>;
}
