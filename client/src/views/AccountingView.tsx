import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Store,
  Truck,
  Banknote,
  QrCode,
  CreditCard,
  Receipt,
  Wallet,
  ArrowDownUp,
} from 'lucide-react';
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useDashboard,
  useSales,
} from '@/lib/queries';
import { useStore } from '@/lib/store';
import { fmt, useDateRange, fmtDateTime, type Period } from '@/lib/utils';
import Modal from '@/components/Modal';
import type { Expense, SaleRow } from '@/lib/types';

const EXPENSE_CATEGORIES = ['compras', 'transporte', 'servicios', 'sueldos', 'otros'];
const PERIODS: [Period, string][] = [
  ['today', 'Hoy'], ['week', 'Semana'], ['month', 'Mes'], ['year', 'Año'],
];

type SaleSort = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'price_desc' | 'price_asc';
type ExpenseSort = 'date_desc' | 'date_asc' | 'desc_asc' | 'desc_desc' | 'amount_desc' | 'amount_asc';
type SaleTypeFilter = 'all' | 'site' | 'delivery';

const SALE_SORT_OPTIONS: [SaleSort, string][] = [
  ['date_desc', 'Más recientes'],
  ['date_asc', 'Más antiguas'],
  ['name_asc', 'Producto A-Z'],
  ['name_desc', 'Producto Z-A'],
  ['price_desc', 'Mayor monto'],
  ['price_asc', 'Menor monto'],
];

const EXPENSE_SORT_OPTIONS: [ExpenseSort, string][] = [
  ['date_desc', 'Más recientes'],
  ['date_asc', 'Más antiguos'],
  ['desc_asc', 'Descripción A-Z'],
  ['desc_desc', 'Descripción Z-A'],
  ['amount_desc', 'Mayor monto'],
  ['amount_asc', 'Menor monto'],
];

interface ExpenseForm {
  date: string;
  category: string;
  description: string;
  amount: number;
}

