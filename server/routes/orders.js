import { getPool, query, nextIdConn, round2 } from '../db.js';
import { createNotification } from '../notifications.js';

const TAX_RATE = 0.13;
const DELIVERY_METHODS = ['QR', 'Depósito'];
const STATUSES = [
  'pendiente',
  'preparando',
  'en_camino',
  'entregado',
  'problema',
  'devuelto',
  'cancelado',
];
const TRANSPORT_TYPES = ['incluido', 'pago_entrega'];
const TRANSPORT_SETTLED = ['cliente', 'tienda', 'sin_pago'];

const createSchema = {
  body: {
    type: 'object',
    required: ['items', 'client_name', 'client_addr'],
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
      client_name: { type: 'string', minLength: 1, maxLength: 150 },
      client_phone: { type: 'string', maxLength: 30 },
      client_zone: { type: 'string', maxLength: 100 },
      client_addr: { type: 'string', minLength: 1, maxLength: 255 },
      notes: { type: ['string', 'null'], maxLength: 2000 },
      transport_type: { type: 'string', enum: TRANSPORT_TYPES },
      transport_cost: { type: 'number', minimum: 0 },
      driver_id: { type: ['string', 'null'], maxLength: 10 },
    },
    additionalProperties: false,
  },
};

const updateSchema = {
  body: {
    type: 'object',
    properties: {
      client_name: { type: 'string', minLength: 1, maxLength: 150 },
      client_phone: { type: 'string', maxLength: 30 },
      client_zone: { type: 'string', maxLength: 100 },
      client_addr: { type: 'string', maxLength: 255 },
      notes: { type: ['string', 'null'], maxLength: 2000 },
      transport_type: { type: 'string', enum: TRANSPORT_TYPES },
      transport_cost: { type: 'number', minimum: 0 },
      driver_id: { type: ['string', 'null'], maxLength: 10 },
    },
    additionalProperties: false,
  },
};

const statusSchema = {
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: STATUSES },
      method: { type: 'string', enum: DELIVERY_METHODS },
      cancel_reason: { type: ['string', 'null'], maxLength: 255 },
      transport_settled: { type: ['string', 'null'], enum: [...TRANSPORT_SETTLED, null] },
    },
    additionalProperties: false,
  },
};

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

function toOrderDTO(o, items) {
  return {
    id: o.id,
    date: o.date,
    clientName: o.client_name,
    clientPhone: o.client_phone || '',
    clientZone: o.client_zone || '',
    clientAddr: o.client_addr || '',
    notes: o.notes,
    subtotal: Number(o.subtotal),
    tax: Number(o.tax),
    total: Number(o.total),
    transportType: o.transport_type,
    transportCost: Number(o.transport_cost),
    driverId: o.driver_id,
    status: o.status,
    transportSettled: o.transport_settled,
    cancelReason: o.cancel_reason,
    userId: o.user_id,
    attendedBy: o.attended_by,
    items,
  };
}

async function loadOrderItems(conn, orderIds) {
  if (!orderIds.length) return new Map();
  const ph = orderIds.map(() => '?').join(',');
  const [items] = await conn.query(
    `SELECT * FROM order_items WHERE order_id IN (${ph}) ORDER BY id ASC`,
    orderIds
  );
  const map = new Map();
  for (const it of items) {
    if (!map.has(it.order_id)) map.set(it.order_id, []);
    map.get(it.order_id).push(toItemDTO(it));
  }
  return map;
}

async function fetchSingleOrder(id) {
  const [orderRows] = await getPool().query(
    'SELECT * FROM orders WHERE id = ? LIMIT 1',
    [id]
  );
  if (!orderRows.length) return null;
  const itemsMap = await loadOrderItems(getPool(), [id]);
  return toOrderDTO(orderRows[0], itemsMap.get(id) || []);
}

