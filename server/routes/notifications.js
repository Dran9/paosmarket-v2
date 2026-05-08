import { query } from '../db.js';
import { lowStockNotifications, notificationToDTO } from '../notifications.js';

export default async function notificationRoutes(app) {
  app.get('/', { preHandler: [app.authenticate] }, async () => {
    const persisted = await query(
      `SELECT * FROM notifications
        WHERE status = 'unread'
        ORDER BY created_at DESC
        LIMIT 100`
    );

    const settingRows = await query(
      "SELECT `value` FROM settings WHERE `key` = 'lowStockThreshold' LIMIT 1"
    );
    const threshold = Number(settingRows[0]?.value) || 5;
    const derived = await lowStockNotifications(threshold);

    return [...persisted.map(notificationToDTO), ...derived];
  });

  app.put(
    '/:id/read',
    {
      preHandler: [app.authenticate],
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
        `UPDATE notifications
            SET status = 'read', read_at = CURRENT_TIMESTAMP
          WHERE id = ? AND status = 'unread'`,
        [req.params.id]
      );
      if (result.affectedRows === 0) {
        return reply.code(404).send({ error: 'Notificación no encontrada' });
      }
      return { ok: true };
    }
  );

  app.put('/read-all', { preHandler: [app.authenticate] }, async () => {
    await query(
      `UPDATE notifications
          SET status = 'read', read_at = CURRENT_TIMESTAMP
        WHERE status = 'unread'`
    );
    return { ok: true };
  });
}
