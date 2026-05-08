import { useMemo, useState } from 'react';
import {
  Truck,
  ChevronDown,
  ChevronRight,
  Loader2,
  Phone,
  AlertTriangle,
  Check,
  Coins,
  ReceiptText,
  X,
  CircleAlert,
  Ban,
  RotateCcw,
  Banknote,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useOrders,
  useDrivers,
  useUpdateOrder,
  useUpdateOrderStatus,
} from '@/lib/queries';
import { fmt, fmtDateTime } from '@/lib/utils';
import type {
  DeliveryMethod,
  Order,
  OrderStatus,
  TransportSettled,
  TransportType,
} from '@/lib/types';
import Modal from '@/components/Modal';
import {
  EditableNumber,
  EditableSelect,
  EditableText,
} from '@/components/EditableCell';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  preparando: 'Preparando',
  en_camino: 'En camino',
  entregado: 'Entregado',
  problema: 'Problema',
  devuelto: 'Devuelto',
  cancelado: 'Cancelado',
};

const STATUS_PILL: Record<OrderStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  preparando: 'bg-blue-100 text-blue-700',
  en_camino: 'bg-indigo-100 text-indigo-700',
  entregado: 'bg-emerald-100 text-emerald-700',
  problema: 'bg-red-100 text-red-700',
  devuelto: 'bg-slate-200 text-slate-700',
  cancelado: 'bg-slate-100 text-slate-500',
};

const TRANSPORT_LABEL: Record<TransportType, string> = {
  incluido: 'Incluido',
  pago_entrega: 'Pago entrega',
};

interface PendingTransition {
  order: Order;
  next: OrderStatus;
}

