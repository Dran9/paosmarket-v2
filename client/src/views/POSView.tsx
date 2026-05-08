import { useMemo, useState } from 'react';
import {
  Search,
  ShoppingCart,
  ShoppingBasket,
  Trash2,
  X,
  Store,
  Truck,
  CreditCard,
  Banknote,
  QrCode,
  Landmark,
  Check,
  Receipt as ReceiptIcon,
  Printer,
  Loader2,
  Coins,
  ReceiptText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useProducts,
  useCreateTransaction,
  useCreateOrder,
} from '@/lib/queries';
import { useStore } from '@/lib/store';
import { fmt, round2, calcTax, fmtDateTime } from '@/lib/utils';
import type {
  CartItem,
  Order,
  Product,
  Transaction,
  TransportType,
} from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import Modal from '@/components/Modal';

type Method = 'Efectivo' | 'QR' | 'Tarjeta' | 'Mixto';
type SaleType = 'site' | 'delivery';

export default function POSView() {
  const { data: products = [], isLoading } = useProducts();
  const { cart, settings, addToCart, decQty, setQty, removeItem, resetCart } = useStore();

  const [search, setSearch] = useState('');
  const [saleType, setSaleType] = useState<SaleType>('site');
  const [showPayment, setShowPayment] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [showReceipt, setShowReceipt] = useState<Transaction | null>(null);
  const [showOrderConfirm, setShowOrderConfirm] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [products, search]);

  const subtotal = useMemo(
    () => round2(cart.reduce((s, c) => s + c.price * c.qty, 0)),
    [cart]
  );
  const tax = calcTax(subtotal, settings.taxRate);
  const total = round2(subtotal + tax);
  const totalUnits = cart.reduce((s, c) => s + c.qty, 0);

  const handlePaymentSuccess = (tx: Transaction) => {
    setShowPayment(false);
    setShowReceipt(tx);
    resetCart();
  };

  const handleOrderSuccess = (order: Order) => {
    setShowDelivery(false);
    setShowOrderConfirm(order);
    resetCart();
  };

  const handleCheckout = () => {
    if (saleType === 'delivery') setShowDelivery(true);
    else setShowPayment(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 h-full">
      <div className="flex flex-col overflow-hidden">
        <div className="mb-4">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto o código de barras…"
              className="w-full pl-12 pr-4 py-4 text-2xl font-semibold rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 overflow-y-auto flex-1 pb-2 pr-1">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} onClick={(prod: Product) => addToCart(prod)} />
          ))}
          {!filtered.length && !isLoading && (
            <div className="col-span-full text-center py-12 text-slate-400 text-sm">
              {search ? 'Sin resultados' : 'No hay productos.'}
            </div>
          )}
          {isLoading && (
            <div className="col-span-full flex items-center justify-center gap-2 py-12 text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Cargando productos…
            </div>
          )}
        </div>
      </div>

      <CartPanel
        cart={cart}
        subtotal={subtotal}
        tax={tax}
        total={total}
        totalUnits={totalUnits}
        saleType={saleType}
        setSaleType={setSaleType}
        onInc={(id) => {
          const p = products.find((x) => x.id === id);
          if (p) addToCart(p);
        }}
        onDec={decQty}
        onSetQty={setQty}
        onRemove={removeItem}
        onClear={resetCart}
        onCheckout={handleCheckout}
      />

      {showPayment && (
        <PaymentModal
          total={total}
          subtotal={subtotal}
          tax={tax}
          taxRate={settings.taxRate}
          cart={cart}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {showDelivery && (
        <DeliveryModal
          cart={cart}
          subtotal={subtotal}
          tax={tax}
          productsTotal={total}
          onClose={() => setShowDelivery(false)}
          onSuccess={handleOrderSuccess}
        />
      )}

      {showReceipt && (
        <ReceiptModal
          tx={showReceipt}
          businessName={settings.businessName}
          businessTagline={settings.businessTagline}
          businessAddress={settings.businessAddress}
          businessNIT={settings.businessNIT}
          taxRate={settings.taxRate}
          onClose={() => setShowReceipt(null)}
        />
      )}

      {showOrderConfirm && (
        <OrderConfirmModal
          order={showOrderConfirm}
          onClose={() => setShowOrderConfirm(null)}
        />
      )}
    </div>
  );
}

