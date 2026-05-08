import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDB, pingDBStatus } from './server/db.js';

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
