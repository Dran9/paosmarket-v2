import { query } from '../db.js';

function toDriverDTO(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    plate: row.plate || '',
    whatsappId: row.whatsapp_id || '',
    active: row.active === undefined ? true : !!row.active,
  };
}

const createSchema = {
  body: {
    type: 'object',
    required: ['id', 'name', 'phone'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 10 },
      name: { type: 'string', minLength: 1, maxLength: 100 },
      phone: { type: 'string', minLength: 1, maxLength: 30 },
      plate: { type: 'string', maxLength: 20 },
      whatsappId: { type: 'string', maxLength: 30 },
    },
    additionalProperties: false,
  },
};

const updateSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      phone: { type: 'string', minLength: 1, maxLength: 30 },
      plate: { type: 'string', maxLength: 20 },
      whatsappId: { type: 'string', maxLength: 30 },
    },
    additionalProperties: false,
  },
};

export default async function driverRoutes(app) {
  app.get('/', { preHandler: [app.authenticate] }, async () => {
    const rows = await query(
      'SELECT * FROM drivers WHERE active = 1 ORDER BY name ASC'
    );
    return rows.map(toDriverDTO);
  });

  app.post('/', { schema: createSchema, preHandler: [app.requireOwner] }, async (req, reply) => {
    const { id, name, phone, plate = '', whatsappId = '' } = req.body;

    const existing = await query('SELECT id FROM drivers WHERE id = ?', [id]);
    if (existing.length) {
      return reply.code(409).send({ error: 'Ya existe un chofer con ese ID' });
    }

    await query(
      'INSERT INTO drivers (id, name, phone, plate, whatsapp_id, active) VALUES (?, ?, ?, ?, ?, 1)',
      [id, name, phone, plate, whatsappId || null]
    );
    const rows = await query('SELECT * FROM drivers WHERE id = ?', [id]);
    return reply.code(201).send(toDriverDTO(rows[0]));
  });

  app.put('/:id', { schema: updateSchema, preHandler: [app.requireOwner] }, async (req, reply) => {
    const fields = {};
    if (req.body.name !== undefined) fields.name = req.body.name;
    if (req.body.phone !== undefined) fields.phone = req.body.phone;
    if (req.body.plate !== undefined) fields.plate = req.body.plate;
    if (req.body.whatsappId !== undefined) fields.whatsapp_id = req.body.whatsappId || null;

    if (!Object.keys(fields).length) {
      return reply.code(400).send({ error: 'Nada que actualizar' });
    }

    const set = Object.keys(fields).map((k) => `\`${k}\` = ?`).join(', ');
    const result = await query(
      `UPDATE drivers SET ${set} WHERE id = ? AND active = 1`,
      [...Object.values(fields), req.params.id]
    );
    if (result.affectedRows === 0) {
      return reply.code(404).send({ error: 'Chofer no encontrado' });
    }
    const rows = await query('SELECT * FROM drivers WHERE id = ?', [req.params.id]);
    return toDriverDTO(rows[0]);
  });

  app.delete('/:id', { preHandler: [app.requireOwner] }, async (req, reply) => {
    const result = await query(
      'UPDATE drivers SET active = 0 WHERE id = ? AND active = 1',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return reply.code(404).send({ error: 'Chofer no encontrado' });
    }
    return { ok: true };
  });
}
