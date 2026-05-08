import { query } from '../db.js';

const NUMERIC_KEYS = new Set(['taxRate', 'lowStockThreshold']);

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
}
