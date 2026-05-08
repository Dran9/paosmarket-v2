import { query } from '../db.js';

const NUMERIC_KEYS = new Set(['taxRate', 'lowStockThreshold']);

const ALLOWED_KEYS = new Set([
  'businessName', 'businessTagline', 'businessNIT', 'businessPhone',
  'businessAddress', 'businessCity', 'businessEmail',
  'currency', 'currencySymbol', 'timezone',
  'taxRate', 'lowStockThreshold', 'ticketPrefix', 'orderPrefix',
]);

function castValue(key, value) {
  if (NUMERIC_KEYS.has(key)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return value ?? '';
}

export default async function settingsRoutes(app) {
  app.get('/', async () => {
    const rows = await query('SELECT `key`, `value` FROM settings');
    const out = {};
    for (const r of rows) {
      out[r.key] = castValue(r.key, r.value);
    }
    return out;
  });

  app.put('/', { preHandler: [app.requireOwner] }, async (req, reply) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return reply.code(400).send({ error: 'Cuerpo inválido' });
    }
    const keys = Object.keys(body).filter((k) => ALLOWED_KEYS.has(k));
    if (!keys.length) return reply.code(400).send({ error: 'Ninguna clave válida' });

    for (const k of keys) {
      const raw = body[k];
      const v = typeof raw === 'number' ? String(raw) : String(raw ?? '');
      await query(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
        [k, v]
      );
    }
    return { ok: true };
  });
}
