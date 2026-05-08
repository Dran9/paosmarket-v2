import { query } from '../db.js';

const productCreateSchema = {
  body: {
    type: 'object',
    required: ['name', 'category', 'price'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      category: { type: 'string', minLength: 1, maxLength: 50 },
      barcode: { type: 'string', maxLength: 50 },
      price: { type: 'number', minimum: 0 },
      cost: { type: 'number', minimum: 0 },
      stock: { type: 'integer' },
      unit: { type: 'string', maxLength: 10 },
    },
    additionalProperties: false,
  },
};

const productUpdateSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      category: { type: 'string', minLength: 1, maxLength: 50 },
      barcode: { type: 'string', maxLength: 50 },
      price: { type: 'number', minimum: 0 },
      cost: { type: 'number', minimum: 0 },
      stock: { type: 'integer' },
      unit: { type: 'string', maxLength: 10 },
      active: { type: 'boolean' },
    },
    additionalProperties: false,
  },
  params: {
    type: 'object',
    properties: { id: { type: 'integer' } },
    required: ['id'],
  },
};

const stockSchema = {
  body: {
    type: 'object',
    required: ['qty'],
    properties: { qty: { type: 'integer' } },
    additionalProperties: false,
  },
  params: {
    type: 'object',
    properties: { id: { type: 'integer' } },
    required: ['id'],
  },
};

export function toProductDTO(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    barcode: row.barcode || '',
    price: Number(row.price),
    cost: Number(row.cost),
    stock: row.stock,
    unit: row.unit,
    active: !!row.active,
  };
}

export default async function productRoutes(app) {
  app.get('/', { preHandler: [app.authenticate] }, async () => {
    const rows = await query(
      'SELECT * FROM products WHERE active = 1 ORDER BY name ASC'
    );
    return rows.map(toProductDTO);
  });

  app.post(
    '/',
    { schema: productCreateSchema, preHandler: [app.requireOwner] },
    async (req, reply) => {
      const {
        name,
        category,
        barcode = '',
        price,
        cost = 0,
        stock = 0,
        unit = 'pza',
      } = req.body;

      const result = await query(
        `INSERT INTO products (name, category, barcode, price, cost, stock, unit)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, category, barcode, price, cost, stock, unit]
      );
      const rows = await query('SELECT * FROM products WHERE id = ?', [
        result.insertId,
      ]);
      return reply.code(201).send(toProductDTO(rows[0]));
    }
  );

  app.put(
    '/:id',
    { schema: productUpdateSchema, preHandler: [app.requireOwner] },
    async (req, reply) => {
      const id = req.params.id;
      const fields = req.body;
      const keys = Object.keys(fields);
      if (!keys.length) {
        return reply.code(400).send({ error: 'Nada que actualizar' });
      }
      const set = keys.map((k) => `\`${k}\` = ?`).join(', ');
      const values = keys.map((k) => (typeof fields[k] === 'boolean' ? (fields[k] ? 1 : 0) : fields[k]));

      const result = await query(`UPDATE products SET ${set} WHERE id = ?`, [
        ...values,
        id,
      ]);
      if (result.affectedRows === 0) {
        return reply.code(404).send({ error: 'Producto no encontrado' });
      }
      const rows = await query('SELECT * FROM products WHERE id = ?', [id]);
      return toProductDTO(rows[0]);
    }
  );

  app.delete(
    '/:id',
    {
      preHandler: [app.requireOwner],
      schema: {
        params: {
          type: 'object',
          properties: { id: { type: 'integer' } },
          required: ['id'],
        },
      },
    },
    async (req, reply) => {
      const result = await query(
        'UPDATE products SET active = 0 WHERE id = ? AND active = 1',
        [req.params.id]
      );
      if (result.affectedRows === 0) {
        return reply.code(404).send({ error: 'Producto no encontrado' });
      }
      return { ok: true };
    }
  );

  app.post(
    '/:id/stock',
    { schema: stockSchema, preHandler: [app.requireOwner] },
    async (req, reply) => {
      const result = await query(
        'UPDATE products SET stock = stock + ? WHERE id = ? AND active = 1',
        [req.body.qty, req.params.id]
      );
      if (result.affectedRows === 0) {
        return reply.code(404).send({ error: 'Producto no encontrado' });
      }
      const rows = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
      return toProductDTO(rows[0]);
    }
  );
}
