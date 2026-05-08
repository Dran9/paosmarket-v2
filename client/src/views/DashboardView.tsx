import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useDashboard } from '@/lib/queries';
import { useStore } from '@/lib/store';
import { fmt, useDateRange, type Period } from '@/lib/utils';
import { AlertCircle, TrendingUp, ShoppingBag, Receipt, Wallet, DollarSign } from 'lucide-react';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend
);

const PERIODS: [Period, string][] = [
  ['today', 'Hoy'],
  ['week', 'Semana'],
  ['month', 'Mes'],
  ['year', 'Año'],
];

const METHOD_COLORS: Record<string, string> = {
  Efectivo: '#10b981',
  QR: '#6366f1',
  Tarjeta: '#3b82f6',
  Depósito: '#f59e0b',
  Mixto: '#8b5cf6',
};

function KPICard({ label, value, sub, color, icon: Icon }: { label: string; value: string; sub?: string; color: string; icon: any }) {
  return (
    <div className="bg-white rounded-xl p-4 border-2 border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-500 uppercase">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={14} />
        </div>
      </div>
      <div className="text-2xl font-extrabold text-slate-800">{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function DashboardView() {
  const [period, setPeriod] = useState<Period>('month');
  const range = useDateRange(period);
  const { data, isLoading } = useDashboard(range);
  const { settings } = useStore();

  const methodChart = useMemo(() => {
    if (!data?.byMethod?.length) return null;
    return {
      labels: data.byMethod.map((m) => m.method),
      datasets: [{
        data: data.byMethod.map((m) => m.total),
        backgroundColor: data.byMethod.map((m) => METHOD_COLORS[m.method] || '#94a3b8'),
        borderWidth: 0,
      }],
    };
  }, [data]);

  const saleTypeChart = useMemo(() => {
    if (!data?.bySaleType?.length) return null;
    return {
      labels: data.bySaleType.map((s) => s.saleType === 'site' ? 'En tienda' : 'Delivery'),
      datasets: [{
        data: data.bySaleType.map((s) => s.total),
        backgroundColor: ['#6366f1', '#f59e0b'],
        borderWidth: 0,
      }],
    };
  }, [data]);

  const topProductsChart = useMemo(() => {
    if (!data?.topProducts?.length) return null;
    const top = data.topProducts.slice(0, 10);
    return {
      labels: top.map((p) => p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name),
      datasets: [
        {
          label: 'Ingresos',
          data: top.map((p) => p.revenue),
          backgroundColor: '#6366f1cc',
          borderRadius: 4,
        },
        {
          label: 'Ganancia',
          data: top.map((p) => p.profit),
          backgroundColor: '#10b981cc',
          borderRadius: 4,
        },
      ],
    };
  }, [data]);

  const donutOpts = {
    responsive: true,
    plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 12, font: { size: 11 } } } },
  };

  const barOpts = {
    responsive: true,
    indexAxis: 'y' as const,
    plugins: { legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: { x: { ticks: { font: { size: 10 } } }, y: { ticks: { font: { size: 10 } } } },
  };

  if (isLoading || !data) {
    return (
      <div>
        <h2 className="text-xl font-extrabold mb-5">Dashboard</h2>
        <div className="text-center py-16 text-slate-400">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold">Dashboard</h2>
        <div className="flex gap-1">
          {PERIODS.map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                period === k
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-indigo-50'
              }`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <KPICard label="Ingresos" value={fmt(data.totalRevenue)} sub={`${data.txCount} ventas`} color="bg-indigo-100 text-indigo-600" icon={DollarSign} />
        <KPICard label="COGS" value={fmt(data.totalCOGS)} color="bg-amber-100 text-amber-600" icon={ShoppingBag} />
        <KPICard label="Ganancia bruta" value={fmt(data.grossProfit)} color="bg-emerald-100 text-emerald-600" icon={TrendingUp} />
        <KPICard label="IVA 13%" value={fmt(data.totalTax)} color="bg-slate-100 text-slate-600" icon={Receipt} />
        <KPICard label="Gastos" value={fmt(data.totalExpenses)} color="bg-red-100 text-red-600" icon={Wallet} />
        <KPICard
          label="Ganancia neta"
          value={fmt(data.netProfit)}
          color={data.netProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {methodChart && (
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Método de pago</h3>
            <div className="max-h-48 flex justify-center">
              <Doughnut data={methodChart} options={donutOpts} />
            </div>
          </div>
        )}
        {saleTypeChart && (
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Tipo de venta</h3>
            <div className="max-h-48 flex justify-center">
              <Doughnut data={saleTypeChart} options={donutOpts} />
            </div>
          </div>
        )}
      </div>

      {topProductsChart && (
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 mb-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Top 10 productos</h3>
          <Bar data={topProductsChart} options={barOpts} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data.byUser.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-700">Ventas por vendedor</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-2 text-left font-semibold">Vendedor</th>
                  <th className="px-4 py-2 text-right font-semibold">Ventas</th>
                  <th className="px-4 py-2 text-right font-semibold">Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {data.byUser.map((u) => (
                  <tr key={u.userId} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{u.name}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{u.count}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{fmt(u.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.lowStock.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-600" />
              <h3 className="text-sm font-bold text-amber-700">Stock bajo ({data.lowStock.length})</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-2 text-left font-semibold">Producto</th>
                  <th className="px-4 py-2 text-right font-semibold">Stock</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStock.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{p.name}</td>
                    <td className={`px-4 py-2.5 text-right font-bold ${p.stock <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {p.stock} {p.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!data.txCount && (
        <div className="text-center py-10 text-slate-400 text-sm">
          Sin ventas en este período
        </div>
      )}
    </div>
  );
}
