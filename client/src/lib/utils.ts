import { useMemo } from 'react';
import { useStore } from './store';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcTax(subtotal: number, rate: number): number {
  return round2(subtotal * (rate / 100));
}

export function fmt(n: number, symbol?: string): string {
  const sym = symbol ?? useStore.getState().settings.currencySymbol ?? 'Bs';
  const v = (Number(n) || 0).toFixed(2);
  return `${sym} ${v}`;
}

const DT_FORMAT = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function fmtDateTime(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  return DT_FORMAT.format(date).replace(/\./g, '');
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export type Period = 'today' | 'week' | 'month' | 'year';

export function periodRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = endOfDay(now);
  let from: Date;

  if (period === 'today') {
    from = startOfDay(now);
  } else if (period === 'week') {
    from = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  } else if (period === 'year') {
    from = new Date(now.getFullYear(), 0, 1);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export function useDateRange(period: Period) {
  return useMemo(() => periodRange(period), [period]);
}