export default function OrdersView() {
  const { data: orders = [], isLoading } = useOrders();
  const { data: drivers = [] } = useDrivers();
  const update = useUpdateOrder();
  const setStatus = useUpdateOrderStatus();

  const [filter, setFilter] = useState<'all' | 'active' | OrderStatus>('active');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingTransition | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'active') {
      return orders.filter(
        (o) => !['entregado', 'devuelto', 'cancelado'].includes(o.status)
      );
    }
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: orders.length,
      active: 0,
      pendiente: 0,
      preparando: 0,
      en_camino: 0,
      entregado: 0,
      problema: 0,
      devuelto: 0,
      cancelado: 0,
    };
    for (const o of orders) {
      c[o.status]++;
      if (!['entregado', 'devuelto', 'cancelado'].includes(o.status)) c.active++;
    }
    return c;
  }, [orders]);

  const toggleExpanded = (id: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const driverOptions = useMemo<ReadonlyArray<readonly [string, string]>>(
    () => [['', 'Sin asignar'], ...drivers.map((d) => [d.id, d.name] as const)],
    [drivers]
  );

  const handleField = <K extends keyof Parameters<typeof update.mutateAsync>[0]['body']>(
    id: string,
    key: K,
    value: Parameters<typeof update.mutateAsync>[0]['body'][K]
  ) => {
    update
      .mutateAsync({ id, body: { [key]: value } as Parameters<typeof update.mutateAsync>[0]['body'] })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Error al guardar'));
  };

  const handleStatusChange = (order: Order, next: OrderStatus) => {
    if (next === order.status) return;

    // Cambios que requieren mini-modal
    if (next === 'entregado' || next === 'devuelto' || next === 'cancelado') {
      setPending({ order, next });
      return;
    }

    setStatus
      .mutateAsync({ id: order.id, body: { status: next } })
      .then(() => toast.success(`${order.id}: ${STATUS_LABEL[next]}`))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Error al cambiar estado'));
  };

  // Estados disponibles según el actual (los terminales no se pueden tocar).
  const availableStatuses = (current: OrderStatus): ReadonlyArray<readonly [OrderStatus, string]> => {
    if (current === 'devuelto' || current === 'cancelado') {
      return [[current, STATUS_LABEL[current]]];
    }
    if (current === 'entregado') {
      // De entregado solo se puede ir a devuelto.
      return [
        ['entregado', 'Entregado'],
        ['devuelto', 'Devuelto'],
      ];
    }
    return [
      ['pendiente', 'Pendiente'],
      ['preparando', 'Preparando'],
      ['en_camino', 'En camino'],
      ['entregado', 'Entregado'],
      ['problema', 'Problema'],
      ['cancelado', 'Cancelado'],
    ];
  };

  const FILTERS: ReadonlyArray<readonly [string, string, number]> = [
    ['active', 'Activos', counts.active],
    ['pendiente', 'Pendientes', counts.pendiente],
    ['preparando', 'Preparando', counts.preparando],
    ['en_camino', 'En camino', counts.en_camino],
    ['problema', 'Problema', counts.problema],
    ['entregado', 'Entregados', counts.entregado],
    ['devuelto', 'Devueltos', counts.devuelto],
    ['cancelado', 'Cancelados', counts.cancelado],
    ['all', 'Todos', counts.all],
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
          <Truck size={20} /> Pedidos
        </h2>
      </div>

      <div className="flex gap-1 mb-4 flex-wrap">
        {FILTERS.map(([k, l, n]) => (
          <button
            key={k}
            onClick={() => setFilter(k as typeof filter)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              filter === k
                ? 'bg-indigo-500 text-white'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-indigo-50'
            }`}
          >
            {l} {n > 0 && <span className="ml-1 opacity-70">({n})</span>}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr className="text-xs font-bold uppercase text-slate-600">
                <th className="px-2 py-3 w-8" />
                <th className="px-3 py-3 text-left">Pedido</th>
                <th className="px-3 py-3 text-left">Cliente</th>
                <th className="px-3 py-3 text-left">Fecha</th>
                <th className="px-3 py-3 text-center">Items</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-left">Transporte</th>
                <th className="px-3 py-3 text-left">Chofer</th>
                <th className="px-3 py-3 text-left">Estado</th>
                <th className="px-3 py-3 text-left">Atiende</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, idx) => {
                const isOpen = expanded.has(o.id);
                const terminal = o.status === 'devuelto' || o.status === 'cancelado';
                return (
                  <>
                    <tr
                      key={o.id}
                      className={`text-sm border-b border-slate-100 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                      }`}
                    >
                      <td className="px-2 py-3">
                        <button
                          onClick={() => toggleExpanded(o.id)}
                          className="text-slate-400 hover:text-indigo-500"
                        >
                          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-800 whitespace-nowrap">
                        {o.id}
                      </td>
                      <td className="px-3 py-3 max-w-[160px]">
                        <EditableText
                          value={o.clientName}
                          onSave={(v) => handleField(o.id, 'client_name', v)}
                          disabled={terminal}
                        />
                        {o.clientPhone && (
                          <div className="text-[10px] text-slate-400 px-1.5">
                            {o.clientPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">
                        {fmtDateTime(o.date)}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-700">
                        {o.items.reduce((s, it) => s + it.qty, 0)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {fmt(o.total)}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <EditableSelect<TransportType>
                            value={o.transportType}
                            options={[
                              ['incluido', 'Incluido'],
                              ['pago_entrega', 'Pago entrega'],
                            ]}
                            onSave={(v) => handleField(o.id, 'transport_type', v)}
                            disabled={terminal}
                          />
                          <EditableNumber
                            value={o.transportCost}
                            onSave={(v) => handleField(o.id, 'transport_cost', v)}
                            disabled={terminal}
                            min={0}
                            prefix="Bs"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <EditableSelect
                          value={o.driverId ?? ''}
                          options={driverOptions}
                          onSave={(v) => handleField(o.id, 'driver_id', v || null)}
                          disabled={terminal}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_PILL[o.status]}`}
                          >
                            {STATUS_LABEL[o.status]}
                          </span>
                          {!terminal && (
                            <select
                              value={o.status}
                              onChange={(e) =>
                                handleStatusChange(o, e.target.value as OrderStatus)
                              }
                              className="text-xs border border-slate-200 rounded px-1.5 py-0.5 hover:border-indigo-400 outline-none focus:border-indigo-500"
                              title="Cambiar estado"
                            >
                              {availableStatuses(o.status).map(([k, l]) => (
                                <option key={k} value={k}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        {o.status === 'problema' && (
                          <div className="text-[10px] text-red-500 mt-1">
                            <CircleAlert size={11} className="inline" /> Avisado a admin
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600 text-xs whitespace-nowrap">
                        {o.attendedBy}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-indigo-50/30 border-b border-slate-100">
                        <td />
                        <td colSpan={9} className="px-4 py-3">
                          <ExpandedOrder
                            order={o}
                            disabled={terminal}
                            onField={(k, v) => handleField(o.id, k, v)}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {!filtered.length && !isLoading && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No hay pedidos en este filtro.
          </div>
        )}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin" /> Cargando pedidos…
          </div>
        )}
      </div>

      {pending && pending.next === 'entregado' && (
        <DeliverModal
          order={pending.order}
          onClose={() => setPending(null)}
          onConfirm={async (method) => {
            try {
              await setStatus.mutateAsync({
                id: pending.order.id,
                body: { status: 'entregado', method },
              });
              toast.success(`${pending.order.id} entregado · ${method}`);
              setPending(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Error');
            }
          }}
        />
      )}
      {pending && pending.next === 'devuelto' && (
        <ReturnModal
          order={pending.order}
          onClose={() => setPending(null)}
          onConfirm={async (transportSettled, reason) => {
            try {
              await setStatus.mutateAsync({
                id: pending.order.id,
                body: {
                  status: 'devuelto',
                  transport_settled: transportSettled,
                  cancel_reason: reason || null,
                },
              });
              toast.success(`${pending.order.id} devuelto`);
              setPending(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Error');
            }
          }}
        />
      )}
      {pending && pending.next === 'cancelado' && (
        <CancelModal
          order={pending.order}
          onClose={() => setPending(null)}
          onConfirm={async (reason) => {
            try {
              await setStatus.mutateAsync({
                id: pending.order.id,
                body: { status: 'cancelado', cancel_reason: reason || null },
              });
              toast.success(`${pending.order.id} cancelado`);
              setPending(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Error');
            }
          }}
        />
      )}
    </div>
  );
}

function ExpandedOrder({
  order,
  disabled,
  onField,
}: {
  order: Order;
  disabled: boolean;
  onField: <K extends keyof Parameters<ReturnType<typeof useUpdateOrder>['mutateAsync']>[0]['body']>(
    key: K,
    value: Parameters<ReturnType<typeof useUpdateOrder>['mutateAsync']>[0]['body'][K]
  ) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <SectionLabel>Items</SectionLabel>
        <ul className="text-sm text-slate-700 space-y-1">
          {order.items.map((it) => (
            <li key={it.productId} className="flex justify-between">
              <span>
                {it.qty}× {it.name}
              </span>
              <span className="font-semibold">{fmt(it.price * it.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 pt-2 border-t border-indigo-100 text-xs space-y-0.5">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{fmt(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>IVA</span>
            <span>{fmt(order.tax)}</span>
          </div>
          {order.transportType === 'incluido' && (
            <div className="flex justify-between text-slate-500">
              <span>Transporte</span>
              <span>{fmt(order.transportCost)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base text-slate-800 pt-1 border-t border-indigo-100">
            <span>Total</span>
            <span>{fmt(order.total)}</span>
          </div>
        </div>
      </div>
      <div>
        <SectionLabel>Cliente</SectionLabel>
        <FieldRow label="Teléfono">
          <EditableText
            value={order.clientPhone}
            onSave={(v) => onField('client_phone', v)}
            disabled={disabled}
            placeholder="—"
          />
        </FieldRow>
        <FieldRow label="Zona">
          <EditableText
            value={order.clientZone}
            onSave={(v) => onField('client_zone', v)}
            disabled={disabled}
            placeholder="—"
          />
        </FieldRow>
        <FieldRow label="Dirección">
          <EditableText
            value={order.clientAddr}
            onSave={(v) => onField('client_addr', v)}
            disabled={disabled}
            placeholder="—"
          />
        </FieldRow>
      </div>
      <div>
        <SectionLabel>Notas</SectionLabel>
        <EditableText
          value={order.notes ?? ''}
          onSave={(v) => onField('notes', v || null)}
          disabled={disabled}
          placeholder="Sin notas"
          multiline
        />
        {order.cancelReason && (
          <div className="mt-3">
            <SectionLabel>Razón</SectionLabel>
            <p className="text-sm text-slate-600 italic">{order.cancelReason}</p>
          </div>
        )}
        {order.transportSettled && (
          <div className="mt-3 text-xs text-slate-500">
            Costo del transporte: <strong>{
              order.transportSettled === 'cliente'
                ? 'lo pagó el cliente'
                : order.transportSettled === 'tienda'
                ? 'lo absorbió la tienda'
                : 'no se pagó'
            }</strong>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 tracking-wider">
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 text-sm mb-1">
      <span className="text-[11px] text-slate-500 uppercase font-semibold w-16 flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function DeliverModal({
  order,
  onClose,
  onConfirm,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: (method: DeliveryMethod) => Promise<void>;
}) {
  const [method, setMethod] = useState<DeliveryMethod>('QR');
  const [busy, setBusy] = useState(false);

  return (
    <Modal open onClose={onClose} title="Confirmar entrega">
      <p className="text-sm text-slate-600 mb-4">
        El pedido <strong>{order.id}</strong> de <strong>{order.clientName}</strong> por{' '}
        <strong className="text-indigo-600">{fmt(order.total)}</strong> está por marcarse como entregado.
        Esto registra la transacción en contabilidad.
      </p>

      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
        Método de pago recibido
      </label>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {(
          [
            { m: 'QR' as DeliveryMethod, Icon: Banknote, label: 'QR / Transferencia' },
            { m: 'Depósito' as DeliveryMethod, Icon: ReceiptText, label: 'Depósito bancario' },
          ]
        ).map(({ m, Icon, label }) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`p-4 border-2 rounded-lg text-center transition-all ${
              method === m
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 hover:border-indigo-300 text-slate-600'
            }`}
          >
            <Icon size={26} className="mx-auto mb-2" />
            <div className="text-xs font-semibold">{label}</div>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 italic">
        Efectivo no es opción en delivery — siempre va por canal digital.
      </p>

      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
        >
          Cancelar
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            await onConfirm(method);
            setBusy(false);
          }}
          disabled={busy}
          className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {busy ? 'Registrando…' : 'Confirmar entrega'}
        </button>
      </div>
    </Modal>
  );
}

function ReturnModal({
  order,
  onClose,
  onConfirm,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: (settled: TransportSettled, reason: string) => Promise<void>;
}) {
  const [settled, setSettled] = useState<TransportSettled>('cliente');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Modal open onClose={onClose} title="Confirmar devolución" size="md">
      <p className="text-sm text-slate-600 mb-3">
        El pedido <strong>{order.id}</strong> de <strong>{order.clientName}</strong> se va a marcar como devuelto.
      </p>
      <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded mb-4 text-xs text-amber-800">
        <AlertTriangle size={12} className="inline mr-1" /> Esto reversará el stock de los productos y
        eliminará la transacción asociada (si la había).
      </div>

      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
        ¿Qué pasó con el costo del transporte ({fmt(order.transportCost)})?
      </label>
      <div className="grid grid-cols-1 gap-2 mb-4">
        {(
          [
            ['cliente', 'Lo pagó el cliente igual', Coins],
            ['tienda', 'Lo absorbió la tienda', AlertTriangle],
            ['sin_pago', 'No se pagó nada', X],
          ] as const
        ).map(([k, l, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSettled(k)}
            className={`flex items-center gap-3 p-3 border-2 rounded-lg text-left transition-all ${
              settled === k
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-slate-200 hover:border-indigo-300'
            }`}
          >
            <Icon size={18} className="text-slate-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-slate-700">{l}</span>
          </button>
        ))}
      </div>

      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
        Razón (opcional)
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Cliente cambió de opinión, dirección equivocada, etc."
        rows={2}
        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none resize-none mb-3"
      />

      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
        >
          Cancelar
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            await onConfirm(settled, reason);
            setBusy(false);
          }}
          disabled={busy}
          className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          {busy ? 'Procesando…' : 'Marcar devuelto'}
        </button>
      </div>
    </Modal>
  );
}

function CancelModal({
  order,
  onClose,
  onConfirm,
}: {
  order: Order;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Modal open onClose={onClose} title="Confirmar cancelación" size="md">
      <p className="text-sm text-slate-600 mb-3">
        Vas a cancelar el pedido <strong>{order.id}</strong> de <strong>{order.clientName}</strong>.
      </p>
      <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded mb-4 text-xs text-amber-800">
        <AlertTriangle size={12} className="inline mr-1" /> El stock de los productos volverá al inventario.
      </div>

      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
        Razón (opcional)
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Sin stock, cliente desistió, etc."
        rows={2}
        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none resize-none mb-3"
      />

      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
        >
          Volver
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            await onConfirm(reason);
            setBusy(false);
          }}
          disabled={busy}
          className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-bold bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
          {busy ? 'Cancelando…' : 'Cancelar pedido'}
        </button>
      </div>
    </Modal>
  );
}
