import { query } from '../db.js';

const productCreateSchema = {
  body: {
    type: 'object',
    required: ['name', 'category', 'price'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 200 },
      brand: { type: 'string', maxLength: 100 },
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
      brand: { type: 'string', maxLength: 100 },
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
    brand: row.brand || '',
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
    { schema: productCreateSchema, preHandler: [app.requireView('inventory')] },
    async (req, reply) => {
      const {
        name,
        brand = '',
        category,
        barcode = '',
        price,
        cost = 0,
        stock = 0,
        unit = 'pza',
      } = req.body;

      const result = await query(
        `INSERT INTO products (name, brand, category, barcode, price, cost, stock, unit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, brand, category, barcode, price, cost, stock, unit]
      );
      const rows = await query('SELECT * FROM products WHERE id = ?', [
        result.insertId,
      ]);
      return reply.code(201).send(toProductDTO(rows[0]));
    }
  );

  app.put(
    '/:id',
    { schema: productUpdateSchema, preHandler: [app.requireView('inventory')] },
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
      preHandler: [app.requireView('inventory')],
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
    '/bulk',
    {
      preHandler: [app.requireView('inventory')],
      schema: {
        body: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              minItems: 1,
              maxItems: 2000,
              items: {
                type: 'object',
                properties: {
                  name:     { type: 'string' },
                  brand:    { type: 'string' },
                  category: { type: 'string' },
                  barcode:  { type: 'string' },
                  price:    { type: 'number' },
                  cost:     { type: 'number' },
                  stock:    { type: 'number' },
                  unit:     { type: 'string' },
                },
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (req, reply) => {
      const { items } = req.body;
      let imported = 0;
      const errors = [];

      for (let i = 0; i < items.length; i++) {
        const {
          name,
          brand = '',
          category,
          barcode = '',
          price = 0,
          cost = 0,
          stock = 0,
          unit = 'pza',
        } = items[i];

        const n = String(name ?? '').trim();
        const c = String(category ?? '').trim();
        if (!n || !c) {
          errors.push({ index: i, reason: 'Falta nombre o categoría' });
          continue;
        }

        try {
          await query(
            'INSERT INTO products (name, brand, category, barcode, price, cost, stock, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [n, String(brand).trim(), c, String(barcode).trim(), Number(price), Number(cost), Number(stock), String(unit).trim()]
          );
          imported++;
        } catch (e) {
          errors.push({ index: i, reason: e.message });
        }
      }

      return reply.code(201).send({ imported, errors });
    }
  );

  app.post(
    '/:id/stock',
    { schema: stockSchema, preHandler: [app.requireView('inventory')] },
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