function CartPanel({
  cart,
  subtotal,
  tax,
  total,
  totalUnits,
  saleType,
  setSaleType,
  onInc,
  onDec,
  onSetQty,
  onRemove,
  onClear,
  onCheckout,
}: {
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  totalUnits: number;
  saleType: SaleType;
  setSaleType: (t: SaleType) => void;
  onInc: (id: number) => void;
  onDec: (id: number) => void;
  onSetQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  const isDelivery = saleType === 'delivery';
  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2 text-slate-800">
          <ShoppingCart size={14} /> Carrito
          <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {totalUnits}
          </span>
        </h3>
        {cart.length > 0 && (
          <button
            onClick={onClear}
            className="text-slate-400 hover:text-red-500 transition-colors"
            title="Vaciar carrito"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <ShoppingBasket size={48} className="opacity-30 mb-3" />
            <p className="text-sm">Carrito vacío</p>
          </div>
        ) : (
          cart.map((c) => (
            <div
              key={c.productId}
              className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-indigo-50/50 transition-colors"
            >
              <span className="flex-1 text-sm font-medium truncate text-slate-800">
                {c.name}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onDec(c.productId)}
                  className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all text-xs"
                >
                  −
                </button>
                <input
                  type="number"
                  value={c.qty}
                  onChange={(e) =>
                    onSetQty(c.productId, parseInt(e.target.value, 10) || 0)
                  }
                  className="w-10 text-center font-bold text-sm border border-slate-200 rounded outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => onInc(c.productId)}
                  className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all text-xs"
                >
                  +
                </button>
              </div>
              <span className="text-sm font-bold min-w-[60px] text-right text-slate-800">
                {fmt(c.price * c.qty)}
              </span>
              <button
                onClick={() => onRemove(c.productId)}
                className="text-slate-300 hover:text-red-500 transition-colors ml-1"
                title="Quitar"
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          <button
            onClick={() => setSaleType('site')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              !isDelivery
                ? 'bg-indigo-500 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <Store size={12} /> En tienda
          </button>
          <button
            onClick={() => setSaleType('delivery')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              isDelivery
                ? 'bg-amber-500 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <Truck size={12} /> Delivery
          </button>
        </div>

        {isDelivery && (
          <div className="bg-amber-50 rounded-lg px-3 py-1.5 mb-2 text-[11px] font-semibold text-amber-700 text-center">
            <Truck size={11} className="inline mr-1" /> Modo delivery — se creará un pedido
          </div>
        )}

        <div className="mb-3 text-sm">
          <div className="flex justify-between py-0.5 text-slate-500">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between py-0.5 text-slate-500">
            <span>IVA</span>
            <span>{fmt(tax)}</span>
          </div>
          <div className="flex justify-between pt-2 mt-1 border-t-2 border-slate-200 text-lg font-extrabold text-slate-800">
            <span>Total</span>
            <span>{fmt(total)}</span>
          </div>
        </div>

        <button
          disabled={cart.length === 0}
          onClick={onCheckout}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-white ${
            isDelivery
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-indigo-500 hover:bg-indigo-600'
          }`}
        >
          {isDelivery ? <Truck size={15} /> : <CreditCard size={15} />}
          {isDelivery ? 'Crear pedido' : 'Cobrar'} {fmt(total)}
        </button>
      </div>
    </div>
  );
}

function PaymentModal({
  total,
  subtotal,
  tax,
  taxRate,
  cart,
  onClose,
  onSuccess,
}: {
  total: number;
  subtotal: number;
  tax: number;
  taxRate: number;
  cart: CartItem[];
  onClose: () => void;
  onSuccess: (tx: Transaction) => void;
}) {
  const [method, setMethod] = useState<Method>('Efectivo');
  const [cashIn, setCashIn] = useState('');
  const [mixtoCash, setMixtoCash] = useState(0);
  const [error, setError] = useState('');
  const create = useCreateTransaction();

  const cashReceived = parseFloat(cashIn) || 0;
  const change = round2(Math.max(0, cashReceived - total));
  const qrSplit = round2(Math.max(0, total - mixtoCash));

  const canConfirm = (() => {
    if (cart.length === 0) return false;
    if (method === 'Efectivo') return cashReceived >= total - 0.01;
    if (method === 'Mixto') return mixtoCash >= 0 && mixtoCash <= total;
    return true;
  })();

  const handleConfirm = async () => {
    if (!canConfirm || create.isPending) return;
    setError('');
    const body: Parameters<typeof create.mutateAsync>[0] = {
      items: cart.map((c) => ({ productId: c.productId, qty: c.qty })),
      method,
      sale_type: 'site',
    };
    if (method === 'Efectivo') body.cash_received = cashReceived;
    if (method === 'Mixto') {
      body.cash_amount = round2(mixtoCash);
      body.qr_amount = qrSplit;
    }
    try {
      const tx = await create.mutateAsync(body);
      toast.success(`Venta ${tx.id} registrada`);
      onSuccess(tx);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar pago');
    }
  };

  const QUICK = Array.from(
    new Set([Math.ceil(total), 50, 100, 200])
  ).sort((a, b) => a - b);

  return (
    <Modal open onClose={onClose} title="Procesar pago">
      <div className="text-center mb-5">
        <div className="text-xs text-slate-500">Total a pagar · IVA {taxRate}%</div>
        <div className="text-4xl font-extrabold text-indigo-500">{fmt(total)}</div>
        <div className="text-[11px] text-slate-400 mt-1">
          Subtotal {fmt(subtotal)} · IVA {fmt(tax)}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        {(
          [
            { m: 'Efectivo' as Method, Icon: Banknote },
            { m: 'QR' as Method, Icon: QrCode },
            { m: 'Tarjeta' as Method, Icon: CreditCard },
            { m: 'Mixto' as Method, Icon: Landmark },
          ]
        ).map(({ m, Icon }) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`p-3 border-2 rounded-lg text-center transition-all ${
              method === m
                ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                : 'border-slate-200 hover:border-indigo-300 text-slate-600'
            }`}
          >
            <Icon size={22} className="mx-auto mb-1" />
            <span className="text-xs font-semibold">{m}</span>
          </button>
        ))}
      </div>

      {method === 'Efectivo' && (
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Efectivo recibido
          </label>
          <input
            type="number"
            value={cashIn}
            onChange={(e) => setCashIn(e.target.value)}
            placeholder="0.00"
            autoFocus
            className="w-full p-3 text-2xl font-bold text-center border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
          />
          <div className="flex gap-2 flex-wrap mt-3">
            {QUICK.map((v) => (
              <button
                key={v}
                onClick={() => setCashIn(String(v))}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-indigo-50 text-slate-700"
              >
                {fmt(v)}
              </button>
            ))}
          </div>
          {cashReceived >= total && (
            <div className="text-center p-3 mt-3 bg-slate-50 rounded-lg">
              <div className="text-[11px] text-slate-500">Cambio</div>
              <div className="text-2xl font-extrabold text-emerald-600">{fmt(change)}</div>
            </div>
          )}
        </div>
      )}

      {method === 'QR' && (
        <div className="text-center py-5">
          <div className="w-40 h-40 bg-slate-50 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <QrCode size={80} className="text-indigo-300" />
          </div>
          <p className="text-sm text-slate-500">Confirmá cuando el cliente haya pagado por QR.</p>
        </div>
      )}

      {method === 'Tarjeta' && (
        <div className="text-center py-5">
          <CreditCard size={64} className="text-indigo-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Confirmá cuando la transacción de tarjeta esté aprobada.</p>
        </div>
      )}

      {method === 'Mixto' && (
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex justify-between font-bold mb-3 text-slate-800">
            <span>Total:</span>
            <span className="text-xl">{fmt(total)}</span>
          </div>
          <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
            Efectivo
          </label>
          <input
            type="number"
            value={mixtoCash}
            onChange={(e) =>
              setMixtoCash(Math.max(0, Math.min(total, parseFloat(e.target.value) || 0)))
            }
            min={0}
            max={total}
            className="w-full p-2 text-lg font-bold text-center border-2 border-slate-200 rounded-lg mb-3 outline-none focus:border-indigo-500"
          />
          <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">QR</label>
          <input
            type="number"
            value={qrSplit.toFixed(2)}
            readOnly
            className="w-full p-2 text-lg font-bold text-center border-2 border-slate-200 rounded-lg bg-white text-slate-700"
          />
        </div>
      )}

      {error && <p className="text-red-500 text-sm text-center mt-3">{error}</p>}

      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!canConfirm || create.isPending}
          className="flex items-center gap-1.5 px-6 py-2.5 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg"
        >
          {create.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {create.isPending ? 'Procesando…' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
}

function DeliveryModal({
  cart,
  subtotal,
  tax,
  productsTotal,
  onClose,
  onSuccess,
}: {
  cart: CartItem[];
  subtotal: number;
  tax: number;
  productsTotal: number;
  onClose: () => void;
  onSuccess: (order: Order) => void;
}) {
  const create = useCreateOrder();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState('');
  const [addr, setAddr] = useState('');
  const [notes, setNotes] = useState('');
  const [transportType, setTransportType] = useState<TransportType>('incluido');
  const [transportCost, setTransportCost] = useState(15);
  const [error, setError] = useState('');

  const finalTotal =
    transportType === 'incluido'
      ? round2(productsTotal + transportCost)
      : productsTotal;

  const valid = name.trim().length > 0 && addr.trim().length > 0;

  const handleConfirm = async () => {
    if (!valid || create.isPending) return;
    setError('');
    try {
      const order = await create.mutateAsync({
        items: cart.map((c) => ({ productId: c.productId, qty: c.qty })),
        client_name: name.trim(),
        client_phone: phone.trim(),
        client_zone: zone.trim(),
        client_addr: addr.trim(),
        notes: notes.trim() || null,
        transport_type: transportType,
        transport_cost: transportCost,
        driver_id: null,
      });
      toast.success(`Pedido ${order.id} creado`);
      onSuccess(order);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear el pedido');
    }
  };

  const QUICK_TRANSPORT = [10, 15, 20, 30];
  const inputCls =
    'w-full px-2.5 py-1.5 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none';

  return (
    <Modal open onClose={onClose} title="Pedido con entrega" size="md">
      {/* Totales en una sola línea compacta */}
      <div className="flex items-center justify-between bg-indigo-50 border-2 border-indigo-100 rounded-lg px-3 py-2 mb-3">
        <div>
          <div className="text-[10px] text-indigo-500 uppercase font-semibold tracking-wide">Total a cobrar</div>
          <div className="text-2xl font-extrabold text-indigo-600 leading-tight">{fmt(finalTotal)}</div>
        </div>
        <div className="text-right text-[10px] text-slate-500 leading-tight">
          <div>Productos+IVA: <strong>{fmt(productsTotal)}</strong></div>
          <div>
            {transportType === 'incluido'
              ? `Transporte: ${fmt(transportCost)}`
              : `+ ${fmt(transportCost)} al chofer`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <CompactField label="Cliente" required>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Doña Marta" autoFocus className={inputCls} />
        </CompactField>
        <CompactField label="Teléfono">
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="591…" className={inputCls} />
        </CompactField>
      </div>

      <div className="grid grid-cols-[1fr_2fr] gap-2 mb-2">
        <CompactField label="Zona">
          <input value={zone} onChange={(e) => setZone(e.target.value)}
            placeholder="Zona Norte" className={inputCls} />
        </CompactField>
        <CompactField label="Dirección" required>
          <input value={addr} onChange={(e) => setAddr(e.target.value)}
            placeholder="Calle, número, referencia" className={inputCls} />
        </CompactField>
      </div>

      <CompactField label="Notas">
        <input value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Tocar timbre 2 veces…" className={inputCls} />
      </CompactField>

      <div className="mt-3 mb-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Transporte
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          {(
            [
              { k: 'incluido' as TransportType, Icon: ReceiptText, t: 'Incluir', d: 'Paola cobra todo' },
              { k: 'pago_entrega' as TransportType, Icon: Coins, t: 'Pago en entrega', d: 'Cliente paga chofer' },
            ]
          ).map((o) => (
            <button
              key={o.k}
              type="button"
              onClick={() => setTransportType(o.k)}
              className={`flex items-center gap-2 px-2.5 py-1.5 border-2 rounded-lg text-left transition-all ${
                transportType === o.k ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <o.Icon size={16} className="text-indigo-500 flex-shrink-0" />
              <div className="leading-tight">
                <div className="font-bold text-xs text-slate-800">{o.t}</div>
                <div className="text-[10px] text-slate-500">{o.d}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 items-center">
          <input
            type="number"
            min={0}
            value={transportCost}
            onChange={(e) => setTransportCost(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-20 px-2 py-1.5 text-sm border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
          />
          {QUICK_TRANSPORT.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setTransportCost(v)}
              className={`px-2.5 py-1 text-xs font-semibold border rounded-lg ${
                transportCost === v
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-indigo-50'
              }`}
            >
              {fmt(v)}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-500 text-xs text-center mt-2">{error}</p>}

      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          disabled={!valid || create.isPending}
          className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg"
        >
          {create.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {create.isPending ? 'Creando…' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
}

function CompactField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ReceiptModal({
  tx,
  businessName,
  businessTagline,
  businessAddress,
  businessNIT,
  taxRate,
  onClose,
}: {
  tx: Transaction;
  businessName: string;
  businessTagline: string;
  businessAddress: string;
  businessNIT: string;
  taxRate: number;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title="Ticket de venta">
      <div className="receipt-print bg-white border border-dashed border-slate-300 p-6 font-mono text-sm max-w-xs mx-auto">
        <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
          <div className="font-sans font-extrabold text-base uppercase">{businessName}</div>
          {businessTagline && (
            <div className="font-sans text-[10px] text-slate-500">{businessTagline}</div>
          )}
          {businessAddress && (
            <div className="font-sans text-[10px] text-slate-500">{businessAddress}</div>
          )}
          {businessNIT && (
            <div className="font-sans text-[10px] text-slate-500">NIT: {businessNIT}</div>
          )}
        </div>

        <div className="text-[10px] mb-2 space-y-0.5">
          <div>Ticket: {tx.id}</div>
          <div>Fecha: {fmtDateTime(tx.date)}</div>
          <div>Atiende: {tx.attendedBy}</div>
          <div>Tipo: {tx.saleType === 'delivery' ? 'Delivery' : 'En tienda'}</div>
        </div>

        <div className="border-b border-dashed border-slate-300 pb-2 mb-2">
          {tx.items.map((i, idx) => (
            <div key={idx} className="flex justify-between text-[11px]">
              <span>
                {i.qty}× {i.name}
              </span>
              <span>{fmt(i.price * i.qty)}</span>
            </div>
          ))}
        </div>

        <div className="space-y-0.5 text-[11px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{fmt(tx.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA ({taxRate}%):</span>
            <span>{fmt(tx.tax)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-1 border-t border-dashed border-slate-300 mt-1">
            <span>TOTAL:</span>
            <span>{fmt(tx.total)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-300 mt-2 pt-2 text-[11px] space-y-0.5">
          <div className="flex justify-between">
            <span>Método:</span>
            <span>{tx.method}</span>
          </div>
          {tx.method === 'Efectivo' && (
            <>
              <div className="flex justify-between">
                <span>Recibido:</span>
                <span>{fmt(tx.cashReceived)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cambio:</span>
                <span>{fmt(tx.change)}</span>
              </div>
            </>
          )}
          {tx.method === 'Mixto' && (
            <>
              <div className="flex justify-between">
                <span>Efectivo:</span>
                <span>{fmt(tx.cashAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>QR:</span>
                <span>{fmt(tx.qrAmount)}</span>
              </div>
            </>
          )}
        </div>

        <div className="text-center border-t border-dashed border-slate-300 mt-2 pt-2 text-[10px] text-slate-500">
          ¡Gracias por su compra!
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4 no-print">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
        >
          <Printer size={14} /> Imprimir
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg"
        >
          <ReceiptIcon size={14} /> Nueva venta
        </button>
      </div>
    </Modal>
  );
}

function OrderConfirmModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { settings } = useStore();
  return (
    <Modal open onClose={onClose} title="Pedido creado">
      <div className="text-center py-3">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <Check size={32} />
        </div>
        <div className="text-xl font-extrabold text-slate-800">{order.id}</div>
        <div className="text-sm text-slate-500 mb-3">creado correctamente</div>
        <div className="text-3xl font-extrabold text-indigo-600 mb-1">{fmt(order.total)}</div>
        <div className="text-xs text-slate-500">
          Cliente: <strong>{order.clientName}</strong> · {order.clientAddr}
        </div>
        {order.notes && (
          <div className="text-xs text-slate-500 italic mt-1">"{order.notes}"</div>
        )}
        <div className="text-[11px] text-slate-400 mt-3">
          Está en estado <strong>pendiente</strong>. Lo seguís desde la vista de Pedidos.
          {settings.businessName && (
            <>
              <br />
              El dinero entrará a contabilidad cuando lo marques como entregado.
            </>
          )}
        </div>
      </div>
      <div className="flex justify-end mt-3 no-print">
        <button
          onClick={onClose}
          className="px-5 py-2 text-sm font-bold bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg"
        >
          Continuar
        </button>
      </div>
    </Modal>
  );
}
