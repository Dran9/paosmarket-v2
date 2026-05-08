import { lazy, Suspense } from 'react';
import {
  ShoppingCart,
  Receipt,
  Truck,
  BarChart3,
  Calculator,
  Package,
  Settings,
  Store,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { setToken } from '@/lib/api';
import { api } from '@/lib/api';
import POSView from '@/views/POSView';
import SalesView from '@/views/SalesView';
import OrdersView from '@/views/OrdersView';
import BellMenu from '@/components/BellMenu';
import { useOrders } from '@/lib/queries';
import type { ViewKey } from '@/lib/types';

const TERMINAL_STATUSES = new Set(['entregado', 'devuelto', 'cancelado']);

// Vistas owner-only se cargan bajo demanda (chart.js + xlsx + forms son pesados).
const InventoryView = lazy(() => import('@/views/InventoryView'));
const DashboardView = lazy(() => import('@/views/DashboardView'));
const AccountingView = lazy(() => import('@/views/AccountingView'));
const SettingsView = lazy(() => import('@/views/SettingsView'));

function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-slate-400 text-sm">Cargando...</div>
    </div>
  );
}

interface NavEntry {
  key: ViewKey;
  icon: LucideIcon;
  label: string;
  ownerOnly?: boolean;
}

const NAV: NavEntry[] = [
  { key: 'pos', icon: ShoppingCart, label: 'Punto de Venta' },
  { key: 'sales', icon: Receipt, label: 'Ventas' },
  { key: 'orders', icon: Truck, label: 'Pedidos' },
  { key: 'dashboard', icon: BarChart3, label: 'Dashboard', ownerOnly: true },
  { key: 'accounting', icon: Calculator, label: 'Contabilidad', ownerOnly: true },
  { key: 'inventory', icon: Package, label: 'Inventario', ownerOnly: true },
  { key: 'settings', icon: Settings, label: 'Ajustes', ownerOnly: true },
];

export default function AppShell() {
  const { view, setView, currentUser, settings, setUser } = useStore();
  const { data: orders = [] } = useOrders();
  if (!currentUser) return null;
  const u = currentUser;

  const pendingOrders = orders.filter((o) => !TERMINAL_STATUSES.has(o.status)).length;

  const isOwner = u.role === 'owner';
  const userPerms = u.permissions ?? [];
  const visibleNav = NAV.filter((n) => {
    if (!n.ownerOnly) return true;
    if (isOwner) return true;
    return userPerms.includes(n.key);
  });

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      /* ignorar */
    }
    setToken(null);
    setUser(null);
    setView('pos');
  };

  const VIEWS: Record<ViewKey, JSX.Element> = {
    pos: <POSView />,
    sales: <SalesView />,
    orders: <OrdersView />,
    dashboard: <DashboardView />,
    accounting: <AccountingView />,
    inventory: <InventoryView />,
    settings: <SettingsView />,
  };

  const activeKey: ViewKey = visibleNav.some((n) => n.key === view) ? view : 'pos';

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-48 min-w-[192px] bg-slate-900 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Store size={15} />
            </div>
            <div className="min-w-0">
              <strong className="block text-sm font-extrabold truncate leading-tight">
                {settings.businessName}
              </strong>
              <span className="text-[10px] text-white/40 truncate block">
                {settings.businessTagline}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
          {visibleNav.map((n) => {
            const Icon = n.icon;
            const active = activeKey === n.key;
            const showOrdersBadge = n.key === 'orders' && pendingOrders > 0;
            const btn = (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all relative ${
                  active
                    ? 'bg-indigo-500/25 text-white'
                    : 'text-white/60 hover:text-white hover:bg-slate-800'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r" />
                )}
                <Icon size={14} className="flex-shrink-0" />
                <span className="truncate flex-1 text-left">{n.label}</span>
                {showOrdersBadge && (
                  <span
                    className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-extrabold leading-none"
                    title={`${pendingOrders} pedido${pendingOrders === 1 ? '' : 's'} pendiente${pendingOrders === 1 ? '' : 's'}`}
                  >
                    {pendingOrders}
                  </span>
                )}
              </button>
            );
            // Insertar campana justo antes de Ajustes
            if (n.key === 'settings') {
              return (
                <div key="bell-and-settings">
                  <BellMenu sidebar />
                  {btn}
                </div>
              );
            }
            return btn;
          })}
          {/* Si el usuario no ve Ajustes (vendedora), la campana va al final */}
          {!visibleNav.some((n) => n.key === 'settings') && <BellMenu sidebar />}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-white">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: u.color, color: '#fff' }}
            >
              {u.avatar || u.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate leading-tight">{u.name}</div>
              <div className="text-[9px] text-white/40">
                {u.role === 'owner' ? 'Propietaria' : 'Vendedora'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<ViewFallback />}>
            {VIEWS[activeKey]}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
