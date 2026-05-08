import { getPool, query, nextIdConn, round2 } from '../db.js';

const TAX_RATE = 0.13;
const PAY_TOLERANCE = 0.01;

const createSchema = {
  body: {
    type: 'object',
    required: ['items', 'method'],
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['productId', 'qty'],
          properties: {
            productId: { type: 'integer' },
            qty: { type: 'integer', minimum: 1 },
          },
          additionalProperties: false,
        },
      },
      method: { type: 'string', enum: ['Efectivo', 'QR', 'Tarjeta', 'Mixto'] },
      cash_received: { type: 'number', minimum: 0 },
      cash_amount: { type: 'number', minimum: 0 },
      qr_amount: { type: 'number', minimum: 0 },
      sale_type: { type: 'string', enum: ['site', 'delivery'] },
      order_id: { type: ['string', 'null'] },
    },
    additionalProperties: false,
  },
};

const listSchema = {
  querystring: {
    type: 'object',
    properties: {
      from: { type: 'string' },
      to: { type: 'string' },
      limit: { type: 'integer', minimum: 1, maximum: 1000 },
      saleType: { type: 'string', enum: ['site', 'delivery', 'all'] },
    },
    additionalProperties: false,
  },
};

const salesSchema = {
  querystring: {
    type: 'object',
    properties: {
      from: { type: 'string' },
      to: { type: 'string' },
      saleType: { type: 'string', enum: ['site', 'delivery', 'all'] },
    },
    additionalProperties: false,
  },
};

function defaultRange({ from, to }) {
  const now = new Date();
  const toDate = to ? new Date(to) : now;
  const fromDate = from
    ? new Date(from)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return null;
  }
  return { from: fromDate, to: toDate };
}

function toItemDTO(row) {
  return {
    productId: row.product_id,
    name: row.product_name,
    category: row.category || '',
    price: Number(row.price),
    cost: Number(row.cost),
    qty: row.qty,
  };
}

function toTransactionDTO(tx, items) {
  return {
    id: tx.id,
    date: tx.date,
    subtotal: Number(tx.subtotal),
    tax: Number(tx.tax),
    total: Number(tx.total),
    method: tx.method,
    cashReceived: Number(tx.cash_received),
    cashAmount: Number(tx.cash_amount),
    qrAmount: Number(tx.qr_amount),
    change: Number(tx.change_amount),
    attendedBy: tx.attended_by,
    userId: tx.user_id,
    orderId: tx.order_id,
    saleType: tx.sale_type,
    items,
  };
}

function toSaleRowDTO(row) {
  return {
    lineId: row.line_id,
    ticketId: row.ticket_id,
    soldAt: row.sold_at,
    productId: row.product_id,
    productName: row.product_name,
    category: row.category || '',
    price: Number(row.price),
    cost: Number(row.cost),
    qty: row.qty,
    lineTotal: Number(row.line_total),
    lineProfit: Number(row.line_profit),
    paymentMethod: row.payment_method,
    saleType: row.sale_type,
    attendedBy: row.attended_by,
    userId: row.user_id,
    currentStock: row.current_stock ?? 0,
    productActive: !!row.product_active,
  };
}