function ExpenseModal({
  expense,
  onClose,
}: { expense: Expense | null; onClose: () => void }) {
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const isEdit = !!expense;

  const defaultDate = expense
    ? new Date(expense.date).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);

  const { register, handleSubmit, formState: { errors } } = useForm<ExpenseForm>({
    defaultValues: expense
      ? { date: defaultDate, category: expense.category, description: expense.description, amount: expense.amount }
      : { date: defaultDate, category: 'compras', description: '', amount: 0 },
  });

  const onSubmit = async (data: ExpenseForm) => {
    try {
      if (isEdit) {
        await updateExpense.mutateAsync({ id: expense!.id, body: { ...data, amount: Number(data.amount) } });
        toast.success('Gasto actualizado');
      } else {
        await createExpense.mutateAsync({ ...data, amount: Number(data.amount) });
        toast.success('Gasto registrado');
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Error');
    }
  };

  const isPending = createExpense.isPending || updateExpense.isPending;

  return (
    <Modal onClose={onClose} title={isEdit ? 'Editar gasto' : 'Nuevo gasto'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha y hora *</label>
            <input type="datetime-local" {...register('date', { required: true })}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Categoría *</label>
            <select {...register('category', { required: true })}
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm bg-white">
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Descripción *</label>
          <input {...register('description', { required: true })}
            placeholder="Ej: Arroz 50kg de proveedor"
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          {errors.description && <p className="text-xs text-red-500 mt-0.5">Requerido</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-600 block mb-1">Monto Bs *</label>
          <input type="number" step="0.01" min="0" {...register('amount', { required: true, min: 0.01 })}
            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-sm" />
          {errors.amount && <p className="text-xs text-red-500 mt-0.5">Ingresa un monto válido</p>}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 border-2 border-slate-200 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-50">
            {isPending ? 'Guardando...' : isEdit ? 'Guardar' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden mb-5">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function PaymentIcon({ method }: { method: string }) {
  if (method === 'Efectivo') return <Banknote size={16} className="inline text-emerald-500" />;
  if (method === 'QR') return <QrCode size={16} className="inline text-indigo-500" />;
  if (method === 'Tarjeta') return <CreditCard size={16} className="inline text-blue-500" />;
  return <span className="text-xs text-slate-600">{method}</span>;
}

function SalesPanel({ sales, isLoading }: { sales: SaleRow[]; isLoading: boolean }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [saleType, setSaleType] = useState<SaleTypeFilter>('all');
  const [sort, setSort] = useState<SaleSort>('date_desc');

  const categories = useMemo(() => {
    const set = new Set(sales.map((s) => s.category).filter(Boolean));
    return Array.from(set).sort();
  }, [sales]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = sales.filter((s) => {
      const matchSearch =
        !q ||
        s.productName.toLowerCase().includes(q) ||
        s.ticketId.toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q);
      const matchCat = !category || s.category === category;
      const matchType = saleType === 'all' || s.saleType === saleType;
      return matchSearch && matchCat && matchType;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'date_desc': return new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime();
        case 'date_asc': return new Date(a.soldAt).getTime() - new Date(b.soldAt).getTime();
        case 'name_asc': return a.productName.localeCompare(b.productName);
        case 'name_desc': return b.productName.localeCompare(a.productName);
        case 'price_desc': return b.lineTotal - a.lineTotal;
        case 'price_asc': return a.lineTotal - b.lineTotal;
      }
    });
    return list;
  }, [sales, search, category, saleType, sort]);

  const totals = useMemo(() => ({
    rows: filtered.length,
    units: filtered.reduce((s, r) => s + r.qty, 0),
    revenue: filtered.reduce((s, r) => s + r.lineTotal, 0),
    profit: filtered.reduce((s, r) => s + r.lineProfit, 0),
  }), [filtered]);

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Receipt size={14} /> Ventas registradas
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span><strong className="text-slate-700">{totals.rows}</strong> líneas</span>
          <span><strong className="text-emerald-600">{fmt(totals.revenue)}</strong> ingresos</span>
          <span><strong className={totals.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}>{fmt(totals.profit)}</strong> ganancia</span>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto, ticket o categoría..."
            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 text-xs font-semibold border-2 border-slate-200 rounded-lg bg-white focus:border-indigo-500 outline-none"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-1">
          {([['all', 'Todas'], ['site', 'Tienda'], ['delivery', 'Delivery']] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setSaleType(k)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                saleType === k ? 'bg-indigo-500 text-white' : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="relative">
          <ArrowDownUp size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SaleSort)}
            className="pl-7 pr-3 py-2 text-xs font-semibold border-2 border-slate-200 rounded-lg bg-white focus:border-indigo-500 outline-none"
          >
            {SALE_SORT_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs font-bold uppercase text-slate-600 border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2.5 text-left">Fecha</th>
              <th className="px-3 py-2.5 text-left">Ticket</th>
              <th className="px-3 py-2.5 text-left">Producto</th>
              <th className="px-3 py-2.5 text-left">Categoría</th>
              <th className="px-3 py-2.5 text-center">Tipo</th>
              <th className="px-3 py-2.5 text-center">Cant.</th>
              <th className="px-3 py-2.5 text-right">Precio</th>
              <th className="px-3 py-2.5 text-right">Total</th>
              <th className="px-3 py-2.5 text-right">Ganancia</th>
              <th className="px-3 py-2.5 text-center">Pago</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={10} className="text-center py-6 text-slate-400 text-sm">Cargando...</td></tr>
            )}
            {filtered.map((s, idx) => (
              <tr
                key={s.lineId}
                className={`text-sm border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
              >
                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-xs">{fmtDateTime(s.soldAt)}</td>
                <td className="px-3 py-2.5 font-bold text-slate-800 text-xs">{s.ticketId}</td>
                <td className="px-3 py-2.5 font-semibold text-slate-800">{s.productName}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600">{s.category}</span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {s.saleType === 'site'
                    ? <Store size={15} className="inline text-indigo-500" />
                    : <Truck size={15} className="inline text-amber-500" />}
                </td>
                <td className="px-3 py-2.5 text-center font-bold">{s.qty}</td>
                <td className="px-3 py-2.5 text-right text-slate-700">{fmt(s.price)}</td>
                <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{fmt(s.lineTotal)}</td>
                <td className={`px-3 py-2.5 text-right font-bold ${s.lineProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {fmt(s.lineProfit)}
                </td>
                <td className="px-3 py-2.5 text-center"><PaymentIcon method={s.paymentMethod} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isLoading && !filtered.length && (
        <div className="text-center py-10 text-slate-400 text-sm">
          {sales.length === 0 ? 'Sin ventas en este período' : 'Ningún resultado para los filtros aplicados'}
        </div>
      )}
      {filtered.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-sm">
          <span className="text-slate-500">
            {filtered.length} {filtered.length === 1 ? 'venta' : 'ventas'} · {totals.units} {totals.units === 1 ? 'unidad' : 'unidades'}
          </span>
          <span className="font-extrabold text-emerald-600">Total: {fmt(totals.revenue)}</span>
        </div>
      )}
    </div>
  );
}

function ExpensesPanel({
  expenses,
  isLoading,
  onEdit,
  onDelete,
}: {
  expenses: Expense[];
  isLoading: boolean;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [sort, setSort] = useState<ExpenseSort>('date_desc');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = expenses.filter((e) => {
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q);
      const matchCat = !category || e.category === category;
      return matchSearch && matchCat;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'date_desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date_asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'desc_asc': return a.description.localeCompare(b.description);
        case 'desc_desc': return b.description.localeCompare(a.description);
        case 'amount_desc': return b.amount - a.amount;
        case 'amount_asc': return a.amount - b.amount;
      }
    });
    return list;
  }, [expenses, search, category, sort]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Wallet size={14} /> Gastos registrados
        </h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span><strong className="text-slate-700">{filtered.length}</strong> registros</span>
          <span><strong className="text-red-600">{fmt(total)}</strong> total</span>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar descripción, categoría o id..."
            className="w-full pl-9 pr-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 text-xs font-semibold border-2 border-slate-200 rounded-lg bg-white focus:border-indigo-500 outline-none capitalize"
        >
          <option value="">Todas las categorías</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="relative">
          <ArrowDownUp size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ExpenseSort)}
            className="pl-7 pr-3 py-2 text-xs font-semibold border-2 border-slate-200 rounded-lg bg-white focus:border-indigo-500 outline-none"
          >
            {EXPENSE_SORT_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs font-bold uppercase text-slate-600 border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2.5 text-left">Fecha</th>
              <th className="px-3 py-2.5 text-left">Categoría</th>
              <th className="px-4 py-2.5 text-left">Descripción</th>
              <th className="px-3 py-2.5 text-right">Monto</th>
              <th className="px-3 py-2.5 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="text-center py-6 text-slate-400 text-sm">Cargando...</td></tr>
            )}
            {filtered.map((e, idx) => (
              <tr
                key={e.id}
                className={`text-sm border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
              >
                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-xs">{fmtDateTime(e.date)}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 capitalize">{e.category}</span>
                </td>
                <td className="px-4 py-2.5 text-slate-700">{e.description}</td>
                <td className="px-3 py-2.5 text-right font-bold text-red-600">{fmt(e.amount)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => onEdit(e)} title="Editar"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(e)} title="Eliminar"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isLoading && !filtered.length && (
        <div className="text-center py-10 text-slate-400 text-sm">
          {expenses.length === 0 ? 'Sin gastos en este período' : 'Ningún resultado para los filtros aplicados'}
        </div>
      )}
      {filtered.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-sm">
          <span className="text-slate-500">{filtered.length} registros</span>
          <span className="font-extrabold text-red-600">Total: {fmt(total)}</span>
        </div>
      )}
    </div>
  );
}

export default function AccountingView() {
  const [period, setPeriod] = useState<Period>('month');
  const [tab, setTab] = useState<'ventas' | 'gastos'>('ventas');
  const range = useDateRange(period);
  const { data: expenses = [], isLoading: loadingExp } = useExpenses(range);
  const { data: sales = [], isLoading: loadingSales } = useSales(range);
  const { data: dash } = useDashboard(range);
  const deleteExpense = useDeleteExpense();

  const [editExpense, setEditExpense] = useState<Expense | null | undefined>(undefined);

  const handleDelete = async (e: Expense) => {
    if (!confirm(`¿Eliminar "${e.description}"?`)) return;
    try {
      await deleteExpense.mutateAsync(e.id);
      toast.success('Gasto eliminado');
    } catch (err: any) {
      toast.error(err.message || 'Error');
    }
  };

  const ivaDebito = dash?.totalTax ?? 0;
  const totalCompras = useMemo(() =>
    expenses.filter((e) => e.category === 'compras').reduce((s, e) => s + e.amount, 0),
    [expenses]
  );
  const ivaCredito = totalCompras * 0.13;
  const ivaNetoPagar = ivaDebito - ivaCredito;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  const plRevenue = dash?.totalRevenue ?? 0;
  const plCOGS = dash?.totalCOGS ?? 0;
  const plTax = dash?.totalTax ?? 0;
  const plNet = plRevenue - plCOGS - plTax - totalExpenses;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h2 className="text-xl font-extrabold">Contabilidad</h2>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <SectionCard title="Resumen IVA">
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">IVA débito (ventas)</span>
              <span className="font-bold text-slate-800">{fmt(ivaDebito)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">IVA crédito (compras)</span>
              <span className="font-bold text-emerald-600">- {fmt(ivaCredito)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2.5 flex justify-between">
              <span className="font-semibold text-slate-700">IVA neto a pagar</span>
              <span className={`font-extrabold ${ivaNetoPagar >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {fmt(ivaNetoPagar)}
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Resumen P&L">
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Ingresos</span>
              <span className="font-bold text-slate-800">{fmt(plRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Costo de ventas (COGS)</span>
              <span className="font-bold text-slate-600">- {fmt(plCOGS)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">IVA débito</span>
              <span className="font-bold text-slate-600">- {fmt(plTax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Gastos operativos</span>
              <span className="font-bold text-slate-600">- {fmt(totalExpenses)}</span>
            </div>
            <div className="border-t border-slate-200 pt-2.5 flex justify-between">
              <span className="font-semibold text-slate-700">Ganancia neta</span>
              <span className={`font-extrabold ${plNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fmt(plNet)}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex bg-white border-2 border-slate-200 rounded-lg p-1">
          <button
            onClick={() => setTab('ventas')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${
              tab === 'ventas' ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Receipt size={14} /> Ventas
          </button>
          <button
            onClick={() => setTab('gastos')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${
              tab === 'gastos' ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Wallet size={14} /> Gastos
          </button>
        </div>
        {tab === 'gastos' && (
          <button onClick={() => setEditExpense(null)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600">
            <Plus size={13} /> Nuevo gasto
          </button>
        )}
      </div>

      {tab === 'ventas' && <SalesPanel sales={sales} isLoading={loadingSales} />}
      {tab === 'gastos' && (
        <ExpensesPanel
          expenses={expenses}
          isLoading={loadingExp}
          onEdit={(e) => setEditExpense(e)}
          onDelete={handleDelete}
        />
      )}

      {editExpense !== undefined && (
        <ExpenseModal expense={editExpense} onClose={() => setEditExpense(undefined)} />
      )}
    </div>
  );
}
