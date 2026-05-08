import { query } from './db.js';
import { notifyAdmin } from './telegram.js';

// Crea una notificación persistente y opcionalmente la dispara por Telegram.
//
// `telegram=true` solo se debe pasar para eventos de alta señal (problema
// en pedido, devolución con plata involucrada). NO usar para stock bajo.
export async function createNotification({
  type,
  severity = 'info',
  title,
  body = null,
  refType = null,
  refId = null,
  telegram = false,
  log = console,
}) {
  const result = await query(
    `INSERT INTO notifications
       (type, severity, title, body, ref_type, ref_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [type, severity, title, body, refType, refId]
  );

  if (telegram) {
    const tag = severity === 'error' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
    const msg = body ? `${tag} <b>${title}</b>\n${body}` : `${tag} <b>${title}</b>`;
    notifyAdmin(msg, log).catch((err) =>
      log?.warn?.(`notifyAdmin error: ${err.message}`)
    );
  }

  return { id: result.insertId };
}

export function notificationToDTO(row) {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    body: row.body,
    refType: row.ref_type,
    refId: row.ref_id,
    status: row.status,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

// Notif derivada para stock bajo (no persistida, calculada al pedir).
// Devuelve un objeto con la misma forma del DTO de las persistidas, pero
// con id sintético "low-<productId>" para que el front pueda dedupe.
export async function lowStockNotifications(threshold) {
  const rows = await query(
    `SELECT id, name, stock, unit
       FROM products
       WHERE active = 1 AND stock <= ?
       ORDER BY stock ASC
       LIMIT 50`,
    [threshold]
  );
  return rows.map((p) => ({
    id: `low-${p.id}`,
    type: 'low_stock',
    severity: p.stock <= 0 ? 'error' : 'warning',
    title:
      p.stock <= 0
        ? `Sin stock: ${p.name}`
        : `Stock bajo: ${p.name} (${p.stock} ${p.unit})`,
    body: null,
    refType: 'product',
    refId: String(p.id),
    status: 'unread',
    createdAt: null,
    readAt: null,
    derived: true,
  }));
}