export default async function transactionRoutes(app) {
  app.post(
    '/',
    { schema: createSchema, preHandler: [app.authenticate] },
    async (req, reply) => {
      const {
        items,
        method,
        cash_received = 0,
        cash_amount = 0,
        qr_amount = 0,
        sale_type = 'site',
        order_id = null,
      } = req.body;

      const conn = await getPool().getConnection();
      try {
        await conn.beginTransaction();

        const ids = items.map((i) => i.productId);
        const placeholders = ids.map(() => '?').join(',');
        const [products] = await conn.query(
          `SELECT * FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
          ids
        );
        if (products.length !== ids.length) {
          await conn.rollback();
          return reply.code(400).send({ error: 'Algún producto no existe' });
        }
        const byId = new Map(products.map((p) => [p.id, p]));

        let subtotal = 0;
        const lines = items.map((it) => {
          const p = byId.get(it.productId);
          const price = Number(p.price);
          const cost = Number(p.cost);
          const lineTotal = round2(price * it.qty);
          subtotal += lineTotal;
          return { product: p, qty: it.qty, price, cost, lineTotal };
        });
        subtotal = round2(subtotal);
        const tax = round2(subtotal * TAX_RATE);
        const total = round2(subtotal + tax);

        let change_amount = 0;
        let cash_received_final = 0;
        let cash_amount_final = 0;
        let qr_amount_final = 0;

        if (method === 'Efectivo') {
          if (cash_received < total - PAY_TOLERANCE) {
            await conn.rollback();
            return reply
              .code(400)
              .send({ error: `Efectivo insuficiente: total ${total}, recibido ${cash_received}` });
          }
          cash_received_final = round2(cash_received);
          change_amount = round2(cash_received - total);
        } else if (method === 'Mixto') {
          if (Math.abs(cash_amount + qr_amount - total) > PAY_TOLERANCE) {
            await conn.rollback();
            return reply
              .code(400)
              .send({ error: `Pago mixto no cuadra: total ${total}, suma ${round2(cash_amount + qr_amount)}` });
          }
          cash_amount_final = round2(cash_amount);
          qr_amount_final = round2(qr_amount);
        }

        const [userRows] = await conn.query(
          'SELECT name FROM users WHERE id = ? LIMIT 1',
          [req.user.id]
        );
        const attendedBy = userRows[0]?.name || req.user.id;

        const id = await nextIdConn(conn, 'tx', 'T-');
        const date = new Date();

        await conn.execute(
          `INSERT INTO transactions
            (id, date, subtotal, tax, total, method, cash_received, cash_amount, qr_amount,
             change_amount, user_id, attended_by, order_id, sale_type)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id, date, subtotal, tax, total, method,
            cash_received_final, cash_amount_final, qr_amount_final, change_amount,
            req.user.id, attendedBy, order_id, sale_type,
          ]
        );

        const itemDTOs = [];
        for (const li of lines) {
          await conn.execute(
            `INSERT INTO transaction_items
              (transaction_id, product_id, product_name, category, price, cost, qty)
             VALUES (?,?,?,?,?,?,?)`,
            [id, li.product.id, li.product.name, li.product.category, li.price, li.cost, li.qty]
          );
          await conn.execute(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [li.qty, li.product.id]
          );
          itemDTOs.push({
            productId: li.product.id,
            name: li.product.name,
            category: li.product.category,
            price: li.price,
            cost: li.cost,
            qty: li.qty,
          });
        }

        await conn.commit();

        return reply.code(201).send({
          id,
          date,
          subtotal,
          tax,
          total,
          method,
          cashReceived: cash_received_final,
          cashAmount: cash_amount_final,
          qrAmount: qr_amount_final,
          change: change_amount,
          attendedBy,
          userId: req.user.id,
          orderId: order_id,
          saleType: sale_type,
          items: itemDTOs,
        });
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }
  );

  app.get(
    '/',
    { schema: listSchema, preHandler: [app.authenticate] },
    async (req, reply) => {
      const range = defaultRange(req.query);
      if (!range) return reply.code(400).send({ error: 'Fechas inválidas' });
      const limit = req.query.limit || 100;
      const saleType = req.query.saleType || 'all';

      const params = [range.from, range.to];
      let sql =
        'SELECT * FROM transactions WHERE date >= ? AND date <= ?';
      if (saleType !== 'all') {
        sql += ' AND sale_type = ?';
        params.push(saleType);
      }
      sql += ' ORDER BY date DESC LIMIT ?';
      params.push(limit);

      const [txs] = await getPool().query(sql, params);
      if (!txs.length) return [];

      const txIds = txs.map((t) => t.id);
      const ph = txIds.map(() => '?').join(',');
      const [items] = await getPool().query(
        `SELECT * FROM transaction_items WHERE transaction_id IN (${ph}) ORDER BY id ASC`,
        txIds
      );
      const itemsByTx = new Map();
      for (const it of items) {
        if (!itemsByTx.has(it.transaction_id)) itemsByTx.set(it.transaction_id, []);
        itemsByTx.get(it.transaction_id).push(toItemDTO(it));
      }
      return txs.map((t) => toTransactionDTO(t, itemsByTx.get(t.id) || []));
    }
  );

  app.get(
    '/sales',
    { schema: salesSchema, preHandler: [app.authenticate] },
    async (req, reply) => {
      const range = defaultRange(req.query);
      if (!range) return reply.code(400).send({ error: 'Fechas inválidas' });
      const saleType = req.query.saleType || 'all';

      const params = [range.from, range.to];
      let extra = '';
      if (saleType !== 'all') {
        extra = ' AND t.sale_type = ?';
        params.push(saleType);
      }

      const [rows] = await getPool().query(
        `SELECT
           ti.id              AS line_id,
           t.id               AS ticket_id,
           t.date             AS sold_at,
           ti.product_id,
           ti.product_name,
           ti.category,
           ti.price,
           ti.cost,
           ti.qty,
           (ti.price * ti.qty) AS line_total,
           ((ti.price - ti.cost) * ti.qty) AS line_profit,
           t.method           AS payment_method,
           t.sale_type        AS sale_type,
           t.attended_by,
           t.user_id,
           p.stock            AS current_stock,
           p.active           AS product_active
         FROM transaction_items ti
         JOIN transactions t ON ti.transaction_id = t.id
         LEFT JOIN products p ON ti.product_id = p.id
         WHERE t.date >= ? AND t.date <= ?${extra}
         ORDER BY t.date DESC, ti.id DESC
         LIMIT 1000`,
        params
      );
      return rows.map(toSaleRowDTO);
    }
  );
}
