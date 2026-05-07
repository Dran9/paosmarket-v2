import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({ logger: true });

await app.register(fastifyStatic, {
  root: path.join(__dirname, 'client', 'dist'),
  prefix: '/',
});

app.get('/api/health', async () => ({
  ok: true,
  version: '2.0.0',
  time: new Date().toISOString(),
  node: process.version,
}));

app.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api/')) {
    reply.code(404).send({ error: 'No encontrado' });
    return;
  }
  reply.sendFile('index.html');
});

const port = Number(process.env.PORT) || 3000;

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
}
