import { query } from '../db.js';

function defaultRange({ from, to }) {
  const now = new Date();
  const toDate = to ? new Date(to) : now;
  const fromDate = from
    ? new Date(from)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
  return { from: fromDate, to: toDate };
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

export default async function dashboardRoutes(app) {
  app.get('/', { schema: listSchema, preHandler: [app.requireView(['dashboard', 'accounting'])] }, async (req, reply) => {
    const range = defaultRange(req.query);
    if (!range) return reply.code(400).send({ error: 'Fechas inválidas' });
    const { from, to } = range;

    const [txSummary] = await query(
      `SELECT
         COUNT(*) AS txCount,
         COALESCE(SUM(total), 0) AS totalRevenue,
         COALESCE(SUM(tax), 0) AS totalTax
       FROM transactions
       WHERE date >= ? AND date <= ?`,
      [from, to]
    );

    const [cogsSummary] = await query(
      `SELECT COALESCE(SUM(ti.cost * ti.qty), 0) AS totalCOGS
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE t.date >= ? AND t.date <= ?`,
      [from, to]
    );

    const [expSummary] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS totalExpenses
       FROM expenses
       WHERE date >= ? AND date <= ?`,
      [from, to]
    );

    const totalRevenue = Number(txSummary.totalRevenue);
    const totalTax = Number(txSummary.totalTax);
    const totalCOGS = Number(cogsSummary.totalCOGS);
    const grossProfit = totalRevenue - totalCOGS;
    const totalExpenses = Number(expSummary.totalExpenses);
    const netProfit = totalRevenue - totalCOGS - totalTax - totalExpenses;

    const byUserRows = await query(
      `SELECT
         t.user_id AS userId,
         t.attended_by AS name,
         COUNT(*) AS count,
         COALESCE(SUM(t.total), 0) AS revenue
       FROM transactions t
       WHERE t.date >= ? AND t.date <= ?
       GROUP BY t.user_id, t.attended_by
       ORDER BY revenue DESC`,
      [from, to]
    );

    const byMethodRows = await query(
      `SELECT
         method,
         COUNT(*) AS count,
         COALESCE(SUM(total), 0) AS total
       FROM transactions
       WHERE date >= ? AND date <= ?
       GROUP BY method
       ORDER BY total DESC`,
      [from, to]
    );

    const bySaleTypeRows = await query(
      `SELECT
         sale_type AS saleType,
         COUNT(*) AS count,
         COALESCE(SUM(total), 0) AS total
       FROM transactions
       WHERE date >= ? AND date <= ?
       GROUP BY sale_type`,
      [from, to]
    );

    const topProductRows = await query(
      `SELECT
         ti.product_id AS productId,
         ti.product_name AS name,
         SUM(ti.qty) AS qty,
         SUM(ti.price * ti.qty) AS revenue,
         SUM((ti.price - ti.cost) * ti.qty) AS profit
       FROM transaction_items ti
       JOIN transactions t ON ti.transaction_id = t.id
       WHERE t.date >= ? AND t.date <= ?
       GROUP BY ti.product_id, ti.product_name
       ORDER BY profit DESC
       LIMIT 10`,
      [from, to]
    );

    const thresholdRows = await query(
      'SELECT `value` FROM settings WHERE `key` = "lowStockThreshold"'
    );
    const parsedThreshold = thresholdRows.length ? Number(thresholdRows[0].value) : NaN;
    const threshold = Number.isFinite(parsedThreshold) ? parsedThreshold : 5;

    const lowStockRows = await query(
      `SELECT id, name, stock, unit
       FROM products
       WHERE active = 1 AND stock <= ?
       ORDER BY stock ASC
       LIMIT 20`,
      [threshold]
    );

    return {
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalTax,
      totalExpenses,
      netProfit,
      txCount: Number(txSummary.txCount),
      byUser: byUserRows.map((r) => ({
        userId: r.userId,
        name: r.name,
        count: Number(r.count),
        revenue: Number(r.revenue),
      })),
      byMethod: byMethodRows.map((r) => ({
        method: r.method,
        count: Number(r.count),
        total: Number(r.total),
      })),
      bySaleType: bySaleTypeRows.map((r) => ({
        saleType: r.saleType,
        count: Number(r.count),
        total: Number(r.total),
      })),
      topProducts: topProductRows.map((r) => ({
        productId: r.productId,
        name: r.name,
        qty: Number(r.qty),
        revenue: Number(r.revenue),
        profit: Number(r.profit),
      })),
      lowStock: lowStockRows.map((r) => ({
        id: r.id,
        name: r.name,
        stock: r.stock,
        unit: r.unit,
        threshold,
      })),
    };
  });
}
