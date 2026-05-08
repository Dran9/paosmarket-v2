import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { userToDTO, COOKIE_NAME, COOKIE_OPTS } from '../auth.js';

const loginSchema = {
  body: {
    type: 'object',
    required: ['id', 'password'],
    properties: {
      id: { type: 'string', minLength: 1, maxLength: 50 },
      password: { type: 'string', minLength: 1, maxLength: 200 },
    },
    additionalProperties: false,
  },
};

export default async function authRoutes(app) {
  app.post('/login', { schema: loginSchema }, async (req, reply) => {
    const { id, password } = req.body;

    const rows = await query(
      'SELECT * FROM users WHERE id = ? AND active = 1 LIMIT 1',
      [id]
    );
    const user = rows[0];

    if (!user) {
      return reply.code(401).send({ error: 'Usuario o contraseña incorrectos' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return reply.code(401).send({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = await reply.jwtSign({ id: user.id, role: user.role });
    reply.setCookie(COOKIE_NAME, token, COOKIE_OPTS);

    return { token, user: userToDTO(user) };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const rows = await query(
      'SELECT * FROM users WHERE id = ? AND active = 1 LIMIT 1',
      [req.user.id]
    );
    const user = rows[0];
    if (!user) {
      return reply.code(401).send({ error: 'Usuario no encontrado' });
    }
    return { user: userToDTO(user) };
  });

  app.post('/logout', async (req, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  });
}