export default async function orderRoutes(app) {
  app.post(
    '/',
    { schema: createSchema, preHandler: [app.authenticate] },
    async (req, reply) => {
      const {
        items,
        client_name,
        client_phone = '',
        client_zone = '',
        client_addr,
        notes = null,
        transport_type = 'incluido',
        transport_cost = 0,
        driver_id = null,
      } = req.body;

      const conn = await getPool().getConnection();
      try {
        await conn.beginTransaction();

        const ids = items.map((i) => i.productId);
        const ph = ids.map(() => '?').join(',');
        const [products] = await conn.query(
          `SELECT * FROM products WHERE id IN (${ph}) FOR UPDATE`,
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
          subtotal += round2(price * it.qty);
          return { product: p, qty: it.qty, price, cost };
        });
        subtotal = round2(subtotal);
        const tax = round2(subtotal * TAX_RATE);
        const productsTotal = round2(subtotal + tax);
        const total =
          transport_type === 'incluido'
            ? round2(productsTotal + transport_cost)
            : productsTotal;

        if (driver_id) {
          const [d] = await conn.query(
            'SELECT id FROM drivers WHERE id = ? LIMIT 1',
            [driver_id]
          );
          if (!d.length) {
            await conn.rollback();
            return reply.code(400).send({ error: 'Chofer no existe' });
          }
        }

        const [userRows] = await conn.query(
          'SELECT name FROM users WHERE id = ? LIMIT 1',
          [req.user.id]
        );
        const attendedBy = userRows[0]?.name || req.user.id;

        const id = await nextIdConn(conn, 'order', 'PED-', 5000);
        const date = new Date();

        await conn.execute(
          `INSERT INTO orders
            (id, date, client_name, client_phone, client_zone, client_addr, notes,
             subtotal, tax, total, transport_type, transport_cost, driver_id,
             status, user_id, attended_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id, date, client_name, client_phone, client_zone, client_addr, notes,
            subtotal, tax, total, transport_type, transport_cost, driver_id || null,
            'pendiente', req.user.id, attendedBy,
          ]
        );

        for (const li of lines) {
          await conn.execute(
            `INSERT INTO order_items
              (order_id, product_id, product_name, category, price, cost, qty)
             VALUES (?,?,?,?,?,?,?)`,
            [id, li.product.id, li.product.name, li.product.category, li.price, li.cost, li.qty]
          );
          await conn.execute(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [li.qty, li.product.id]
          );
        }

        await conn.commit();

        const created = await fetchSingleOrder(id);
        return reply.code(201).send(created);
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }
  );

  app.get('/', { preHandler: [app.authenticate] }, async () => {
    const [orders] = await getPool().query(
      'SELECT * FROM orders ORDER BY date DESC LIMIT 500'
    );
    if (!orders.length) return [];
    const itemsMap = await loadOrderItems(getPool(), orders.map((o) => o.id));
    return orders.map((o) => toOrderDTO(o, itemsMap.get(o.id) || []));
  });

  app.put(
    '/:id',
    { schema: updateSchema, preHandler: [app.authenticate] },
    async (req, reply) => {
      const fields = req.body;
      const keys = Object.keys(fields);
      if (!keys.length) {
        return reply.code(400).send({ error: 'Nada que actualizar' });
      }

      // driver_id puede venir como '' del front; normalizar a null.
      if ('driver_id' in fields && !fields.driver_id) fields.driver_id = null;

      const set = keys.map((k) => `\`${k}\` = ?`).join(', ');
      const values = keys.map((k) => fields[k]);

      const result = await query(
        `UPDATE orders SET ${set} WHERE id = ?`,
        [...values, req.params.id]
      );
      if (result.affectedRows === 0) {
        return reply.code(404).send({ error: 'Pedido no encontrado' });
      }

      // Si se modificó el transporte, recalcular total.
      if ('transport_type' in fields || 'transport_cost' in fields) {
        await query(
          `UPDATE orders
             SET total = CASE
               WHEN transport_type = 'incluido' THEN ROUND(subtotal + tax + transport_cost, 2)
               ELSE ROUND(subtotal + tax, 2)
             END
           WHERE id = ?`,
          [req.params.id]
        );
      }

      const updated = await fetchSingleOrder(req.params.id);
      return updated;
    }
  );

  app.put(
    '/:id/status',
    { schema: statusSchema, preHandler: [app.authenticate] },
    async (req, reply) => {
      const { status, method, cancel_reason = null, transport_settled = null } = req.body;
      const orderId = req.params.id;

      const conn = await getPool().getConnection();
      try {
        await conn.beginTransaction();

        const [orderRows] = await conn.query(
          'SELECT * FROM orders WHERE id = ? FOR UPDATE',
          [orderId]
        );
        if (!orderRows.length) {
          await conn.rollback();
          return reply.code(404).send({ error: 'Pedido no encontrado' });
        }
        const order = orderRows[0];
        const prev = order.status;

        if (prev === status) {
          await conn.rollback();
          return reply.code(400).send({ error: 'El pedido ya está en ese estado' });
        }

        // Salir de estados terminales requiere lógica especial: solo permitimos
        // entregado→devuelto. Otros saltos se aceptan libremente.
        if (prev === 'devuelto' || prev === 'cancelado') {
          await conn.rollback();
          return reply
            .code(400)
            .send({ error: `Pedido ${prev}; no se puede cambiar de estado` });
        }

        const stockWasDecremented = prev !== 'cancelado'; // hoy siempre true salvo terminales
        const stockIsDecremented = !['devuelto', 'cancelado'].includes(status);

        // Reversión de stock cuando salimos al lado terminal.
        if (stockWasDecremented && !stockIsDecremented) {
          const [items] = await conn.query(
            'SELECT product_id, qty FROM order_items WHERE order_id = ?',
            [orderId]
          );
          for (const it of items) {
            await conn.execute(
              'UPDATE products SET stock = stock + ? WHERE id = ?',
              [it.qty, it.product_id]
            );
          }
        }

        // Lógica de "entregado": crear transacción si no existe.
        if (status === 'entregado') {
          if (!method || !DELIVERY_METHODS.includes(method)) {
            await conn.rollback();
            return reply
              .code(400)
              .send({ error: 'Falta método de pago (QR o Depósito)' });
          }

          const [existingTx] = await conn.query(
            'SELECT id FROM transactions WHERE order_id = ? LIMIT 1',
            [orderId]
          );
          if (!existingTx.length) {
            const [items] = await conn.query(
              'SELECT * FROM order_items WHERE order_id = ?',
              [orderId]
            );
            const txId = await nextIdConn(conn, 'tx', 'T-');
            const txDate = new Date();

            // El subtotal de la transacción refleja lo que el cliente paga
            // por productos. Si transport_type='incluido', el transport_cost
            // se suma como un ítem virtual o se deja fuera de SalesView para
            // no contaminar las métricas de productos. Decisión: el total de
            // la transacción es order.total (lo que efectivamente entró).
            const txSubtotal = Number(order.subtotal);
            const txTax = Number(order.tax);
            const txTotal = Number(order.total);

            await conn.execute(
              `INSERT INTO transactions
                (id, date, subtotal, tax, total, method, cash_received, cash_amount,
                 qr_amount, change_amount, user_id, attended_by, order_id, sale_type)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
              [
                txId, txDate, txSubtotal, txTax, txTotal, method,
                0, 0, txTotal, 0,
                order.user_id, order.attended_by, orderId, 'delivery',
              ]
            );

            for (const it of items) {
              await conn.execute(
                `INSERT INTO transaction_items
                  (transaction_id, product_id, product_name, category, price, cost, qty)
                 VALUES (?,?,?,?,?,?,?)`,
                [txId, it.product_id, it.product_name, it.category, it.price, it.cost, it.qty]
              );
            }
          }
        }

        // Devuelto: borrar la transacción asociada (si existía) y limpiar.
        if (status === 'devuelto') {
          if (!transport_settled || !TRANSPORT_SETTLED.includes(transport_settled)) {
            await conn.rollback();
            return reply
              .code(400)
              .send({ error: 'Falta destino del costo de transporte' });
          }
          await conn.execute('DELETE FROM transactions WHERE order_id = ?', [orderId]);
        }

        const updates = ['status = ?'];
        const updateValues = [status];
        if (status === 'cancelado' && cancel_reason !== null) {
          updates.push('cancel_reason = ?');
          updateValues.push(cancel_reason);
        }
        if (status === 'devuelto') {
          updates.push('transport_settled = ?');
          updateValues.push(transport_settled);
          if (cancel_reason !== null) {
            updates.push('cancel_reason = ?');
            updateValues.push(cancel_reason);
          }
        }

        await conn.execute(
          `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
          [...updateValues, orderId]
        );

        await conn.commit();

        // Notificación de "problema" se crea fuera de la transacción para
        // no bloquear el commit principal si Telegram tarda.
        if (status === 'problema') {
          await createNotification({
            type: 'order_problem',
            severity: 'error',
            title: `Pedido ${orderId} con problema`,
            body: `Cliente: ${order.client_name} · Total Bs ${Number(order.total).toFixed(2)}`,
            refType: 'order',
            refId: orderId,
            telegram: true,
            log: req.log,
          });
        }

        const updated = await fetchSingleOrder(orderId);
        return updated;
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }
  );
}
