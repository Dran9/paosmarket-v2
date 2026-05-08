import { query } from '../db.js';

const createSchema = {
  body: {
    type: 'object',
    required: ['name', 'icon'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 50 },
      icon: { type: 'string', minLength: 1, maxLength: 50 },
      sort_order: { type: 'integer' },
    },
    additionalProperties: false,
  },
};

const updateSchema = {
  body: {
    type: 'object',
    properties: {
      icon: { type: 'string', minLength: 1, maxLength: 50 },
      sort_order: { type: 'integer' },
    },
    additionalProperties: false,
  },
};

function toDTO(row) {
  return {
    name: row.name,
    icon: row.icon,
    sortOrder: row.sort_order,
    active: !!row.active,
  };
}

export default async function categoryRoutes(app) {
  app.get('/', { preHandler: [app.authenticate] }, async () => {
    const rows = await query(
      'SELECT * FROM categories WHERE active = 1 ORDER BY sort_order ASC, name ASC'
    );
    return rows.map(toDTO);
  });

  app.post(
    '/',
    { schema: createSchema, preHandler: [app.requireView('inventory')] },
    async (req, reply) => {
      const { name, icon, sort_order = 100 } = req.body;
      const trimmed = name.trim();
      if (!trimmed) return reply.code(400).send({ error: 'Nombre vacío' });
      const existing = await query(
        'SELECT name FROM categories WHERE LOWER(name) = LOWER(?)',
        [trimmed]
      );
      if (existing.length) {
        return reply.code(409).send({ error: 'Ya existe esa categoría' });
      }
      await query(
        'INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)',
        [trimmed, icon, sort_order]
      );
      const rows = await query('SELECT * FROM categories WHERE name = ?', [trimmed]);
      return reply.code(201).send(toDTO(rows[0]));
    }
  );

  app.put(
    '/:name',
    { schema: updateSchema, preHandler: [app.requireView('inventory')] },
    async (req, reply) => {
      const name = decodeURIComponent(req.params.name);
      const fields = req.body;
      const keys = Object.keys(fields);
      if (!keys.length) {
        return reply.code(400).send({ error: 'Nada que actualizar' });
      }
      const set = keys.map((k) => `\`${k}\` = ?`).join(', ');
      const values = keys.map((k) => fields[k]);
      values.push(name);
      const result = await query(
        `UPDATE categories SET ${set} WHERE name = ?`,
        values
      );
      if (result.affectedRows === 0) {
        return reply.code(404).send({ error: 'Categoría no encontrada' });
      }
      const rows = await query('SELECT * FROM categories WHERE name = ?', [name]);
      return toDTO(rows[0]);
    }
  );

  app.delete(
    '/:name',
    { preHandler: [app.requireView('inventory')] },
    async (req, reply) => {
      const name = decodeURIComponent(req.params.name);
      const inUse = await query(
        'SELECT COUNT(*) AS c FROM products WHERE category = ? AND active = 1',
        [name]
      );
      if (inUse[0].c > 0) {
        return reply.code(409).send({
          error: `No se puede eliminar: ${inUse[0].c} producto(s) usan esta categoría`,
        });
      }
      const result = await query(
        'UPDATE categories SET active = 0 WHERE name = ?',
        [name]
      );
      if (result.affectedRows === 0) {
        return reply.code(404).send({ error: 'Categoría no encontrada' });
      }
      return { ok: true };
    }
  );
}
