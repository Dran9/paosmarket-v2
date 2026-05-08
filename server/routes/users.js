import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { userToDTO } from '../auth.js';

const BCRYPT_ROUNDS = 10;

const createSchema = {
  body: {
    type: 'object',
    required: ['id', 'name', 'password', 'role'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 50 },
      name: { type: 'string', minLength: 1, maxLength: 100 },
      password: { type: 'string', minLength: 4, maxLength: 100 },
      role: { type: 'string', enum: ['owner', 'vendedora'] },
      avatar: { type: 'string', maxLength: 10 },
      color: { type: 'string', maxLength: 20 },
      firstName: { type: ['string', 'null'], maxLength: 100 },
      lastName: { type: ['string', 'null'], maxLength: 100 },
      phone: { type: ['string', 'null'], maxLength: 30 },
    },
    additionalProperties: false,
  },
};

const updateSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      password: { type: 'string', minLength: 4, maxLength: 100 },
      role: { type: 'string', enum: ['owner', 'vendedora'] },
      avatar: { type: 'string', maxLength: 10 },
      color: { type: 'string', maxLength: 20 },
      firstName: { type: ['string', 'null'], maxLength: 100 },
      lastName: { type: ['string', 'null'], maxLength: 100 },
      phone: { type: ['string', 'null'], maxLength: 30 },
      documentNumber: { type: ['string', 'null'], maxLength: 30 },
      address: { type: ['string', 'null'], maxLength: 255 },
    },
    additionalProperties: false,
  },
};

export default async function usersRoutes(app) {
  app.get('/', { preHandler: [app.requireOwner] }, async () => {
    const rows = await query(
      'SELECT * FROM users WHERE active = 1 ORDER BY created_at ASC'
    );
    return rows.map(userToDTO);
  });

  app.post('/', { schema: createSchema, preHandler: [app.requireOwner] }, async (req, reply) => {
    const {
      id, name, password, role,
      avatar = '',
      color = '#6366f1',
      firstName = null,
      lastName = null,
      phone = null,
    } = req.body;

    const existing = await query('SELECT id FROM users WHERE id = ?', [id]);
    if (existing.length) {
      return reply.code(409).send({ error: 'Ya existe un usuario con ese ID' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const canDashboard = role === 'owner' ? 1 : 0;

    await query(
      `INSERT INTO users
         (id, name, password_hash, role, avatar, color, can_dashboard,
          first_name, last_name, phone, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, name, hash, role, avatar, color, canDashboard, firstName, lastName, phone]
    );

    const [row] = await query('SELECT * FROM users WHERE id = ?', [id]);
    return reply.code(201).send(userToDTO(row));
  });

  app.put('/:id', { schema: updateSchema, preHandler: [app.authenticate] }, async (req, reply) => {
    const targetId = req.params.id;
    const isSelf = req.user.id === targetId;
    const isOwner = req.user.role === 'owner';

    if (!isOwner && !isSelf) {
      return reply.code(403).send({ error: 'Solo el propietario puede editar otros usuarios' });
    }

    const body = req.body;
    const fields = {};

    if (body.name !== undefined) fields.name = body.name;
    if (body.avatar !== undefined) fields.avatar = body.avatar;
    if (body.color !== undefined) fields.color = body.color;
    if (body.firstName !== undefined) fields.first_name = body.firstName;
    if (body.lastName !== undefined) fields.last_name = body.lastName;
    if (body.phone !== undefined) fields.phone = body.phone;
    if (body.documentNumber !== undefined) fields.document_number = body.documentNumber;
    if (body.address !== undefined) fields.address = body.address;

    if (body.role !== undefined) {
      if (!isOwner) {
        return reply.code(403).send({ error: 'Solo el propietario puede cambiar el rol' });
      }
      fields.role = body.role;
      fields.can_dashboard = body.role === 'owner' ? 1 : 0;
    }

    if (body.password !== undefined) {
      fields.password_hash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    }

    if (!Object.keys(fields).length) {
      return reply.code(400).send({ error: 'Nada que actualizar' });
    }

    const set = Object.keys(fields).map((k) => `\`${k}\` = ?`).join(', ');
    const values = Object.values(fields);
    const result = await query(
      `UPDATE users SET ${set} WHERE id = ? AND active = 1`,
      [...values, targetId]
    );
    if (result.affectedRows === 0) {
      return reply.code(404).send({ error: 'Usuario no encontrado' });
    }
    const [row] = await query('SELECT * FROM users WHERE id = ?', [targetId]);
    return userToDTO(row);
  });

  app.delete('/:id', { preHandler: [app.requireOwner] }, async (req, reply) => {
    const targetId = req.params.id;

    if (req.user.id === targetId) {
      return reply.code(400).send({ error: 'No puedes eliminarte a ti mismo' });
    }

    const rows = await query(
      'SELECT role FROM users WHERE id = ? AND active = 1',
      [targetId]
    );
    if (!rows.length) {
      return reply.code(404).send({ error: 'Usuario no encontrado' });
    }

    if (rows[0].role === 'owner') {
      const [count] = await query(
        'SELECT COUNT(*) AS n FROM users WHERE role = "owner" AND active = 1'
      );
      if (count.n <= 1) {
        return reply
          .code(400)
          .send({ error: 'No se puede eliminar el único propietario' });
      }
    }

    await query('UPDATE users SET active = 0 WHERE id = ?', [targetId]);
    return { ok: true };
  });
}
