import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

const SETTINGS_DEFAULTS = [
  ['businessName', "Paolita's Market"],
  ['businessTagline', 'Tu tienda de confianza'],
  ['businessNIT', ''],
  ['businessPhone', ''],
  ['businessAddress', ''],
  ['businessCity', 'La Paz'],
  ['businessEmail', ''],
  ['currency', 'BOB'],
  ['currencySymbol', 'Bs'],
  ['timezone', 'America/La_Paz'],
  ['taxRate', '13'],
  ['ticketPrefix', 'T-'],
  ['orderPrefix', 'PED-'],
  ['lowStockThreshold', '5'],
];

const DRIVERS = [
  ['D01', 'Jonhy Mamani', '59178001001', ''],
  ['D02', 'Gerson Colque', '59178001002', ''],
  ['D03', 'Rolando Quispe', '59178001003', ''],
  ['D04', 'Felix Callisaya', '59178001004', ''],
];

const PRODUCTS = [
  ['Coca-Cola 600ml', 'Bebidas', '7790895000017', 8.0, 5.0, 48, 'pza'],
  ['Pan Blanco', 'Panadería', '', 1.5, 0.8, 60, 'pza'],
  ['Leche Pil 1L', 'Lácteos', '7770001234567', 10.0, 6.5, 30, 'pza'],
  ['Arroz Grano de Oro 1kg', 'Abarrotes', '7770009876543', 12.0, 8.5, 25, 'kg'],
  ['Aceite Fino 1L', 'Abarrotes', '7770005551111', 18.0, 13.0, 18, 'pza'],
  ['Galletas Oreo', 'Snacks', '7622300336776', 6.0, 3.5, 40, 'pza'],
];

export async function runSeed(pool, log = console) {
  const adminHash = await bcrypt.hash('admin123', BCRYPT_ROUNDS);
  const espeHash = await bcrypt.hash('esperanza123', BCRYPT_ROUNDS);

  await pool.execute(
    `INSERT IGNORE INTO users
       (id, name, password_hash, role, avatar, color, can_dashboard, first_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['admin', 'Admin', adminHash, 'owner', 'A', '#ec4899', 1, 'Admin']
  );
  await pool.execute(
    `INSERT IGNORE INTO users
       (id, name, password_hash, role, avatar, color, can_dashboard, first_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['esperancita', 'Esperancita', espeHash, 'vendedora', 'E', '#f59e0b', 0, 'Esperanza']
  );

  for (const [id, name, phone, plate] of DRIVERS) {
    await pool.execute(
      `INSERT INTO drivers (id, name, phone, plate)
         VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         phone = VALUES(phone),
         plate = VALUES(plate)`,
      [id, name, phone, plate]
    );
  }

  for (const [name, category, barcode, price, cost, stock, unit] of PRODUCTS) {
    const [existing] = await pool.execute(
      'SELECT id FROM products WHERE name = ? LIMIT 1',
      [name]
    );
    if (existing.length) continue;
    await pool.execute(
      `INSERT INTO products (name, category, barcode, price, cost, stock, unit)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, category, barcode, price, cost, stock, unit]
    );
  }

  for (const [key, value] of SETTINGS_DEFAULTS) {
    await pool.execute(
      'INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)',
      [key, value]
    );
  }

  log?.info?.('Seed completado');
}
