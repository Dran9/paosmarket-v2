import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import crypto from 'crypto';
import { query } from './db.js';

const JWT_EXPIRES_IN = '12h';
const COOKIE_NAME = 'token';

export async function setupAuth(app) {
  await app.register(fastifyCookie);

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    app.log.warn(
      'JWT_SECRET no configurado: generando uno aleatorio. Las sesiones se invalidarán en cada reinicio.'
    );
  }

  await app.register(fastifyJwt, {
    secret: secret || crypto.randomBytes(32).toString('hex'),
    cookie: { cookieName: COOKIE_NAME, signed: false },
    sign: { expiresIn: JWT_EXPIRES_IN },
  });

  app.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'No autorizado' });
    }
  });

  app.decorate('requireOwner', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'No autorizado' });
    }
    if (req.user?.role !== 'owner') {
      return reply.code(403).send({ error: 'Solo el propietario puede acceder' });
    }
  });

  app.decorate('requireView', (viewKey) => async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'No autorizado' });
    }
    if (req.user?.role === 'owner') return;
    const required = Array.isArray(viewKey) ? viewKey : [viewKey];
    const rows = await query(
      'SELECT permissions FROM users WHERE id = ? AND active = 1',
      [req.user.id]
    );
    if (!rows.length) {
      return reply.code(401).send({ error: 'Usuario no encontrado' });
    }
    let perms = [];
    const raw = rows[0].permissions;
    if (Array.isArray(raw)) perms = raw;
    else if (typeof raw === 'string' && raw) {
      try {
        const parsed = JSON.parse(raw);
        perms = Array.isArray(parsed) ? parsed : [];
      } catch { perms = []; }
    }
    if (!required.some((k) => perms.includes(k))) {
      return reply.code(403).send({ error: 'Sin permiso para esta acción' });
    }
  });
}

export function userToDTO(row) {
  if (!row) return null;
  let permissions = [];
  if (row.permissions !== undefined && row.permissions !== null) {
    if (Array.isArray(row.permissions)) permissions = row.permissions;
    else if (typeof row.permissions === 'string' && row.permissions) {
      try {
        const parsed = JSON.parse(row.permissions);
        permissions = Array.isArray(parsed) ? parsed : [];
      } catch { permissions = []; }
    }
  }
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatar: row.avatar || '',
    color: row.color || '#6366f1',
    canDashboard: !!row.can_dashboard,
    active: row.active === undefined ? true : !!row.active,
    firstName: row.first_name || null,
    lastName: row.last_name || null,
    phone: row.phone || null,
    documentNumber: row.document_number || null,
    address: row.address || null,
    permissions,
  };
}

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 12 * 60 * 60,
};

export { COOKIE_NAME };
