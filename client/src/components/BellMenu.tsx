import { useEffect, useRef, useState } from 'react';
import { Bell, AlertCircle, AlertTriangle, Info, Check, Package } from 'lucide-react';
import {
  useNotifications,
  useReadAllNotifications,
  useReadNotification,
} from '@/lib/queries';
import type { AppNotification, ViewKey } from '@/lib/types';
import { useStore } from '@/lib/store';
import { fmtDateTime } from '@/lib/utils';

export default function BellMenu({ sidebar = false }: { sidebar?: boolean }) {
  const { data: notifications = [] } = useNotifications();
  const readOne = useReadNotification();
  const readAll = useReadAllNotifications();
  const setView = useStore((s) => s.setView);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const count = notifications.length;
  const persistedCount = notifications.filter((n) => !n.derived).length;

  const handleClick = (n: AppNotification) => {
    if (typeof n.id === 'number' && !n.derived) readOne.mutate(n.id);
    if (n.refType === 'order') setView('orders');
    else if (n.refType === 'product') setView('inventory');
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      {sidebar ? (
        /* Versión sidebar: fila completa similar a los nav buttons */
        <button
          onClick={() => setOpen((v) => !v)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all relative ${
            count > 0
              ? 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
              : 'text-white/60 hover:text-white hover:bg-slate-800'
          }`}
          title="Avisos"
        >
          <div className="relative flex-shrink-0">
            <Bell size={14} />
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </div>
          <span className="truncate">Avisos</span>
        </button>
      ) : (
        /* Versión header: botón icono cuadrado */
        <button
          onClick={() => setOpen((v) => !v)}
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            count > 0
              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
              : 'text-slate-400 hover:bg-slate-100'
          }`}
          title="Avisos"
        >
          <Bell size={18} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className={`absolute w-[360px] max-h-[480px] bg-white rounded-xl border-2 border-slate-200 shadow-xl z-40 overflow-hidden flex flex-col ${
          sidebar
            ? 'left-full ml-2 bottom-0'   /* abre hacia la derecha del sidebar */
            : 'right-0 top-12'            /* abre hacia abajo desde el header  */
        }`}>
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">Centro de avisos</h3>
            {persistedCount > 0 && (
              <button
                onClick={() => readAll.mutate()}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
              >
                <Check size={12} /> Marcar leídos
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {!notifications.length && (
              <div className="text-center py-12 text-slate-400 text-sm px-4">
                Todo en orden — sin avisos pendientes.
              </div>
            )}
            {notifications.map((n) => (
              <NotificationItem key={String(n.id)} n={n} onClick={() => handleClick(n)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  n,
  onClick,
}: {
  n: AppNotification;
  onClick: () => void;
}) {
  const Icon =
    n.severity === 'error'
      ? AlertCircle
      : n.severity === 'warning'
        ? n.type === 'low_stock'
          ? Package
          : AlertTriangle
        : Info;

  const colors =
    n.severity === 'error'
      ? 'text-red-500 bg-red-50'
      : n.severity === 'warning'
        ? 'text-amber-500 bg-amber-50'
        : 'text-blue-500 bg-blue-50';

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 flex gap-3 transition-colors"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-800 truncate">{n.title}</div>
        {n.body && (
          <div className="text-xs text-slate-500 truncate">{n.body}</div>
        )}
        <div className="text-[10px] text-slate-400 mt-0.5">
          {n.createdAt
            ? fmtDateTime(n.createdAt)
            : n.derived
              ? 'En tiempo real'
              : ''}
        </div>
      </div>
    </button>
  );
}
