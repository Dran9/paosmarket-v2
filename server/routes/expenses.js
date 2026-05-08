import { query, nextId, round2 } from '../db.js';

const CATEGORIES = ['compras', 'transporte', 'servicios', 'sueldos', 'otros'];

function defaultRange({ from, to }) {
  const now = new Date();
  const toDate = to ? new Date(to) : now;
  const fromDate = from
    ? new Date(from)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
  return { from: fromDate, to: toDate };
}

function toDTO(row) {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
  };
}

const listSchema = {
  querystring: {
    type: 'object',
    properties: {
      from: { type: 'string' },
      to: { type: 'string' },
    },
    additionalProperties: false,
  },
};

const createSchema = {
  body: {
    type: 'object',
    required: ['date', 'category', 'description', 'amount'],
    properties: {
      date: { type: 'string' },
      category: { type: 'string', minLength: 1, maxLength: 50 },
      description: { type: 'string', minLength: 1, maxLength: 255 },
      amount: { type: 'number', minimum: 0 },
      notification_id: { type: ['integer', 'null'] },
    },
    additionalProperties: false,
  },
};

const updateSchema = {
  body: {
    type: 'object',
    properties: {
      date: { type: 'string' },
      category: { type: 'string', minLength: 1, maxLength: 50 },
      description: { type: 'string', minLength: 1, maxLength: 255 },
      amount: { type: 'number', minimum: 0 },
    },
    additionalProperties: false,
  },
};

export default async function expensesRoutes(app) {
  app.get('/', { schema: listSchema, preHandler: [app.requireOwner] }, async (req, reply) => {
    const range = defaultRange(req.query);
    if (!range) return reply.code(400).send({ error: 'Fechas inválidas' });

    const rows = await query(
      'SELECT * FROM expenses WHERE date >= ? AND date <= ? ORDER BY date DESC',
      [range.from, range.to]
    );
    return rows.map(toDTO);
  });

  app.post('/', { schema: createSchema, preHandler: [app.requireOwner] }, async (req, reply) => {
    const { date, category, description, amount, notification_id = null } = req.body;

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return reply.code(400).send({ error: 'Fecha inválida' });
    }

    const id = await nextId('expense', 'EXP-', 1000);
    await query(
      'INSERT INTO expenses (id, date, category, description, amount) VALUES (?, ?, ?, ?, ?)',
      [id, parsedDate, category, description, round2(amount)]
    );

    if (notification_id) {
      await query(
        'UPDATE notifications SET status = "read", read_at = NOW() WHERE id = ? AND status = "unread"',
        [notification_id]
      );
    }

    const rows = await query('SELECT * FROM expenses WHERE id = ?', [id]);
    return reply.code(201).send(toDTO(rows[0]));
  });

  app.put('/:id', { schema: updateSchema, preHandler: [app.requireOwner] }, async (req, reply) => {
    const body = req.body;
    const fields = {};

    if (body.date !== undefined) {
      const d = new Date(body.date);
      if (isNaN(d.getTime())) return reply.code(400).send({ error: 'Fecha inválida' });
      fields.date = d;
    }
    if (body.category !== undefined) fields.category = body.category;
    if (body.description !== undefined) fields.description = body.description;
    if (body.amount !== undefined) fields.amount = round2(body.amount);

    if (!Object.keys(fields).length) {
      return reply.code(400).send({ error: 'Nada que actualizar' });
    }

    const set = Object.keys(fields).map((k) => `\`${k}\` = ?`).join(', ');
    const result = await query(
      `UPDATE expenses SET ${set} WHERE id = ?`,
      [...Object.values(fields), req.params.id]
    );
    if (result.affectedRows === 0) {
      return reply.code(404).send({ error: 'Gasto no encontrado' });
    }
    const rows = await query('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
    return toDTO(rows[0]);
  });

  app.delete('/:id', { preHandler: [app.requireOwner] }, async (req, reply) => {
    const result = await query('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return reply.code(404).send({ error: 'Gasto no encontrado' });
    }
    return { ok: true };
  });

  app.get('/categories', { preHandler: [app.requireOwner] }, async () => CATEGORIES);
}
