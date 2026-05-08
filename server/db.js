import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runSeed } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool = null;

function dbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z',
  };
}

export function getPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    ...dbConfig(),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

const PING_TTL_MS = 5000;
let pingCache = { ok: false, error: null, errorMsg: null, at: 0, inflight: null };

async function probe() {
  try {
    await getPool().query('SELECT 1');
    return { ok: true, error: null, errorMsg: null };
  } catch (err) {
    return {
      ok: false,
      error: err.code || err.errno || 'UNKNOWN',
      errorMsg: err.message || null,
    };
  }
}

export async function pingDB() {
  const status = await pingDBStatus();
  return status.ok;
}

export async function pingDBStatus() {
  const now = Date.now();
  if (now - pingCache.at < PING_TTL_MS) {
    return { ok: pingCache.ok, error: pingCache.error, errorMsg: pingCache.errorMsg };
  }
  if (pingCache.inflight) return pingCache.inflight;
  pingCache.inflight = probe().then((res) => {
    pingCache = {
      ok: res.ok,
      error: res.error,
      errorMsg: res.errorMsg,
      at: Date.now(),
      inflight: null,
    };
    return res;
  });
  return pingCache.inflight;
}

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name VARCHAR(120) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getApplied(conn) {
  const [rows] = await conn.query('SELECT name FROM _migrations');
  return new Set(rows.map((r) => r.name));
}

async function runMigrations(log) {
  const dir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(dir)) {
    log?.warn?.(`No existe directorio de migraciones: ${dir}`);
    return;
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (!files.length) {
    log?.info?.('No hay archivos de migración');
    return;
  }

  const conn = await mysql.createConnection({
    ...dbConfig(),
    multipleStatements: true,
  });

  try {
    await ensureMigrationsTable(conn);
    const applied = await getApplied(conn);

    for (const file of files) {
      if (applied.has(file)) {
        log?.info?.(`Migración ya aplicada: ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      log?.info?.(`Aplicando migración: ${file}`);
      await conn.query(sql);
      await conn.execute('INSERT INTO _migrations (name) VALUES (?)', [file]);
      log?.info?.(`Migración aplicada: ${file}`);
    }
  } finally {
    await conn.end();
  }
}

export async function initDB(log = console) {
  if (!process.env.DB_NAME || !process.env.DB_USER) {
    log.warn?.('DB env vars no configuradas; salto initDB');
    return false;
  }
  await runMigrations(log);
  await runSeed(getPool(), log);
  return true;
}
