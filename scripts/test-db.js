// Script puntual para verificar conexión, migraciones y seed contra la DB local.
// Uso: node --env-file=.env scripts/test-db.js
import { initDB, query, pingDB, getPool } from '../server/db.js';

function row(label, value) {
  console.log(`  ${label.padEnd(20)} ${value}`);
}

async function main() {
  if (!process.env.DB_NAME || !process.env.DB_USER) {
    console.error('Falta .env (DB_USER, DB_NAME, ...). Aborto.');
    process.exit(1);
  }

  console.log(`\nConectando a ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME}...`);

  const ok = await pingDB();
  if (!ok) {
    console.error('No se pudo conectar a la DB. ¿Está el contenedor arriba? `docker ps`');
    process.exit(1);
  }
  console.log('  Ping DB              OK');

  console.log('\nCorriendo initDB (migraciones + seed)...');
  await initDB(console);

  console.log('\nVerificando contenido:');
  const [{ n: users }] = await query('SELECT COUNT(*) AS n FROM users');
  const [{ n: products }] = await query('SELECT COUNT(*) AS n FROM products');
  const [{ n: drivers }] = await query('SELECT COUNT(*) AS n FROM drivers');
  const [{ n: settings }] = await query('SELECT COUNT(*) AS n FROM settings');
  const [{ n: migrations }] = await query('SELECT COUNT(*) AS n FROM _migrations');

  row('users', users);
  row('products', products);
  row('drivers', drivers);
  row('settings', settings);
  row('_migrations', migrations);

  const businessName = await query('SELECT `value` FROM settings WHERE `key` = ?', ['businessName']);
  row('businessName', businessName[0]?.value);

  console.log('\nOK\n');
  await getPool().end();
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
