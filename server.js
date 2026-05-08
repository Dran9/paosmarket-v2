import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDB, pingDBStatus } from './server/db.js';
import { setupAuth } from './server/auth.js';
import authRoutes from './server/routes/auth.js';
import productRoutes from './server/routes/products.js';
import transactionRoutes from './server/routes/transactions.js';
import settingsRoutes from './server/routes/settings.js';
import driverRoutes from './server/routes/drivers.js';
import orderRoutes from './server/routes/orders.js';
import notificationRoutes from './server/routes/notifications.js';
import usersRoutes from './server/routes/users.js';
import expensesRoutes from './server/routes/expenses.js';
import dashboardRoutes from './server/routes/dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({ logger: true });
const distDir = path.join(__dirname, 'client', 'dist');
const VERSION = '2.0.0';

app.get('/api/health', async () => {
  const dbStatus = await pingDBStatus();
  return {
    ok: true,
    version: VERSION,
    time: new Date().toISOString(),
    node: process.version,
    db: dbStatus.ok,
    dbError: dbStatus.error,
  };
});

async function start() {
  await setupAuth(app);
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(productRoutes, { prefix: '/api/products' });
  await app.register(transactionRoutes, { prefix: '/api/transactions' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });
  await app.register(driverRoutes, { prefix: '/api/drivers' });
  await app.register(orderRoutes, { prefix: '/api/orders' });
  await app.register(notificationRoutes, { prefix: '/api/notifications' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(expensesRoutes, { prefix: '/api/expenses' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });

  if (fs.existsSync(distDir)) {
    await app.register(fastifyStatic, { root: distDir, prefix: '/' });
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        reply.code(404).send({ error: 'No encontrado' });
        return;
      }
      reply.sendFile('index.html');
    });
  } else {
    app.log.warn(`Build no encontrado en ${distDir}`);
  }

  const port = Number(process.env.PORT) || 3000;
  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    return;
  }

  initDB(app.log).catch((err) => {
    app.log.error({ err }, 'initDB falló; el servidor sigue arriba');
  });
}

start();
export default app;
