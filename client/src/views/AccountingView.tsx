import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useDashboard } from '@/lib/queries';
import { useStore } from '@/lib/store';
import { fmt, useDateRange, fmtDateTime, type Period } from '@/lib/utils';
import Modal from '@/components/Modal';
import type { Expense } from '@/lib/types';

const CATEGORIES = ['compras', 'transporte', 'servicios', 'sueldos', 'otros'];
const PERIODS: [Period, string][] = [
  ['today', 'Hoy'], ['week', 'Semana'], ['month', 'Mes'], ['year', 'Año'],
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
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
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

export default function AccountingView() {
  const [period, setPeriod] = useState<Period>('month');
  const range = useDateRange(period);
  const { data: expenses = [], isLoading: loadingExp } = useExpenses(range);
  const { data: dash } = useDashboard(range);
  const deleteExpense = useDeleteExpense();
  const { settings } = useStore();

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
      <div className="flex items-center justify-between mb-5">
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

      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">Gastos</h3>
          <button onClick={() => setEditExpense(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600">
            <Plus size={13} /> Gasto
          </button>
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
              {loadingExp && (
                <tr><td colSpan={5} className="text-center py-6 text-slate-400 text-sm">Cargando...</td></tr>
              )}
              {expenses.map((e, idx) => (
                <tr key={e.id}
                  className={`text-sm border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-xs">
                    {fmtDateTime(e.date)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 capitalize">
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{e.description}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-red-600">{fmt(e.amount)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditExpense(e)} title="Editar"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(e)} title="Eliminar"
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
        {!expenses.length && !loadingExp && (
          <div className="text-center py-10 text-slate-400 text-sm">
            Sin gastos en este período
          </div>
        )}
        {expenses.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-sm">
            <span className="text-slate-500">{expenses.length} registros</span>
            <span className="font-extrabold text-red-600">Total: {fmt(totalExpenses)}</span>
          </div>
        )}
      </div>

      {editExpense !== undefined && (
        <ExpenseModal expense={editExpense} onClose={() => setEditExpense(undefined)} />
      )}
    </div>
  );
}
